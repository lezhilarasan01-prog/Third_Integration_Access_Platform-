package com.platform.erp.model.hm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class HmPacking {
    private String packingMaterialNumber;
    private Object length;
    private Object width;
    private Object height;
    private Integer piecesPerCarton;
    private String huIdentifier;
    private String packingMode;

    public String getPackingMaterialNumber() {
        return packingMaterialNumber;
    }

    public void setPackingMaterialNumber(String packingMaterialNumber) {
        this.packingMaterialNumber = packingMaterialNumber;
    }

    public Object getLength() {
        return length;
    }

    public void setLength(Object length) {
        this.length = length;
    }

    public Object getWidth() {
        return width;
    }

    public void setWidth(Object width) {
        this.width = width;
    }

    public Object getHeight() {
        return height;
    }

    public void setHeight(Object height) {
        this.height = height;
    }

    public Integer getPiecesPerCarton() {
        return piecesPerCarton;
    }

    public void setPiecesPerCarton(Integer piecesPerCarton) {
        this.piecesPerCarton = piecesPerCarton;
    }

    public String getHuIdentifier() {
        return huIdentifier;
    }

    public void setHuIdentifier(String huIdentifier) {
        this.huIdentifier = huIdentifier;
    }

    public String getPackingMode() {
        return packingMode;
    }

    public void setPackingMode(String packingMode) {
        this.packingMode = packingMode;
    }
}
