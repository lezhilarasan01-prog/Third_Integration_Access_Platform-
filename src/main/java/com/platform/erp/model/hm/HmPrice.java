package com.platform.erp.model.hm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class HmPrice {
    private String channelName;
    private Object priceValue;
    private String currencyISOCode;

    public String getChannelName() {
        return channelName;
    }

    public void setChannelName(String channelName) {
        this.channelName = channelName;
    }

    public Object getPriceValue() {
        return priceValue;
    }

    public void setPriceValue(Object priceValue) {
        this.priceValue = priceValue;
    }

    public String getCurrencyISOCode() {
        return currencyISOCode;
    }

    public void setCurrencyISOCode(String currencyISOCode) {
        this.currencyISOCode = currencyISOCode;
    }
}
