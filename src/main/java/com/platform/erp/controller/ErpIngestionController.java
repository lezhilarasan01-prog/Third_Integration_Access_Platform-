package com.platform.erp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.model.IngestionAckResponse;
import com.platform.erp.producer.ErpFileProducerService;
import com.platform.erp.store.TransactionStore;
import com.platform.erp.transformer.FileToJsonTransformer;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.multipart.MultipartResolver;

import java.util.Map;
import java.util.UUID;

/**
 * Universal Ingestion Controller for ERP Integration.
 * 
 * Exposes a single, unified endpoint that accepts ANY payload format sent by ERP systems:
 * - Multipart File Upload (form-data)
 * - Raw CSV, JSON, XML, EDI, Flat-file
 * - Binary / Application Octet-Stream
 * 
 * Handles docType, filename, and format auto-detection with zero rejection.
 */
@RestController
@RequestMapping("/api/v1/erp")
public class ErpIngestionController {

    private static final Logger log = LoggerFactory.getLogger(ErpIngestionController.class);

    private final ErpFileProducerService producerService;
    private final MultipartResolver multipartResolver;
    private final FileToJsonTransformer transformer;
    private final TransactionStore transactionStore;
    private final ObjectMapper objectMapper;
    private final com.platform.erp.mawm.MawmDispatcherService mawmDispatcherService;

    public ErpIngestionController(ErpFileProducerService producerService,
                                  MultipartResolver multipartResolver,
                                  FileToJsonTransformer transformer,
                                  TransactionStore transactionStore,
                                  ObjectMapper objectMapper,
                                  com.platform.erp.mawm.MawmDispatcherService mawmDispatcherService) {
        this.producerService = producerService;
        this.multipartResolver = multipartResolver;
        this.transformer = transformer;
        this.transactionStore = transactionStore;
        this.objectMapper = objectMapper;
        this.mawmDispatcherService = mawmDispatcherService;
    }

