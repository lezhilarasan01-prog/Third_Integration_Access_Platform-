package com.platform.erp.mawm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Manages OAuth2 authentication for Manhattan Active WMS (MAWM).
 * Thread-safe retrieval, proactive background refresh, and auto-regeneration
 * on expiration or HTTP 401 challenges without interrupting any running pipeline.
 */
@Service
public class MawmAuthService {

    private static final Logger log = LoggerFactory.getLogger(MawmAuthService.class);

    private final MawmProperties mawmProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final ReentrantLock lock = new ReentrantLock();

    private volatile String cachedToken = null;
    private volatile Instant tokenExpiry = Instant.MIN;

    public MawmAuthService(MawmProperties mawmProperties, ObjectMapper objectMapper) {
        this.mawmProperties = mawmProperties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Retrieves a valid OAuth2 bearer token for MAWM, reusing cached token if valid.
     * If expired or nearing expiration, thread-safely requests a new token.
     */
    public String getAccessToken() {
        // Fast path without lock if token is valid with at least 90s safety margin
        if (isTokenValid(90)) {
            return cachedToken;
        }

        lock.lock();
        try {
            // Double-check after acquiring lock
            if (isTokenValid(90)) {
                return cachedToken;
            }
            return fetchNewToken();
        } finally {
            lock.unlock();
        }
    }

    /**
     * Forcibly invalidates cached token (e.g. after remote 401 challenge).
     */
    public void invalidateToken() {
        lock.lock();
        try {
            log.info("[MAWM Auth] Invalidation requested. Resetting cached OAuth2 token.");
            this.cachedToken = null;
            this.tokenExpiry = Instant.MIN;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Proactive Background Scheduled Task:
     * Wakes up every 5 minutes to verify token health. If token expires within 10 minutes
     * or is not yet loaded, refreshes it automatically so worker threads and Kafka consumers
     * never experience blocking delays or token expiry disruptions.
     */
    @Scheduled(fixedDelay = 300_000, initialDelay = 10_000)
    public void proactiveTokenRefresh() {
        if (!mawmProperties.isEnabled()) return;
        if (!isTokenValid(600)) {
            log.info("[MAWM Auth Background] Token approaching expiry or uninitialized. Proactively refreshing...");
            try {
                lock.lock();
                try {
                    if (!isTokenValid(600)) {
                        fetchNewToken();
                    }
                } finally {
                    lock.unlock();
                }
            } catch (Exception e) {
                log.warn("[MAWM Auth Background] Proactive token refresh encountered transient error: {}", e.getMessage());
            }
        }
    }

    private boolean isTokenValid(long bufferSeconds) {
        return cachedToken != null && !cachedToken.isBlank() && Instant.now().isBefore(tokenExpiry.minusSeconds(bufferSeconds));
    }

    private String fetchNewToken() {
        log.info("[MAWM Auth] Requesting new OAuth2 token from {}", mawmProperties.getAuthUrl());

        try {
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("grant_type", "password");
            formData.add("username", mawmProperties.getUsername());
            formData.add("password", mawmProperties.getPassword());

            String responseBody = restClient.post()
                    .uri(mawmProperties.getAuthUrl())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .header("Authorization", mawmProperties.getBasicAuth())
                    .body(formData)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            if (root.has("access_token")) {
                this.cachedToken = root.get("access_token").asText();
                long expiresIn = root.has("expires_in") ? root.get("expires_in").asLong() : 3600;
                this.tokenExpiry = Instant.now().plusSeconds(expiresIn);
                log.info("[MAWM Auth] Successfully acquired fresh MAWM OAuth2 token (expires in {}s, valid until {})",
                        expiresIn, tokenExpiry);
                return this.cachedToken;
            } else {
                throw new IllegalStateException("OAuth response missing access_token: " + responseBody);
            }
        } catch (Exception e) {
            log.error("[MAWM Auth] Failed to authenticate with MAWM OAuth server: {}", e.getMessage(), e);
            throw new RuntimeException("MAWM Authentication failed: " + e.getMessage(), e);
        }
    }

    /**
     * Exposes auth status information for health checks and testing.
     */
    public Map<String, Object> getAuthStatus() {
        boolean hasValidToken = isTokenValid(60);
        java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("authUrl", mawmProperties.getAuthUrl() != null ? mawmProperties.getAuthUrl() : "");
        map.put("username", mawmProperties.getUsername() != null ? mawmProperties.getUsername() : "");
        map.put("hasCachedToken", hasValidToken);
        map.put("tokenExpiresAt", tokenExpiry != null ? tokenExpiry.toString() : "");
        return map;
    }

    /**
     * Actively tests OAuth connection and returns response latency and token validity.
     */
    public Map<String, Object> testConnection() {
        long start = System.currentTimeMillis();
        String token = getAccessToken();
        long latency = System.currentTimeMillis() - start;
        java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("status", "CONNECTED");
        map.put("latencyMs", latency);
        map.put("authUrl", mawmProperties.getAuthUrl() != null ? mawmProperties.getAuthUrl() : "");
        map.put("facility", mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility() : "Food_Cbe");
        map.put("hasValidToken", token != null && !token.isBlank());
        map.put("tokenExpiresAt", tokenExpiry != null ? tokenExpiry.toString() : "");
        return map;
    }
}
