package com.platform.erp.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "platform.storage")
public class BlobStorageProperties {

    /**
     * Threshold in bytes above which a payload is routed to Claim-Check blob storage
     * instead of inline DB and inline Kafka message. Default: 5MB (5,242,880 bytes).
     */
    private long inlineThresholdBytes = 5 * 1024 * 1024;

    /**
     * Storage mode: FILESYSTEM or S3
     */
    private String storageType = "FILESYSTEM";

    /**
     * Base directory for local filesystem / EBS shared volume blob storage.
     */
    private String localBaseDir = "data/blobs";

    /**
     * AWS S3 Bucket name (used when storageType = S3).
     */
    private String s3Bucket = "";

    /**
     * AWS S3 Region.
     */
    private String s3Region = "ap-south-1";

    /**
     * AWS Access Key ID (optional, defaults to environment / IAM instance role)
     */
    private String s3AccessKey = "";

    /**
     * AWS Secret Access Key (optional)
     */
    private String s3SecretKey = "";

    public String getS3AccessKey() {
        return s3AccessKey;
    }

    public void setS3AccessKey(String s3AccessKey) {
        this.s3AccessKey = s3AccessKey;
    }

    public String getS3SecretKey() {
        return s3SecretKey;
    }

    public void setS3SecretKey(String s3SecretKey) {
        this.s3SecretKey = s3SecretKey;
    }

    public long getInlineThresholdBytes() {
        return inlineThresholdBytes;
    }

    public void setInlineThresholdBytes(long inlineThresholdBytes) {
        this.inlineThresholdBytes = inlineThresholdBytes;
    }

    public String getStorageType() {
        return storageType;
    }

    public void setStorageType(String storageType) {
        this.storageType = storageType;
    }

    public String getLocalBaseDir() {
        return localBaseDir;
    }

    public void setLocalBaseDir(String localBaseDir) {
        this.localBaseDir = localBaseDir;
    }

    private int presignedUrlDurationMinutes = 15;

    public boolean isS3Enabled() {
        return "S3".equalsIgnoreCase(storageType) || (s3Bucket != null && !s3Bucket.isBlank());
    }

    public int getPresignedUrlDurationMinutes() {
        return presignedUrlDurationMinutes;
    }

    public void setPresignedUrlDurationMinutes(int presignedUrlDurationMinutes) {
        this.presignedUrlDurationMinutes = presignedUrlDurationMinutes;
    }

    public String getS3Bucket() {
        return s3Bucket;
    }

    public void setS3Bucket(String s3Bucket) {
        this.s3Bucket = s3Bucket;
    }

    public String getS3Region() {
        return s3Region;
    }

    public void setS3Region(String s3Region) {
        this.s3Region = s3Region;
    }
}
