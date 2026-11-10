package com.platform.erp.util;

import java.util.Set;

/**
 * Pure Dynamic Facility Extractor.
 * Dynamically extracts whatever facility identifier the user provides in the filename,
 * while preventing document type names (e.g. ITEM, PO, ASN, DO) and generic keywords from being misidentified as facilities.
 */
public class FacilityExtractor {

    private static final Set<String> NON_FACILITY_TOKENS = Set.of(
            "ITEM", "ITEMS", "PO", "ASN", "DO", "DCORDER", "ORDER", "ORDERS",
            "SHIPMENT", "DELIVERY", "INVENTORY", "PAYLOAD", "DATA", "SAMPLE",
            "CUSTOMER", "ERP", "FILE", "DEFAULT", "UNKNOWN", "TEST", "BATCH", "BATCHES", "BATCHMASTER"
    );

    /**
     * Extracts the facility directly from the user's filename convention (<FACILITY>_<REST>).
     * Examples:
     *   "CHENNAI_ASN_001.csv"  -> "CHENNAI"
     *   "CBE_PO_101.csv"       -> "CBE"
     *   "DALLAS_ORDERS.csv"    -> "DALLAS"
     *   "WH-99_DATA.csv"       -> "WH-99"
     *   "ITEM_PAYLOAD_123.json"-> "DEFAULT" (ITEM is a docType, not a facility)
     */
    public static String extractFacility(String filename) {
        if (filename == null || filename.isBlank()) {
            return "DEFAULT";
        }

        // 1. Strip file extension
        String base = filename.replaceFirst("\\.[^.]+$", "").trim();

        // 2. Extract the facility prefix defined by the user (separated by underscore or hyphen)
        String firstToken = null;
        if (base.contains("_")) {
            firstToken = base.split("_")[0].trim();
        } else if (base.contains("-")) {
            firstToken = base.split("-")[0].trim();
        }

        if (firstToken != null && !firstToken.isBlank()) {
            String upper = firstToken.toUpperCase();
            if (!NON_FACILITY_TOKENS.contains(upper)) {
                return upper;
            }
        }

        return "DEFAULT";
    }
}
