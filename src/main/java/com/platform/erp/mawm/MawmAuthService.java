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

    private static class TokenEntry {
        final String token;
        final Instant expiry;

        TokenEntry(String token, Instant expiry) {
            this.token = token;
            this.expiry = expiry;
        }

        boolean isValid(long bufferSeconds) {
            return token != null && !token.isBlank() && Instant.now().isBefore(expiry.minusSeconds(bufferSeconds));
        }
    }

    private final java.util.concurrent.ConcurrentHashMap<String, TokenEntry> tokenCache = new java.util.concurrent.ConcurrentHashMap<>();

    public MawmAuthService(MawmProperties mawmProperties, ObjectMapper objectMapper) {
        this.mawmProperties = mawmProperties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Retrieves a valid OAuth2 bearer token for MAWM, using the default configured username.
     */
    public String getAccessToken() {
        return getAccessToken(null);
    }

    /**
     * Retrieves a valid OAuth2 bearer token for MAWM.
     * If username (e.g. from incoming CreatedBy payload field) is provided, it is used as the OAuth username.
     * All credentials (password, basicAuth, authUrl) are read strictly from application properties.
     */
    public String getAccessToken(String username) {
        String configuredUser = (mawmProperties.getUsername() != null && !mawmProperties.getUsername().isBlank())
                ? mawmProperties.getUsername().trim()
                : "lezhilarasan";

        String effectiveUsername = (username != null && !username.isBlank() && !isNonMawmUser(username))
                ? username.trim()
                : configuredUser;

        TokenEntry entry = tokenCache.get(effectiveUsername);
        if (entry != null && entry.isValid(90)) {
            return entry.token;
        }

        lock.lock();
        try {
            entry = tokenCache.get(effectiveUsername);
            if (entry != null && entry.isValid(90)) {
                return entry.token;
            }
            return fetchNewTokenForUser(effectiveUsername);
        } finally {
            lock.unlock();
        }
    }

    private boolean isNonMawmUser(String username) {
        if (username == null || username.isBlank()) return true;
        String upper = username.trim().toUpperCase();
        return upper.equals("OPTI") || upper.equals("SAP") || upper.equals("ORACLE")
                || upper.equals("NETSUITE") || upper.equals("SYSTEM") || upper.startsWith("CUSTOMER_")
                || upper.equals("DEFAULT") || upper.contains("@") || upper.contains(" ");
    }

    /**
     * Forcibly invalidates cached token for all users.
     */
    public void invalidateToken() {
        invalidateToken(null);
    }

    /**
     * Forcibly invalidates cached token for a specific user (or all if null/blank).
     */
    public void invalidateToken(String username) {
        lock.lock();
        try {
            if (username == null || username.isBlank()) {
                log.info("[MAWM Auth] Invalidation requested. Resetting all cached OAuth2 tokens.");
                tokenCache.clear();
            } else {
                String clean = username.trim();
                log.info("[MAWM Auth] Invalidation requested for user '{}'. Resetting cached token.", clean);
                tokenCache.remove(clean);
            }
        } finally {
            lock.unlock();
        }
    }

    /**
     * Proactive Background Scheduled Task:
     * Wakes up every 5 minutes to verify default token health. If token expires within 10 minutes
     * or is not yet loaded, refreshes it automatically so worker threads and Kafka consumers
     * never experience blocking delays or token expiry disruptions.
     */
    @Scheduled(fixedDelay = 300_000, initialDelay = 10_000)
    public void proactiveTokenRefresh() {
        if (!mawmProperties.isEnabled()) return;
        String defaultUser = mawmProperties.getUsername();
        if (defaultUser == null || defaultUser.isBlank()) return;

        TokenEntry entry = tokenCache.get(defaultUser);
        if (entry == null || !entry.isValid(600)) {
            log.info("[MAWM Auth Background] Token for '{}' approaching expiry or uninitialized. Proactively refreshing...", defaultUser);
            try {
                lock.lock();
                try {
                    TokenEntry cur = tokenCache.get(defaultUser);
                    if (cur == null || !cur.isValid(600)) {
                        fetchNewTokenForUser(defaultUser);
                    }
                } finally {
                    lock.unlock();
                }
            } catch (Exception e) {
                log.warn("[MAWM Auth Background] Proactive token refresh encountered transient error: {}", e.getMessage());
            }
        }
    }

    private String fetchNewTokenForUser(String username) {
        log.info("[MAWM Auth] Requesting new OAuth2 token for user '{}' from {}", username, mawmProperties.getAuthUrl());

        try {
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("grant_type", "password");
            formData.add("username", username);
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
                String token = root.get("access_token").asText();
                long expiresIn = root.has("expires_in") ? root.get("expires_in").asLong() : 3600;
                Instant expiry = Instant.now().plusSeconds(expiresIn);
                tokenCache.put(username, new TokenEntry(token, expiry));
                log.info("[MAWM Auth] Successfully acquired fresh MAWM OAuth2 token for user '{}' (expires in {}s, valid until {})",
                        username, expiresIn, expiry);
                return token;
            } else {
                throw new IllegalStateException("OAuth response missing access_token: " + responseBody);
            }
        } catch (Exception e) {
            String configuredUser = (mawmProperties.getUsername() != null && !mawmProperties.getUsername().isBlank())
                    ? mawmProperties.getUsername().trim() : "lezhilarasan";
            if (!username.equalsIgnoreCase(configuredUser)) {
                log.warn("[MAWM Auth] Authentication for custom user '{}' failed ({}), falling back to configured MAWM user '{}'",
                        username, e.getMessage(), configuredUser);
                return fetchNewTokenForUser(configuredUser);
            }
            log.error("[MAWM Auth] Failed to authenticate user '{}' with MAWM OAuth server: {}", username, e.getMessage(), e);
            throw new RuntimeException("MAWM Authentication failed for user '" + username + "': " + e.getMessage(), e);
        }
    }

    /**
     * Exposes auth status information for health checks and testing.
     */
    public Map<String, Object> getAuthStatus() {
        String defaultUser = mawmProperties.getUsername() != null ? mawmProperties.getUsername() : "lezhilarasan";
        TokenEntry entry = tokenCache.get(defaultUser);
        boolean hasValidToken = entry != null && entry.isValid(60);
        java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("authUrl", mawmProperties.getAuthUrl() != null ? mawmProperties.getAuthUrl() : "");
        map.put("username", defaultUser);
        map.put("hasCachedToken", hasValidToken);
        map.put("tokenExpiresAt", (entry != null && entry.expiry != null) ? entry.expiry.toString() : "");
        map.put("cachedUsers", tokenCache.keySet());
        return map;
    }

    /**
     * Actively tests OAuth connection and returns response latency and token validity.
     */
    public Map<String, Object> testConnection() {
        return testConnection(null);
    }

    public Map<String, Object> testConnection(String username) {
        String effectiveUser = (username != null && !username.isBlank()) ? username.trim() : mawmProperties.getUsername();
        long start = System.currentTimeMillis();
        String token = getAccessToken(effectiveUser);
        long latency = System.currentTimeMillis() - start;
        TokenEntry entry = tokenCache.get(effectiveUser);

        java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("status", "CONNECTED");
        map.put("latencyMs", latency);
        map.put("authUrl", mawmProperties.getAuthUrl() != null ? mawmProperties.getAuthUrl() : "");
        map.put("username", effectiveUser);
        map.put("facility", mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility() : "Food_Cbe");
        map.put("hasValidToken", token != null && !token.isBlank());
        map.put("tokenExpiresAt", (entry != null && entry.expiry != null) ? entry.expiry.toString() : "");
        return map;
    }
}
