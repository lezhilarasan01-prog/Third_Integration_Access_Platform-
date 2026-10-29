package com.platform.erp.validation;

import com.platform.erp.model.hm.HmInboundDeliveryMessage;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmDeliveryLine;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmInboundDelivery;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmPacking;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmPrice;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Enterprise Schema & Business Rule Validator for H&M Inbound Delivery payloads.
 * Strictly enforces all mandatory fields as required by the MAWM ASN LPN-Level specification:
 *
 * 1. Root & Header:
 *    - inboundDelivery (Mandatory container)
 *    - inboundDeliveryNumber (Mandatory -> MAWM AsnId)
 *    - siteID (Mandatory -> MAWM ProductStatusId)
 *
 * 2. Delivery Lines:
 *    - deliveryLine (Mandatory list, min 1 line)
 *    - lineNumber (Mandatory)
 *    - sku (Mandatory -> MAWM ItemId)
 *    - advisedQuantity (Mandatory -> Integer > 0)
 *
 * 3. SKU Attributes & Pricing:
 *    - skuAttributes (Mandatory container for prices)
 *    - prices (Mandatory list, min 1 price entry)
 *    - priceValue (Mandatory -> MAWM RetailPrice, must be valid numeric value)
 *
 * 4. Packing Containers (LPNs):
 *    - packing (Mandatory list, min 1 carton per line)
 *    - huIdentifier (Mandatory -> MAWM LpnId)
 *    - piecesPerCarton (Mandatory -> MAWM ShippedQuantity, Integer > 0)
 *
 * 5. Integrity & Cross-Field Rules:
 *    - sum(piecesPerCarton) == advisedQuantity per line
 */
@Component
public class HmAsnSchemaValidator {

