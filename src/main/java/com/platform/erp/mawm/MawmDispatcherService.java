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
            // Determine Facility ID (guaranteeing valid MAWM facility, defaulting to Food_Cbe)
            String configuredFacility = (mawmProperties.getDefaultFacility() != null && !mawmProperties.getDefaultFacility().isBlank())
                    ? mawmProperties.getDefaultFacility()
                    : "Food_Cbe";
            String facilityId = (envelope.getFacilityId() != null && envelope.getFacilityId().equalsIgnoreCase(configuredFacility))
                    ? envelope.getFacilityId()
                    : configuredFacility;

            // Prepare payload for MAWM
            // For ASN: MAWM /receiving/api/receiving/asn/save expects the individual ASN object
            Object payloadToSend;
            if (envelope.getData() != null && !envelope.getData().isEmpty()) {
                Map<String, Object> asnMap = envelope.getData().get(0);
                // Ensure DestinationFacilityId matches the facility if not already populated
                if (asnMap.get("DestinationFacilityId") == null || String.valueOf(asnMap.get("DestinationFacilityId")).isBlank()) {
                    asnMap.put("DestinationFacilityId", facilityId);
                }
                payloadToSend = asnMap;
            } else {
                payloadToSend = envelope.toMawmPayload();
            }

            String jsonPayload = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payloadToSend);

            log.info("[MAWM Dispatcher] Dispatching converted ASN to MAWM Cloud Endpoint: {} (TrackingId: {}, Facility: {})",
                    targetEndpoint, trackingId, facilityId);

            // Execute HTTP POST with automatic token regeneration & retry on 401/403 (zero process interruption)
            String responseBody = executeWithAuthRetry(targetEndpoint, facilityId, jsonPayload);

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
     * it immediately invalidates the token, fetches a fresh OAuth2 Bearer token,
     * and retries the dispatch automatically without failing or interrupting the pipeline.
     */
    private String executeWithAuthRetry(String targetEndpoint, String facilityId, String jsonPayload) {
        String bearerToken = mawmAuthService.getAccessToken();
        try {
            return sendToMawm(targetEndpoint, facilityId, bearerToken, jsonPayload);
        } catch (org.springframework.web.client.RestClientResponseException rcre) {
            int statusCode = rcre.getStatusCode().value();
            if (statusCode == 401 || statusCode == 403) {
                log.warn("[MAWM Dispatcher] MAWM Cloud returned HTTP {} Unauthorized (token expired/invalid). " +
                        "Auto-regenerating token and retrying dispatch without interruption...", statusCode);
                mawmAuthService.invalidateToken();
                String freshToken = mawmAuthService.getAccessToken();
                return sendToMawm(targetEndpoint, facilityId, freshToken, jsonPayload);
            }
            throw rcre;
        }
    }

    private String sendToMawm(String targetEndpoint, String facilityId, String bearerToken, String jsonPayload) {
        return restClient.post()
                .uri(targetEndpoint)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + bearerToken)
                .header("selectedLocation", facilityId)
                .header("selectedOrganization", facilityId)
                .header("selectedBusinessUnit", facilityId)
                .body(jsonPayload)
                .retrieve()
                .body(String.class);
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