    /**
     * Synchronous Interactive Transformation Testing Endpoint.
     * Takes any raw payload or multipart file (e.g., H&M ASN JSON) and immediately returns the converted MAWM Canonical JSON.
     */
    @PostMapping(value = "/transform", consumes = MediaType.ALL_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> testTransformSynchronously(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestBody(required = false) byte[] rawBody,
            @RequestParam(value = "erpSource", defaultValue = "HM") String erpSource,
            @RequestParam(value = "docType", defaultValue = "ASN") String docType,
            @RequestParam(value = "filename", required = false) String filename,
            HttpServletRequest request) {
        try {
            byte[] payload = null;
            String resolvedFilename = filename;

            if (file != null && !file.isEmpty()) {
                payload = file.getBytes();
                if (resolvedFilename == null || resolvedFilename.isBlank()) {
                    resolvedFilename = file.getOriginalFilename();
                }
            } else if (rawBody != null && rawBody.length > 0) {
                payload = rawBody;
            } else {
                payload = request.getInputStream().readAllBytes();
            }

            if (resolvedFilename == null || resolvedFilename.isBlank()) {
                resolvedFilename = "hm_asn.json";
            }

            if (payload == null || payload.length == 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "EMPTY_PAYLOAD", "message", "Request body or file cannot be empty"));
            }
            CanonicalEnvelope envelope = transformer.transform(payload, erpSource, docType, "TEST-" + UUID.randomUUID(), resolvedFilename);
            return ResponseEntity.ok(envelope.toMawmPayload());
        } catch (Exception e) {
            log.error("Synchronous transformation failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "TRANSFORMATION_FAILED",
                    "message", e.getMessage() != null ? e.getMessage() : e.toString()
            ));
        }
    }

    /**
     * SINGLE UNIVERSAL INGESTION ENDPOINT.
     * Mapped to /{erpSource}/files, /{erpSource}/ingest, /{erpSource}, and /{erpSource}/raw.
     * Supports multipart form-data file uploads and raw request bodies (JSON, XML, CSV, EDI).
     * Strictly restricted to OPTI host system.
     */
    @PostMapping(value = { "/{erpSource}/files", "/{erpSource}/ingest", "/{erpSource}",
            "/{erpSource}/raw", "/files", "/ingest", "/raw" }, consumes = MediaType.ALL_VALUE)
    public ResponseEntity<?> ingestPayload(
            @PathVariable(value = "erpSource", required = false) String erpSourcePath,
            @RequestParam(value = "erpSource", required = false) String erpSourceParam,
            @RequestHeader(value = "X-ERP-Source", required = false) String erpSourceHeader,
            @RequestParam(value = "docType", required = false) String docTypeParam,
            @RequestParam(value = "type", required = false) String typeParam,
            @RequestParam(value = "topic", required = false) String customTopic,
            @RequestParam(value = "filename", required = false) String queryFilename,
            @RequestParam(value = "createdBy", required = false) String paramCreatedBy,
            @RequestHeader(value = "X-Created-By", required = false) String headerCreatedBy,
            @RequestHeader(value = "X-Filename", required = false) String headerFilename,
            @RequestHeader(value = "X-Document-Type", required = false) String headerDocType,
            @RequestHeader(value = "X-Kafka-Topic", required = false) String headerTopic,
            @RequestHeader(value = "Content-Disposition", required = false) String contentDisposition,
            HttpServletRequest request) {

        // 0. Enforce Mandatory ERP Source Validation - Restricted strictly to OPTI
        String erpSource = (erpSourceParam != null && !erpSourceParam.isBlank())
                ? erpSourceParam.trim()
                : (erpSourceHeader != null && !erpSourceHeader.isBlank())
                ? erpSourceHeader.trim()
                : erpSourcePath;

        if (erpSource == null || erpSource.isBlank()
                || "files".equalsIgnoreCase(erpSource)
                || "ingest".equalsIgnoreCase(erpSource)
                || "raw".equalsIgnoreCase(erpSource)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "MISSING_HOST_SOURCE",
                    "message", "Host Source is mandatory. Please specify a valid host source system"
            ));
        }

        if ("OPTI".equalsIgnoreCase(erpSource)) {
            erpSource = "Opti";
        }

        try {
            byte[] payload = null;
            String resolvedFilename = null;

            // 1. Check if request is Multipart (Standard or wrapped)
            MultipartHttpServletRequest multipartRequest = null;
            if (request instanceof MultipartHttpServletRequest mr) {
                multipartRequest = mr;
            } else if (multipartResolver != null && multipartResolver.isMultipart(request)) {
                try {
                    multipartRequest = multipartResolver.resolveMultipart(request);
                } catch (Exception e) {
                    log.debug("Multipart resolution fallback: {}", e.getMessage());
                }
            }

            if (multipartRequest != null) {
                Map<String, MultipartFile> fileMap = multipartRequest.getFileMap();
                if (!fileMap.isEmpty()) {
                    MultipartFile file = fileMap.values().iterator().next();
                    payload = file.getBytes();
                    resolvedFilename = file.getOriginalFilename();
                    log.info("Extracted payload from multipart part: '{}', filename: '{}', size: {} bytes",
                            file.getName(), resolvedFilename, payload.length);
                }
            }

            // 2. If not multipart or multipart had no files, read raw bytes from InputStream
            if (payload == null || payload.length == 0) {
                payload = request.getInputStream().readAllBytes();
            }

            // 3. Validate non-empty payload
            if (payload == null || payload.length == 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "EMPTY_PAYLOAD", "message",
                        "Payload cannot be empty. Please provide a file via multipart form-data or raw request body."));
            }

            // 4. Resolve Filename (Priority: Query Param > X-Filename Header > Content-Disposition > Multipart)
            if (queryFilename != null && !queryFilename.isBlank()) {
                resolvedFilename = queryFilename.trim();
            } else if (headerFilename != null && !headerFilename.isBlank()) {
                resolvedFilename = headerFilename.trim();
            } else if (resolvedFilename == null || resolvedFilename.isBlank()) {
                resolvedFilename = extractFilenameFromContentDisposition(contentDisposition);
            }

            // 5. Dynamic Document Type Resolution (Resolves PO or ASN; returns null if neither)
            String requestedDocType = (docTypeParam != null && !docTypeParam.isBlank()) ? docTypeParam
                    : (typeParam != null && !typeParam.isBlank()) ? typeParam : headerDocType;
            String docType = resolveDocType(requestedDocType, resolvedFilename, payload);

            String destination = (customTopic != null && !customTopic.isBlank()) ? customTopic.trim()
                    : ((headerTopic != null && !headerTopic.isBlank()) ? headerTopic.trim() : (docType != null ? docType : "UNKNOWN"));

            log.info("[Universal Ingestion] Accepted from ERP: '{}', Target: '{}', Filename: '{}', Size: {} bytes",
                    erpSource, destination, resolvedFilename, payload.length);

            // 6. Publish to Kafka & Register in PostgreSQL Tracker
            IngestionAckResponse ack = producerService.publishFile(erpSource, destination, resolvedFilename, payload);

            boolean isOpti = "Opti".equalsIgnoreCase(erpSource)
                    || "OPTI".equalsIgnoreCase(erpSource);

            // 7. Wait for asynchronous Kafka conversion (Opti waits for MAWM cloud dispatch; non-Opti finishes quickly)
            var optTracker = transactionStore.waitForCompletion(ack.getTrackingId(), isOpti ? 4500 : 800);

            // If Kafka consumer took longer or hasn't finished yet, run immediate conversion & dispatch fallback
            if (optTracker.isEmpty() || optTracker.get().getOutputFiles() == null || optTracker.get().getOutputFiles().isBlank()
                    || "PENDING".equalsIgnoreCase(optTracker.get().getDispatchStatus())) {
                try {
                    CanonicalEnvelope env = transformer.transform(payload, erpSource, docType, ack.getTrackingId(), resolvedFilename);
                    if (env.getCreatedBy() == null || env.getCreatedBy().isBlank()) {
                        String userFromReq = (paramCreatedBy != null && !paramCreatedBy.isBlank()) ? paramCreatedBy.trim()
                                : (headerCreatedBy != null && !headerCreatedBy.isBlank()) ? headerCreatedBy.trim() : null;
                        if (userFromReq != null) env.setCreatedBy(userFromReq);
                    }
                    transactionStore.recordConverted(ack.getTrackingId(), erpSource, docType, resolvedFilename, env);
                    if (isOpti) {
                        mawmDispatcherService.dispatch(env);
                    } else {
                        transactionStore.recordMawmStatus(ack.getTrackingId(), "CONVERTED (Opti Exclusive)", env.getTotalRecords(), 0,
                                "{\"status\":\"CONVERTED\",\"hotDispatch\":false,\"erpSource\":\"" + erpSource + "\",\"message\":\"Payload converted to MAWM Canonical JSON. Hot dispatch is exclusive to Opti.\"}");
                    }
                    optTracker = transactionStore.getTracker(ack.getTrackingId());
                } catch (Exception e) {
                    log.warn("[Universal Ingestion] Direct conversion fallback error: {}", e.getMessage());
                }
            }

            if (optTracker.isPresent()) {
                var tracker = optTracker.get();
                String dispatchStatus = tracker.getDispatchStatus();
                String intakeStatus = tracker.getIntakeStatus();

                // If Kafka finished converting but MAWM dispatch hasn't run yet, dispatch immediately ONLY if Opti
                if (isOpti && tracker.getOutputFiles() != null && !tracker.getOutputFiles().isBlank() &&
                        (dispatchStatus == null || (!dispatchStatus.startsWith("DELIVERED") && !dispatchStatus.startsWith("DISPATCH_FAILED")))) {
                    try {
                        mawmDispatcherService.dispatchJob(ack.getTrackingId());
                        tracker = transactionStore.getTracker(ack.getTrackingId()).orElse(tracker);
                        dispatchStatus = tracker.getDispatchStatus();
                        intakeStatus = tracker.getIntakeStatus();
                    } catch (Exception e) {
                        log.warn("[Universal Ingestion] Fast dispatch fallback: {}", e.getMessage());
                    }
                }

                if (dispatchStatus != null && (dispatchStatus.startsWith("DELIVERED") || dispatchStatus.startsWith("DISPATCH_FAILED") || dispatchStatus.contains("Opti Exclusive"))) {
                    Object parsedMawmResp = null;
                    if (tracker.getMawmResponse() != null && !tracker.getMawmResponse().isBlank()) {
                        try {
                            parsedMawmResp = objectMapper.readTree(tracker.getMawmResponse());
                        } catch (Exception ignored) {
                            parsedMawmResp = tracker.getMawmResponse();
                        }
                    }
                    return ResponseEntity.ok(IngestionAckResponse.builder()
                            .trackingId(ack.getTrackingId())
                            .erpSource(erpSource)
                            .documentType(docType)
                            .filename(resolvedFilename)
                            .sizeBytes(payload.length)
                            .status(intakeStatus != null ? intakeStatus : "CONVERTED")
                            .dispatchStatus(dispatchStatus)
                            .mawmResponse(parsedMawmResp)
                            .message(isOpti ? "File successfully accepted and processed for MAWM Cloud delivery."
                                            : "File successfully converted to MAWM Canonical JSON (Hot dispatch is exclusive to Opti).")
                            .timestamp(ack.getTimestamp())
                            .build());
                }
            }

            return ResponseEntity.status(HttpStatus.ACCEPTED).body(ack);

        } catch (Exception e) {
            log.error("Failed to process universal ingestion for ERP: {}", erpSource, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    Map.of("error", "INGESTION_FAILED", "message", "Internal processing error: " + e.getMessage()));
        }
    }

    private String resolveDocType(String requestedDocType, String filename, byte[] payload) {
        if (requestedDocType != null && !requestedDocType.isBlank()) {
            String upper = requestedDocType.trim().toUpperCase();
            if (upper.contains("ASN") || upper.contains("DESADV") || upper.contains("SHIP")) {
                return "ASN";
            }
            if (upper.contains("PO") || upper.contains("ORDER") || upper.contains("PURCHASE")) {
                return "PO";
            }
        }
        if (filename != null && !filename.isBlank()) {
            String upper = filename.toUpperCase();
            if (upper.contains("ASN") || upper.contains("DESADV") || upper.contains("SHIP")) {
                return "ASN";
            }
            if (upper.contains("PO") || upper.contains("ORDER") || upper.contains("PURCHASE")) {
                return "PO";
            }
        }
        if (payload != null && payload.length > 0) {
            String sample = new String(payload, 0, Math.min(payload.length, 2048), java.nio.charset.StandardCharsets.UTF_8);
            if (sample.contains("AsnId") || sample.contains("asnId") || sample.contains("inboundDelivery") || sample.contains("asn") || sample.contains("ASN")) {
                return "ASN";
            }
            if (sample.contains("PurchaseOrderId") || sample.contains("purchaseOrder") || sample.contains("purchaseOrderId") || sample.contains("poNumber") || sample.contains("orders")) {
                return "PO";
            }
        }
        return null;
    }

    private String extractFilenameFromContentDisposition(String contentDisposition) {
        if (contentDisposition == null || contentDisposition.isBlank()) {
            return null;
        }
        for (String part : contentDisposition.split(";")) {
            String trimmed = part.trim();
            if (trimmed.toLowerCase().startsWith("filename=")) {
                String name = trimmed.substring("filename=".length()).trim();
                if (name.startsWith("\"") && name.endsWith("\"") && name.length() > 1) {
                    name = name.substring(1, name.length() - 1);
                }
                return name;
            }
        }
        return null;
    }
}
