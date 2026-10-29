package com.platform.erp.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.model.ErpFileIntakeTracker;
import com.platform.erp.model.ProcessedTransaction;
import com.platform.erp.repository.ErpFileIntakeTrackerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service managing the erp_file_intake_tracker table in PostgreSQL.
 * Persists all stages: Receive -> Convert -> Deliver to MAWM.
 * All JSON and status data are stored in the database without relying on local disk directories.
 */
@Service
public class TransactionStore {

    private static final Logger log = LoggerFactory.getLogger(TransactionStore.class);

    private final ErpFileIntakeTrackerRepository trackerRepository;
    private final ObjectMapper objectMapper;
    private final com.platform.erp.storage.BlobStorageService blobStorageService;

    public TransactionStore(ErpFileIntakeTrackerRepository trackerRepository,
                            ObjectMapper objectMapper,
                            com.platform.erp.storage.BlobStorageService blobStorageService) {
        this.trackerRepository = trackerRepository;
        this.objectMapper = objectMapper;
        this.blobStorageService = blobStorageService;
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            int deleted = trackerRepository.cleanupInvalidSourceTrackers();
            if (deleted > 0) {
                log.info("[DB Tracker] Purged {} legacy tracker records with invalid route source keywords.", deleted);
            }
        } catch (Exception e) {
            log.debug("[DB Tracker] Route keyword cleanup skipped or table not initialized yet: {}", e.getMessage());
        }
    }

    /**
     * Stage 1: Receive
     * Records initial entry in erp_file_intake_tracker upon file intake.
     * Uses Claim-Check if payload exceeds inline threshold.
     */
    @Transactional
    public void recordReceived(String trackingId, String erpSource, String docType,
                               String filename, long sizeBytes, String checksum, String targetTopic, String rawContent) {
        try {
            ErpFileIntakeTracker tracker = new ErpFileIntakeTracker();
            tracker.setJobId(trackingId);
            tracker.setSourceSystem(erpSource != null ? erpSource : "UNKNOWN_ERP");
            tracker.setTransactionType(docType != null && !docType.isBlank() ? docType.trim().toUpperCase() : "UNKNOWN");
            tracker.setMappingProfile((erpSource != null ? erpSource.toLowerCase() : "default") + "-"
                    + (docType != null ? docType.toLowerCase() : "doc") + "-v1");
            tracker.setInputFormat(inferFormat(filename));
            tracker.setOriginalFilename(filename);
            tracker.setFacilityId(com.platform.erp.util.FacilityExtractor.extractFacility(filename));
            tracker.setFileSizeBytes(sizeBytes);
            tracker.setFileChecksum(checksum);
            tracker.setReceivedAt(Instant.now());
            tracker.setKafkaTopic(targetTopic);
            tracker.setIntakeStatus("RECEIVED");
            tracker.setDispatchStatus("PENDING");
            tracker.setUpdatedAt(Instant.now());

            if (blobStorageService.isLarge(sizeBytes) && rawContent != null) {
                String blobUri = blobStorageService.storeRaw(trackingId, filename, rawContent.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                tracker.setStoragePath(blobUri);
                tracker.setRawContent("[CLAIM_CHECK: " + blobUri + "]");
                log.info("[DB Tracker] Payload exceeds threshold ({} bytes). Stored in Blob Storage: {}", sizeBytes, blobUri);
            } else {
                tracker.setStoragePath(targetTopic);
                tracker.setRawContent(rawContent);
            }

            trackerRepository.save(tracker);
            log.info("[DB Tracker] Inserted RECEIVE state in PostgreSQL for jobId: {}", trackingId);
        } catch (Exception e) {
            log.error("[DB Tracker] Failed to save RECEIVE state for jobId: {}", trackingId, e);
        }
    }

    @Transactional
    public void recordReceived(String trackingId, String erpSource, String docType,
                               String filename, long sizeBytes, String checksum, String targetTopic) {
        recordReceived(trackingId, erpSource, docType, filename, sizeBytes, checksum, targetTopic, null);
    }

    /**
     * Stage 2: Convert Started
     */
    @Transactional
    public void recordProcessingStarted(String trackingId) {
        trackerRepository.findByJobId(trackingId).ifPresent(tracker -> {
            tracker.setProcessingStartedAt(Instant.now());
            tracker.setIntakeStatus("CONVERTING");
            tracker.setUpdatedAt(Instant.now());
            trackerRepository.save(tracker);
        });
    }

    /**
     * Record Kafka Coordinates (Topic, Partition, Offset) from Producer or Consumer
     */
    @Transactional
    public void recordKafkaCoordinates(String trackingId, String topic, int partition, long offset) {
        trackerRepository.findByJobId(trackingId).ifPresent(tracker -> {
            tracker.setKafkaTopic(topic);
            tracker.setKafkaPartition(partition);
            tracker.setKafkaOffset(offset);
            tracker.setUpdatedAt(Instant.now());
            trackerRepository.save(tracker);
            log.info("[DB Tracker] Recorded Kafka coordinates for jobId: {} -> Topic: {}, Partition: {}, Offset: {}",
                    trackingId, topic, partition, offset);
        });
    }

    /**
     * Stage 2: Convert Completed Successfully
     * Stores canonical JSON directly in the database (no disk files needed).
     */
    @Transactional
    public void recordConverted(String trackingId, String erpSource, String docType,
                                String filename, CanonicalEnvelope envelope) {
        try {
            ErpFileIntakeTracker tracker = trackerRepository.findByJobId(trackingId)
                    .orElseGet(() -> {
                        ErpFileIntakeTracker t = new ErpFileIntakeTracker();
                        t.setJobId(trackingId);
                        t.setSourceSystem(erpSource != null && !erpSource.isBlank() ? erpSource : "UNKNOWN_ERP");
                        t.setTransactionType(docType != null && !docType.isBlank() ? docType.trim().toUpperCase() : "UNKNOWN");
                        t.setOriginalFilename(filename);
                        t.setReceivedAt(Instant.now());
                        return t;
                    });

            String jsonPayload = envelope != null ? envelope.toMawmJson(objectMapper) : "{\"Data\":[]}";
            tracker.setIntakeStatus("CONVERTED");
            tracker.setProcessingCompletedAt(Instant.now());
            tracker.setTotalRecords(envelope != null ? envelope.getTotalRecords() : 0);
            tracker.setConvertedRecords(envelope != null ? envelope.getTotalRecords() : 0);
            tracker.setErrorRecords(0);
            tracker.setDispatchStatus("SAVED_AWAITING_ENDPOINT");
            tracker.setUpdatedAt(Instant.now());

            byte[] jsonBytes = jsonPayload.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if (blobStorageService.isLarge(jsonBytes.length)) {
                String jsonBlobUri = blobStorageService.storeConvertedJson(trackingId, jsonPayload);
                tracker.setOutputFiles("[CLAIM_CHECK: " + jsonBlobUri + "]");
                log.info("[DB Tracker] Converted JSON exceeds threshold ({} bytes). Stored in Blob Storage: {}", jsonBytes.length, jsonBlobUri);
            } else {
                tracker.setOutputFiles(jsonPayload);
            }

            trackerRepository.save(tracker);
            log.info("[DB Tracker] Updated CONVERTED state in PostgreSQL for jobId: {}", trackingId);
        } catch (Exception e) {
            log.error("[DB Tracker] Failed to record CONVERTED in DB for jobId: {}", trackingId, e);
        }
    }

    /**
     * Stage 2: Duplicate Skipped (Idempotency)
     */
    @Transactional
    public void recordDuplicate(String trackingId, String erpSource, String docType, String filename) {
        ErpFileIntakeTracker tracker = trackerRepository.findByJobId(trackingId)
                .orElseGet(() -> {
                    ErpFileIntakeTracker t = new ErpFileIntakeTracker();
                    t.setJobId(trackingId);
                    t.setSourceSystem(erpSource != null && !erpSource.isBlank() ? erpSource : "UNKNOWN_ERP");
                    t.setTransactionType(docType != null && !docType.isBlank() ? docType.trim().toUpperCase() : "UNKNOWN");
                    t.setOriginalFilename(filename);
                    t.setReceivedAt(Instant.now());
                    return t;
                });

        tracker.setIntakeStatus("DUPLICATE_SKIPPED");
        tracker.setProcessingErrorMessage("Idempotency filter: Identical payload was previously received and processed. Skipped duplicate JSON conversion.");
        tracker.setProcessingCompletedAt(Instant.now());
        tracker.setDispatchStatus("SKIPPED");
        tracker.setUpdatedAt(Instant.now());

        trackerRepository.save(tracker);
        log.info("[DB Tracker] Updated DUPLICATE_SKIPPED state in PostgreSQL for jobId: {}", trackingId);
    }

    /**
     * Stage 2: Convert Failed (Sent to DLQ)
     */
    @Transactional
    public void recordFailure(String trackingId, String erpSource, String docType, String dlqTopic, String error) {
        ErpFileIntakeTracker tracker = trackerRepository.findByJobId(trackingId)
                .orElseGet(() -> {
                    ErpFileIntakeTracker t = new ErpFileIntakeTracker();
                    t.setJobId(trackingId);
                    t.setSourceSystem(erpSource != null && !erpSource.isBlank() ? erpSource : "UNKNOWN_ERP");
                    t.setTransactionType(docType != null && !docType.isBlank() ? docType.trim().toUpperCase() : "UNKNOWN");
                    t.setReceivedAt(Instant.now());
                    return t;
                });

        tracker.setIntakeStatus("FAILED");
        tracker.setProcessingErrorMessage(error);
        if (dlqTopic != null && !dlqTopic.isBlank()) {
            tracker.setErrorFile(dlqTopic);
        }
        tracker.setErrorRecords(1);
        tracker.setProcessingCompletedAt(Instant.now());
        tracker.setDispatchStatus("FAILED");
        tracker.setUpdatedAt(Instant.now());

        trackerRepository.save(tracker);
        log.warn("[DB Tracker] Updated FAILED state in PostgreSQL for jobId: {}, DLQ: {}", trackingId, dlqTopic);
    }

    @Transactional
    public void recordFailure(String trackingId, String erpSource, String docType, String error) {
        recordFailure(trackingId, erpSource, docType, null, error);
    }

    /**
     * Stage 3: Deliver to MAWM
     */
    @Transactional
    public void recordMawmStatus(String trackingId, String mawmStatus, int dispatchedCount, int failedCount) {
        trackerRepository.findByJobId(trackingId).ifPresent(tracker -> {
            tracker.setDispatchStatus(mawmStatus);
            tracker.setDispatchedRecords(dispatchedCount);
            tracker.setDispatchFailedRecords(failedCount);
            tracker.setDispatchCompletedAt(Instant.now());
            tracker.setUpdatedAt(Instant.now());
            trackerRepository.save(tracker);
            log.info("[DB Tracker] Updated MAWM dispatch status '{}' for jobId: {}", mawmStatus, trackingId);
        });
    }

    public void recordMawmStatus(String trackingId, String mawmStatus) {
        recordMawmStatus(trackingId, mawmStatus, 0, 0);
    }

    public Optional<ErpFileIntakeTracker> getTracker(String jobId) {
        return trackerRepository.findByJobId(jobId).map(this::normalizeTrackerOutput);
    }

    private ErpFileIntakeTracker normalizeTrackerOutput(ErpFileIntakeTracker tracker) {
        if (tracker == null || tracker.getOutputFiles() == null) return tracker;
        String raw = tracker.getOutputFiles().trim();
        if (raw.startsWith("[CLAIM_CHECK:")) return tracker;
        try {
            if (raw.startsWith("{") || raw.startsWith("[")) {
                com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(raw);
                if (node.isObject() && node.has("Data") && node.get("Data").isArray() && node.size() == 1) {
                    return tracker;
                }
                if (node.isObject() && node.has("Data") && node.get("Data").isArray()) {
                    tracker.setOutputFiles(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(java.util.Map.of("Data", node.get("Data"))));
                } else if (node.isObject() && node.has("records") && node.get("records").isArray()) {
                    tracker.setOutputFiles(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(java.util.Map.of("Data", node.get("records"))));
                } else if (node.isObject() && node.has("data") && node.get("data").isArray()) {
                    tracker.setOutputFiles(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(java.util.Map.of("Data", node.get("data"))));
                } else if (node.isArray()) {
                    tracker.setOutputFiles(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(java.util.Map.of("Data", node)));
                }
            }
        } catch (Exception ignored) {}
        return tracker;
    }

    @Transactional
    public boolean deleteTracker(String jobId) {
        if (trackerRepository.existsById(jobId)) {
            trackerRepository.deleteById(jobId);
            log.info("[DB Tracker] Successfully deleted tracker row for jobId: {}", jobId);
            return true;
        }
        return false;
    }

    public List<ErpFileIntakeTracker> getAllTrackers(int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                Math.max(0, page),
                Math.max(1, size),
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "receivedAt")
        );
        return trackerRepository.findByOrderByReceivedAtDesc(pageable);
    }

    public List<ErpFileIntakeTracker> getAllTrackers() {
        return getAllTrackers(0, 500);
    }

    public List<com.platform.erp.model.TrackerSummaryProjection> getAllTrackerSummaries(int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                Math.max(0, page),
                Math.max(1, size),
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "receivedAt")
        );
        return trackerRepository.findProjectedByOrderByReceivedAtDesc(pageable);
    }

    public List<com.platform.erp.model.TrackerSummaryProjection> getAllTrackerSummaries() {
        return getAllTrackerSummaries(0, 500);
    }

    public Map<String, Object> getTransactionStats() {
        long total = trackerRepository.count();
        long completed = 0;
        long failed = 0;
        long processing = 0;
        try {
            List<Object[]> rows = trackerRepository.countGroupedByStatus();
            for (Object[] r : rows) {
                String status = r[0] != null ? r[0].toString().toUpperCase() : "";
                long c = ((Number) r[1]).longValue();
                if (status.equals("CONVERTED") || status.equals("COMPLETED")) {
                    completed += c;
                } else if (status.equals("FAILED")) {
                    failed += c;
                } else if (status.equals("PROCESSING") || status.equals("RECEIVED") || status.equals("IN_PROGRESS") || status.equals("QUEUED")) {
                    processing += c;
                }
            }
        } catch (Exception e) {
            log.warn("Could not calculate status counts: {}", e.getMessage());
        }
        return Map.of(
            "total", total,
            "completed", completed,
            "failed", failed,
            "processing", processing
        );
    }

    public List<ErpFileIntakeTracker> getDlqExceptions() {
        return trackerRepository.findDlqExceptions();
    }

    public List<String> getDistinctSourceSystems() {
        try {
            return trackerRepository.findDistinctSourceSystems().stream()
                    .filter(s -> s != null && !s.isBlank())
                    .map(String::trim)
                    .filter(s -> !List.of("files", "ingest", "raw").contains(s.toLowerCase()))
                    .distinct()
                    .toList();
        } catch (Exception e) {
            log.warn("Could not query distinct source systems: {}", e.getMessage());
            return List.of("CUSTOMER_A_ERP", "CUSTOMER_B_ERP", "CUSTOMER_C_ERP", "CUSTOMER_D_ERP", "HM", "SAP_ERP", "LOGISTICS_PARTNER", "ORACLE_NETSUITE");
        }
    }

    public List<String> getDistinctTransactionTypes() {
        try {
            return trackerRepository.findDistinctTransactionTypes().stream()
                    .filter(s -> s != null && !s.isBlank())
                    .map(String::trim)
                    .distinct()
                    .toList();
        } catch (Exception e) {
            log.warn("Could not query distinct transaction types: {}", e.getMessage());
            return List.of("ASN", "PO");
        }
    }

    public Optional<ProcessedTransaction> getTransaction(String trackingId) {
        return trackerRepository.findByJobId(trackingId).map(this::mapToProcessedTransaction);
    }

    public List<ProcessedTransaction> getAllTransactions() {
        List<ErpFileIntakeTracker> trackers = getAllTrackers(0, 500);
        List<ProcessedTransaction> result = new ArrayList<>();
        for (ErpFileIntakeTracker t : trackers) {
            result.add(mapToProcessedTransaction(t));
        }
        return result;
    }

    private ProcessedTransaction mapToProcessedTransaction(ErpFileIntakeTracker tracker) {
        ProcessedTransaction tx = new ProcessedTransaction();
        tx.setTrackingId(tracker.getJobId());
        tx.setErpSource(tracker.getSourceSystem());
        tx.setFacilityId(tracker.getFacilityId() != null ? tracker.getFacilityId() : com.platform.erp.util.FacilityExtractor.extractFacility(tracker.getOriginalFilename()));
        tx.setDocumentType(tracker.getTransactionType());
        tx.setFilename(tracker.getOriginalFilename());
        tx.setStatus(tracker.getIntakeStatus());
        tx.setTotalRecords(tracker.getTotalRecords() != null ? tracker.getTotalRecords() : 0);
        tx.setConvertedAt(tracker.getProcessingCompletedAt() != null ? tracker.getProcessingCompletedAt() : tracker.getReceivedAt());
        tx.setErrorMessage(tracker.getProcessingErrorMessage());
        tx.setMawmStatus(tracker.getDispatchStatus());

        if (tracker.getOutputFiles() != null && !tracker.getOutputFiles().isBlank()) {
            try {
                CanonicalEnvelope env = objectMapper.readValue(tracker.getOutputFiles(), CanonicalEnvelope.class);
                tx.setCanonicalEnvelope(env);
            } catch (Exception e) {
                log.debug("Could not deserialize output_files JSON: {}", e.getMessage());
            }
        }
        return tx;
    }

    private String inferFormat(String filename) {
        if (filename == null || !filename.contains(".")) return "UNKNOWN";
        String cleanName = filename.replace("\\", "/");
        if (cleanName.contains("/")) {
            cleanName = cleanName.substring(cleanName.lastIndexOf('/') + 1).trim();
        }
        int dotIndex = cleanName.lastIndexOf('.');
        if (dotIndex <= 0 || dotIndex == cleanName.length() - 1) return "UNKNOWN";
        String lower = cleanName.toLowerCase();
        if (lower.endsWith(".csv")) return "CSV";
        if (lower.endsWith(".edi") || lower.endsWith(".x12")) return "EDI";
        if (lower.endsWith(".json")) return "JSON";
        if (lower.endsWith(".xml")) return "XML";
        if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "YAML";
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "EXCEL";
        if (lower.endsWith(".tsv")) return "TSV";
        return cleanName.substring(dotIndex + 1).toUpperCase();
    }
}
