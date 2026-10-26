package com.platform.erp.producer;

import com.platform.erp.config.KafkaTopicProperties;
import com.platform.erp.model.IngestionAckResponse;
import com.platform.erp.storage.BlobStorageService;
import com.platform.erp.store.TransactionStore;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
public class ErpFileProducerService {

    private static final Logger log = LoggerFactory.getLogger(ErpFileProducerService.class);

    private final KafkaTemplate<String, byte[]> kafkaTemplate;
    private final KafkaTopicProperties topicProperties;
    private final TransactionStore transactionStore;
    private final BlobStorageService blobStorageService;

	public ErpFileProducerService(KafkaTemplate<String, byte[]> kafkaTemplate, KafkaTopicProperties topicProperties,
			com.platform.erp.store.TransactionStore transactionStore,
			com.platform.erp.storage.BlobStorageService blobStorageService) {
		this.kafkaTemplate = kafkaTemplate;
		this.topicProperties = topicProperties;
		this.transactionStore = transactionStore;
		this.blobStorageService = blobStorageService;
	}

	public IngestionAckResponse publishFile(String erpSource, String destinationTopicOrDocType, String filename, byte[] payload) {
		String trackingId = UUID.randomUUID().toString();
		long nowMillis = System.currentTimeMillis();
		String checksum = calculateChecksum(payload);

		String targetTopic = topicProperties.resolveRawTopic(destinationTopicOrDocType);
		String docType = (destinationTopicOrDocType != null && !destinationTopicOrDocType.isBlank()) 
				? destinationTopicOrDocType.trim().toUpperCase() : "PO";

		// Stage 1: Write Receive row in PostgreSQL tracker
		String rawContent = new String(payload, StandardCharsets.UTF_8);
		transactionStore.recordReceived(trackingId, erpSource, docType, filename, payload.length, checksum, targetTopic,
				rawContent);

		// Stage 2: Send directly to target Kafka topic (any arbitrary topic name supported)
		ProducerRecord<String, byte[]> record = new ProducerRecord<>(targetTopic, erpSource, payload);

		String docTypeName = destinationTopicOrDocType != null ? destinationTopicOrDocType : "RAW";
		record.headers().add(new RecordHeader("X-Tracking-Id", trackingId.getBytes(StandardCharsets.UTF_8)))
				.add(new RecordHeader("X-ERP-Source", erpSource.getBytes(StandardCharsets.UTF_8)))
				.add(new RecordHeader("X-Document-Type", docTypeName.getBytes(StandardCharsets.UTF_8)))
				.add(new RecordHeader("X-Original-Filename",
						(filename != null ? filename : "unknown").getBytes(StandardCharsets.UTF_8)))
				.add(new RecordHeader("X-Ingestion-Timestamp",
						String.valueOf(nowMillis).getBytes(StandardCharsets.UTF_8)));

		log.info(
				"Publishing file event to Kafka. Topic: {}, TrackingId: {}, ERPSource: {}, DocType: {}, BytesOnKafka: {}",
				targetTopic, trackingId, erpSource, docType, payload.length);

		CompletableFuture<SendResult<String, byte[]>> future = kafkaTemplate.send(record);

		future.whenComplete((result, ex) -> {
			if (ex == null) {
				var meta = result.getRecordMetadata();
				log.info("Kafka ACK received. TrackingId: {}, Topic: {}, Partition: {}, Offset: {}", trackingId,
						meta.topic(), meta.partition(), meta.offset());
				transactionStore.recordKafkaCoordinates(trackingId, meta.topic(), meta.partition(), meta.offset());
			} else {
				log.error("Failed to publish file to Kafka. TrackingId: {}, Topic: {}", trackingId, targetTopic, ex);
			}
		});

		try {
			future.get(3, TimeUnit.SECONDS);
		} catch (Exception e) {
			log.warn("Fast-path timeout or warning for trackingId: {}, continuing asynchronously: {}", trackingId,
					e.getMessage());
		}

		return IngestionAckResponse
				.builder().trackingId(trackingId).erpSource(erpSource).documentType(docType).filename(filename)
				.sizeBytes(payload.length).status("QUEUED").message("File successfully accepted and queued on topic '"
						+ targetTopic + "' for asynchronous JSON conversion.")
				.timestamp(Instant.ofEpochMilli(nowMillis)).build();
	}

    private String calculateChecksum(byte[] payload) {
        if (payload == null) return "EMPTY";
        try {
        	// Uses the standard cryptographic SHA-256 algorithm
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(payload);
            // Converts 32-byte binary hash into a readable 64-character hexadecimal string
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return "UNKNOWN";
        }
    }
}
