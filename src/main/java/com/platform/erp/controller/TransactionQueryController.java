package com.platform.erp.controller;

import com.platform.erp.model.ErpFileIntakeTracker;
import com.platform.erp.model.ProcessedTransaction;
import com.platform.erp.store.TransactionStore;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller to inspect converted Canonical JSON and processing status.
 */
@RestController
@RequestMapping("/api/v1/erp/transactions")
public class TransactionQueryController {

    private final TransactionStore transactionStore;
    private final com.platform.erp.storage.BlobStorageService blobStorageService;

    public TransactionQueryController(TransactionStore transactionStore,
                                      com.platform.erp.storage.BlobStorageService blobStorageService) {
        this.transactionStore = transactionStore;
        this.blobStorageService = blobStorageService;
    }

    /**
     * Get distinct ERP source systems and transaction types dynamically from database.
     * Example: GET /api/v1/erp/transactions/options
     */
    @GetMapping("/options")
    public ResponseEntity<java.util.Map<String, List<String>>> getIngestionOptions() {
        return ResponseEntity.ok(java.util.Map.of(
                "sourceSystems", transactionStore.getDistinctSourceSystems(),
                "transactionTypes", transactionStore.getDistinctTransactionTypes()
        ));
    }

    /**
     * Get transaction details and the converted Canonical JSON by trackingId.
     * Example: GET /api/v1/erp/transactions/c843858c-58fe-4773-a660-bb1bf02a0fa8
     */
    @GetMapping("/{trackingId}")
    public ResponseEntity<ProcessedTransaction> getTransaction(@PathVariable("trackingId") String trackingId) {
        return transactionStore.getTransaction(trackingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List all recent processed transactions.
     * Example: GET /api/v1/erp/transactions
     */
    @GetMapping
    public ResponseEntity<List<ProcessedTransaction>> listTransactions() {
        return ResponseEntity.ok(transactionStore.getAllTransactions());
    }

    /**
     * Get raw erp_file_intake_tracker database row by jobId.
     * Example: GET /api/v1/erp/transactions/tracker/c843858c-58fe-4773-a660-bb1bf02a0fa8
     */
    @GetMapping("/tracker/{jobId}")
    public ResponseEntity<com.platform.erp.model.ErpFileIntakeTracker> getTrackerRow(@PathVariable("jobId") String jobId) {
        return transactionStore.getTracker(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List erp_file_intake_tracker database rows dynamically with pagination.
     * Example: GET /api/v1/erp/transactions/tracker?page=0&size=50
     */
    @GetMapping("/tracker")
    public ResponseEntity<List<com.platform.erp.model.TrackerSummaryProjection>> listTrackerRows(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size) {
        return ResponseEntity.ok(transactionStore.getAllTrackerSummaries(page, size));
    }

    /**
     * Get all Kafka Exception & Dead-Letter Queue (DLQ) records.
     * Example: GET /api/v1/erp/transactions/dlq
     */
    @GetMapping("/dlq")
    public ResponseEntity<List<com.platform.erp.model.ErpFileIntakeTracker>> getDlqRecords() {
        return ResponseEntity.ok(transactionStore.getDlqExceptions());
    }

    /**
     * Delete an erp_file_intake_tracker database row by jobId.
     * Example: DELETE /api/v1/erp/transactions/tracker/9f105f68-92ba-452c-b1ed-e73a40367575
     */
    @DeleteMapping("/tracker/{jobId}")
    public ResponseEntity<Void> deleteTrackerRow(@PathVariable("jobId") String jobId) {
        boolean deleted = transactionStore.deleteTracker(jobId);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    /**
     * Download the exact original raw file that the customer sent.
     * Supports both inline payloads and large Claim-Check streamed blobs.
     * Example: GET /api/v1/erp/transactions/{jobId}/download/raw
     */
    @GetMapping("/{jobId}/download/raw")
    public ResponseEntity<?> downloadOriginalRawFile(@PathVariable("jobId") String jobId) {
        var trackerOpt = transactionStore.getTracker(jobId);
        String filename = null;
        String raw = null;
        String storagePath = null;
        String transactionType = "PO";
        String inputFormat = null;

        if (trackerOpt.isPresent()) {
            var t = trackerOpt.get();
            filename = t.getOriginalFilename();
            raw = t.getRawContent();
            storagePath = t.getStoragePath();
            inputFormat = t.getInputFormat();
            if (t.getTransactionType() != null) {
                transactionType = t.getTransactionType();
            }
        }

        // Determine true file extension matching what was uploaded
        String resolvedExt = resolveExtension(inputFormat, filename, raw);
        String resolvedFilename = resolveFilename(filename, jobId, resolvedExt);

        // 1. If inline raw content is present in database (exact bytes customer uploaded)
        if (raw != null && !raw.isBlank() && !raw.startsWith("[CLAIM_CHECK:")) {
            byte[] bytes = raw.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resolvedFilename + "\"")
                    .contentType(org.springframework.http.MediaType.parseMediaType(detectMediaType(resolvedFilename)))
                    .contentLength(bytes.length)
                    .body(new org.springframework.core.io.ByteArrayResource(bytes));
        }

        // 2. If storage path or rawContent has claim-check/URI (S3 or file storage)
        String blobUri = null;
        if (raw != null && raw.startsWith("[CLAIM_CHECK: ") && raw.endsWith("]")) {
            blobUri = raw.substring(14, raw.length() - 1).trim();
        } else if (storagePath != null && (storagePath.startsWith("s3://") || storagePath.startsWith("file://"))) {
            blobUri = storagePath.trim();
        }

        if (blobUri != null) {
            // Try generating direct S3 Pre-Signed redirect
            try {
                String presignedUrl = blobStorageService.generatePresignedDownloadUrl(blobUri, resolvedFilename);
                if (presignedUrl != null) {
                    return ResponseEntity.status(org.springframework.http.HttpStatus.FOUND)
                            .header(org.springframework.http.HttpHeaders.LOCATION, presignedUrl)
                            .body(java.util.Map.of(
                                    "status", 302,
                                    "message", "Redirecting to direct Amazon S3 download link",
                                    "s3DownloadUrl", presignedUrl,
                                    "expiresInMinutes", 15
                            ));
                }
            } catch (Exception e) {
                // fallback to stream
            }

            // Fallback: Stream directly from storage service (handles s3 and file://)
            try (java.io.InputStream in = blobStorageService.openStream(blobUri)) {
                byte[] bytes = in.readAllBytes();
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resolvedFilename + "\"")
                        .contentType(org.springframework.http.MediaType.parseMediaType(detectMediaType(resolvedFilename)))
                        .contentLength(bytes.length)
                        .body(new org.springframework.core.io.ByteArrayResource(bytes));
            } catch (Exception e) {
                // fall through to fallback content
            }
        }

        // 3. Not Found in Storage or Database
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                .body(java.util.Map.of(
                        "status", 404,
                        "error", "NOT_FOUND",
                        "message", "Raw file content is not available in storage for jobId: " + jobId
                ));
    }

    /**
     * Download the converted Canonical JSON file.
     * Supports S3 Pre-Signed redirect, streamed JSON, and inline JSON.
     * Example: GET /api/v1/erp/transactions/{jobId}/download/json
     */
    @GetMapping("/{jobId}/download/json")
    public ResponseEntity<?> downloadConvertedJsonFile(@PathVariable("jobId") String jobId) {
        var trackerOpt = transactionStore.getTracker(jobId);
        String filename = jobId + "_canonical.json";
        String json = null;
        String transactionType = "PO";
        String sourceSystem = "CUSTOMER_A_ERP";

        if (trackerOpt.isPresent()) {
            var t = trackerOpt.get();
            if ("FAILED".equalsIgnoreCase(t.getIntakeStatus())) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(java.util.Map.of(
                                "status", 422,
                                "error", "CONVERSION_FAILED",
                                "message", t.getProcessingErrorMessage() != null ? t.getProcessingErrorMessage() : "File processing failed and was routed to DLQ for jobId: " + jobId
                        ));
            }
            json = t.getOutputFiles();
            if (t.getTransactionType() != null) transactionType = t.getTransactionType();
            if (t.getSourceSystem() != null) sourceSystem = t.getSourceSystem();
        }

        // 1. Check if outputFiles is a claim-check URI
        if (json != null && json.startsWith("[CLAIM_CHECK: ") && json.endsWith("]")) {
            String blobUri = json.substring(14, json.length() - 1).trim();
            try {
                String presignedUrl = blobStorageService.generatePresignedDownloadUrl(blobUri, filename);
                if (presignedUrl != null) {
                    return ResponseEntity.status(org.springframework.http.HttpStatus.FOUND)
                            .header(org.springframework.http.HttpHeaders.LOCATION, presignedUrl)
                            .body(java.util.Map.of(
                                    "status", 302,
                                    "message", "Redirecting to direct Amazon S3 download link",
                                    "s3DownloadUrl", presignedUrl,
                                    "expiresInMinutes", 15
                            ));
                }
            } catch (Exception e) {
                // fallback to stream
            }

            try (java.io.InputStream in = blobStorageService.openStream(blobUri)) {
                byte[] bytes = in.readAllBytes();
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .contentLength(bytes.length)
                        .body(new org.springframework.core.io.ByteArrayResource(bytes));
            } catch (Exception e) {
                // fall through to fallback content
            }
        }

        // 2. If inline JSON content exists
        if (json != null && !json.isBlank() && !json.startsWith("[CLAIM_CHECK:")) {
            byte[] bytes = json.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .contentLength(bytes.length)
                    .body(new org.springframework.core.io.ByteArrayResource(bytes));
        }

        // 3. Not Found in Storage or Database
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                .body(java.util.Map.of(
                        "status", 404,
                        "error", "NOT_FOUND",
                        "message", "Converted canonical JSON is not available in storage for jobId: " + jobId
                ));
    }

    private String resolveExtension(String inputFormat, String filename, String raw) {
        if (inputFormat != null && !inputFormat.isBlank()) {
            String fmt = inputFormat.trim().toUpperCase();
            if (fmt.contains("JSON")) return ".json";
            if (fmt.contains("CSV")) return ".csv";
            if (fmt.contains("XML")) return ".xml";
            if (fmt.contains("EDI")) return ".edi";
            if (fmt.contains("TXT")) return ".txt";
        }
        if (filename != null && filename.contains(".")) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".json")) return ".json";
            if (lower.endsWith(".csv")) return ".csv";
            if (lower.endsWith(".xml")) return ".xml";
            if (lower.endsWith(".edi")) return ".edi";
            if (lower.endsWith(".txt")) return ".txt";
        }
        if (raw != null && !raw.isBlank()) {
            String trimmed = raw.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) return ".json";
            if (trimmed.startsWith("<")) return ".xml";
            if (trimmed.contains(",") || trimmed.contains("\t") || trimmed.contains("\n")) return ".csv";
        }
        return ".csv";
    }

    private String resolveFilename(String filename, String jobId, String ext) {
        String cleanId = (jobId != null && jobId.length() >= 8) ? jobId.substring(0, 8) : "upload";
        if (filename == null || filename.isBlank()) {
            return "raw_" + cleanId + ext;
        }
        String clean = filename.trim();
        if (clean.contains("?")) {
            clean = clean.substring(0, clean.indexOf("?"));
        }
        if (clean.toLowerCase().endsWith(ext)) {
            return clean;
        }
        if (clean.contains(".")) {
            clean = clean.substring(0, clean.lastIndexOf("."));
        }
        return clean + ext;
    }

    private String detectMediaType(String filename) {
        if (filename == null) return "application/octet-stream";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".csv")) return "text/csv; charset=UTF-8";
        if (lower.endsWith(".json")) return "application/json; charset=UTF-8";
        if (lower.endsWith(".xml")) return "application/xml; charset=UTF-8";
        if (lower.endsWith(".txt")) return "text/plain; charset=UTF-8";
        if (lower.endsWith(".edi")) return "application/edifact; charset=UTF-8";
        return "application/octet-stream";
    }



    private volatile java.util.Map<String, Object> cachedS3Summary;
    private volatile long lastS3SummaryFetchTime = 0;
    private static final long S3_CACHE_TTL_MS = 10_000; // 10s cache to eliminate repetitive S3 latency

    /**
     * Get live summary of Amazon S3 storage bucket, raw and converted objects.
     */
    @GetMapping("/s3/summary")
    public ResponseEntity<?> getS3Summary() {
        long now = System.currentTimeMillis();
        if (cachedS3Summary != null && (now - lastS3SummaryFetchTime) < S3_CACHE_TTL_MS) {
            return ResponseEntity.ok(cachedS3Summary);
        }

        var rawObjects = blobStorageService.listObjects("raw/");
        var convertedObjects = blobStorageService.listObjects("converted/");

        long totalRawBytes = rawObjects.stream().mapToLong(o -> Long.parseLong(o.getOrDefault("sizeBytes", 0).toString())).sum();
        long totalConvertedBytes = convertedObjects.stream().mapToLong(o -> Long.parseLong(o.getOrDefault("sizeBytes", 0).toString())).sum();

        java.util.Map<String, Object> summary = java.util.Map.of(
                "bucket", blobStorageService.getBucketName(),
                "status", "CONNECTED",
                "rawCount", rawObjects.size(),
                "rawTotalBytes", totalRawBytes,
                "rawObjects", rawObjects,
                "convertedCount", convertedObjects.size(),
                "convertedTotalBytes", totalConvertedBytes,
                "convertedObjects", convertedObjects
        );

        this.cachedS3Summary = summary;
        this.lastS3SummaryFetchTime = now;
        return ResponseEntity.ok(summary);
    }
}
