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
    @DisplayName("Acceptance Test: Feeds sample H&M ASN input and matches exact expected MAWM JSON")
    void testAcceptanceSampleInputMatchesExpected() throws Exception {
        // 1. Read input and expected JSON files from test resources
        String inputJson;
        String expectedJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            assertNotNull(is, "hm_asn_input.json must exist in test resources");
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_expected.json")) {
            assertNotNull(is, "hm_asn_expected.json must exist in test resources");
            expectedJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // 2. Transform through mapper
        String actualJson = mapper.transformJson(inputJson);
        assertNotNull(actualJson);

        // 3. Compare as JSON Trees (key order independent, values and nulls strictly compared)
        JsonNode actualTree = objectMapper.readTree(actualJson);
        JsonNode expectedTree = objectMapper.readTree(expectedJson);

        assertEquals(expectedTree, actualTree, "Mapped MAWM LPN-Level JSON must match expected output tree");
    }

    @Test
    @DisplayName("Validation Test: Rejects message when advisedQuantity does not equal sum(piecesPerCarton)")
    void testQuantityMismatchFailsValidation() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        HmInboundDeliveryMessage message = objectMapper.readValue(inputJson, HmInboundDeliveryMessage.class);
        // Tamper with advised quantity of first line (52 -> 99)
        message.getInboundDelivery().getDeliveryLine().get(0).setAdvisedQuantity(99);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> mapper.transform(message));
        assertTrue(ex.getMessage().contains("Line validation failed"));
    }

    @Test
    @DisplayName("Optional Field Omission Test: Omits CountryOfOrigin when null but RetailPrice stays present as null")
    void testMissingOptionalInputIsOmittedButMandatoryStaysNull() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        HmInboundDeliveryMessage message = objectMapper.readValue(inputJson, HmInboundDeliveryMessage.class);
        // Remove countryOfOrigin and prices from line 0
        message.getInboundDelivery().getDeliveryLine().get(0).setCountryOfOrigin(null);
        message.getInboundDelivery().getDeliveryLine().get(0).getSkuAttributes().setPrices(null);

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
        // RetailPrice is mandatory so should be explicitly null
        assertTrue(detail.has("RetailPrice"), "RetailPrice should be present");
        assertTrue(detail.get("RetailPrice").isNull(), "RetailPrice should be null");
    }
}
