package com.platform.erp.model.hm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class HmInboundDeliveryMessage {
    private String transactionType;
    private String version;
    private String uniqueTransactionId;
    private String transactionDateTime;
    private String warehouseId;
    private HmInboundDelivery inboundDelivery;

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getUniqueTransactionId() {
        return uniqueTransactionId;
    }

    public void setUniqueTransactionId(String uniqueTransactionId) {
        this.uniqueTransactionId = uniqueTransactionId;
    }

    public String getTransactionDateTime() {
        return transactionDateTime;
    }

    public void setTransactionDateTime(String transactionDateTime) {
        this.transactionDateTime = transactionDateTime;
    }

    public String getWarehouseId() {
        return warehouseId;
    }

    public void setWarehouseId(String warehouseId) {
        this.warehouseId = warehouseId;
    }

    public HmInboundDelivery getInboundDelivery() {
        return inboundDelivery;
    }

    public void setInboundDelivery(HmInboundDelivery inboundDelivery) {
        this.inboundDelivery = inboundDelivery;
    }
}
