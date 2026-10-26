package com.platform.erp.model;

import java.time.Instant;

/**
 * High-performance lightweight projection for tracker list queries.
 * Omits multi-megabyte raw payloads and canonical JSON blobs to ensure sub-50ms responses.
 */
public interface TrackerSummaryProjection {
    String getJobId();
    String getSourceSystem();
    String getTransactionType();
    String getMappingProfile();
    String getInputFormat();
    String getOriginalFilename();
    String getFacilityId();
    Long getFileSizeBytes();
    String getFileChecksum();
    String getStoragePath();
    Instant getReceivedAt();
    String getIntakeStatus();
    Instant getProcessingStartedAt();
    Instant getProcessingCompletedAt();
    Integer getTotalRecords();
    Integer getConvertedRecords();
    Integer getErrorRecords();
    String getProcessingErrorMessage();
    Instant getUpdatedAt();
    String getDispatchStatus();
    Integer getDispatchedRecords();
    Integer getDispatchFailedRecords();
    Instant getDispatchStartedAt();
    Instant getDispatchCompletedAt();

    default String getRawContent() {
        return null;
    }

    default boolean isClaimCheck() {
        return getStoragePath() != null && getStoragePath().startsWith("s3://");
    }
}
