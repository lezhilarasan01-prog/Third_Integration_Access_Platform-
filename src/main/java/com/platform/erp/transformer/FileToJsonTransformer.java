package com.platform.erp.transformer;

import com.platform.erp.mawm.MawmCanonicalBuilder;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.transformer.CamelTransformationEngine.TransformationResult;
import com.platform.erp.util.FacilityExtractor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Enterprise File to Canonical JSON Transformer.
 * Uses Apache Camel engine to parse Excel, CSV, XML, EDI, and JSON formats into uniform CanonicalEnvelopes.
 */
@Service
public class FileToJsonTransformer {

    private static final Logger log = LoggerFactory.getLogger(FileToJsonTransformer.class);

    private final CamelTransformationEngine camelEngine;
    private final MawmCanonicalBuilder mawmBuilder;

    public FileToJsonTransformer(CamelTransformationEngine camelEngine) {
        this(camelEngine, new MawmCanonicalBuilder());
    }

    @Autowired
    public FileToJsonTransformer(CamelTransformationEngine camelEngine, MawmCanonicalBuilder mawmBuilder) {
        this.camelEngine = camelEngine;
        this.mawmBuilder = mawmBuilder;
    }

    public CanonicalEnvelope transform(byte[] rawPayload, String erpSource, String docType, String trackingId, String filename) {
        if (rawPayload == null || rawPayload.length == 0) {
            throw new IllegalArgumentException("Payload is empty for trackingId: " + trackingId);
        }

        String resolvedDocType = (docType != null && !docType.isBlank()) ? docType.trim().toUpperCase() : "PO";
        String facilityId = FacilityExtractor.extractFacility(filename);

        // 1. Pure Apache Camel Intake: Camel automatically detects format, routes, and unmarshals dynamically
        TransformationResult result = camelEngine.unmarshalAuto(rawPayload, filename);
        List<Map<String, Object>> records = result.records();
        String detectedFormat = result.detectedFormat();

        // 2. Extract DestinationFacilityId and CreatedBy from unmarshaled records or raw JSON
        String payloadDestinationFacility = null;
        String payloadCreatedBy = null;

        if (records != null && !records.isEmpty()) {
            for (Map<String, Object> r : records) {
                if (payloadDestinationFacility == null) {
                    if (r.get("DestinationFacilityId") != null && !String.valueOf(r.get("DestinationFacilityId")).isBlank()) {
                        payloadDestinationFacility = String.valueOf(r.get("DestinationFacilityId")).trim();
                    } else if (r.get("destinationFacilityId") != null && !String.valueOf(r.get("destinationFacilityId")).isBlank()) {
                        payloadDestinationFacility = String.valueOf(r.get("destinationFacilityId")).trim();
                    }
                }
                if (payloadCreatedBy == null) {
                    if (r.get("CreatedBy") != null && !String.valueOf(r.get("CreatedBy")).isBlank()) {
                        payloadCreatedBy = String.valueOf(r.get("CreatedBy")).trim();
                    } else if (r.get("createdBy") != null && !String.valueOf(r.get("createdBy")).isBlank()) {
                        payloadCreatedBy = String.valueOf(r.get("createdBy")).trim();
                    }
                }
                if (payloadDestinationFacility != null && payloadCreatedBy != null) break;
            }
        }

        if ((payloadDestinationFacility == null || payloadCreatedBy == null) && rawPayload != null && rawPayload.length > 0) {
            try {
                String str = new String(rawPayload, java.nio.charset.StandardCharsets.UTF_8);
                if (str.trim().startsWith("{") || str.trim().startsWith("[")) {
                    com.fasterxml.jackson.databind.JsonNode rootNode = new com.fasterxml.jackson.databind.ObjectMapper().readTree(rawPayload);
                    if (payloadDestinationFacility == null) {
                        if (rootNode.has("DestinationFacilityId")) payloadDestinationFacility = rootNode.get("DestinationFacilityId").asText();
                        else if (rootNode.has("destinationFacilityId")) payloadDestinationFacility = rootNode.get("destinationFacilityId").asText();
                    }
                    if (payloadCreatedBy == null) {
                        if (rootNode.has("CreatedBy")) payloadCreatedBy = rootNode.get("CreatedBy").asText();
                        else if (rootNode.has("createdBy")) payloadCreatedBy = rootNode.get("createdBy").asText();
                    }
                }
            } catch (Exception ignored) {}
        }

        if (payloadDestinationFacility != null && !payloadDestinationFacility.isBlank()) {
            facilityId = payloadDestinationFacility;
        } else if ("DEFAULT".equalsIgnoreCase(facilityId) || "UNKNOWN".equalsIgnoreCase(facilityId)) {
            facilityId = "Food_Cbe";
        }

        log.info("[Intake: {}] Camel detected format '{}' for file '{}' (ERP: {}, DocType: {}, Facility: {}, CreatedBy: {})", 
                trackingId, detectedFormat, filename, erpSource, resolvedDocType, facilityId, payloadCreatedBy);

        // 3. Wrap unmarshaled records directly into CanonicalEnvelope
        CanonicalEnvelope envelope = new CanonicalEnvelope(trackingId, erpSource, resolvedDocType, filename, records.size(),
                Instant.now(), records);
        envelope.setFacilityId(facilityId);
        envelope.setSourceFormat(detectedFormat);
        if (payloadCreatedBy != null && !payloadCreatedBy.isBlank()) {
            envelope.setCreatedBy(payloadCreatedBy);
        }

        // 4. Structure into universal MAWM { "Data": [ ... ] } dynamic envelope
        List<Map<String, Object>> mawmData = mawmBuilder.buildMawmData(records, rawPayload, erpSource, resolvedDocType, facilityId);
        envelope.setData(mawmData);

        return envelope;
    }
}
