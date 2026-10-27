package com.platform.erp.transformer;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.hm.*;
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

    public HmAsnToMawmMapper() {
        this(new ObjectMapper(), new HmAsnProperties());
    }

    @Autowired
    public HmAsnToMawmMapper(ObjectMapper objectMapper, HmAsnProperties properties) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.properties = properties != null ? properties : new HmAsnProperties();
    }

    /**
     * Entry point for Apache Camel or direct Java calls.
     */
    public Map<String, Object> transform(HmInboundDeliveryMessage message) {
        if (message == null || message.getInboundDelivery() == null) {
            throw new IllegalArgumentException("H&M inbound delivery message payload is missing or invalid");
        }

        HmInboundDelivery delivery = message.getInboundDelivery();
        List<HmDeliveryLine> lines = delivery.getDeliveryLine() != null ? delivery.getDeliveryLine() : Collections.emptyList();

        // 1. Validation: sum(piecesPerCarton) must equal advisedQuantity for every line
        for (HmDeliveryLine line : lines) {
            int advised = line.getAdvisedQuantity() != null ? line.getAdvisedQuantity() : 0;
            int totalPieces = 0;
            if (line.getPacking() != null) {
                for (HmPacking p : line.getPacking()) {
                    if (p.getPiecesPerCarton() != null) {
                        totalPieces += p.getPiecesPerCarton();
                    }
                }
            }
            if (totalPieces != advised) {
                throw new IllegalStateException(String.format(
                        "Line validation failed for line %s (SKU %s): advisedQuantity=%d does not match sum of piecesPerCarton=%d",
                        line.getLineNumber(), line.getSku(), advised, totalPieces));
            }
        }

        String asnId = delivery.getInboundDeliveryNumber();
        String siteId = delivery.getSiteID();

        // 2. Map ASN-level attributes
        Map<String, Object> asnMap = new LinkedHashMap<>();

        // AsnOriginTypeId from config
        String originType = null;
        if (delivery.getInboundDeliveryType() != null && properties.getOriginTypeMap() != null) {
            originType = properties.getOriginTypeMap().get(delivery.getInboundDeliveryType());
        }
        putMandatory(asnMap, "AsnOriginTypeId", originType);

        // BusinessUnitId: schema mandatory, but no mapping from input -> kept as null
        putMandatory(asnMap, "BusinessUnitId", properties.getBusinessUnitId());

        // ASN Level Extended
        Map<String, Object> asnExtended = new LinkedHashMap<>();
        if (delivery.getCustomsClearance() != null) {
            asnExtended.put("DhlCustRef1", String.valueOf(delivery.getCustomsClearance()));
        }
        putOptional(asnExtended, "DhlCustRef2", delivery.getSiteID());
        putOptional(asnExtended, "DhlCustRef3", delivery.getInboundDeliveryType());
        putOptional(asnExtended, "DhlCustRef4", delivery.getActionType());

        if (!asnExtended.isEmpty()) {
            asnMap.put("Extended", asnExtended);
        }

        // 3. Group by packing.huIdentifier
        // Key: huIdentifier -> LpnContext
        Map<String, LpnAccumulator> lpnMap = new LinkedHashMap<>();

        for (HmDeliveryLine line : lines) {
            if (line.getPacking() == null) continue;

            for (HmPacking packing : line.getPacking()) {
                String huId = packing.getHuIdentifier();
                if (huId == null || huId.isBlank()) continue;

                LpnAccumulator acc = lpnMap.computeIfAbsent(huId, id -> new LpnAccumulator(id, packing, line));

                // Create LpnDetail
                Map<String, Object> detail = new LinkedHashMap<>();

                // Retail price: mandatory, null if missing, trailing zero stripped
                String priceStr = null;
                if (line.getSkuAttributes() != null && line.getSkuAttributes().getPrices() != null && !line.getSkuAttributes().getPrices().isEmpty()) {
                    HmPrice price = line.getSkuAttributes().getPrices().get(0);
                    priceStr = formatNumber(price.getPriceValue());
                }
                putMandatory(detail, "RetailPrice", priceStr);

                putOptional(detail, "CountryOfOrigin", line.getCountryOfOrigin());

                // Detail Extended
                Map<String, Object> detailExtended = new LinkedHashMap<>();
                putOptional(detailExtended, "DhlExtAsnLineNbr", line.getLineNumber());
                putOptional(detailExtended, "DhlCustRef1", line.getInShopDate());
                if (line.getSkuAttributes() != null) {
                    putOptional(detailExtended, "DhlCustRef2", line.getSkuAttributes().getBrandName());
                    putOptional(detailExtended, "DhlCustRef3", line.getSkuAttributes().getIndexGroupName());
                    putOptional(detailExtended, "DhlCustRef4", line.getSkuAttributes().getIndexDescription());
                    putOptional(detailExtended, "DhlCustRef5", line.getSkuAttributes().getSubIndexDescription());
                }
                if (!detailExtended.isEmpty()) {
                    detail.put("Extended", detailExtended);
                }

                // QuantityUomId: schema mandatory, kept null if no mapping from input
                putMandatory(detail, "QuantityUomId", properties.getQuantityUomId());
                putOptional(detail, "InventoryTypeId", packing.getPackingMode());
                putOptional(detail, "ItemId", line.getSku());
                putOptional(detail, "InventoryAttribute1", line.getHmOrderNumber());
                detail.put("LpnId", huId);
                putOptional(detail, "ShippedQuantity", formatNumber(packing.getPiecesPerCarton()));
                putOptional(detail, "ProductStatusId", siteId);

                acc.details.add(detail);
            }
        }

        // 4. Sort LPNs ascending by LpnId
        List<LpnAccumulator> sortedLpns = new ArrayList<>(lpnMap.values());
        sortedLpns.sort(Comparator.comparing(LpnAccumulator::getHuId));

        List<Map<String, Object>> lpnList = new ArrayList<>();
        for (LpnAccumulator acc : sortedLpns) {
            Map<String, Object> lpnObj = new LinkedHashMap<>();

            Map<String, Object> actions = new LinkedHashMap<>();
            actions.put("LpnDetail", "RESET");
            lpnObj.put("Actions", actions);

            lpnObj.put("LpnId", acc.huId);

            // LPN Extended
            Map<String, Object> lpnExtended = new LinkedHashMap<>();
            putOptional(lpnExtended, "DhlCustRef1", formatNumber(acc.firstPacking.getLength()));
            putOptional(lpnExtended, "DhlCustRef2", formatNumber(acc.firstPacking.getWidth()));
            putOptional(lpnExtended, "DhlCustRef3", formatNumber(acc.firstPacking.getHeight()));
            putOptional(lpnExtended, "DhlCustRefTtext1", acc.firstLine.getInboundControlCode());

            if (!lpnExtended.isEmpty()) {
                lpnObj.put("Extended", lpnExtended);
            }

            lpnObj.put("LpnDetail", acc.details);
            putOptional(lpnObj, "LpnSizeTypeId", acc.firstPacking.getPackingMaterialNumber());
            lpnObj.put("AsnId", asnId);

            lpnList.add(lpnObj);
        }

        asnMap.put("Lpn", lpnList);
        asnMap.put("AsnId", asnId);
        putMandatory(asnMap, "DestinationFacilityId", properties.getDestinationFacilityId());

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
