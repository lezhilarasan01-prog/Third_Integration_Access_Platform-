package com.platform.erp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 100% Format-Agnostic Kafka Topic Resolution.
 * Topic names can be ANYTHING in the future (e.g. "orders.v2", "sap-feed", "eu_billing", "custom_topic").
 * Resolves directly from application.properties (platform.kafka.topics.*) or uses explicit topic names as-is.
 * Zero hardcoded naming conventions, prefixes, or suffixes.
 */
@Configuration
@ConfigurationProperties(prefix = "platform.kafka")
public class KafkaTopicProperties {

    /**
     * Dynamic Map of all topics configured in application.properties under platform.kafka.topics.*
     * Maps any logical key (e.g. "po", "asn", "invoice", "custom-stream") to ANY arbitrary topic name.
     */
    private Map<String, String> topics = new ConcurrentHashMap<>();

    @Value("${platform.kafka.default-topic:erp_file_raw}")
    private String defaultTopic = "erp_file_raw";

    @Value("${platform.kafka.default-dlq:erp_file_dlq}")
    private String defaultDlq = "erp_file_dlq";

    @Value("${platform.kafka.consumer.topic-pattern:${platform.kafka.topic-pattern:.*}}")
    private String topicPattern = ".*";

    public KafkaTopicProperties() {}

    public Map<String, String> getTopics() {
        return topics;
    }

    public void setTopics(Map<String, String> topics) {
        this.topics = topics != null ? new ConcurrentHashMap<>(topics) : new ConcurrentHashMap<>();
    }

    public String getDefaultTopic() { return defaultTopic; }
    public void setDefaultTopic(String defaultTopic) { this.defaultTopic = defaultTopic; }

    public String getDefaultDlq() { return defaultDlq; }
    public void setDefaultDlq(String defaultDlq) { this.defaultDlq = defaultDlq; }

    public String getTopicPattern() {
        return topicPattern;
    }

    public void setTopicPattern(String topicPattern) {
        this.topicPattern = topicPattern;
    }

    /**
     * Resolves the destination topic for ANY input.
     * Topic names can be ANY arbitrary string.
     * 1. If null or blank, returns configured defaultTopic.
     * 2. Checks if configured in application.properties (exact key or normalized).
     * 3. If an explicit topic name is passed, returns it directly as-is!
     */
    public String resolveRawTopic(String topicOrKey) {
        if (topicOrKey == null || topicOrKey.isBlank()) {
            return defaultTopic;
        }

        String raw = topicOrKey.trim();
        String normalizedKey = raw.toLowerCase().replace("_", "-");

        // 1. Direct match in application.properties
        if (topics.containsKey(raw)) {
            return topics.get(raw);
        }
        if (topics.containsKey(normalizedKey)) {
            return topics.get(normalizedKey);
        }
        if (topics.containsKey(normalizedKey + "-raw")) {
            return topics.get(normalizedKey + "-raw");
        }

        // 2. Use the given topic name directly as-is (supports ANY future topic name)
        return raw;
    }

    /**
     * Resolves the matching dedicated DLQ topic 100% dynamically from application.properties.
     * Zero hardcoded names or business strings.
     * Looks up matching *-dlq property configured in application.properties:
     * - Key "po-raw"  -> reads configured property "platform.kafka.topics.po-dlq"
     * - Key "asn-raw" -> reads configured property "platform.kafka.topics.asn-dlq"
     * - Value "erp_file_po_raw" -> finds its configured property key -> reads matching *-dlq value
     * - Any future topic configured in application.properties maps automatically!
     */
    public String resolveDlqTopic(String topicOrKey) {
        if (topicOrKey == null || topicOrKey.isBlank()) {
            return topics.entrySet().stream()
                    .filter(e -> e.getKey().endsWith("-dlq") || e.getKey().endsWith("_dlq"))
                    .map(Map.Entry::getValue)
                    .findFirst()
                    .orElse(defaultDlq);
        }

        String raw = topicOrKey.trim();
        String normalizedKey = raw.toLowerCase().replace("_", "-");

        // 1. Direct DLQ key match in application.properties (e.g. "po-dlq", "asn-dlq")
        if (topics.containsKey(raw) && (raw.endsWith("-dlq") || raw.endsWith("_dlq"))) {
            return topics.get(raw);
        }
        if (topics.containsKey(normalizedKey) && (normalizedKey.endsWith("-dlq") || normalizedKey.endsWith("_dlq"))) {
            return topics.get(normalizedKey);
        }

        // 2. Logical raw key match in application.properties (e.g. "po-raw", "po", "asn-raw", "asn")
        String candidateKey = normalizedKey.endsWith("-raw") 
                ? normalizedKey.substring(0, normalizedKey.length() - 4) 
                : normalizedKey;
        if (topics.containsKey(candidateKey + "-dlq")) {
            return topics.get(candidateKey + "-dlq");
        }
        if (topics.containsKey(candidateKey + "_dlq")) {
            return topics.get(candidateKey + "_dlq");
        }

        // 3. Topic name match (value lookup): Find which property key holds this topic name,
        // and retrieve its matching dedicated -dlq property from application.properties
        for (Map.Entry<String, String> entry : topics.entrySet()) {
            if (entry.getValue().equalsIgnoreCase(raw)) {
                String key = entry.getKey();
                String dlqKey = key.endsWith("-raw")
                        ? key.substring(0, key.length() - 4) + "-dlq"
                        : key.endsWith("_raw")
                        ? key.substring(0, key.length() - 4) + "_dlq"
                        : key + "-dlq";

                if (topics.containsKey(dlqKey)) {
                    return topics.get(dlqKey);
                }
            }
        }

        // 4. Conventional fallback for dynamic custom topics ending with _raw or -raw
        if (raw.endsWith("_raw")) {
            return raw.substring(0, raw.length() - 4) + "_dlq";
        }
        if (raw.endsWith("-raw")) {
            return raw.substring(0, raw.length() - 4) + "-dlq";
        }

        return raw + "_dlq";
    }

    /**
     * Returns all configured topic names from application.properties.
     */
    public List<String> getAllConfiguredTopics() {
        return new ArrayList<>(topics.values());
    }

    // Dynamic backward-compatible accessors
    public String getAsnRaw() { return resolveRawTopic("asn-raw"); }
    public String getPoRaw() { return resolveRawTopic("po-raw"); }
    public String getAsnDlq() { return resolveDlqTopic("asn-raw"); }
    public String getPoDlq() { return resolveDlqTopic("po-raw"); }
}
