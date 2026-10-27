package com.platform.erp.mawm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.hm.HmInboundDeliveryMessage;
import com.platform.erp.transformer.HmAsnToMawmMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Universal Dynamic MAWM Structure Enforcer.
 * 
 * Guarantees that unmarshaled records from Apache Camel are structured
 * into the universal MAWM container:
 * {
 *   "Data": [ ... ]
 * }
 * 
 * For H&M Inbound Delivery ASN messages, automatically invokes the high-fidelity
 * HmAsnToMawmMapper to produce the LPN-Level canonical MAWM ASN payload.
 */
@Component
public class MawmCanonicalBuilder {

    private static final Logger log = LoggerFactory.getLogger(MawmCanonicalBuilder.class);

    private final HmAsnToMawmMapper hmAsnToMawmMapper;
    private final ObjectMapper objectMapper;

    public MawmCanonicalBuilder() {
        this(new HmAsnToMawmMapper(), new ObjectMapper());
    }

    public MawmCanonicalBuilder(Object ignored) {
        this();
    }

    @Autowired
    public MawmCanonicalBuilder(HmAsnToMawmMapper hmAsnToMawmMapper, ObjectMapper objectMapper) {
        this.hmAsnToMawmMapper = hmAsnToMawmMapper != null ? hmAsnToMawmMapper : new HmAsnToMawmMapper();
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
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

        // Check if incoming payload is an H&M Inbound Delivery message
        if (camelRecords.size() == 1 && camelRecords.get(0).containsKey("inboundDelivery")) {
            Map<String, Object> rootRecord = camelRecords.get(0);
            boolean isHmSource = erpSource != null && (erpSource.equalsIgnoreCase("HM") || erpSource.equalsIgnoreCase("H&M"));
            boolean hasPacking = false;
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> delivery = (Map<String, Object>) rootRecord.get("inboundDelivery");
                if (delivery != null && delivery.get("deliveryLine") instanceof List<?> lines && !lines.isEmpty()) {
                    for (Object lineObj : lines) {
                        if (lineObj instanceof Map<?, ?> lineMap && lineMap.containsKey("packing")) {
                            hasPacking = true;
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {}

            if (isHmSource || hasPacking) {
                try {
                    HmInboundDeliveryMessage message;
                    if (rawPayload != null && rawPayload.length > 0) {
                        message = objectMapper.readValue(rawPayload, HmInboundDeliveryMessage.class);
                    } else {
                        message = objectMapper.convertValue(rootRecord, HmInboundDeliveryMessage.class);
                    }
                    Map<String, Object> mawmMap = hmAsnToMawmMapper.transform(message);
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> data = (List<Map<String, Object>>) mawmMap.get("Data");
                    if (data != null && !data.isEmpty()) {
                        log.info("[MAWM Dynamic Engine] Successfully mapped H&M Inbound Delivery to MAWM LPN-Level schema with {} ASN record(s)", data.size());
                        return data;
                    }
                } catch (Exception e) {
                    log.warn("[MAWM Dynamic Engine] H&M Inbound Delivery mapping failed, falling back to raw records: {}", e.getMessage(), e);
                }
            }
        }

        log.info("[MAWM Dynamic Engine] Wrapped {} dynamic record(s) into universal 'Data' container (ERP: {}, DocType: {})",
                camelRecords.size(), erpSource, docType);
        return new ArrayList<>(camelRecords);
    }
}
