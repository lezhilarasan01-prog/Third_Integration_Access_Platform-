package com.platform.erp.transformer;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.hm.*;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.*;
import com.platform.erp.validation.HmAsnSchemaValidator;
import com.platform.erp.validation.ValidationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

/**
 * High-fidelity H&M Inbound Delivery to MAWM LPN-Level ASN Mapper.
 *
 * Implements the full business specification:
 * 1. Line validation: sum(piecesPerCarton) == advisedQuantity
 * 2. Grouping by packing.huIdentifier into distinct LPNs
 * 3. Handling mixed cartons across multiple delivery lines
 * 4. Ascending sorting by LpnId
 * 5. String value conversion with trailing-zero stripping for decimals
 * 6. Precise inclusion/omission of mandatory vs optional fields
 */
@Service
public class HmAsnToMawmMapper {

    private static final Logger log = LoggerFactory.getLogger(HmAsnToMawmMapper.class);

    private final ObjectMapper objectMapper;
    private final HmAsnProperties properties;
    private final HmAsnSchemaValidator validator;

    public HmAsnToMawmMapper() {
        this(new ObjectMapper(), new HmAsnProperties(), new HmAsnSchemaValidator());
    }

    public HmAsnToMawmMapper(ObjectMapper objectMapper, HmAsnProperties properties) {
        this(objectMapper, properties, new HmAsnSchemaValidator());
    }

