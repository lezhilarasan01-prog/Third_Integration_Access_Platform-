package com.platform.erp.transformer;

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
    private final com.platform.erp.mawm.MawmCanonicalBuilder mawmBuilder;

    public FileToJsonTransformer(CamelTransformationEngine camelEngine) {
        this(camelEngine, new com.platform.erp.mawm.MawmCanonicalBuilder());
    }

    @Autowired
    public FileToJsonTransformer(CamelTransformationEngine camelEngine,
                                 com.platform.erp.mawm.MawmCanonicalBuilder mawmBuilder) {
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

        log.info("[Intake: {}] Camel detected format '{}' for file '{}' (ERP: {}, DocType: {})", 
                trackingId, detectedFormat, filename, erpSource, resolvedDocType);

        // 3. Wrap unmarshaled records directly into CanonicalEnvelope
        CanonicalEnvelope envelope = new CanonicalEnvelope(trackingId, erpSource, resolvedDocType, filename, records.size(),
                Instant.now(), records);
        envelope.setFacilityId(facilityId);
        envelope.setSourceFormat(detectedFormat);

        // 4. Structure into universal MAWM { "Data": [ ... ] } dynamic envelope
        List<Map<String, Object>> mawmData = mawmBuilder.buildMawmData(records, rawPayload, erpSource, resolvedDocType, facilityId);
        envelope.setData(mawmData);

        return envelope;
    }
}
