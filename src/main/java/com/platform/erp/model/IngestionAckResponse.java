package com.platform.erp.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class IngestionAckResponse {
    private final String trackingId;
    private final String erpSource;
    private final String documentType;
    private final String filename;
    private final long sizeBytes;
    private final String status;
    private final String message;
    private final Instant timestamp;

    public IngestionAckResponse(String trackingId, String erpSource, String documentType,
                                String filename, long sizeBytes, String status, String message, Instant timestamp) {
        this.trackingId = trackingId;
        this.erpSource = erpSource;
        this.documentType = documentType;
        this.filename = filename;
        this.sizeBytes = sizeBytes;
        this.status = status;
        this.message = message;
        this.timestamp = timestamp;
    }

    public String getTrackingId() { return trackingId; }
    public String getErpSource() { return erpSource; }
    public String getDocumentType() { return documentType; }
    public String getFilename() { return filename; }
    public long getSizeBytes() { return sizeBytes; }
    public String getStatus() { return status; }
    public String getMessage() { return message; }
    public Instant getTimestamp() { return timestamp; }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String trackingId;
        private String erpSource;
        private String documentType;
        private String filename;
        private long sizeBytes;
        private String status;
        private String message;
        private Instant timestamp;

        public Builder trackingId(String trackingId) { this.trackingId = trackingId; return this; }
        public Builder erpSource(String erpSource) { this.erpSource = erpSource; return this; }
        public Builder documentType(String documentType) { this.documentType = documentType; return this; }
        public Builder filename(String filename) { this.filename = filename; return this; }
        public Builder sizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder message(String message) { this.message = message; return this; }
        public Builder timestamp(Instant timestamp) { this.timestamp = timestamp; return this; }

        public IngestionAckResponse build() {
            return new IngestionAckResponse(trackingId, erpSource, documentType, filename, sizeBytes, status, message, timestamp);
        }
    }
}
