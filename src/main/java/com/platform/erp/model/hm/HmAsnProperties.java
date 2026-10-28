package com.platform.erp.model.hm;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.Map;

/**
 * Idiomatic Java 21 Record for H&M ASN configuration properties.
 * Binds properties prefixed with 'asn' from application.properties.
 */
@ConfigurationProperties(prefix = "asn")
public record HmAsnProperties(
        String businessUnitId,
        String destinationFacilityId,
        Map<String, String> originTypeMap,
        String lpnTypeId,
        String asnLevelId,
        String quantityUomId
) {
    public HmAsnProperties {
        if (originTypeMap == null) {
            originTypeMap = Map.of();
        }
    }

    public HmAsnProperties() {
        this(null, null, Map.of(), null, null, null);
    }

    // Accessor aliases for backward compatibility
    public String getBusinessUnitId() { return businessUnitId(); }
    public String getDestinationFacilityId() { return destinationFacilityId(); }
    public Map<String, String> getOriginTypeMap() { return originTypeMap(); }
    public String getLpnTypeId() { return lpnTypeId(); }
    public String getAsnLevelId() { return asnLevelId(); }
    public String getQuantityUomId() { return quantityUomId(); }
}
