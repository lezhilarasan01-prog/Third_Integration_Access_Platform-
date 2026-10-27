package com.platform.erp.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.config.KafkaTopicProperties;
import com.platform.erp.mawm.MawmDispatcherService;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.store.TransactionStore;
import com.platform.erp.transformer.FileToJsonTransformer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Service
public class ErpFileConsumerService {

    private static final Logger log = LoggerFactory.getLogger(ErpFileConsumerService.class);

    private final FileToJsonTransformer transformer;
    private final KafkaTemplate<String, byte[]> kafkaTemplate;
    private final KafkaTopicProperties topicProperties;
    private final ObjectMapper objectMapper;
    private final TransactionStore transactionStore;
    private final MawmDispatcherService mawmDispatcher;
    private final com.platform.erp.storage.BlobStorageService blobStorageService;

    private final Set<String> processedFingerprints = Collections.newSetFromMap(
            new LinkedHashMap<String, Boolean>(1000, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Boolean> eldest) {
                    return size() > 10000;
                }
            });

    @org.springframework.beans.factory.annotation.Value("${platform.kafka.consumer.deduplication-enabled:true}")
    private boolean deduplicationEnabled = true;

    public ErpFileConsumerService(FileToJsonTransformer transformer,
            KafkaTemplate<String, byte[]> kafkaTemplate,
            KafkaTopicProperties topicProperties,
            ObjectMapper objectMapper,
            TransactionStore transactionStore,
            MawmDispatcherService mawmDispatcher,
            com.platform.erp.storage.BlobStorageService blobStorageService) {
        this.transformer = transformer;
        this.kafkaTemplate = kafkaTemplate;
        this.topicProperties = topicProperties;
        this.objectMapper = objectMapper;
        this.transactionStore = transactionStore;
        this.mawmDispatcher = mawmDispatcher;
        this.blobStorageService = blobStorageService;
    }

    /**
     * GENERIC UNIVERSAL KAFKA LISTENER:
     * Discovers and subscribes to ANY raw topic matching the pattern (e.g. .*_raw).
     * Automatically consumes any present or future topic without writing
     * topic-specific methods.
     */
    @KafkaListener(topicPattern = "${platform.kafka.consumer.topic-pattern:.*_raw}", groupId = "${spring.kafka.consumer.group-id}", concurrency = "${spring.kafka.listener.concurrency:6}")
    public void consume(ConsumerRecord<String, byte[]> record, Acknowledgment ack) {
        processRecord(record, ack);
    }

    private void processRecord(ConsumerRecord<String, byte[]> record, Acknowledgment ack) {
        String trackingId = extractHeader(record, "X-Tracking-Id", "UNKNOWN-" + record.offset());
        String erpSource = extractHeader(record, "X-ERP-Source", record.key() != null ? record.key() : "DEFAULT");
        String filename = extractHeader(record, "X-Original-Filename", "unknown.dat");
        boolean isClaimCheck = "true".equalsIgnoreCase(extractHeader(record, "X-Claim-Check", "false"));

        // Dynamically resolve DocumentType from Header -> Topic Name -> Content
        // Sniffing
        String docTypeHeader = extractHeader(record, "X-Document-Type", null);
        String docType = resolveDocumentType(docTypeHeader, record.topic(), filename);

        // Dynamically resolve DLQ topic for this raw topic
        String dlqTopic = topicProperties.resolveDlqTopic(record.topic());

        long startTime = System.currentTimeMillis();
        log.info(
                "Processing Kafka message. Partition: {}, Offset: {}, TrackingId: {}, ERP: {}, DocType: {}, BytesOnKafka: {}, ClaimCheck: {}",
                record.partition(), record.offset(), trackingId, erpSource, docType, record.value().length,
                isClaimCheck);

        try {
            byte[] payloadBytes;
            if (isClaimCheck) {
                log.info("[Claim-Check Consumer] Fetching payload for TrackingId: {}", trackingId);
                var trackerOpt = transactionStore.getTracker(trackingId);
                if (trackerOpt.isPresent() && trackerOpt.get().getStoragePath() != null
                        && !trackerOpt.get().getStoragePath().isBlank()
                        && trackerOpt.get().getStoragePath().startsWith("s3://")) {
                    payloadBytes = blobStorageService.readAllBytes(trackerOpt.get().getStoragePath());
                } else if (trackerOpt.isPresent() && trackerOpt.get().getRawContent() != null
                        && !trackerOpt.get().getRawContent().startsWith("[CLAIM_CHECK:")) {
                    log.info("[Consumer] Loaded payload from tracker DB rawContent for TrackingId: {}", trackingId);
                    payloadBytes = trackerOpt.get().getRawContent().getBytes(StandardCharsets.UTF_8);
                } else if (record.value() != null && record.value().length > 0 && !isClaimCheckStub(record.value())) {
                    log.info("[Direct Kafka Consumer] Processed direct payload from Kafka stream for TrackingId: {}",
                            trackingId);
                    payloadBytes = record.value();
                } else {
                    throw new IllegalStateException(
                            "Payload not retrievable: Missing S3 storage_path and direct payload for jobId: "
                                    + trackingId);
                }
            } else {
                payloadBytes = record.value();
            }

            // 1. Kafka Idempotency & Deduplication check
            // Deduplicates by trackingId to handle Kafka redelivery while allowing new file uploads with identical content
            if (deduplicationEnabled) {
                synchronized (processedFingerprints) {
                    if (processedFingerprints.contains(trackingId)) {
                        log.warn("Duplicate Kafka delivery detected for TrackingId: {}. Skipping conversion.", trackingId);
                        transactionStore.recordDuplicate(trackingId, erpSource, docType, filename);
                        ack.acknowledge();
                        return;
                    }
                    processedFingerprints.add(trackingId);
                }
            }

            // 2. Format parsing & Canonical JSON conversion
            CanonicalEnvelope envelope = transformer.transform(payloadBytes, erpSource, docType, trackingId, filename);

            // 3. Save to Transaction Store & Output Disk File
            transactionStore.recordKafkaCoordinates(trackingId, record.topic(), record.partition(), record.offset());
            transactionStore.recordConverted(trackingId, erpSource, docType, filename, envelope);

            String jsonOutput = envelope.toMawmJson(objectMapper);
            log.info("Successfully converted {} records to MAWM Canonical JSON in {}ms. TrackingId: {}\n{}",
                    envelope.getTotalRecords(), (System.currentTimeMillis() - startTime), trackingId, jsonOutput);

            // 4. Dispatch to MAWM Cloud REST Endpoint (or save/simulate if pending live
            // URL)
            mawmDispatcher.dispatch(envelope);

            // 5. Offset commit
            ack.acknowledge();

        } catch (Exception ex) {
            log.error("Conversion failed for TrackingId: {}, routing to DLQ: {}", trackingId, dlqTopic, ex);
            transactionStore.recordFailure(trackingId, erpSource, docType, ex.getMessage());
            sendToDlq(dlqTopic, record, trackingId, erpSource, docType, ex.getMessage());
            ack.acknowledge();
        }
    }

    private void sendToDlq(String dlqTopic, ConsumerRecord<String, byte[]> record, String trackingId, String erpSource,
            String docType, String errorMsg) {
        try {
            ProducerRecord<String, byte[]> dlqRecord = new ProducerRecord<>(dlqTopic, record.key(), record.value());
            dlqRecord.headers()
                    .add(new RecordHeader("X-Tracking-Id", trackingId.getBytes(StandardCharsets.UTF_8)))
                    .add(new RecordHeader("X-ERP-Source", erpSource.getBytes(StandardCharsets.UTF_8)))
                    .add(new RecordHeader("X-Document-Type", (docType != null ? docType : "UNKNOWN").getBytes(StandardCharsets.UTF_8)))
                    .add(new RecordHeader("X-Error-Reason",
                            (errorMsg != null ? errorMsg : "Unknown error").getBytes(StandardCharsets.UTF_8)))
                    .add(new RecordHeader("X-Original-Partition",
                            String.valueOf(record.partition()).getBytes(StandardCharsets.UTF_8)))
                    .add(new RecordHeader("X-Original-Offset",
                            String.valueOf(record.offset()).getBytes(StandardCharsets.UTF_8)));

            kafkaTemplate.send(dlqRecord);
            log.warn("Record sent to Dead Letter Queue: {}", dlqTopic);
        } catch (Exception e) {
            log.error("Failed to forward record to DLQ: {}", dlqTopic, e);
        }
    }

    private String extractHeader(ConsumerRecord<String, byte[]> record, String headerKey, String defaultValue) {
        Header header = record.headers().lastHeader(headerKey);
        if (header != null && header.value() != null) {
            return new String(header.value(), StandardCharsets.UTF_8);
        }
        return defaultValue;
    }

