package com.platform.erp.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class CanonicalEnvelope {
    private String trackingId;
    private String erpSource;
    private String facilityId;
    private String documentType;
    private String originalFilename;

    @JsonIgnore
    private Integer totalRecords;
    private Instant convertedAt;
    private String sourceFormat;
    private List<Map<String, Object>> records;

    @JsonProperty("Data")
    private List<Map<String, Object>> data;

    public CanonicalEnvelope() {}

    public CanonicalEnvelope(String trackingId, String erpSource, String documentType,
                             String originalFilename, Integer totalRecords, Instant convertedAt,
                             List<Map<String, Object>> records) {
        this.trackingId = trackingId;
        this.erpSource = erpSource;
        this.documentType = documentType;
        this.originalFilename = originalFilename;
        this.totalRecords = totalRecords;
        this.convertedAt = convertedAt;
        this.records = records;
    }

    public String getTrackingId() { return trackingId; }
    public void setTrackingId(String trackingId) { this.trackingId = trackingId; }

    public String getErpSource() { return erpSource; }
    public void setErpSource(String erpSource) { this.erpSource = erpSource; }

    public String getFacilityId() { return facilityId; }
    public void setFacilityId(String facilityId) { this.facilityId = facilityId; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    @JsonIgnore
    public Integer getTotalRecords() { return totalRecords != null ? totalRecords : 0; }
    public void setTotalRecords(Integer totalRecords) { this.totalRecords = totalRecords; }

    public Instant getConvertedAt() { return convertedAt; }
    public void setConvertedAt(Instant convertedAt) { this.convertedAt = convertedAt; }

    public String getSourceFormat() { return sourceFormat; }
    public void setSourceFormat(String sourceFormat) { this.sourceFormat = sourceFormat; }

    public List<Map<String, Object>> getRecords() { return records; }
    public void setRecords(List<Map<String, Object>> records) { this.records = records; }

    public List<Map<String, Object>> getData() { return data; }
    public void setData(List<Map<String, Object>> data) { this.data = data; }

    /**
     * Produces the official Manhattan Active WMS (MAWM) standard JSON container:
     * { "Data": [ ... ] }
     */
    public Map<String, Object> toMawmPayload() {
        Map<String, Object> mawm = new java.util.LinkedHashMap<>();
        mawm.put("Data", this.data != null ? this.data : (this.records != null ? this.records : java.util.Collections.emptyList()));
        return mawm;
    }

    public String toMawmJson(ObjectMapper objectMapper) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(toMawmPayload());
        } catch (Exception e) {
            return "{\"Data\":[]}";
        }
    }
}
