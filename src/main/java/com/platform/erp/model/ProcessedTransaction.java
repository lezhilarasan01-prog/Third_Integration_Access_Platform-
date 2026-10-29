package com.platform.erp.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProcessedTransaction {
    private static final ObjectMapper JSON_MAPPER = new ObjectMapper();

    private String trackingId;
    private String erpSource;
    private String facilityId;
    private String documentType;
    private String filename;
    private String status; // QUEUED, CONVERTED, SENT_TO_MAWM, DLQ_FAILED
    private int totalRecords;
    private Instant receivedAt;
    private Instant convertedAt;
    private CanonicalEnvelope canonicalEnvelope;
    private String mawmStatus;
    private Object errorMessage;

    public ProcessedTransaction() {}

    public ProcessedTransaction(String trackingId, String erpSource, String documentType,
                                String filename, String status, int totalRecords,
                                Instant receivedAt, Instant convertedAt,
                                CanonicalEnvelope canonicalEnvelope, String mawmStatus, Object errorMessage) {
        this.trackingId = trackingId;
        this.erpSource = erpSource;
        this.documentType = documentType;
        this.filename = filename;
        this.status = status;
        this.totalRecords = totalRecords;
        this.receivedAt = receivedAt;
        this.convertedAt = convertedAt;
        this.canonicalEnvelope = canonicalEnvelope;
        this.mawmStatus = mawmStatus;
        this.errorMessage = errorMessage;
    }

    public ProcessedTransaction(String trackingId, String erpSource, String documentType,
                                String filename, String status, int totalRecords,
                                Instant receivedAt, Instant convertedAt,
                                CanonicalEnvelope canonicalEnvelope, String mawmStatus, String errorMessage) {
        this(trackingId, erpSource, documentType, filename, status, totalRecords, receivedAt, convertedAt, canonicalEnvelope, mawmStatus, (Object) errorMessage);
    }

    public String getTrackingId() { return trackingId; }
    public void setTrackingId(String trackingId) { this.trackingId = trackingId; }

    public String getErpSource() { return erpSource; }
    public void setErpSource(String erpSource) { this.erpSource = erpSource; }

    public String getFacilityId() { return facilityId; }
    public void setFacilityId(String facilityId) { this.facilityId = facilityId; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getTotalRecords() { return totalRecords; }
    public void setTotalRecords(int totalRecords) { this.totalRecords = totalRecords; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }

    public Instant getConvertedAt() { return convertedAt; }
    public void setConvertedAt(Instant convertedAt) { this.convertedAt = convertedAt; }

    public CanonicalEnvelope getCanonicalEnvelope() { return canonicalEnvelope; }
    public void setCanonicalEnvelope(CanonicalEnvelope canonicalEnvelope) { this.canonicalEnvelope = canonicalEnvelope; }

    public String getMawmStatus() { return mawmStatus; }
    public void setMawmStatus(String mawmStatus) { this.mawmStatus = mawmStatus; }

    public Object getErrorMessage() {
        if (errorMessage instanceof String str) {
            String trimmed = str.trim();
            if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || 
                (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
                try {
                    JsonNode node = JSON_MAPPER.readTree(trimmed);
                    return sanitizeErrorNode(node);
                } catch (Exception ignored) {
                }
            }
        }
        return errorMessage;
    }

    private static JsonNode sanitizeErrorNode(JsonNode node) {
        if (node instanceof ObjectNode obj) {
            obj.remove("errorType");
            obj.remove("deliveryLine");
            if (obj.has("errors") && obj.get("errors").isArray()) {
                ArrayNode arr = (ArrayNode) obj.get("errors");
                for (JsonNode item : arr) {
                    if (item instanceof ObjectNode itemObj) {
                        itemObj.remove("errorType");
                        itemObj.remove("deliveryLine");
                        itemObj.remove("lineNumber");
                        if (itemObj.has("field")) {
                            String f = itemObj.get("field").asText();
                            if (f.startsWith("deliveryLine[") && f.contains("].")) {
                                int endBracket = f.indexOf("].");
                                itemObj.put("field", f.substring(endBracket + 2));
                            } else if (f.startsWith("deliveryLine.")) {
                                itemObj.put("field", f.substring(13));
                            } else if (f.equals("deliveryLine")) {
                                itemObj.put("field", "lines");
                            } else if (f.startsWith("line[") && f.contains("].")) {
                                int endBracket = f.indexOf("].");
                                itemObj.put("field", f.substring(endBracket + 2));
                            }
                        }
                    }
                }
            }
            return obj;
        }
        return node;
    }

    public void setErrorMessage(Object errorMessage) {
        this.errorMessage = errorMessage;
    }
}
