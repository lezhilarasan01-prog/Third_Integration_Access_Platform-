package com.platform.erp.model.hm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Modern Java 21 Record representing the H&M Inbound Delivery JSON message.
 * Encapsulates all nested delivery structures in a single concise file.
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
    public String getTransactionType() { return transactionType(); }
    public String getVersion() { return version(); }
    public String getUniqueTransactionId() { return uniqueTransactionId(); }
    public String getTransactionDateTime() { return transactionDateTime(); }
    public String getWarehouseId() { return warehouseId(); }
    public HmInboundDelivery getInboundDelivery() { return inboundDelivery(); }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HmInboundDelivery(
            String actionType,
            String inboundDeliveryNumber,
            String inboundDeliveryType,
            String siteID,
            Boolean customsClearance,
            List<HmDeliveryLine> deliveryLine
    ) {
        public String getActionType() { return actionType(); }
        public String getInboundDeliveryNumber() { return inboundDeliveryNumber(); }
        public String getInboundDeliveryType() { return inboundDeliveryType(); }
        public String getSiteID() { return siteID(); }
        public Boolean getCustomsClearance() { return customsClearance(); }
        public List<HmDeliveryLine> getDeliveryLine() { return deliveryLine(); }
    }

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
    ) {
        public String getLineNumber() { return lineNumber(); }
        public Integer getAdvisedQuantity() { return advisedQuantity(); }
        public String getHmOrderNumber() { return hmOrderNumber(); }
        public String getCountryOfOrigin() { return countryOfOrigin(); }
        public String getInShopDate() { return inShopDate(); }
        public String getInboundControlCode() { return inboundControlCode(); }
        public String getSku() { return sku(); }
        public HmSkuAttributes getSkuAttributes() { return skuAttributes(); }
        public List<HmPacking> getPacking() { return packing(); }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HmPacking(
            String packingMaterialNumber,
            Object length,
            Object width,
            Object height,
            Integer piecesPerCarton,
            String huIdentifier,
            String packingMode
    ) {
        public String getPackingMaterialNumber() { return packingMaterialNumber(); }
        public Object getLength() { return length(); }
        public Object getWidth() { return width(); }
        public Object getHeight() { return height(); }
        public Integer getPiecesPerCarton() { return piecesPerCarton(); }
        public String getHuIdentifier() { return huIdentifier(); }
        public String getPackingMode() { return packingMode(); }
    }

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
    ) {
        public String getArticleTypeCode() { return articleTypeCode(); }
        public String getCorporateBrandID() { return corporateBrandID(); }
        public String getBrandName() { return brandName(); }
        public String getProductName() { return productName(); }
        public String getProductTypeName() { return productTypeName(); }
        public String getColourDescription() { return colourDescription(); }
        public String getSizeName() { return sizeName(); }
        public String getVariantDescription() { return variantDescription(); }
        public String getIndexGroupCode() { return indexGroupCode(); }
        public String getIndexGroupName() { return indexGroupName(); }
        public String getIndexCode() { return indexCode(); }
        public String getIndexDescription() { return indexDescription(); }
        public String getSubIndexCode() { return subIndexCode(); }
        public String getSubIndexDescription() { return subIndexDescription(); }
        public List<HmPrice> getPrices() { return prices(); }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HmPrice(
            String channelName,
            Object priceValue,
            String currencyISOCode
    ) {
        public String getChannelName() { return channelName(); }
        public Object getPriceValue() { return priceValue(); }
        public String getCurrencyISOCode() { return currencyISOCode(); }
    }
}
