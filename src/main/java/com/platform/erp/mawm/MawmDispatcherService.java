package com.platform.erp.mawm;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.store.TransactionStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MawmDispatcherService {

    private static final Logger log = LoggerFactory.getLogger(MawmDispatcherService.class);

    private final MawmProperties mawmProperties;
    private final MawmAuthService mawmAuthService;
    private final TransactionStore transactionStore;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public MawmDispatcherService(MawmProperties mawmProperties,
                                 MawmAuthService mawmAuthService,
                                 TransactionStore transactionStore,
                                 ObjectMapper objectMapper) {
        this.mawmProperties = mawmProperties;
        this.mawmAuthService = mawmAuthService;
        this.transactionStore = transactionStore;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public void dispatch(CanonicalEnvelope envelope) {
        if (envelope == null) return;
        String trackingId = envelope.getTrackingId();

        // STRICT BUSINESS RULE: Only Opti ERP hot dispatches to MAWM Cloud REST API
        String source = envelope.getErpSource();
        boolean isOpti = source != null && ("Opti".equalsIgnoreCase(source) || "OPTI".equalsIgnoreCase(source) || "OTPI".equalsIgnoreCase(source));
        if (!isOpti) {
            log.info("[MAWM Dispatcher] Hot dispatch to live MAWM Cloud skipped for non-Opti source '{}'. Converted Canonical JSON saved. TrackingId: {}", source, trackingId);
            int count = (envelope.getData() != null && !envelope.getData().isEmpty()) ? envelope.getData().size() : 1;
            transactionStore.recordMawmStatus(trackingId, "CONVERTED (Opti Exclusive)", count, 0,
                    "{\"status\":\"CONVERTED\",\"hotDispatch\":false,\"erpSource\":\"" + source + "\",\"message\":\"Converted to MAWM Canonical JSON. Hot dispatch is exclusive to Opti.\"}");
            return;
        }

        if (!mawmProperties.isEnabled()) {
            log.info("[MAWM Dispatcher] MAWM client is currently paused (mawm.client.enabled=false). " +
                    "Converted JSON for TrackingId: {} is saved and ready for live cloud endpoint.", trackingId);
            transactionStore.recordMawmStatus(trackingId, "SAVED_AWAITING_ENDPOINT");
            return;
        }

        String targetEndpoint = mawmProperties.getBaseUrl() +
                ("ASN".equalsIgnoreCase(envelope.getDocumentType()) ? mawmProperties.getAsnPath() : mawmProperties.getPoPath());

        try {
            // Extract DestinationFacilityId directly from data records or envelope (mandatory for MAWM headers)
            String destinationFacilityId = null;
            if (envelope.getData() != null && !envelope.getData().isEmpty()) {
                Map<String, Object> first = envelope.getData().get(0);
                if (first.get("DestinationFacilityId") != null && !String.valueOf(first.get("DestinationFacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("DestinationFacilityId")).trim();
                } else if (first.get("destinationFacilityId") != null && !String.valueOf(first.get("destinationFacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("destinationFacilityId")).trim();
                }
            }
            if (destinationFacilityId == null && envelope.getRecords() != null && !envelope.getRecords().isEmpty()) {
                Map<String, Object> first = envelope.getRecords().get(0);
                if (first.get("DestinationFacilityId") != null && !String.valueOf(first.get("DestinationFacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("DestinationFacilityId")).trim();
                } else if (first.get("destinationFacilityId") != null && !String.valueOf(first.get("destinationFacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("destinationFacilityId")).trim();
                }
            }
            if (destinationFacilityId == null || destinationFacilityId.isBlank()) {
                destinationFacilityId = (envelope.getFacilityId() != null && !envelope.getFacilityId().isBlank())
                        ? envelope.getFacilityId().trim()
                        : (mawmProperties.getDefaultFacility() != null && !mawmProperties.getDefaultFacility().isBlank()
                            ? mawmProperties.getDefaultFacility().trim()
                            : "Food_Cbe");
            }

            // Extract CreatedBy username if present in ingestion payload; else default to app properties
            String effectiveUsername = (envelope.getCreatedBy() != null && !envelope.getCreatedBy().isBlank())
                    ? envelope.getCreatedBy().trim()
                    : mawmProperties.getUsername();

            // Prepare payload for MAWM
            // For ASN: MAWM /receiving/api/receiving/asn/save expects the individual ASN object
            Object payloadToSend;
            if (envelope.getData() != null && !envelope.getData().isEmpty()) {
                Map<String, Object> asnMap = envelope.getData().get(0);
                // Ensure DestinationFacilityId matches if not already populated
                if (asnMap.get("DestinationFacilityId") == null || String.valueOf(asnMap.get("DestinationFacilityId")).isBlank()) {
                    asnMap.put("DestinationFacilityId", destinationFacilityId);
                }
                payloadToSend = asnMap;
            } else {
                payloadToSend = envelope.toMawmPayload();
            }

            String jsonPayload = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payloadToSend);

            log.info("[MAWM Dispatcher] Dispatching converted ASN to MAWM Cloud Endpoint: {} (TrackingId: {}, DestinationFacilityId: {}, User: {})",
                    targetEndpoint, trackingId, destinationFacilityId, effectiveUsername);

            // Execute HTTP POST with automatic token regeneration & retry on 401/403 (zero process interruption)
            String responseBody = executeWithAuthRetry(targetEndpoint, destinationFacilityId, effectiveUsername, jsonPayload);

            int count = (envelope.getData() != null && !envelope.getData().isEmpty()) ? envelope.getData().size() : 1;
            log.info("[MAWM Dispatcher] MAWM Cloud acknowledged receipt for TrackingId: {}. Response: {}",
                    trackingId, responseBody);
            transactionStore.recordMawmStatus(trackingId, "DELIVERED_TO_MAWM (200 OK)", count, 0, responseBody);

        } catch (Exception ex) {
            log.error("[MAWM Dispatcher] Failed delivering JSON to MAWM endpoint {}: {}", targetEndpoint, ex.getMessage(), ex);
            int count = (envelope.getData() != null && !envelope.getData().isEmpty()) ? envelope.getData().size() : 1;
            String errorSummary = ex.getMessage() != null ? ex.getMessage() : "Unknown dispatch error";
            String errorResponseBody = null;
            if (ex instanceof org.springframework.web.client.RestClientResponseException rcre) {
                errorResponseBody = rcre.getResponseBodyAsString();
            }
            transactionStore.recordMawmFailure(trackingId, errorSummary, count, errorResponseBody);
        }
    }

    /**
     * Executes HTTP POST to MAWM with zero-interruption automatic token retry.
     * If MAWM rejects the request with 401 or 403 (token expired/revoked),
     * it immediately invalidates the token for the user, fetches a fresh OAuth2 Bearer token,
     * and retries the dispatch automatically without failing or interrupting the pipeline.
     */
    private String executeWithAuthRetry(String targetEndpoint, String destinationFacilityId, String username, String jsonPayload) {
        String bearerToken = mawmAuthService.getAccessToken(username);
        try {
            return sendToMawm(targetEndpoint, destinationFacilityId, bearerToken, jsonPayload);
        } catch (RestClientResponseException rcre) {
            int statusCode = rcre.getStatusCode().value();
            if (statusCode == 401 || statusCode == 403) {
                log.warn("[MAWM Dispatcher] MAWM Cloud returned HTTP {} Unauthorized for user '{}'. " +
                        "Auto-regenerating token and retrying dispatch without interruption...", statusCode, username);
                mawmAuthService.invalidateToken(username);
                String freshToken = mawmAuthService.getAccessToken(username);
                return sendToMawm(targetEndpoint, destinationFacilityId, freshToken, jsonPayload);
            }
            throw rcre;
        }
    }

    private String sendToMawm(String targetEndpoint, String destinationFacilityId, String bearerToken, String jsonPayload) {
        return restClient.post()
                .uri(targetEndpoint)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + bearerToken)
                .header("selectedLocation", destinationFacilityId)
                .header("selectedOrganization", destinationFacilityId)
                .header("selectedBusinessUnit", destinationFacilityId)
                .body(jsonPayload)
                .retrieve()
                .body(String.class);
    }

    /**
     * Checks ASN verification status in MAWM Cloud using /receiving/api/receiving/asn/search
     * Query: AsnId in ('<AsnId>')
     * Returns: { "data": [ { "AsnId": "...", "AsnStatus": "8000" } ] } where 8000 = Verified
     */
    public Map<String, Object> searchAsnStatus(String asnId, String destinationFacilityId, String username) {
        if (asnId == null || asnId.isBlank()) {
            return Map.of("success", false, "error", "AsnId is mandatory for verification search");
        }

        String facility = (destinationFacilityId != null && !destinationFacilityId.isBlank())
                ? destinationFacilityId.trim()
                : (mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe");

        String effectiveUsername = (username != null && !username.isBlank())
                ? username.trim()
                : mawmProperties.getUsername();

        String searchEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getAsnSearchPath();

        Map<String, Object> requestPayload = Map.of(
                "Query", "AsnId in ('" + asnId.trim() + "')",
                "Template", Map.of(
                        "AsnId", "",
                        "AsnStatus", ""
                )
        );

        try {
            String jsonPayload = objectMapper.writeValueAsString(requestPayload);
            log.info("[MAWM Search] Checking verification status for AsnId: '{}' at {} (Facility: {}, User: {})",
                    asnId, searchEndpoint, facility, effectiveUsername);

            String responseBody = executeWithAuthRetry(searchEndpoint, facility, effectiveUsername, jsonPayload);

            JsonNode rootNode = objectMapper.readTree(responseBody);
            String asnStatus = null;
            boolean isVerified = false;

            if (rootNode.has("data") && rootNode.get("data").isArray() && rootNode.get("data").size() > 0) {
                JsonNode firstMatch = rootNode.get("data").get(0);
                if (firstMatch.has("AsnStatus")) {
                    asnStatus = firstMatch.get("AsnStatus").asText();
                    isVerified = "8000".equals(asnStatus);
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("asnId", asnId.trim());
            result.put("asnStatus", asnStatus != null ? asnStatus : "UNKNOWN");
            result.put("isVerified", isVerified);
            result.put("statusDescription", isVerified ? "8000 - Verified in MAWM" : ("Status: " + (asnStatus != null ? asnStatus : "Pending")));
            result.put("rawResponse", responseBody);
            result.put("endpoint", searchEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("queryPayload", requestPayload);
            return result;

        } catch (Exception ex) {
            log.error("[MAWM Search] Failed searching ASN verification for {}: {}", asnId, ex.getMessage(), ex);
            int statusCode = 500;
            String rawErrorBody = null;
            if (ex instanceof RestClientResponseException rcre) {
                statusCode = rcre.getStatusCode().value();
                rawErrorBody = rcre.getResponseBodyAsString();
            }
            String cleanMessage = extractCleanErrorMessage(rawErrorBody, statusCode, facility, effectiveUsername);
            Map<String, Object> errResult = new LinkedHashMap<>();
            errResult.put("success", false);
            errResult.put("asnId", asnId);
            errResult.put("statusCode", statusCode);
            errResult.put("error", cleanMessage);
            errResult.put("cleanError", cleanMessage);
            errResult.put("endpoint", searchEndpoint);
            errResult.put("facilityId", facility);
            errResult.put("username", effectiveUsername);
            if (rawErrorBody != null && !rawErrorBody.isBlank()) {
                errResult.put("rawResponse", rawErrorBody);
            }
            return errResult;
        }
    }

    /**
     * Directly creates / saves an ASN in MAWM Cloud (5.4.1 /receiving/api/receiving/asn/save)
     */
    public Map<String, Object> saveAsnDirect(Map<String, Object> asnPayload, String username) {
        String targetEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getAsnPath();
        String facility = null;
        if (asnPayload != null && asnPayload.get("DestinationFacilityId") != null) {
            facility = String.valueOf(asnPayload.get("DestinationFacilityId")).trim();
        }
        if (facility == null || facility.isBlank()) {
            facility = mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe";
        }
        String effectiveUsername = (username != null && !username.isBlank())
                ? username.trim()
                : (asnPayload != null && asnPayload.get("CreatedBy") != null
                    ? String.valueOf(asnPayload.get("CreatedBy")).trim()
                    : mawmProperties.getUsername());

        try {
            String jsonPayload = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(asnPayload);
            log.info("[MAWM Direct Save] Saving ASN to {} (Facility: {}, User: {})", targetEndpoint, facility, effectiveUsername);
            String responseBody = executeWithAuthRetry(targetEndpoint, facility, effectiveUsername, jsonPayload);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("endpoint", targetEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("message", "200 OK - ASN Saved Successfully in MAWM");
            result.put("rawResponse", responseBody);
            return result;
        } catch (Exception ex) {
            log.error("[MAWM Direct Save] Failed saving ASN to {}: {}", targetEndpoint, ex.getMessage(), ex);
            int statusCode = 500;
            String rawErrorBody = null;
            if (ex instanceof RestClientResponseException rcre) {
                statusCode = rcre.getStatusCode().value();
                rawErrorBody = rcre.getResponseBodyAsString();
            }
            String cleanMessage = extractCleanErrorMessage(rawErrorBody, statusCode, facility, effectiveUsername);
            Map<String, Object> errResult = new LinkedHashMap<>();
            errResult.put("success", false);
            errResult.put("statusCode", statusCode);
            errResult.put("error", cleanMessage);
            errResult.put("cleanError", cleanMessage);
            errResult.put("endpoint", targetEndpoint);
            errResult.put("facilityId", facility);
            errResult.put("username", effectiveUsername);
            if (rawErrorBody != null && !rawErrorBody.isBlank()) {
                errResult.put("rawResponse", rawErrorBody);
            }
            return errResult;
        }
    }

    public String extractCleanErrorMessage(String rawErrorBody, int statusCode, String facility, String username) {
        if (rawErrorBody == null || rawErrorBody.isBlank()) {
            return "HTTP " + statusCode + " error from MAWM Cloud (" + (facility != null ? facility : "default") + ").";
        }
        try {
            JsonNode root = objectMapper.readTree(rawErrorBody);
            if (root.has("exceptions") && root.get("exceptions").isArray() && root.get("exceptions").size() > 0) {
                JsonNode exc = root.get("exceptions").get(0);
                if (exc.has("message") && !exc.get("message").asText().isBlank()) {
                    String msg = exc.get("message").asText();
                    if (msg.contains("ManhRuntimeException:")) {
                        return msg.substring(msg.indexOf("ManhRuntimeException:") + "ManhRuntimeException:".length()).trim();
                    }
                    if (msg.contains("Exception:")) {
                        return msg.substring(msg.indexOf("Exception:") + "Exception:".length()).trim();
                    }
                    return msg.trim();
                }
            }
            if (root.has("errors") && root.get("errors").isArray() && root.get("errors").size() > 0) {
                JsonNode err = root.get("errors").get(0);
                if (err.has("Description") && !err.get("Description").asText().isBlank()) return err.get("Description").asText().trim();
                if (err.has("description") && !err.get("description").asText().isBlank()) return err.get("description").asText().trim();
                if (err.has("message") && !err.get("message").asText().isBlank()) return err.get("message").asText().trim();
            }
            if (root.has("message") && !root.get("message").asText().isBlank() && !"error.500".equals(root.get("message").asText())) {
                return root.get("message").asText().trim();
            }
        } catch (Exception ignored) {}

        return "HTTP " + statusCode + " response from MAWM Cloud (" + (facility != null ? facility : "default") + ").";
    }

    /**
     * Verifies the ASN status for a specific integration job by inspecting its payload and querying MAWM.
     */
    public Map<String, Object> verifyJobAsn(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) {
            return Map.of("success", false, "error", "Job not found: " + jobId);
        }
        var tracker = optTracker.get();
        String source = tracker.getSourceSystem();
        boolean isOpti = source != null && ("Opti".equalsIgnoreCase(source) || "OPTI".equalsIgnoreCase(source) || "OTPI".equalsIgnoreCase(source));
        if (!isOpti) {
            log.info("[MAWM Search] Live cloud verification is exclusive to Opti ERP feeds. Non-Opti source: '{}', JobId: {}", source, jobId);
            return Map.of(
                    "success", true,
                    "isOptiExclusive", true,
                    "message", "Conversion active. Live MAWM Cloud search verification is exclusive to Opti ERP.",
                    "statusDescription", "CONVERTED (Opti Exclusive)"
            );
        }

        String outputFiles = tracker.getOutputFiles();
        String rawContent = tracker.getRawContent();

        String asnId = null;
        String destinationFacility = tracker.getFacilityId();
        String createdBy = tracker.getCreatedBy();

        // Extract AsnId and DestinationFacilityId from converted outputFiles
        if (outputFiles != null && !outputFiles.isBlank() && !outputFiles.startsWith("[CLAIM_CHECK:")) {
            try {
                JsonNode root = objectMapper.readTree(outputFiles);
                JsonNode dataNode = root.has("Data") ? root.get("Data") : (root.has("data") ? root.get("data") : root);
                if (dataNode.isArray() && dataNode.size() > 0) {
                    JsonNode first = dataNode.get(0);
                    if (first.has("AsnId")) asnId = first.get("AsnId").asText();
                    else if (first.has("asnId")) asnId = first.get("asnId").asText();

                    if (destinationFacility == null || destinationFacility.isBlank()) {
                        if (first.has("DestinationFacilityId")) destinationFacility = first.get("DestinationFacilityId").asText();
                    }
                    if (createdBy == null || createdBy.isBlank()) {
                        if (first.has("CreatedBy")) createdBy = first.get("CreatedBy").asText();
                    }
                } else if (dataNode.isObject()) {
                    if (dataNode.has("AsnId")) asnId = dataNode.get("AsnId").asText();
                    else if (dataNode.has("asnId")) asnId = dataNode.get("asnId").asText();

                    if (destinationFacility == null || destinationFacility.isBlank()) {
                        if (dataNode.has("DestinationFacilityId")) destinationFacility = dataNode.get("DestinationFacilityId").asText();
                    }
                    if (createdBy == null || createdBy.isBlank()) {
                        if (dataNode.has("CreatedBy")) createdBy = dataNode.get("CreatedBy").asText();
                    }
                }
            } catch (Exception ignored) {}
        }

        // Fallback from rawContent
        if (asnId == null && rawContent != null && !rawContent.isBlank() && !rawContent.startsWith("[CLAIM_CHECK:")) {
            try {
                JsonNode root = objectMapper.readTree(rawContent);
                if (root.has("AsnId")) asnId = root.get("AsnId").asText();
                else if (root.has("asnId")) asnId = root.get("asnId").asText();
            } catch (Exception ignored) {}
        }

        if (asnId == null || asnId.isBlank()) {
            asnId = tracker.getJobId();
        }

        Map<String, Object> searchResult = searchAsnStatus(asnId, destinationFacility, createdBy);
        if (Boolean.TRUE.equals(searchResult.get("success"))) {
            String statusDesc = (String) searchResult.get("statusDescription");
            transactionStore.recordMawmAsnStatus(jobId, statusDesc);
        }
        return searchResult;
    }

    /**
     * Manually triggers or retries dispatch to MAWM Cloud using the converted JSON stored in PostgreSQL.
     */
    public Map<String, Object> dispatchJob(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) {
            return Map.of("success", false, "error", "Job not found: " + jobId);
        }
        var tracker = optTracker.get();
        String source = tracker.getSourceSystem();
        boolean isOpti = source != null && ("Opti".equalsIgnoreCase(source) || "OPTI".equalsIgnoreCase(source) || "OTPI".equalsIgnoreCase(source));
        if (!isOpti) {
            log.info("[MAWM Dispatcher] Live cloud dispatch is exclusive to Opti ERP feeds. Non-Opti source: '{}', JobId: {}", source, jobId);
            return Map.of("success", true, "message", "Conversion active. Hot dispatch to MAWM Cloud REST API is exclusive to Opti ERP.", "dispatchStatus", "CONVERTED (Opti Exclusive)");
        }
        String outputFiles = tracker.getOutputFiles();
        if (outputFiles == null || outputFiles.isBlank()) {
            return Map.of("success", false, "error", "No converted JSON available for jobId: " + jobId);
        }

        try {
            CanonicalEnvelope envelope = new CanonicalEnvelope();
            envelope.setTrackingId(jobId);
            envelope.setDocumentType(tracker.getTransactionType());
            envelope.setFacilityId(tracker.getFacilityId());
            envelope.setErpSource(tracker.getSourceSystem());
            envelope.setCreatedBy(tracker.getCreatedBy());

            JsonNode root = objectMapper.readTree(outputFiles);
            if (root.has("Data") && root.get("Data").isArray()) {
                List<Map<String, Object>> dataList = objectMapper.convertValue(root.get("Data"), new TypeReference<List<Map<String, Object>>>() {});
                envelope.setData(dataList);
            } else if (root.isObject()) {
                Map<String, Object> map = objectMapper.convertValue(root, new TypeReference<Map<String, Object>>() {});
                envelope.setData(List.of(map));
            }

            dispatch(envelope);

            var updated = transactionStore.getTracker(jobId).orElse(tracker);
            boolean isSuccess = updated.getDispatchStatus() != null && updated.getDispatchStatus().startsWith("DELIVERED");
            java.util.Map<String, Object> result = new java.util.HashMap<>();
            result.put("success", isSuccess);
            result.put("dispatchStatus", updated.getDispatchStatus() != null ? updated.getDispatchStatus() : "UNKNOWN");
            result.put("mawmResponse", updated.getMawmResponse() != null ? updated.getMawmResponse() : "");
            result.put("jobId", jobId);
            return result;
        } catch (Exception e) {
            log.error("[MAWM Dispatcher] Manual dispatch failed for jobId {}: {}", jobId, e.getMessage(), e);
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    public MawmProperties getMawmProperties() {
        return mawmProperties;
    }

    public MawmAuthService getMawmAuthService() {
        return mawmAuthService;
    }
}
