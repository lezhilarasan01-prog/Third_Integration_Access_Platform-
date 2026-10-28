package com.platform.erp.validation;

import com.platform.erp.model.hm.HmInboundDeliveryMessage;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmDeliveryLine;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmInboundDelivery;
import com.platform.erp.model.hm.HmInboundDeliveryMessage.HmPacking;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Generic Schema & Business Rule Validator for H&M Inbound Delivery ASN payloads.
 *
 * Validates:
 * 1. Root structure and mandatory header fields (inboundDeliveryNumber, siteID).
 * 2. Delivery lines completeness (lineNumber, sku, advisedQuantity > 0).
 * 3. Packing details completeness (huIdentifier, piecesPerCarton > 0).
 * 4. Quantity reconciliation: sum(piecesPerCarton) == advisedQuantity per line.
 */
@Component
public class HmAsnSchemaValidator {

    public ValidationResult validate(HmInboundDeliveryMessage message) {
        List<ValidationError> errors = new ArrayList<>();

        if (message == null) {
            errors.add(new ValidationError("root", "H&M message payload is null"));
            return ValidationResult.invalid(errors);
        }

        HmInboundDelivery delivery = message.inboundDelivery();
        if (delivery == null) {
            errors.add(new ValidationError("inboundDelivery", "Root inboundDelivery object is mandatory"));
            return ValidationResult.invalid(errors);
        }

        // 1. Header validations
        if (delivery.inboundDeliveryNumber() == null || delivery.inboundDeliveryNumber().isBlank()) {
            errors.add(new ValidationError("inboundDelivery.inboundDeliveryNumber", "Inbound delivery number is mandatory", null));
        }

        if (delivery.siteID() == null || delivery.siteID().isBlank()) {
            errors.add(new ValidationError("inboundDelivery.siteID", "Site ID (facility) is mandatory", null));
        }

        // 2. Lines validation
        List<HmDeliveryLine> lines = delivery.deliveryLine();
        if (lines == null || lines.isEmpty()) {
            errors.add(new ValidationError("inboundDelivery.deliveryLine", "At least one deliveryLine is required", null));
            return ValidationResult.invalid(errors);
        }

        for (int i = 0; i < lines.size(); i++) {
            HmDeliveryLine line = lines.get(i);
            String linePrefix = "deliveryLine[" + (line.lineNumber() != null ? line.lineNumber() : i) + "]";

            if (line.lineNumber() == null || line.lineNumber().isBlank()) {
                errors.add(new ValidationError(linePrefix + ".lineNumber", "Line number is mandatory", null));
            }

            if (line.sku() == null || line.sku().isBlank()) {
                errors.add(new ValidationError(linePrefix + ".sku", "Item SKU is mandatory", null));
            }

            Integer advised = line.advisedQuantity();
            if (advised == null || advised <= 0) {
                errors.add(new ValidationError(linePrefix + ".advisedQuantity", "Advised quantity must be greater than 0", advised));
            }

            // 3. Packing cartons validation
            List<HmPacking> packings = line.packing();
            if (packings == null || packings.isEmpty()) {
                errors.add(new ValidationError(linePrefix + ".packing", "At least one packing carton is required", null));
            } else {
                int sumPieces = 0;
                for (int pIdx = 0; pIdx < packings.size(); pIdx++) {
                    HmPacking packing = packings.get(pIdx);
                    String packingPrefix = linePrefix + ".packing[" + pIdx + "]";

                    if (packing.huIdentifier() == null || packing.huIdentifier().isBlank()) {
                        errors.add(new ValidationError(packingPrefix + ".huIdentifier", "Handling Unit ID (huIdentifier / LPN) is mandatory", null));
                    }

                    if (packing.piecesPerCarton() == null || packing.piecesPerCarton() <= 0) {
                        errors.add(new ValidationError(packingPrefix + ".piecesPerCarton", "Pieces per carton must be greater than 0", packing.piecesPerCarton()));
                    } else {
                        sumPieces += packing.piecesPerCarton();
                    }
                }

                // 4. Cross-field rule: sum(piecesPerCarton) must match advisedQuantity
                if (advised != null && advised > 0 && sumPieces != advised) {
                    errors.add(new ValidationError(
                            linePrefix + ".quantityBalance",
                            String.format("Line validation failed for line %s (SKU %s): advisedQuantity=%d does not match sum of piecesPerCarton=%d",
                                    line.lineNumber(), line.sku(), advised, sumPieces),
                            sumPieces
                    ));
                }
            }
        }

        return errors.isEmpty() ? ValidationResult.valid() : ValidationResult.invalid(errors);
    }
}
