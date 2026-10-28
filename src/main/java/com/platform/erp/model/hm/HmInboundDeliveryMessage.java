package com.platform.erp.model.hm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Idiomatic Java 21 Record representing the H&M Inbound Delivery JSON message.
 * Completely eliminates boilerplate getters and setters.
 */

@JsonIgnoreProperties(ignoreUnknown = true)
public record HmInboundDeliveryMessage(
        String transactionType,
        String version,
        String uniqueTransactionId,
        String transactionDateTime,
        String warehouseId,
        HmInboundDelivery inboundDelivery
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HmInboundDelivery(
            String actionType,
            String inboundDeliveryNumber,
            String inboundDeliveryType,
            String siteID,
            Boolean customsClearance,
            List<HmDeliveryLine> deliveryLine
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HmDeliveryLine(
            String lineNumber,
            Integer advisedQuantity,
            String hmOrderNumber,
            String countryOfOrigin,
            String inShopDate,
            String inboundControlCode,
            String sku,
            HmSkuAttributes skuAttributes,
            List<HmPacking> packing
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HmPacking(
            String packingMaterialNumber,
            Object length,
            Object width,
            Object height,
            Integer piecesPerCarton,
            String huIdentifier,
            String packingMode
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HmSkuAttributes(
            String articleTypeCode,
            String corporateBrandID,
            String brandName,
            String productName,
            String productTypeName,
            String colourDescription,
            String sizeName,
            String variantDescription,
            String indexGroupCode,
            String indexGroupName,
            String indexCode,
            String indexDescription,
            String subIndexCode,
            String subIndexDescription,
            List<HmPrice> prices
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HmPrice(
            String channelName,
            Object priceValue,
            String currencyISOCode
    ) {}
}
