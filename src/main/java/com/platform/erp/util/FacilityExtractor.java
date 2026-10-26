package com.platform.erp.util;

/**
 * Pure Dynamic Facility Extractor.
 * Zero hardcoded facility names or city lists.
 * Dynamically extracts whatever facility identifier the user provides in the filename.
 */
public class FacilityExtractor {

    /**
     * Extracts the facility directly from the user's filename convention (<FACILITY>_<REST>).
     * Examples:
     *   "CHENNAI_ASN_001.csv"  -> "CHENNAI"
     *   "CBE_PO_101.csv"       -> "CBE"
     *   "DALLAS_ORDERS.csv"    -> "DALLAS"
     *   "WH-99_DATA.csv"       -> "WH-99"
     */
    public static String extractFacility(String filename) {
        if (filename == null || filename.isBlank()) {
            return "DEFAULT";
        }

        // 1. Strip file extension
        String base = filename.replaceFirst("\\.[^.]+$", "").trim();

        // 2. Extract the facility prefix defined by the user (separated by underscore or hyphen)
        if (base.contains("_")) {
            String firstToken = base.split("_")[0].trim();
            if (!firstToken.isEmpty()) {
                return firstToken.toUpperCase();
            }
        } else if (base.contains("-")) {
            String firstToken = base.split("-")[0].trim();
            if (!firstToken.isEmpty()) {
                return firstToken.toUpperCase();
            }
        }

        return base.toUpperCase();
    }
}
