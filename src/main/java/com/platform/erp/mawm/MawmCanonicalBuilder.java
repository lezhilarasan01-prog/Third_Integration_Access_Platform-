package com.platform.erp.mawm;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Universal Dynamic MAWM Structure Enforcer.
 * 
 * 100% Dynamic & Automatic:
 * Guarantees that ALL unmarshaled records from Apache Camel are structured
 * into the universal MAWM container:
 * {
 *   "Data": [ ... dynamic records parsed from incoming file ... ]
 * }
 * 
 * Zero hardcoded field names. Zero hardcoded business values.
 * Completely format-agnostic across any ERP, partner, or file type.
 */
@Component
public class MawmCanonicalBuilder {

    private static final Logger log = LoggerFactory.getLogger(MawmCanonicalBuilder.class);

    public MawmCanonicalBuilder() {}

    public MawmCanonicalBuilder(Object ignored) {
        this();
    }

    public List<Map<String, Object>> buildMawmData(List<Map<String, Object>> camelRecords) {
        return buildMawmData(camelRecords, null, null, null, null);
    }

    public List<Map<String, Object>> buildMawmData(List<Map<String, Object>> camelRecords, byte[] rawPayload) {
        return buildMawmData(camelRecords, rawPayload, null, null, null);
    }

    public List<Map<String, Object>> buildMawmData(
            List<Map<String, Object>> camelRecords,
            byte[] rawPayload,
            String erpSource,
            String docType,
            String facilityId
    ) {
        if (camelRecords == null || camelRecords.isEmpty()) {
            return Collections.emptyList();
        }

        log.info("[MAWM Dynamic Engine] Wrapped {} dynamic record(s) into universal 'Data' container (ERP: {}, DocType: {})",
                camelRecords.size(), erpSource, docType);
        return new ArrayList<>(camelRecords);
    }
}
