package com.platform.erp.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProcessedTransaction {
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
    private String errorMessage;

    public ProcessedTransaction() {}

    public ProcessedTransaction(String trackingId, String erpSource, String documentType,
                                String filename, String status, int totalRecords,
                                Instant receivedAt, Instant convertedAt,
                                CanonicalEnvelope canonicalEnvelope, String mawmStatus, String errorMessage) {
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

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
