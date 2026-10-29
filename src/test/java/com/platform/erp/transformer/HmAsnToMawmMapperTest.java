package com.platform.erp.transformer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.hm.HmAsnProperties;
import com.platform.erp.model.hm.HmInboundDeliveryMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HmAsnToMawmMapperTest {

    private ObjectMapper objectMapper;
    private HmAsnToMawmMapper mapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        HmAsnProperties properties = new HmAsnProperties();
        mapper = new HmAsnToMawmMapper(objectMapper, properties);
    }

    @Test
    @DisplayName("Acceptance Test: Transforms incoming H&M ASN file and validates MAWM LPN-Level structure dynamically")
    void testAcceptanceSampleInputMatchesExpected() throws Exception {
        // 1. Read incoming file from test resources
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            assertNotNull(is, "hm_asn_input.json must exist in test resources");
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // 2. Transform incoming file through mapper
        String actualJson = mapper.transformJson(inputJson);
        assertNotNull(actualJson);

        // 3. Verify output dynamically from incoming file data
        JsonNode tree = objectMapper.readTree(actualJson);
        assertTrue(tree.has("Data"), "Root must contain 'Data' array");
        JsonNode dataArray = tree.path("Data");
        assertEquals(1, dataArray.size());

        JsonNode asnNode = dataArray.get(0);
        assertEquals("1064389422", asnNode.path("AsnId").asText());
        assertTrue(asnNode.has("AsnOriginTypeId") && asnNode.get("AsnOriginTypeId").isNull(), "AsnOriginTypeId must be null");
        assertTrue(asnNode.has("BusinessUnitId") && asnNode.get("BusinessUnitId").isNull(), "BusinessUnitId must be null");
        assertTrue(asnNode.has("DestinationFacilityId") && asnNode.get("DestinationFacilityId").isNull(), "DestinationFacilityId must be null");

        // Extended header attributes
        JsonNode extNode = asnNode.path("Extended");
        assertEquals("false", extNode.path("DhlCustRef1").asText());
        assertEquals("W533", extNode.path("DhlCustRef2").asText());
        assertEquals("InboundSupplier", extNode.path("DhlCustRef3").asText());
        assertEquals("A", extNode.path("DhlCustRef4").asText());

        // LPN cartons - 7 distinct cartons sorted ascending
        JsonNode lpnArray = asnNode.path("Lpn");
        assertEquals(7, lpnArray.size(), "Must produce 7 distinct LPNs from incoming packing HU identifiers");

        // First LPN verification
        JsonNode firstLpn = lpnArray.get(0);
        assertEquals("00173217306660655741", firstLpn.path("LpnId").asText());
        assertEquals("RESET", firstLpn.path("Actions").path("LpnDetail").asText());
        assertEquals("1064389422", firstLpn.path("AsnId").asText());
        assertEquals("A49", firstLpn.path("LpnSizeTypeId").asText());
        assertEquals("58", firstLpn.path("Extended").path("DhlCustRef1").asText());
        assertEquals("40", firstLpn.path("Extended").path("DhlCustRef2").asText());
        assertEquals("40", firstLpn.path("Extended").path("DhlCustRef3").asText());
        assertEquals("WAITING", firstLpn.path("Extended").path("DhlCustRefTtext1").asText());

        // LPN Detail verification
        JsonNode detail = firstLpn.path("LpnDetail").get(0);
        assertEquals("1370811001264A03", detail.path("ItemId").asText());
        assertEquals("29", detail.path("ShippedQuantity").asText());
        assertEquals("999", detail.path("RetailPrice").asText());
        assertTrue(detail.has("QuantityUomId") && detail.get("QuantityUomId").isNull(), "QuantityUomId must be null");
        assertEquals("W533", detail.path("ProductStatusId").asText());
        assertEquals("MA", detail.path("CountryOfOrigin").asText());
    }

    @Test
    @DisplayName("Validation Test: Rejects message when advisedQuantity does not equal sum(piecesPerCarton)")
    void testQuantityMismatchFailsValidation() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // Tamper with advised quantity of first line (52 -> 99) in JSON
        String tamperedJson = inputJson.replaceFirst("\"advisedQuantity\":\\s*52", "\"advisedQuantity\": 99");
        HmInboundDeliveryMessage message = objectMapper.readValue(tamperedJson, HmInboundDeliveryMessage.class);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> mapper.transform(message));
        assertTrue(ex.getMessage().contains("Line validation failed") || ex.getMessage().contains("Quantity mismatch"));
    }

    @Test
    @DisplayName("Optional Field Omission Test: Omits CountryOfOrigin when null")
    void testMissingOptionalInputIsOmitted() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            assertNotNull(is, "hm_asn_input.json must exist in test resources");
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // Remove countryOfOrigin from line 0 in JSON
        String tamperedJson = inputJson.replaceFirst("\"countryOfOrigin\":\\s*\"MA\"", "\"countryOfOrigin\": null");
        HmInboundDeliveryMessage message = objectMapper.readValue(tamperedJson, HmInboundDeliveryMessage.class);

        Map<String, Object> output = mapper.transform(message);
        String json = objectMapper.writeValueAsString(output);
        JsonNode tree = objectMapper.readTree(json);

        // Find LPN for 00173217306660655802 (line 0)
        JsonNode lpnArray = tree.path("Data").get(0).path("Lpn");
        JsonNode targetLpn = null;
        for (JsonNode l : lpnArray) {
            if ("00173217306660655802".equals(l.path("LpnId").asText())) {
                targetLpn = l;
                break;
            }
        }
        assertNotNull(targetLpn);
        JsonNode detail = targetLpn.path("LpnDetail").get(0);

        // CountryOfOrigin should be completely omitted
        assertFalse(detail.has("CountryOfOrigin"), "CountryOfOrigin should be omitted when missing");
        // RetailPrice is present from valid prices
        assertTrue(detail.has("RetailPrice"), "RetailPrice should be present");
        assertEquals("999", detail.path("RetailPrice").asText());
    }
}
