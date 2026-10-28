package com.platform.erp.controller;

import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.model.IngestionAckResponse;
import com.platform.erp.producer.ErpFileProducerService;
import com.platform.erp.transformer.FileToJsonTransformer;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.multipart.MultipartResolver;

import java.io.IOException;
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

    public ErpIngestionController(ErpFileProducerService producerService,
                                  MultipartResolver multipartResolver,
                                  FileToJsonTransformer transformer) {
        this.producerService = producerService;
        this.multipartResolver = multipartResolver;
        this.transformer = transformer;
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
	 * SINGLE UNIVERSAL INGESTION ENDPOINT. Mapped to /{erpSource}/files,
	 * /{erpSource}/ingest, /{erpSource}, and /{erpSource}/raw Consumes ANY
	 * MediaType (consumes = MediaType.ALL_VALUE)
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
			@RequestHeader(value = "X-Filename", required = false) String headerFilename,
			@RequestHeader(value = "X-Document-Type", required = false) String headerDocType,
			@RequestHeader(value = "X-Kafka-Topic", required = false) String headerTopic,
			@RequestHeader(value = "Content-Disposition", required = false) String contentDisposition,
			HttpServletRequest request) {

		// 0. Enforce Mandatory ERP Source Validation
		String erpSource = (erpSourceParam != null && !erpSourceParam.isBlank())
				? erpSourceParam.trim()
				: (erpSourceHeader != null && !erpSourceHeader.isBlank())
				? erpSourceHeader.trim()
				: erpSourcePath;

		// Guard: Reject if erpSource is missing or accidentally captured route keywords like "files", "ingest", or "raw"
		if (erpSource == null || erpSource.isBlank()
				|| "files".equalsIgnoreCase(erpSource)
				|| "ingest".equalsIgnoreCase(erpSource)
				|| "raw".equalsIgnoreCase(erpSource)) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
					"error", "MISSING_HOST_SOURCE",
					"message", "Host Source is mandatory. Please specify a valid host source system"
			));
		}
		erpSource = erpSource.trim().toUpperCase();

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

			// 2. If not multipart or multipart had no files, read raw bytes from
			// InputStream
			if (payload == null || payload.length == 0) {
				payload = request.getInputStream().readAllBytes();
			}

			// 3. Validate non-empty payload
			if (payload == null || payload.length == 0) {
				return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "EMPTY_PAYLOAD", "message",
						"Payload cannot be empty. Please provide a file via multipart form-data or raw request body."));
			}

			// 4. Resolve Filename (Priority: Query Param > X-Filename Header >
			// Content-Disposition > Multipart > Auto-detected)
			if (queryFilename != null && !queryFilename.isBlank()) {
				resolvedFilename = queryFilename.trim();
			} else if (headerFilename != null && !headerFilename.isBlank()) {
				resolvedFilename = headerFilename.trim();
			} else if (resolvedFilename == null || resolvedFilename.isBlank()) {
				resolvedFilename = extractFilenameFromContentDisposition(contentDisposition);
			}

			if (resolvedFilename == null || resolvedFilename.isBlank()) {
				resolvedFilename = autoDetectFilename(erpSource);
			}

			// 5. Dynamic Document Type Resolution (Supports ANY document type: PO, ASN,
			// INVOICE, ORDERS, etc.)
			String requestedDocType = (docTypeParam != null && !docTypeParam.isBlank()) ? docTypeParam
					: (typeParam != null && !typeParam.isBlank()) ? typeParam : headerDocType;

			String docType;
			if (requestedDocType != null && !requestedDocType.isBlank()) {
				docType = requestedDocType.trim().toUpperCase();
			} else if (resolvedFilename != null && !resolvedFilename.isBlank()) {
				String upper = resolvedFilename.toUpperCase();
				if (upper.contains("ASN") || upper.contains("DESADV") || upper.contains("SHIP")) {
					docType = "ASN";
				} else if (upper.contains("PO") || upper.contains("ORDER") || upper.contains("PURCHASE")) {
					docType = "PO";
				} else if (upper.contains("INV") || upper.contains("INVOICE")) {
					docType = "INVOICE";
				} else {
					docType = "UNKNOWN";
				}
			} else {
				docType = "UNKNOWN";
			}

			String destination = (customTopic != null && !customTopic.isBlank()) ? customTopic.trim()
					: ((headerTopic != null && !headerTopic.isBlank()) ? headerTopic.trim() : docType);

			// Guard: Prevent unclassified/unknown documents from polluting Kafka
			if ("UNKNOWN".equalsIgnoreCase(destination)) {
				log.warn("[Universal Ingestion] Rejected file '{}' from ERP '{}': Unknown document type",
						resolvedFilename, erpSource);
				return ResponseEntity.status(HttpStatus.BAD_REQUEST)
						.body(Map.of("error", "UNKNOWN_DOCUMENT_TYPE", "message",
								"Unable to detect document type from filename '" + resolvedFilename
										+ "'. Please specify 'docType' query parameter or header."));
			}

			log.info("[Universal Ingestion] Accepted from ERP: '{}', Target: '{}', Filename: '{}', Size: {} bytes",
					erpSource, destination, resolvedFilename, payload.length);

			// 6. Publish to Kafka (any arbitrary topic supported) & Register in PostgreSQL
			// Tracker
			IngestionAckResponse ack = producerService.publishFile(erpSource, destination, resolvedFilename, payload);
			return ResponseEntity.status(HttpStatus.ACCEPTED).body(ack);

		} catch (Exception e) {
			log.error("Failed to process universal ingestion for ERP: {}", erpSource, e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
					Map.of("error", "INGESTION_FAILED", "message", "Internal processing error: " + e.getMessage()));
		}
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

    private String autoDetectFilename(String erpSource) {
        return erpSource.toLowerCase() + "_feed_" + System.currentTimeMillis() + ".dat";
    }
}
