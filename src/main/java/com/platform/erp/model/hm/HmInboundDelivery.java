package com.platform.erp.model.hm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class HmInboundDelivery {
    private String actionType;
    private String inboundDeliveryNumber;
    private String inboundDeliveryType;
    private String siteID;
    private Boolean customsClearance;
    private List<HmDeliveryLine> deliveryLine;

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getInboundDeliveryNumber() {
        return inboundDeliveryNumber;
    }

    public void setInboundDeliveryNumber(String inboundDeliveryNumber) {
        this.inboundDeliveryNumber = inboundDeliveryNumber;
    }

    public String getInboundDeliveryType() {
        return inboundDeliveryType;
    }

    public void setInboundDeliveryType(String inboundDeliveryType) {
        this.inboundDeliveryType = inboundDeliveryType;
    }

    public String getSiteID() {
        return siteID;
    }

    public void setSiteID(String siteID) {
        this.siteID = siteID;
    }

    public Boolean getCustomsClearance() {
        return customsClearance;
    }

    public void setCustomsClearance(Boolean customsClearance) {
        this.customsClearance = customsClearance;
    }

    public List<HmDeliveryLine> getDeliveryLine() {
        return deliveryLine;
    }

    public void setDeliveryLine(List<HmDeliveryLine> deliveryLine) {
        this.deliveryLine = deliveryLine;
    }
}
