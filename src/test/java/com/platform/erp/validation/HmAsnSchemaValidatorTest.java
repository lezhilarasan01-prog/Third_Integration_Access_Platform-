package com.platform.erp.validation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.hm.HmInboundDeliveryMessage;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmDeliveryLine;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmInboundDelivery;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmPacking;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HmAsnSchemaValidatorTest {

    private HmAsnSchemaValidator validator;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        validator = new HmAsnSchemaValidator();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Valid Payload: Standard sample passes schema validation cleanly")
    void testValidSamplePassesValidation() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            assertNotNull(is, "hm_asn_input.json must exist in test resources");
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        HmInboundDeliveryMessage message = objectMapper.readValue(inputJson, HmInboundDeliveryMessage.class);
        ValidationResult result = validator.validate(message);

        assertTrue(result.isValid(), "Sample payload should be valid");
        assertTrue(result.errors().isEmpty());
    }

    @Test
    @DisplayName("Null / Empty Payload: Reports root error")
    void testNullPayloadReportsError() {
        ValidationResult result = validator.validate(null);
        assertFalse(result.isValid());
        assertEquals(1, result.errors().size());
        assertEquals("root", result.errors().get(0).field());
    }

    @Test
    @DisplayName("Missing Header Fields: Reports deliveryNumber and siteID errors")
    void testMissingHeaderFields() {
        HmInboundDelivery delivery = new HmInboundDelivery("A", null, "Type", "", true, List.of());
        HmInboundDeliveryMessage msg = new HmInboundDeliveryMessage("ASN", "1.0", "TX-1", "2026-01-01", "W1", delivery);

        ValidationResult result = validator.validate(msg);
        assertFalse(result.isValid());
        assertTrue(result.errors().stream().anyMatch(e -> e.field().contains("inboundDeliveryNumber")));
        assertTrue(result.errors().stream().anyMatch(e -> e.field().contains("siteID")));
        assertTrue(result.errors().stream().anyMatch(e -> e.field().contains("deliveryLine")));
    }

    @Test
    @DisplayName("Quantity Mismatch: Captures line advised quantity vs carton sum mismatch")
    void testQuantityMismatch() {
        HmPacking packing = new HmPacking("MAT-1", 10, 10, 10, 20, "HU001", "BOX");
        HmDeliveryLine line = new HmDeliveryLine("1", 50, "PO100", "US", "2026-01-01", "WAIT", "SKU123", null, List.of(packing));
        HmInboundDelivery delivery = new HmInboundDelivery("A", "ASN100", "Type", "SITE1", true, List.of(line));
        HmInboundDeliveryMessage msg = new HmInboundDeliveryMessage("ASN", "1.0", "TX-1", "2026-01-01", "W1", delivery);

        ValidationResult result = validator.validate(msg);
        assertFalse(result.isValid());
        assertTrue(result.errors().stream().anyMatch(e -> e.field().contains("quantityBalance")));
        assertTrue(result.getFormattedErrors().contains("advisedQuantity (50)"));
    }

    @Test
    @DisplayName("Multi-Error Accumulation: Collects all errors across lines at once instead of failing fast")
    void testCollectsMultipleErrors() {
        HmPacking badPacking = new HmPacking("MAT-1", 10, 10, 10, 0, "", "BOX");
        HmDeliveryLine badLine = new HmDeliveryLine("", 0, "PO100", "US", "2026-01-01", "WAIT", "", null, List.of(badPacking));
        HmInboundDelivery delivery = new HmInboundDelivery("A", "", "Type", "", true, List.of(badLine));
        HmInboundDeliveryMessage msg = new HmInboundDeliveryMessage("ASN", "1.0", "TX-1", "2026-01-01", "W1", delivery);

        ValidationResult result = validator.validate(msg);
        assertFalse(result.isValid());
        // Must contain header errors, line errors, and packing errors simultaneously
        assertTrue(result.errors().size() >= 5, "Should aggregate multiple validation violations");
    }

    @Test
    @DisplayName("Mandatory Transaction Type: Rejects payload when transactionType is missing, null, or blank")
    void testMissingTransactionTypeFailsValidation() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            assertNotNull(is, "hm_asn_input.json must exist in test resources");
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // Replace "transactionType": "I1116" with "": "I1116" as tested by user
        String tamperedJson = inputJson.replaceFirst("\"transactionType\":\\s*\"I1116\"", "\"\": \"I1116\"");
        HmInboundDeliveryMessage message = objectMapper.readValue(tamperedJson, HmInboundDeliveryMessage.class);

        ValidationResult result = validator.validate(message);
        assertFalse(result.isValid(), "Validation must fail when transactionType is missing");
        assertTrue(result.errors().stream().anyMatch(e -> e.field().equals("transactionType")),
                "Errors must contain 'transactionType'");
        assertTrue(result.getFormattedErrors().contains("transactionType"),
                "Formatted errors must include 'transactionType'");
    }

    @Test
    @DisplayName("Mandatory Price Validation: Rejects payload when priceValue is missing or misspelled as 'abc'")
    void testMissingOrMisspelledPriceFailsValidation() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            assertNotNull(is, "hm_asn_input.json must exist in test resources");
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // Replace "priceValue" with "abc"
        String tamperedJson = inputJson.replaceFirst("\"priceValue\":\\s*999\\.0", "\"abc\": 999.0");
        HmInboundDeliveryMessage message = objectMapper.readValue(tamperedJson, HmInboundDeliveryMessage.class);

        ValidationResult result = validator.validate(message);
        assertFalse(result.isValid(), "Validation must fail when priceValue is misspelled or missing");
        assertTrue(result.getFormattedErrors().contains("priceValue"), "Error message must report missing priceValue");
    }

    @Test
    @DisplayName("Mandatory huIdentifier / LpnId Validation: Rejects payload when huIdentifier is missing or removed")
    void testMissingHuIdentifierFailsValidation() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            assertNotNull(is, "hm_asn_input.json must exist in test resources");
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // Replace "huIdentifier": "00173217306660655802" with "": "00173217306660655802" as tested by user
        String tamperedJson = inputJson.replace("\"huIdentifier\"", "\"\"");
        HmInboundDeliveryMessage message = objectMapper.readValue(tamperedJson, HmInboundDeliveryMessage.class);

        ValidationResult result = validator.validate(message);
        assertFalse(result.isValid(), "Validation must fail when huIdentifier is removed");
        assertTrue(result.getFormattedErrors().contains("huIdentifier"), "Error message must report missing huIdentifier");
    }

    @Test
    @DisplayName("LpnId Alias Support: Accepts 'LpnId' or 'lpnId' as valid alias for huIdentifier")
    void testLpnIdAliasPassesValidation() throws Exception {
        String inputJson;
        try (InputStream is = getClass().getResourceAsStream("/hm_asn_input.json")) {
            assertNotNull(is, "hm_asn_input.json must exist in test resources");
            inputJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // Replace "huIdentifier" with "LpnId"
        String aliasJson = inputJson.replace("\"huIdentifier\"", "\"LpnId\"");
        HmInboundDeliveryMessage message = objectMapper.readValue(aliasJson, HmInboundDeliveryMessage.class);

        ValidationResult result = validator.validate(message);
        assertTrue(result.isValid(), "Validation must pass when LpnId alias is used for huIdentifier");
    }
}