//    private String calculateFingerprint(String erpSource, String docType, byte[] payload) {
//        try {
//            MessageDigest digest = MessageDigest.getInstance("SHA-256");
//            digest.update(erpSource.getBytes(StandardCharsets.UTF_8));
//            digest.update((docType != null ? docType : "PO").getBytes(StandardCharsets.UTF_8));
//            byte[] hash = digest.digest(payload);
//            StringBuilder sb = new StringBuilder();
//            for (byte b : hash) {
//                sb.append(String.format("%02x", b));
//            }
//            return sb.toString();
//        } catch (Exception e) {
//            return erpSource + "_" + docType + "_" + payload.length;
//        }
//    }

    private boolean isClaimCheckStub(byte[] value) {
        if (value == null || value.length == 0 || value.length > 512)
            return false;
        String str = new String(value, StandardCharsets.UTF_8).trim();
        return str.startsWith("{") && str.contains("\"claimCheck\":true");
    }

    private String resolveDocumentType(String headerDocType, String topic, String filename) {
        if (headerDocType != null && !headerDocType.isBlank()) {
            return headerDocType.trim().toUpperCase();
        }
        if (topic != null) {
            String lower = topic.toLowerCase();
            if (lower.contains("asn") || lower.contains("ship"))
                return "ASN";
            if (lower.contains("po") || lower.contains("order"))
                return "PO";
            if (lower.contains("invoice"))
                return "INVOICE";
        }
        if (filename != null) {
            String upper = filename.toUpperCase();
            if (upper.contains("ASN") || upper.contains("SHIP"))
                return "ASN";
            if (upper.contains("PO") || upper.contains("ORDER"))
                return "PO";
            if (upper.contains("INVOICE"))
                return "INVOICE";
        }
        return "PO";
    }
}
