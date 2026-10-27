package com.platform.erp.model.hm;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "asn")
public class HmAsnProperties {

    private String businessUnitId = "CID001683";
    private String destinationFacilityId = "IN_5180";
    private Map<String, String> originTypeMap = new HashMap<>();
    private String lpnTypeId = "ILPN";
    private String asnLevelId = "LPN";
    private String quantityUomId = "Units";

    public HmAsnProperties() {
        originTypeMap.put("InboundSupplier", "P");
    }

    public String getBusinessUnitId() {
        return businessUnitId;
    }

    public void setBusinessUnitId(String businessUnitId) {
        this.businessUnitId = businessUnitId;
    }

    public String getDestinationFacilityId() {
        return destinationFacilityId;
    }

    public void setDestinationFacilityId(String destinationFacilityId) {
        this.destinationFacilityId = destinationFacilityId;
    }

    public Map<String, String> getOriginTypeMap() {
        return originTypeMap;
    }

    public void setOriginTypeMap(Map<String, String> originTypeMap) {
        this.originTypeMap = originTypeMap;
    }

    public String getLpnTypeId() {
        return lpnTypeId;
    }

    public void setLpnTypeId(String lpnTypeId) {
        this.lpnTypeId = lpnTypeId;
    }

    public String getAsnLevelId() {
        return asnLevelId;
    }

    public void setAsnLevelId(String asnLevelId) {
        this.asnLevelId = asnLevelId;
    }

    public String getQuantityUomId() {
        return quantityUomId;
    }

    public void setQuantityUomId(String quantityUomId) {
        this.quantityUomId = quantityUomId;
    }
}