    @Autowired
    public HmAsnToMawmMapper(ObjectMapper objectMapper, HmAsnProperties properties, HmAsnSchemaValidator validator) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.properties = properties != null ? properties : new HmAsnProperties();
        this.validator = validator != null ? validator : new HmAsnSchemaValidator();
    }

    /**
     * Entry point for Apache Camel or direct Java calls.
     */
    public Map<String, Object> transform(HmInboundDeliveryMessage message) {
        // 1. Generic Schema & Business Rule Validation
        ValidationResult validationResult = validator.validate(message);
        if (!validationResult.isValid()) {
            String prefix = (message != null && message.transactionType() != null && !message.transactionType().isBlank())
                    ? message.transactionType() + " schema validation failed: "
                    : "Schema validation failed: ";
            throw new IllegalArgumentException(prefix + validationResult.getFormattedErrors());
        }

        HmInboundDelivery delivery = message.inboundDelivery();
        List<HmDeliveryLine> lines = delivery.deliveryLine() != null ? delivery.deliveryLine() : Collections.emptyList();

        String asnId = delivery.inboundDeliveryNumber();
        String siteId = delivery.siteID();

        // 2. Map ASN-level attributes
        Map<String, Object> asnMap = new LinkedHashMap<>();

        // AsnOriginTypeId from config
        String originType = null;
        if (delivery.inboundDeliveryType() != null && properties.originTypeMap() != null) {
            originType = properties.originTypeMap().get(delivery.inboundDeliveryType());
        }
        putMandatory(asnMap, "AsnOriginTypeId", originType);

        // BusinessUnitId: schema mandatory, but no mapping from input -> kept as null
        putMandatory(asnMap, "BusinessUnitId", properties.businessUnitId());

        // ASN Level Extended
        Map<String, Object> asnExtended = new LinkedHashMap<>();
        if (delivery.customsClearance() != null) {
            asnExtended.put("DhlCustRef1", String.valueOf(delivery.customsClearance()));
        }
        putOptional(asnExtended, "DhlCustRef2", delivery.siteID());
        putOptional(asnExtended, "DhlCustRef3", delivery.inboundDeliveryType());
        putOptional(asnExtended, "DhlCustRef4", delivery.actionType());

        if (!asnExtended.isEmpty()) {
            asnMap.put("Extended", asnExtended);
        }

        // 3. Group by packing.huIdentifier
        // Key: huIdentifier -> LpnContext
        Map<String, LpnAccumulator> lpnMap = new LinkedHashMap<>();

        for (HmDeliveryLine line : lines) {
            if (line.packing() == null) continue;

            for (HmPacking packing : line.packing()) {
                String huId = packing.huIdentifier();
                if (huId == null || huId.isBlank()) continue;

                LpnAccumulator acc = lpnMap.computeIfAbsent(huId, id -> new LpnAccumulator(id, packing, line));

                // Create LpnDetail
                Map<String, Object> detail = new LinkedHashMap<>();

                // Retail price: mandatory, null if missing, trailing zero stripped
                String priceStr = null;
                if (line.skuAttributes() != null && line.skuAttributes().prices() != null && !line.skuAttributes().prices().isEmpty()) {
                    HmPrice price = line.skuAttributes().prices().get(0);
                    priceStr = formatNumber(price.priceValue());
                }
                putMandatory(detail, "RetailPrice", priceStr);

                putOptional(detail, "CountryOfOrigin", line.countryOfOrigin());

                // Detail Extended
                Map<String, Object> detailExtended = new LinkedHashMap<>();
                putOptional(detailExtended, "DhlExtAsnLineNbr", line.lineNumber());
                putOptional(detailExtended, "DhlCustRef1", line.inShopDate());
                if (line.skuAttributes() != null) {
                    putOptional(detailExtended, "DhlCustRef2", line.skuAttributes().brandName());
                    putOptional(detailExtended, "DhlCustRef3", line.skuAttributes().indexGroupName());
                    putOptional(detailExtended, "DhlCustRef4", line.skuAttributes().indexDescription());
                    putOptional(detailExtended, "DhlCustRef5", line.skuAttributes().subIndexDescription());
                }
                if (!detailExtended.isEmpty()) {
                    detail.put("Extended", detailExtended);
                }

                // QuantityUomId: schema mandatory, kept null if no mapping from input
                putMandatory(detail, "QuantityUomId", properties.quantityUomId());
                putOptional(detail, "InventoryTypeId", packing.packingMode());
                putOptional(detail, "ItemId", line.sku());
                putOptional(detail, "InventoryAttribute1", line.hmOrderNumber());
                detail.put("LpnId", huId);
                putOptional(detail, "ShippedQuantity", formatNumber(packing.piecesPerCarton()));
                putOptional(detail, "ProductStatusId", siteId);

                acc.details.add(detail);
            }
        }

        // 4. Sort LPNs ascending by LpnId (null-safe lambda avoids Eclipse null-type-safety method reference warning)
        List<LpnAccumulator> sortedLpns = new ArrayList<>(lpnMap.values());
        sortedLpns.sort(Comparator.comparing(acc -> acc.getHuId() != null ? acc.getHuId() : ""));

        List<Map<String, Object>> lpnList = new ArrayList<>();
        for (LpnAccumulator acc : sortedLpns) {
            Map<String, Object> lpnObj = new LinkedHashMap<>();

            Map<String, Object> actions = new LinkedHashMap<>();
            actions.put("LpnDetail", "RESET");
            lpnObj.put("Actions", actions);

            lpnObj.put("LpnId", acc.huId);

            // LPN Extended
            Map<String, Object> lpnExtended = new LinkedHashMap<>();
            putOptional(lpnExtended, "DhlCustRef1", formatNumber(acc.firstPacking.length()));
            putOptional(lpnExtended, "DhlCustRef2", formatNumber(acc.firstPacking.width()));
            putOptional(lpnExtended, "DhlCustRef3", formatNumber(acc.firstPacking.height()));
            putOptional(lpnExtended, "DhlCustRefTtext1", acc.firstLine.inboundControlCode());

            if (!lpnExtended.isEmpty()) {
                lpnObj.put("Extended", lpnExtended);
            }

            lpnObj.put("LpnDetail", acc.details);
            putOptional(lpnObj, "LpnSizeTypeId", acc.firstPacking.packingMaterialNumber());
            lpnObj.put("AsnId", asnId);

            lpnList.add(lpnObj);
        }

        if (lpnList.isEmpty()) {
            throw new IllegalArgumentException("Schema validation failed: Mandatory container 'Lpn' (LpnId / huIdentifier) is missing or contains no valid cartons");
        }

        asnMap.put("Lpn", lpnList);
        asnMap.put("AsnId", asnId);
        putMandatory(asnMap, "DestinationFacilityId", properties.destinationFacilityId());

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("Data", List.of(asnMap));
        return root;
    }

    /**
     * Converts JSON byte[] or String into HmInboundDeliveryMessage and maps to MAWM JSON string.
     */
    public String transformJson(String jsonInput) throws Exception {
        HmInboundDeliveryMessage message = objectMapper.readValue(jsonInput, HmInboundDeliveryMessage.class);
        Map<String, Object> result = transform(message);
        return objectMapper.writeValueAsString(result);
    }

    public String transformJson(byte[] payloadBytes) throws Exception {
        HmInboundDeliveryMessage message = objectMapper.readValue(payloadBytes, HmInboundDeliveryMessage.class);
        Map<String, Object> result = transform(message);
        return objectMapper.writeValueAsString(result);
    }

    public static String formatNumber(Object val) {
        if (val == null) return null;
        String str = String.valueOf(val).trim();
        if (str.isEmpty()) return null;
        try {
            BigDecimal bd = new BigDecimal(str);
            return bd.stripTrailingZeros().toPlainString();
        } catch (Exception e) {
            return str;
        }
    }

    private static void putMandatory(Map<String, Object> map, String key, Object value) {
        map.put(key, value);
    }

    private static void putOptional(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            String str = String.valueOf(value).trim();
            if (!str.isEmpty() && !"null".equalsIgnoreCase(str)) {
                map.put(key, value);
            }
        }
    }

    private static class LpnAccumulator {
        private final String huId;
        private final HmPacking firstPacking;
        private final HmDeliveryLine firstLine;
        private final List<Map<String, Object>> details = new ArrayList<>();

        public LpnAccumulator(String huId, HmPacking firstPacking, HmDeliveryLine firstLine) {
            this.huId = huId;
            this.firstPacking = firstPacking;
            this.firstLine = firstLine;
        }

        public String getHuId() {
            return huId;
        }
    }
}
