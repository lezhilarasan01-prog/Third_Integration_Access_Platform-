package com.platform.erp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Single tracker entity recording every activity on an ERP file from receipt,
 * through parsing/conversion, to delivery into MAWM.
 */
@Entity
@Table(name = "erp_file_intake_tracker")
public class ErpFileIntakeTracker {

    // --- Receive Stage ---
    @Id
    @Column(name = "job_id", length = 64, nullable = false)
    private String jobId;

    @Column(name = "source_system", length = 64, nullable = false)
    private String sourceSystem;

    @Column(name = "transaction_type", length = 32, nullable = false)
    private String transactionType;

    @Column(name = "mapping_profile", length = 64)
    private String mappingProfile;

    @Column(name = "input_format", length = 32)
    private String inputFormat;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "facility_id", length = 64)
    private String facilityId;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "file_checksum", length = 128)
    private String fileChecksum;

    @Column(name = "storage_path", length = 255)
    private String storagePath;

    @Column(name = "kafka_topic", length = 128)
    private String kafkaTopic;

    @Column(name = "kafka_partition")
    private Integer kafkaPartition;

    @Column(name = "kafka_offset")
    private Long kafkaOffset;

    @Column(name = "raw_content", columnDefinition = "TEXT")
    private String rawContent;

    @Column(name = "received_at")
    private Instant receivedAt;

    // --- Convert Stage ---
    @Column(name = "intake_status", length = 32, nullable = false)
    private String intakeStatus;

    @Column(name = "processing_started_at")
    private Instant processingStartedAt;

    @Column(name = "processing_completed_at")
    private Instant processingCompletedAt;

    @Column(name = "total_records")
    private Integer totalRecords = 0;

    @Column(name = "converted_records")
    private Integer convertedRecords = 0;

    @Column(name = "error_records")
    private Integer errorRecords = 0;

    @Column(name = "output_files", columnDefinition = "TEXT")
    private String outputFiles;

    @Column(name = "error_file", columnDefinition = "TEXT")
    private String errorFile;

    @Column(name = "processing_error_message", columnDefinition = "TEXT")
    private String processingErrorMessage;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // --- Deliver to MAWM Stage ---
    @Column(name = "dispatch_status", length = 32)
    private String dispatchStatus;

    @Column(name = "dispatched_records")
    private Integer dispatchedRecords = 0;

    @Column(name = "dispatch_failed_records")
    private Integer dispatchFailedRecords = 0;

    @Column(name = "dispatch_started_at")
    private Instant dispatchStartedAt;

    @Column(name = "dispatch_completed_at")
    private Instant dispatchCompletedAt;

    public ErpFileIntakeTracker() {
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getSourceSystem() {
        return sourceSystem;
    }

    public void setSourceSystem(String sourceSystem) {
        this.sourceSystem = sourceSystem;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public String getMappingProfile() {
        return mappingProfile;
    }

    public void setMappingProfile(String mappingProfile) {
        this.mappingProfile = mappingProfile;
    }

    public String getInputFormat() {
        return inputFormat;
    }

    public void setInputFormat(String inputFormat) {
        this.inputFormat = inputFormat;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getFacilityId() {
        return facilityId;
    }

    public void setFacilityId(String facilityId) {
        this.facilityId = facilityId;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }

    public String getFileChecksum() {
        return fileChecksum;
    }

    public void setFileChecksum(String fileChecksum) {
        this.fileChecksum = fileChecksum;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public void setStoragePath(String storagePath) {
        this.storagePath = storagePath;
    }

    public String getRawContent() {
        return rawContent;
    }

    public void setRawContent(String rawContent) {
        this.rawContent = rawContent;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(Instant receivedAt) {
        this.receivedAt = receivedAt;
    }

    public String getIntakeStatus() {
        return intakeStatus;
    }

    public void setIntakeStatus(String intakeStatus) {
        this.intakeStatus = intakeStatus;
    }

    public Instant getProcessingStartedAt() {
        return processingStartedAt;
    }

    public void setProcessingStartedAt(Instant processingStartedAt) {
        this.processingStartedAt = processingStartedAt;
    }

    public Instant getProcessingCompletedAt() {
        return processingCompletedAt;
    }

    public void setProcessingCompletedAt(Instant processingCompletedAt) {
        this.processingCompletedAt = processingCompletedAt;
    }

    public Integer getTotalRecords() {
        return totalRecords;
    }

    public void setTotalRecords(Integer totalRecords) {
        this.totalRecords = totalRecords;
    }

    public Integer getConvertedRecords() {
        return convertedRecords;
    }

    public void setConvertedRecords(Integer convertedRecords) {
        this.convertedRecords = convertedRecords;
    }

    public Integer getErrorRecords() {
        return errorRecords;
    }

    public void setErrorRecords(Integer errorRecords) {
        this.errorRecords = errorRecords;
    }

    public String getOutputFiles() {
        return outputFiles;
    }

    public void setOutputFiles(String outputFiles) {
        this.outputFiles = outputFiles;
    }

    public String getErrorFile() {
        return errorFile;
    }

    public void setErrorFile(String errorFile) {
        this.errorFile = errorFile;
    }

    public String getProcessingErrorMessage() {
        return processingErrorMessage;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("errorDetails")
    public Object getErrorDetails() {
        if (processingErrorMessage == null || processingErrorMessage.isBlank()) return null;
        String trimmed = processingErrorMessage.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || 
            (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            try {
                com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(trimmed);
                if (node instanceof com.fasterxml.jackson.databind.node.ObjectNode obj) {
                    obj.remove("errorType");
                    obj.remove("deliveryLine");
                    if (obj.has("errors") && obj.get("errors").isArray()) {
                        com.fasterxml.jackson.databind.node.ArrayNode arr = (com.fasterxml.jackson.databind.node.ArrayNode) obj.get("errors");
                        for (com.fasterxml.jackson.databind.JsonNode item : arr) {
                            if (item instanceof com.fasterxml.jackson.databind.node.ObjectNode itemObj) {
                                itemObj.remove("errorType");
                                itemObj.remove("deliveryLine");
                                if (itemObj.has("field")) {
                                    String f = itemObj.get("field").asText();
                                    if (f.startsWith("deliveryLine[") && f.contains("].")) {
                                        int endBracket = f.indexOf("].");
                                        String lineNum = f.substring(13, endBracket);
                                        itemObj.put("lineNumber", lineNum);
                                        itemObj.put("field", f.substring(endBracket + 2));
                                    } else if (f.startsWith("deliveryLine.")) {
                                        itemObj.put("field", f.substring(13));
                                    } else if (f.equals("deliveryLine")) {
                                        itemObj.put("field", "lines");
                                    }
                                }
                            }
                        }
                    }
                    return obj;
                }
                return node;
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    public void setProcessingErrorMessage(String processingErrorMessage) {
        this.processingErrorMessage = processingErrorMessage;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getDispatchStatus() {
        return dispatchStatus;
    }

    public void setDispatchStatus(String dispatchStatus) {
        this.dispatchStatus = dispatchStatus;
    }

    public Integer getDispatchedRecords() {
        return dispatchedRecords;
    }

    public void setDispatchedRecords(Integer dispatchedRecords) {
        this.dispatchedRecords = dispatchedRecords;
    }

    public Integer getDispatchFailedRecords() {
        return dispatchFailedRecords;
    }

    public void setDispatchFailedRecords(Integer dispatchFailedRecords) {
        this.dispatchFailedRecords = dispatchFailedRecords;
    }

    public Instant getDispatchStartedAt() {
        return dispatchStartedAt;
    }

    public void setDispatchStartedAt(Instant dispatchStartedAt) {
        this.dispatchStartedAt = dispatchStartedAt;
    }

    public Instant getDispatchCompletedAt() {
        return dispatchCompletedAt;
    }

    public void setDispatchCompletedAt(Instant dispatchCompletedAt) {
        this.dispatchCompletedAt = dispatchCompletedAt;
    }

    public String getKafkaTopic() {
        return kafkaTopic;
    }

    public void setKafkaTopic(String kafkaTopic) {
        this.kafkaTopic = kafkaTopic;
    }

    public Integer getKafkaPartition() {
        return kafkaPartition;
    }

    public void setKafkaPartition(Integer kafkaPartition) {
        this.kafkaPartition = kafkaPartition;
    }

    public Long getKafkaOffset() {
        return kafkaOffset;
    }

    public void setKafkaOffset(Long kafkaOffset) {
        this.kafkaOffset = kafkaOffset;
    }
}
