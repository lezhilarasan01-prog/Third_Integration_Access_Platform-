package com.platform.erp.controller;

import com.fasterxml.jackson.databind.JsonNode;
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

import java.nio.charset.StandardCharsets;
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

	public ErpIngestionController(ErpFileProducerService producerService, MultipartResolver multipartResolver,
			FileToJsonTransformer transformer, TransactionStore transactionStore, ObjectMapper objectMapper,
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
    /**
     * Unified ERP Ingestion Gateway.
     * Accepts data either via:
     * 1. File Upload (multipart/form-data: file)
     * 2. Direct JSON Body (application/json)
     */
    @PostMapping(value = { "/{erpSource}/files", "/files" }, consumes = MediaType.ALL_VALUE)
    public ResponseEntity<?> ingestPayload(
            @PathVariable(value = "erpSource", required = false) String erpSourcePath,
            @RequestParam(value = "erpSource", required = false) String erpSourceParam,
            @RequestParam(value = "docType", required = false) String docTypeParam,
            @RequestParam(value = "facility", required = false) String facilityParam,
            @RequestParam(value = "facilityId", required = false) String facilityIdParam,
            @RequestParam(value = "filename", required = false) String filenameParam,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestBody(required = false) byte[] rawBody,
            HttpServletRequest request) {

        // 1. Resolve ERP Source (defaults to Opti)
        String erpSource = (erpSourcePath != null && !erpSourcePath.isBlank() && !"files".equalsIgnoreCase(erpSourcePath))
                ? erpSourcePath.trim()
                : (erpSourceParam != null && !erpSourceParam.isBlank()) ? erpSourceParam.trim() : "Opti";

        if ("OPTI".equalsIgnoreCase(erpSource)) {
            erpSource = "Opti";
        }

        try {
            // 2. Extract Data: File Upload or JSON Body
            byte[] payload = null;
            String resolvedFilename = (filenameParam != null && !filenameParam.isBlank()) ? filenameParam.trim() : null;

            if (file != null && !file.isEmpty()) {
                payload = file.getBytes();
                if (resolvedFilename == null || resolvedFilename.isBlank()) {
                    resolvedFilename = file.getOriginalFilename();
                }
            } else if (rawBody != null && rawBody.length > 0) {
                payload = rawBody;
            } else if (request != null) {
                payload = request.getInputStream().readAllBytes();
            }

            if (payload == null || payload.length == 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "EMPTY_PAYLOAD",
                        "message", "Please provide data via file upload ('file') or direct JSON request body."
                ));
            }

            // 3. Resolve Document Type (PO, ASN, DO, ITEM)
            String docType = resolveDocType(docTypeParam, resolvedFilename, request);
            if (docType == null || docType.isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                        "error", "MISSING_DOCUMENT_TYPE",
                        "message", "Document type (docType) is mandatory. Specify ?docType=PO|ASN|DO|ITEM or provide a filename identifying the document."
                ));
            }

            String explicitFacility = (facilityParam != null && !facilityParam.isBlank()) ? facilityParam.trim()
                    : ((facilityIdParam != null && !facilityIdParam.isBlank()) ? facilityIdParam.trim()
                    : (request != null && request.getHeader("X-Facility-Id") != null ? request.getHeader("X-Facility-Id").trim() : null));

            if (resolvedFilename == null || resolvedFilename.isBlank()) {
                String prefix = (explicitFacility != null && !explicitFacility.isBlank()) ? explicitFacility + "_" : "";
                resolvedFilename = prefix + docType + "_PAYLOAD_" + System.currentTimeMillis() + ".json";
            }

            String authUser = (request != null && request.getAttribute("authenticatedUser") != null)
                    ? (String) request.getAttribute("authenticatedUser")
                    : null;

            log.info("[ERP Ingestion] Accepted from ERP: '{}', Target: '{}', Authenticated As: '{}', Filename: '{}', Size: {} bytes",
                    erpSource, docType, authUser != null ? authUser : "anonymous", resolvedFilename, payload.length);

            // 4. Publish to Kafka & Register in PostgreSQL Tracker
            IngestionAckResponse ack = producerService.publishFile(erpSource, docType, resolvedFilename, payload);

            boolean isOpti = "Opti".equalsIgnoreCase(erpSource) || "OPTI".equalsIgnoreCase(erpSource);

            // 5. Wait for asynchronous Kafka conversion (Opti waits for MAWM cloud dispatch; non-Opti finishes quickly)
            var optTracker = transactionStore.waitForCompletion(ack.getTrackingId(), isOpti ? 4500 : 800);

			// If Kafka consumer took longer or hasn't finished yet, run immediate
			// conversion & dispatch fallback
			if (optTracker.isEmpty() || optTracker.get().getOutputFiles() == null
					|| optTracker.get().getOutputFiles().isBlank()
					|| "PENDING".equalsIgnoreCase(optTracker.get().getDispatchStatus())) {
				try {
					CanonicalEnvelope env = transformer.transform(payload, erpSource, docType, ack.getTrackingId(),
							resolvedFilename);
					if (env.getCreatedBy() == null || env.getCreatedBy().isBlank()) {
						env.setCreatedBy(authUser != null ? authUser : mawmDispatcherService.getMawmProperties().getUsername());
					}
					transactionStore.recordConverted(ack.getTrackingId(), erpSource, docType, resolvedFilename, env);
					if (isOpti) {
						mawmDispatcherService.dispatch(env);
					} else {
						transactionStore.recordMawmStatus(ack.getTrackingId(), "CONVERTED (Opti Exclusive)",
								env.getTotalRecords(), 0,
								"{\"status\":\"CONVERTED\",\"hotDispatch\":false,\"erpSource\":\"" + erpSource
										+ "\",\"message\":\"Payload converted to MAWM Canonical JSON. Hot dispatch is exclusive to Opti.\"}");
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

				// If Kafka finished converting but MAWM dispatch hasn't run yet, dispatch
				// immediately ONLY if Opti
				if (isOpti && tracker.getOutputFiles() != null && !tracker.getOutputFiles().isBlank()
						&& (dispatchStatus == null || (!dispatchStatus.startsWith("DELIVERED")
								&& !dispatchStatus.startsWith("DISPATCH_FAILED")))) {
					try {
						mawmDispatcherService.dispatchJob(ack.getTrackingId());
						tracker = transactionStore.getTracker(ack.getTrackingId()).orElse(tracker);
						dispatchStatus = tracker.getDispatchStatus();
						intakeStatus = tracker.getIntakeStatus();
					} catch (Exception e) {
						log.warn("[Universal Ingestion] Fast dispatch fallback: {}", e.getMessage());
					}
				}

				if (dispatchStatus != null && (dispatchStatus.startsWith("DELIVERED")
						|| dispatchStatus.startsWith("DISPATCH_FAILED") || dispatchStatus.contains("Opti Exclusive"))) {
					Object parsedMawmResp = null;
					if (tracker.getMawmResponse() != null && !tracker.getMawmResponse().isBlank()) {
						try {
							parsedMawmResp = objectMapper.readTree(tracker.getMawmResponse());
						} catch (Exception ignored) {
							parsedMawmResp = tracker.getMawmResponse();
						}
					}
					return ResponseEntity.ok(IngestionAckResponse.builder().trackingId(ack.getTrackingId())
							.erpSource(erpSource).documentType(docType).filename(resolvedFilename)
							.sizeBytes(payload.length).status(intakeStatus != null ? intakeStatus : "CONVERTED")
							.dispatchStatus(dispatchStatus).mawmResponse(parsedMawmResp)
							.message(isOpti ? "File successfully accepted and processed for MAWM Cloud delivery."
									: "File successfully converted to MAWM Canonical JSON (Hot dispatch is exclusive to Opti).")
							.timestamp(ack.getTimestamp()).build());
				}
			}

			return ResponseEntity.status(HttpStatus.ACCEPTED).body(ack);

		} catch (Exception e) {
			log.error("Failed to process universal ingestion for ERP: {}", erpSource, e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
					Map.of("error", "INGESTION_FAILED", "message", "Internal processing error: " + e.getMessage()));
		}
	}

    private String resolveDocType(String requestedDocType, String filename, HttpServletRequest request) {
        // 1. Explicit parameter or header (e.g. docType=DO, type=PO, docType=BATCH)
        if (requestedDocType != null && !requestedDocType.isBlank()) {
            String upper = requestedDocType.trim().toUpperCase();
            if (upper.contains("BATCH")) return "BATCH";
            if (upper.contains("DO") || upper.contains("DISTRIBUTION")) return "DO";
            if (upper.contains("PO") || upper.contains("PURCHASE")) return "PO";
            if (upper.contains("ASN") || upper.contains("SHIP") || upper.contains("DESADV")) return "ASN";
            if (upper.contains("ITEM") || upper.contains("SKU") || upper.contains("PRODUCT")) return "ITEM";
            return upper;
        }

        // 2. URI route context (/do, /distribution, /po, /asn, /items, /batch, /orders)
        if (request != null && request.getRequestURI() != null) {
            String uri = request.getRequestURI().toLowerCase();
            if (uri.contains("/batch")) return "BATCH";
            if (uri.contains("/do") || uri.contains("/distribution")) return "DO";
            if (uri.contains("/po") || uri.contains("/purchase")) return "PO";
            if (uri.contains("/asn") || uri.contains("/deliver")) return "ASN";
            if (uri.contains("/item")) return "ITEM";
        }

        // 3. Filename convention (e.g. DO-2026.json, PO-001.json, ASN-101.json, BATCH-01.json)
        if (filename != null && !filename.isBlank()) {
            String upperFn = filename.toUpperCase();
            if (upperFn.contains("BATCH")) return "BATCH";
            if (upperFn.contains("DO") || upperFn.contains("DISTRIBUTION")) return "DO";
            if (upperFn.contains("PO") || upperFn.contains("PURCHASE")) return "PO";
            if (upperFn.contains("ASN") || upperFn.contains("DESADV") || upperFn.contains("SHIP")) return "ASN";
            if (upperFn.contains("ITEM") || upperFn.contains("SKU")) return "ITEM";
        }

        return null;
    }
}
