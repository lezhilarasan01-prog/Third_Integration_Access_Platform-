package com.platform.erp.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FacilityExtractorTest {

    @Test
    void testExtractFacilityFromVariousFilenameConventions() {
        // Standard user-defined: <FACILITY>_<ANYTHING>
        assertEquals("CHENNAI", FacilityExtractor.extractFacility("CHENNAI_ASN_001.csv"));
        assertEquals("CBE", FacilityExtractor.extractFacility("CBE_PO_101.csv"));
        assertEquals("BLR", FacilityExtractor.extractFacility("BLR_SHIPMENT_20261019.csv"));
        assertEquals("DALLAS", FacilityExtractor.extractFacility("DALLAS_ORDERS.csv"));
        assertEquals("WH-99", FacilityExtractor.extractFacility("WH-99_INVENTORY.csv"));
        assertEquals("FRANKFURT", FacilityExtractor.extractFacility("FRANKFURT_ITEMS.xml"));

        // Fallbacks and non-facility prefixes
        assertEquals("DEFAULT", FacilityExtractor.extractFacility(null));
        assertEquals("DEFAULT", FacilityExtractor.extractFacility(""));
        assertEquals("DEFAULT", FacilityExtractor.extractFacility("ITEM_PAYLOAD_1794286960324.json"));
        assertEquals("DEFAULT", FacilityExtractor.extractFacility("PO_PAYLOAD_101.json"));
        assertEquals("DEFAULT", FacilityExtractor.extractFacility("ASN_PAYLOAD_202.json"));
        assertEquals("DEFAULT", FacilityExtractor.extractFacility("DO_PAYLOAD_303.json"));
        assertEquals("DEFAULT", FacilityExtractor.extractFacility("BATCH_PAYLOAD_404.json"));
    }
}
