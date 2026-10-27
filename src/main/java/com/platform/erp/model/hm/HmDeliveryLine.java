package com.platform.erp.model.hm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class HmDeliveryLine {
    private String lineNumber;
    private Integer advisedQuantity;
    private String hmOrderNumber;
    private String countryOfOrigin;
    private String inShopDate;
    private String inboundControlCode;
    private String sku;
    private HmSkuAttributes skuAttributes;
    private List<HmPacking> packing;

    public String getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(String lineNumber) {
        this.lineNumber = lineNumber;
    }

    public Integer getAdvisedQuantity() {
        return advisedQuantity;
    }

    public void setAdvisedQuantity(Integer advisedQuantity) {
        this.advisedQuantity = advisedQuantity;
    }

    public String getHmOrderNumber() {
        return hmOrderNumber;
    }

    public void setHmOrderNumber(String hmOrderNumber) {
        this.hmOrderNumber = hmOrderNumber;
    }

    public String getCountryOfOrigin() {
        return countryOfOrigin;
    }

    public void setCountryOfOrigin(String countryOfOrigin) {
        this.countryOfOrigin = countryOfOrigin;
    }

    public String getInShopDate() {
        return inShopDate;
    }

    public void setInShopDate(String inShopDate) {
        this.inShopDate = inShopDate;
    }

    public String getInboundControlCode() {
        return inboundControlCode;
    }

    public void setInboundControlCode(String inboundControlCode) {
        this.inboundControlCode = inboundControlCode;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public HmSkuAttributes getSkuAttributes() {
        return skuAttributes;
    }

    public void setSkuAttributes(HmSkuAttributes skuAttributes) {
        this.skuAttributes = skuAttributes;
    }

    public List<HmPacking> getPacking() {
        return packing;
    }

    public void setPacking(List<HmPacking> packing) {
        this.packing = packing;
    }
}
