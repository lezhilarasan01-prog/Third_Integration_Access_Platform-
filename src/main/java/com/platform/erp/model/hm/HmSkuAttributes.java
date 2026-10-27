package com.platform.erp.model.hm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class HmSkuAttributes {
    private String articleTypeCode;
    private String corporateBrandID;
    private String brandName;
    private String productName;
    private String productTypeName;
    private String colourDescription;
    private String sizeName;
    private String variantDescription;
    private String indexGroupCode;
    private String indexGroupName;
    private String indexCode;
    private String indexDescription;
    private String subIndexCode;
    private String subIndexDescription;
    private List<HmPrice> prices;

    public String getArticleTypeCode() {
        return articleTypeCode;
    }

    public void setArticleTypeCode(String articleTypeCode) {
        this.articleTypeCode = articleTypeCode;
    }

    public String getCorporateBrandID() {
        return corporateBrandID;
    }

    public void setCorporateBrandID(String corporateBrandID) {
        this.corporateBrandID = corporateBrandID;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductTypeName() {
        return productTypeName;
    }

    public void setProductTypeName(String productTypeName) {
        this.productTypeName = productTypeName;
    }

    public String getColourDescription() {
        return colourDescription;
    }

    public void setColourDescription(String colourDescription) {
        this.colourDescription = colourDescription;
    }

    public String getSizeName() {
        return sizeName;
    }

    public void setSizeName(String sizeName) {
        this.sizeName = sizeName;
    }

    public String getVariantDescription() {
        return variantDescription;
    }

    public void setVariantDescription(String variantDescription) {
        this.variantDescription = variantDescription;
    }

    public String getIndexGroupCode() {
        return indexGroupCode;
    }

    public void setIndexGroupCode(String indexGroupCode) {
        this.indexGroupCode = indexGroupCode;
    }

    public String getIndexGroupName() {
        return indexGroupName;
    }

    public void setIndexGroupName(String indexGroupName) {
        this.indexGroupName = indexGroupName;
    }

    public String getIndexCode() {
        return indexCode;
    }

    public void setIndexCode(String indexCode) {
        this.indexCode = indexCode;
    }

    public String getIndexDescription() {
        return indexDescription;
    }

    public void setIndexDescription(String indexDescription) {
        this.indexDescription = indexDescription;
    }

    public String getSubIndexCode() {
        return subIndexCode;
    }

    public void setSubIndexCode(String subIndexCode) {
        this.subIndexCode = subIndexCode;
    }

    public String getSubIndexDescription() {
        return subIndexDescription;
    }

    public void setSubIndexDescription(String subIndexDescription) {
        this.subIndexDescription = subIndexDescription;
    }

    public List<HmPrice> getPrices() {
        return prices;
    }

    public void setPrices(List<HmPrice> prices) {
        this.prices = prices;
    }
}