    public ValidationResult validate(HmInboundDeliveryMessage message) {
        List<ValidationError> errors = new ArrayList<>();

        // 1. Root Payload Validation
        if (message == null) {
            errors.add(new ValidationError("root", "H&M inbound message payload is missing or null"));
            return ValidationResult.invalid(errors);
        }

        HmInboundDelivery delivery = message.inboundDelivery();
        if (delivery == null) {
            errors.add(new ValidationError("inboundDelivery", "Mandatory 'inboundDelivery' root object is missing"));
            return ValidationResult.invalid(errors);
        }

        // 2. ASN Header Mandatory Fields (MAWM: AsnId, ProductStatusId)
        if (delivery.inboundDeliveryNumber() == null || delivery.inboundDeliveryNumber().isBlank()) {
            errors.add(new ValidationError(
                    "inboundDelivery.inboundDeliveryNumber",
                    "Mandatory field 'inboundDeliveryNumber' (MAWM AsnId) is missing or blank",
                    null
            ));
        }

        if (delivery.siteID() == null || delivery.siteID().isBlank()) {
            errors.add(new ValidationError(
                    "inboundDelivery.siteID",
                    "Mandatory field 'siteID' (MAWM ProductStatusId) is missing or blank",
                    null
            ));
        }

        // 3. Delivery Lines Array
        List<HmDeliveryLine> lines = delivery.deliveryLine();
        if (lines == null || lines.isEmpty()) {
            errors.add(new ValidationError(
                    "inboundDelivery.deliveryLine",
                    "Mandatory 'deliveryLine' array is missing or empty (at least one line required)",
                    null
            ));
            return ValidationResult.invalid(errors);
        }

        // 4. Validate Each Delivery Line
        for (int i = 0; i < lines.size(); i++) {
            HmDeliveryLine line = lines.get(i);
            String linePrefix = "deliveryLine[" + (line.lineNumber() != null && !line.lineNumber().isBlank() ? line.lineNumber() : i) + "]";

            // Line Number
            if (line.lineNumber() == null || line.lineNumber().isBlank()) {
                errors.add(new ValidationError(linePrefix + ".lineNumber", "Mandatory field 'lineNumber' is missing or blank", null));
            }

            // SKU -> MAWM ItemId
            if (line.sku() == null || line.sku().isBlank()) {
                errors.add(new ValidationError(linePrefix + ".sku", "Mandatory field 'sku' (MAWM ItemId) is missing or blank", null));
            }

            // Advised Quantity
            Integer advised = line.advisedQuantity();
            if (advised == null) {
                errors.add(new ValidationError(linePrefix + ".advisedQuantity", "Mandatory field 'advisedQuantity' is missing", null));
            } else if (advised <= 0) {
                errors.add(new ValidationError(linePrefix + ".advisedQuantity", "Field 'advisedQuantity' must be greater than 0", advised));
            }

            // Price Validation -> MAWM RetailPrice (Mandatory in spec)
            if (line.skuAttributes() == null) {
                errors.add(new ValidationError(linePrefix + ".skuAttributes", "Mandatory object 'skuAttributes' is missing", null));
            } else if (line.skuAttributes().prices() == null || line.skuAttributes().prices().isEmpty()) {
                errors.add(new ValidationError(linePrefix + ".skuAttributes.prices", "Mandatory 'prices' array is missing or empty", null));
            } else {
                boolean hasValidPriceValue = false;
                for (int pIdx = 0; pIdx < line.skuAttributes().prices().size(); pIdx++) {
                    HmPrice price = line.skuAttributes().prices().get(pIdx);
                    if (price != null && price.priceValue() != null) {
                        String priceStr = String.valueOf(price.priceValue()).trim();
                        if (!priceStr.isEmpty() && !"null".equalsIgnoreCase(priceStr)) {
                            try {
                                new BigDecimal(priceStr); // Ensure it is valid numeric
                                hasValidPriceValue = true;
                                break;
                            } catch (NumberFormatException ignored) {}
                        }
                    }
                }
                if (!hasValidPriceValue) {
                    errors.add(new ValidationError(
                            linePrefix + ".skuAttributes.prices.priceValue",
                            "Mandatory field 'priceValue' (MAWM RetailPrice) is missing, null, or not a valid number",
                            null
                    ));
                }
            }

            // Packing Containers -> MAWM Lpn & ShippedQuantity
            List<HmPacking> packings = line.packing();
            if (packings == null || packings.isEmpty()) {
                errors.add(new ValidationError(linePrefix + ".packing", "Mandatory 'packing' array is missing or empty (at least one carton required)", null));
            } else {
                int sumPieces = 0;
                for (int pIdx = 0; pIdx < packings.size(); pIdx++) {
                    HmPacking packing = packings.get(pIdx);
                    String packingPrefix = linePrefix + ".packing[" + pIdx + "]";

                    // Handling Unit ID -> MAWM LpnId
                    if (packing.huIdentifier() == null || packing.huIdentifier().isBlank()) {
                        errors.add(new ValidationError(
                                packingPrefix + ".huIdentifier",
                                "Mandatory field 'huIdentifier' (MAWM LpnId) is missing or blank",
                                null
                        ));
                    }

                    // Pieces Per Carton -> MAWM ShippedQuantity
                    Integer pieces = packing.piecesPerCarton();
                    if (pieces == null) {
                        errors.add(new ValidationError(packingPrefix + ".piecesPerCarton", "Mandatory field 'piecesPerCarton' is missing", null));
                    } else if (pieces <= 0) {
                        errors.add(new ValidationError(packingPrefix + ".piecesPerCarton", "Field 'piecesPerCarton' must be greater than 0", pieces));
                    } else {
                        sumPieces += pieces;
                    }
                }

                // Cross-field Reconciliation: sum(piecesPerCarton) == advisedQuantity
                if (advised != null && advised > 0 && sumPieces != advised) {
                    errors.add(new ValidationError(
                            linePrefix + ".quantityBalance",
                            String.format("Quantity mismatch on line %s (SKU %s): advisedQuantity (%d) does not match total carton pieces (%d)",
                                    line.lineNumber(), line.sku(), advised, sumPieces),
                            sumPieces
                    ));
                }
            }
        }

        return errors.isEmpty() ? ValidationResult.valid() : ValidationResult.invalid(errors);
    }
}