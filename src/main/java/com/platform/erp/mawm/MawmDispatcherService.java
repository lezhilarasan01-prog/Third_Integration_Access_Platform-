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
import org.springframework.web.util.UriComponentsBuilder;

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
        boolean isOpti = source != null && ("Opti".equalsIgnoreCase(source) || "OPTI".equalsIgnoreCase(source));
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

        boolean isItem = "ITEM".equalsIgnoreCase(envelope.getDocumentType()) || "ITEM_MASTER".equalsIgnoreCase(envelope.getDocumentType());
        boolean isAsn = "ASN".equalsIgnoreCase(envelope.getDocumentType());

        String targetEndpoint = mawmProperties.getBaseUrl() +
                (isItem ? mawmProperties.getItemPath() : isAsn ? mawmProperties.getAsnPath() : mawmProperties.getPoPath());

        try {
            // Extract DestinationFacilityId directly from data records or envelope (mandatory for MAWM headers)
            String destinationFacilityId = null;
            if (envelope.getData() != null && !envelope.getData().isEmpty()) {
                Map<String, Object> first = envelope.getData().get(0);
                if (first.get("DestinationFacilityId") != null && !String.valueOf(first.get("DestinationFacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("DestinationFacilityId")).trim();
                } else if (first.get("destinationFacilityId") != null && !String.valueOf(first.get("destinationFacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("destinationFacilityId")).trim();
                } else if (first.get("FacilityId") != null && !String.valueOf(first.get("FacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("FacilityId")).trim();
                }
            }
            if (destinationFacilityId == null && envelope.getRecords() != null && !envelope.getRecords().isEmpty()) {
                Map<String, Object> first = envelope.getRecords().get(0);
                if (first.get("DestinationFacilityId") != null && !String.valueOf(first.get("DestinationFacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("DestinationFacilityId")).trim();
                } else if (first.get("destinationFacilityId") != null && !String.valueOf(first.get("destinationFacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("destinationFacilityId")).trim();
                } else if (first.get("FacilityId") != null && !String.valueOf(first.get("FacilityId")).isBlank()) {
                    destinationFacilityId = String.valueOf(first.get("FacilityId")).trim();
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
            // For ITEM: MAWM /item-master/api/item-master/item/save expects the individual Item object
            // For ASN: MAWM /receiving/api/receiving/asn/save expects the individual ASN object
            // For PO: MAWM /receiving/api/receiving/purchaseOrder/save expects { "Data": [ ... ] } or individual object
            Object payloadToSend;
            if (isItem) {
                if (envelope.getData() != null && !envelope.getData().isEmpty()) {
                    payloadToSend = envelope.getData().get(0);
                } else if (envelope.getRecords() != null && !envelope.getRecords().isEmpty()) {
                    payloadToSend = envelope.getRecords().get(0);
                } else {
                    payloadToSend = envelope.toMawmPayload();
                }
            } else if (isAsn) {
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
            } else {
                if (envelope.getData() != null && !envelope.getData().isEmpty()) {
                    payloadToSend = Map.of("Data", envelope.getData());
                } else {
                    payloadToSend = envelope.toMawmPayload();
                }
            }

            String jsonPayload = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payloadToSend);

            log.info("[MAWM Dispatcher] Dispatching converted {} to MAWM Cloud Endpoint: {} (TrackingId: {}, Facility: {}, User: {})",
                    (isItem ? "ITEM" : isAsn ? "ASN" : "PO"), targetEndpoint, trackingId, destinationFacilityId, effectiveUsername);

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

    private String executeWithAuthRetryGet(String targetEndpoint, String destinationFacilityId, String username, Map<String, String> queryParams) {
        String bearerToken = mawmAuthService.getAccessToken(username);
        try {
            return sendToMawmGet(targetEndpoint, destinationFacilityId, bearerToken, queryParams);
        } catch (RestClientResponseException rcre) {
            int statusCode = rcre.getStatusCode().value();
            if (statusCode == 401 || statusCode == 403) {
                log.warn("[MAWM Dispatcher] MAWM Cloud returned HTTP {} Unauthorized for GET user '{}'. Auto-regenerating token and retrying...", statusCode, username);
                mawmAuthService.invalidateToken(username);
                String freshToken = mawmAuthService.getAccessToken(username);
                return sendToMawmGet(targetEndpoint, destinationFacilityId, freshToken, queryParams);
            }
            throw rcre;
        }
    }

    private String sendToMawmGet(String targetEndpoint, String destinationFacilityId, String bearerToken, Map<String, String> queryParams) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(targetEndpoint);
        if (queryParams != null) {
            queryParams.forEach((k, v) -> {
                if (k != null && v != null && !k.isBlank()) {
                    builder.queryParam(k, v);
                }
            });
        }
        return restClient.get()
                .uri(builder.build().toUri())
                .header("Authorization", "Bearer " + bearerToken)
                .header("selectedLocation", destinationFacilityId)
                .header("selectedOrganization", destinationFacilityId)
                .header("selectedBusinessUnit", destinationFacilityId)
                .retrieve()
                .body(String.class);
    }

    /**
     * Dynamic Search for ASN (5.4.2 /receiving/api/receiving/asn/search)
     * Handles arbitrary dynamic JSON payloads from ERPs (Query + Template).
     */
    public Map<String, Object> searchAsnDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        String targetEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getAsnSearchPath();
        return executeDynamicSearch(targetEndpoint, "ASN", facility, username, body, "AsnId", storeTracker);
    }

    /**
     * Dynamic Search for Purchase Orders (5.3.2 /receiving/api/receiving/purchaseOrder/search)
     * Handles arbitrary dynamic JSON payloads from ERPs (Query + Template).
     */
    public Map<String, Object> searchPoDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        String targetEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getPoSearchPath();
        return executeDynamicSearch(targetEndpoint, "PO", facility, username, body, "PurchaseOrderId", storeTracker);
    }

    /**
     * Dynamic Search for Purchase Order Lines (5.3.3 /receiving/api/receiving/purchaseOrderLine/search)
     * Handles arbitrary dynamic JSON payloads from ERPs (Query + Template).
     */
    public Map<String, Object> searchPoLineDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        String targetEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getPoLineSearchPath();
        return executeDynamicSearch(targetEndpoint, "PO_LINE", facility, username, body, "PurchaseOrderId", storeTracker);
    }

    /**
     * Dynamic Search for PO Associated ASN Lines (5.3.4 /receiving/api/receiving/asnLine/search)
     * Handles arbitrary dynamic JSON payloads from ERPs (Query + Template).
     */
    public Map<String, Object> searchPoAsnLineDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        String targetEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getAsnLineSearchPath();
        return executeDynamicSearch(targetEndpoint, "ASN_LINE", facility, username, body, "PurchaseOrderId", storeTracker);
    }

    /**
     * Inbound Sync: Dynamic GET to Fetch Items from MAWM (/item-master/api/item-master/item)
     * Accepts dynamic query parameters (query filters like UpdatedTimestamp>..., page, size, needTotalCount).
     */
    public Map<String, Object> fetchItemsDynamic(String facilityId, String username, Map<String, String> queryParams, boolean storeTracker) {
        String targetEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getItemQueryPath();
        String facility = (facilityId != null && !facilityId.isBlank())
                ? facilityId.trim()
                : (mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe");
        String effectiveUsername = (username != null && !username.isBlank())
                ? username.trim()
                : mawmProperties.getUsername();

        Map<String, String> params = new LinkedHashMap<>();
        params.put("page", "0");
        params.put("size", "1000");
        params.put("needTotalCount", "true");
        if (queryParams != null) {
            params.putAll(queryParams);
        }

        try {
            log.info("[MAWM Inbound Sync] Fetching items from {} with params {} (Facility: {}, User: {})",
                    targetEndpoint, params, facility, effectiveUsername);
            long startTime = System.currentTimeMillis();
            String responseBody = executeWithAuthRetryGet(targetEndpoint, facility, effectiveUsername, params);
            long latencyMs = System.currentTimeMillis() - startTime;

            JsonNode rootNode = objectMapper.readTree(responseBody);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("statusCode", 200);
            result.put("endpoint", targetEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("latencyMs", latencyMs);
            result.put("queryParams", params);
            result.put("rawResponse", responseBody);

            if (rootNode.has("data")) {
                result.put("data", rootNode.get("data"));
            } else {
                result.put("data", rootNode);
            }
            if (rootNode.has("totalCount")) {
                result.put("totalCount", rootNode.get("totalCount").asInt());
            }

            if (storeTracker) {
                String trackingId = java.util.UUID.randomUUID().toString();
                String querySummary = "GET " + targetEndpoint + "?" + params.toString();
                transactionStore.recordQueryAudit(trackingId, "ITEM", facility, effectiveUsername, querySummary, responseBody, "DELIVERED_TO_MAWM (200 OK)");
                result.put("jobId", trackingId);
            }

            return result;
        } catch (Exception ex) {
            log.error("[MAWM Inbound Sync] Failed fetching items from {}: {}", targetEndpoint, ex.getMessage(), ex);
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
            if (storeTracker) {
                String trackingId = java.util.UUID.randomUUID().toString();
                transactionStore.recordQueryAudit(trackingId, "ITEM", facility, effectiveUsername, params.toString(), rawErrorBody != null ? rawErrorBody : cleanMessage, "DISPATCH_FAILED (" + statusCode + ")");
                errResult.put("jobId", trackingId);
            }
            return errResult;
        }
    }

    /**
     * Executes arbitrary dynamic JSON search against MAWM Cloud.
     * Zero-loss schema passthrough: accepts arbitrary Query and Template fields.
     */
    public Map<String, Object> executeDynamicSearch(String targetEndpoint, String docType, String destinationFacilityId, String username, JsonNode bodyNode, String defaultQueryField, boolean storeTracker) {
        String facility = resolveDynamicFacility(destinationFacilityId, bodyNode);
        String effectiveUsername = resolveDynamicUsername(username, bodyNode);

        try {
            String jsonPayload;
            if (bodyNode == null || bodyNode.isNull() || bodyNode.isEmpty()) {
                throw new IllegalArgumentException("Request payload cannot be empty for MAWM search");
            }

            // Check if Query already present
            boolean hasQuery = bodyNode.has("Query") || bodyNode.has("query");
            if (hasQuery) {
                // Pass directly to MAWM verbatim
                jsonPayload = objectMapper.writeValueAsString(bodyNode);
            } else {
                // Adaptive smart synthesis: construct Query & Template from shorthand fields
                Map<String, Object> synthesized = synthesizeManhattanQuery(bodyNode, defaultQueryField);
                jsonPayload = objectMapper.writeValueAsString(synthesized);
            }

            log.info("[MAWM Dynamic Search] Forwarding dynamic search to {} (Facility: {}, User: {}) - Payload: {}",
                    targetEndpoint, facility, effectiveUsername, jsonPayload);

            long startTime = System.currentTimeMillis();
            String responseBody = executeWithAuthRetry(targetEndpoint, facility, effectiveUsername, jsonPayload);
            long latencyMs = System.currentTimeMillis() - startTime;

            JsonNode rootNode = objectMapper.readTree(responseBody);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("statusCode", 200);
            result.put("endpoint", targetEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("latencyMs", latencyMs);
            result.put("rawResponse", responseBody);

            if (rootNode.has("data")) {
                result.put("data", rootNode.get("data"));
            } else {
                result.put("data", rootNode);
            }
            if (rootNode.has("totalCount")) {
                result.put("totalCount", rootNode.get("totalCount").asInt());
            }

            if (storeTracker) {
                String trackingId = java.util.UUID.randomUUID().toString();
                transactionStore.recordQueryAudit(trackingId, docType, facility, effectiveUsername, jsonPayload, responseBody, "DELIVERED_TO_MAWM (200 OK)");
                result.put("jobId", trackingId);
            }

            return result;
        } catch (Exception ex) {
            log.error("[MAWM Dynamic Search] Failed query to {}: {}", targetEndpoint, ex.getMessage(), ex);
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
            if (storeTracker) {
                String trackingId = java.util.UUID.randomUUID().toString();
                String payloadSummary = bodyNode != null ? bodyNode.toString() : "empty";
                transactionStore.recordQueryAudit(trackingId, docType, facility, effectiveUsername, payloadSummary, rawErrorBody != null ? rawErrorBody : cleanMessage, "DISPATCH_FAILED (" + statusCode + ")");
                errResult.put("jobId", trackingId);
            }
            return errResult;
        }
    }

    private Map<String, Object> synthesizeManhattanQuery(JsonNode node, String defaultQueryField) {
        Map<String, Object> result = new LinkedHashMap<>();

        // 1. Determine Query string
        String queryString = null;
        if ("AsnId".equalsIgnoreCase(defaultQueryField)) {
            String val = node.has("AsnId") ? node.get("AsnId").asText() : (node.has("asnId") ? node.get("asnId").asText() : "");
            if (!val.isBlank()) {
                queryString = "AsnId in ('" + val.trim() + "')";
            }
        } else if ("PurchaseOrderId".equalsIgnoreCase(defaultQueryField)) {
            String val = node.has("PurchaseOrderId") ? node.get("PurchaseOrderId").asText() : (node.has("purchaseOrderId") ? node.get("purchaseOrderId").asText() : "");
            if (!val.isBlank()) {
                queryString = "PurchaseOrderId='" + val.trim() + "'";
            }
        }

        if (queryString == null || queryString.isBlank()) {
            queryString = "1=1";
        }
        result.put("Query", queryString);

        // 2. Determine Template
        if (node.has("Template") && node.get("Template").isObject()) {
            result.put("Template", objectMapper.convertValue(node.get("Template"), Map.class));
        } else if (node.has("fields") && node.get("fields").isArray()) {
            Map<String, String> template = new LinkedHashMap<>();
            node.get("fields").forEach(f -> template.put(f.asText(), ""));
            result.put("Template", template);
        } else if ("AsnId".equalsIgnoreCase(defaultQueryField)) {
            result.put("Template", Map.of("AsnId", "", "AsnStatus", ""));
        } else if ("PurchaseOrderId".equalsIgnoreCase(defaultQueryField)) {
            result.put("Template", Map.of("PurchaseOrderId", "", "PurchaseOrderStatus", "", "PurchaseOrderStatusDescription", ""));
        } else {
            result.put("Template", Map.of());
        }

        return result;
    }

    private String resolveDynamicFacility(String destinationFacilityId, JsonNode bodyNode) {
        if (destinationFacilityId != null && !destinationFacilityId.isBlank()) {
            return destinationFacilityId.trim();
        }
        if (bodyNode != null && bodyNode.isObject()) {
            if (bodyNode.has("DestinationFacilityId") && !bodyNode.get("DestinationFacilityId").asText().isBlank()) {
                return bodyNode.get("DestinationFacilityId").asText().trim();
            }
            if (bodyNode.has("FacilityId") && !bodyNode.get("FacilityId").asText().isBlank()) {
                return bodyNode.get("FacilityId").asText().trim();
            }
        }
        return (mawmProperties.getDefaultFacility() != null && !mawmProperties.getDefaultFacility().isBlank())
                ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe";
    }

    private String resolveDynamicUsername(String username, JsonNode bodyNode) {
        if (username != null && !username.isBlank()) {
            return username.trim();
        }
        if (bodyNode != null && bodyNode.isObject()) {
            if (bodyNode.has("CreatedBy") && !bodyNode.get("CreatedBy").asText().isBlank()) {
                return bodyNode.get("CreatedBy").asText().trim();
            }
            if (bodyNode.has("username") && !bodyNode.get("username").asText().isBlank()) {
                return bodyNode.get("username").asText().trim();
            }
        }
        return mawmProperties.getUsername();
    }

    /**
     * Checks ASN verification status in MAWM Cloud using /receiving/api/receiving/asn/search
     * Query: AsnId in ('<AsnId>')
     * Returns: { "data": [ { "AsnId": "...", "AsnStatus": "..." } ] } containing the actual MAWM status
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
            String statusDescription = null;

            if (rootNode.has("data") && rootNode.get("data").isArray() && rootNode.get("data").size() > 0) {
                JsonNode firstMatch = rootNode.get("data").get(0);
                if (firstMatch.has("AsnStatus")) {
                    asnStatus = firstMatch.get("AsnStatus").asText();
                }
                if (firstMatch.has("StatusDescription")) {
                    statusDescription = firstMatch.get("StatusDescription").asText();
                } else if (firstMatch.has("AsnStatusDescription")) {
                    statusDescription = firstMatch.get("AsnStatusDescription").asText();
                } else if (firstMatch.has("Description")) {
                    statusDescription = firstMatch.get("Description").asText();
                } else {
                    statusDescription = asnStatus;
                }
            }

            String configuredVerifiedStatus = mawmProperties.getVerifiedStatus();
            boolean isVerified = configuredVerifiedStatus != null && !configuredVerifiedStatus.isBlank()
                    && configuredVerifiedStatus.equalsIgnoreCase(asnStatus);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("asnId", asnId.trim());
            result.put("asnStatus", asnStatus != null ? asnStatus : "UNKNOWN");
            result.put("isVerified", isVerified);
            result.put("statusDescription", statusDescription != null ? statusDescription : (asnStatus != null ? asnStatus : "NO_RECORD_FOUND"));
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
     * Directly creates / saves a Purchase Order in MAWM Cloud (5.3.1 /receiving/api/receiving/purchaseOrder/save)
     */
    public Map<String, Object> savePoDirect(Map<String, Object> poPayload, String username) {
        String targetEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getPoPath();
        String facility = null;
        if (poPayload != null && poPayload.get("DestinationFacilityId") != null) {
            facility = String.valueOf(poPayload.get("DestinationFacilityId")).trim();
        }
        if (facility == null || facility.isBlank()) {
            facility = mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe";
        }
        String effectiveUsername = (username != null && !username.isBlank())
                ? username.trim()
                : (poPayload != null && poPayload.get("CreatedBy") != null
                    ? String.valueOf(poPayload.get("CreatedBy")).trim()
                    : mawmProperties.getUsername());

        try {
            String jsonPayload = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(poPayload);
            log.info("[MAWM Direct PO Save] Saving PO to {} (Facility: {}, User: {})", targetEndpoint, facility, effectiveUsername);
            String responseBody = executeWithAuthRetry(targetEndpoint, facility, effectiveUsername, jsonPayload);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("endpoint", targetEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("message", "200 OK - Purchase Order Saved Successfully in MAWM");
            result.put("rawResponse", responseBody);
            try {
                result.put("data", objectMapper.readTree(responseBody));
            } catch (Exception ignored) {}
            return result;
        } catch (Exception ex) {
            log.error("[MAWM Direct PO Save] Failed saving PO to {}: {}", targetEndpoint, ex.getMessage(), ex);
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

    /**
     * Checks Purchase Order Status in MAWM Cloud (5.3.2 /receiving/api/receiving/purchaseOrder/search)
     */
    public Map<String, Object> searchPoStatus(String purchaseOrderId, String destinationFacilityId, String username) {
        if (purchaseOrderId == null || purchaseOrderId.isBlank()) {
            return Map.of("success", false, "error", "PurchaseOrderId is mandatory for status search");
        }

        String facility = (destinationFacilityId != null && !destinationFacilityId.isBlank())
                ? destinationFacilityId.trim()
                : (mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe");

        String effectiveUsername = (username != null && !username.isBlank())
                ? username.trim()
                : mawmProperties.getUsername();

        String searchEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getPoSearchPath();

        Map<String, Object> requestPayload = Map.of(
                "Query", "PurchaseOrderId='" + purchaseOrderId.trim() + "'",
                "Template", Map.of(
                        "PurchaseOrderId", "",
                        "PurchaseOrderStatus", "",
                        "PurchaseOrderStatusDescription", ""
                )
        );

        try {
            String jsonPayload = objectMapper.writeValueAsString(requestPayload);
            log.info("[MAWM PO Search] Querying PO status for '{}' at {} (Facility: {}, User: {})",
                    purchaseOrderId, searchEndpoint, facility, effectiveUsername);

            String responseBody = executeWithAuthRetry(searchEndpoint, facility, effectiveUsername, jsonPayload);

            JsonNode rootNode = objectMapper.readTree(responseBody);
            String poStatus = null;
            String poStatusDescription = null;

            if (rootNode.has("data") && rootNode.get("data").isArray() && rootNode.get("data").size() > 0) {
                JsonNode firstMatch = rootNode.get("data").get(0);
                if (firstMatch.has("PurchaseOrderStatus")) {
                    poStatus = firstMatch.get("PurchaseOrderStatus").asText();
                }
                if (firstMatch.has("purchaseOrderStatusDescription")) {
                    poStatusDescription = firstMatch.get("purchaseOrderStatusDescription").asText();
                } else if (firstMatch.has("PurchaseOrderStatusDescription")) {
                    poStatusDescription = firstMatch.get("PurchaseOrderStatusDescription").asText();
                } else {
                    poStatusDescription = poStatus;
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("purchaseOrderId", purchaseOrderId.trim());
            result.put("purchaseOrderStatus", poStatus != null ? poStatus : "UNKNOWN");
            result.put("purchaseOrderStatusDescription", poStatusDescription != null ? poStatusDescription : (poStatus != null ? poStatus : "NO_RECORD_FOUND"));
            result.put("statusDescription", poStatusDescription != null ? poStatusDescription : (poStatus != null ? poStatus : "NO_RECORD_FOUND"));
            result.put("rawResponse", responseBody);
            result.put("endpoint", searchEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("queryPayload", requestPayload);
            try {
                if (rootNode.has("data")) {
                    result.put("data", rootNode.get("data"));
                }
            } catch (Exception ignored) {}
            return result;

        } catch (Exception ex) {
            log.error("[MAWM PO Search] Failed querying PO status for {}: {}", purchaseOrderId, ex.getMessage(), ex);
            int statusCode = 500;
            String rawErrorBody = null;
            if (ex instanceof RestClientResponseException rcre) {
                statusCode = rcre.getStatusCode().value();
                rawErrorBody = rcre.getResponseBodyAsString();
            }
            String cleanMessage = extractCleanErrorMessage(rawErrorBody, statusCode, facility, effectiveUsername);
            Map<String, Object> errResult = new LinkedHashMap<>();
            errResult.put("success", false);
            errResult.put("purchaseOrderId", purchaseOrderId);
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
     * Queries Purchase Order Lines from MAWM Cloud (5.3.3 /receiving/api/receiving/purchaseOrderLine/search)
     */
    public Map<String, Object> searchPoLines(String purchaseOrderId, String destinationFacilityId, String username) {
        if (purchaseOrderId == null || purchaseOrderId.isBlank()) {
            return Map.of("success", false, "error", "PurchaseOrderId is mandatory for PO lines search");
        }

        String facility = (destinationFacilityId != null && !destinationFacilityId.isBlank())
                ? destinationFacilityId.trim()
                : (mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe");

        String effectiveUsername = (username != null && !username.isBlank())
                ? username.trim()
                : mawmProperties.getUsername();

        String searchEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getPoLineSearchPath();

        Map<String, Object> requestPayload = Map.of(
                "Query", "PurchaseOrderId ='" + purchaseOrderId.trim() + "'",
                "Template", Map.of(
                        "PurchaseOrderLineId", "",
                        "ShippedQuantity", "",
                        "ReceivedQuantity", "",
                        "PoLineStatus", ""
                )
        );

        try {
            String jsonPayload = objectMapper.writeValueAsString(requestPayload);
            log.info("[MAWM PO Lines] Querying lines for '{}' at {} (Facility: {}, User: {})",
                    purchaseOrderId, searchEndpoint, facility, effectiveUsername);

            String responseBody = executeWithAuthRetry(searchEndpoint, facility, effectiveUsername, jsonPayload);
            JsonNode rootNode = objectMapper.readTree(responseBody);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("purchaseOrderId", purchaseOrderId.trim());
            result.put("rawResponse", responseBody);
            result.put("endpoint", searchEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("queryPayload", requestPayload);
            if (rootNode.has("data")) {
                result.put("data", rootNode.get("data"));
            }
            return result;
        } catch (Exception ex) {
            log.error("[MAWM PO Lines] Failed querying PO lines for {}: {}", purchaseOrderId, ex.getMessage(), ex);
            int statusCode = 500;
            String rawErrorBody = null;
            if (ex instanceof RestClientResponseException rcre) {
                statusCode = rcre.getStatusCode().value();
                rawErrorBody = rcre.getResponseBodyAsString();
            }
            String cleanMessage = extractCleanErrorMessage(rawErrorBody, statusCode, facility, effectiveUsername);
            Map<String, Object> errResult = new LinkedHashMap<>();
            errResult.put("success", false);
            errResult.put("purchaseOrderId", purchaseOrderId);
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
     * Queries ASN details associated with a PO from MAWM Cloud (5.3.4 /receiving/api/receiving/asnLine/search)
     */
    public Map<String, Object> searchPoAsnLines(String purchaseOrderId, String destinationFacilityId, String username) {
        if (purchaseOrderId == null || purchaseOrderId.isBlank()) {
            return Map.of("success", false, "error", "PurchaseOrderId is mandatory for associated ASN lines search");
        }

        String facility = (destinationFacilityId != null && !destinationFacilityId.isBlank())
                ? destinationFacilityId.trim()
                : (mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe");

        String effectiveUsername = (username != null && !username.isBlank())
                ? username.trim()
                : mawmProperties.getUsername();

        String searchEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getAsnLineSearchPath();

        Map<String, Object> requestPayload = Map.of(
                "Query", "PurchaseOrderId ='" + purchaseOrderId.trim() + "'",
                "Template", Map.of(
                        "AsnId", "",
                        "ItemId", "",
                        "ShippedQuantity", "",
                        "PurchaseOrderLineId", ""
                )
        );

        try {
            String jsonPayload = objectMapper.writeValueAsString(requestPayload);
            log.info("[MAWM PO ASN Lines] Querying associated ASN lines for '{}' at {} (Facility: {}, User: {})",
                    purchaseOrderId, searchEndpoint, facility, effectiveUsername);

            String responseBody = executeWithAuthRetry(searchEndpoint, facility, effectiveUsername, jsonPayload);
            JsonNode rootNode = objectMapper.readTree(responseBody);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("purchaseOrderId", purchaseOrderId.trim());
            result.put("rawResponse", responseBody);
            result.put("endpoint", searchEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("queryPayload", requestPayload);
            if (rootNode.has("data")) {
                result.put("data", rootNode.get("data"));
            }
            return result;
        } catch (Exception ex) {
            log.error("[MAWM PO ASN Lines] Failed querying ASN lines for PO {}: {}", purchaseOrderId, ex.getMessage(), ex);
            int statusCode = 500;
            String rawErrorBody = null;
            if (ex instanceof RestClientResponseException rcre) {
                statusCode = rcre.getStatusCode().value();
                rawErrorBody = rcre.getResponseBodyAsString();
            }
            String cleanMessage = extractCleanErrorMessage(rawErrorBody, statusCode, facility, effectiveUsername);
            Map<String, Object> errResult = new LinkedHashMap<>();
            errResult.put("success", false);
            errResult.put("purchaseOrderId", purchaseOrderId);
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

    /**
     * Directly creates / saves an Item Master in MAWM Cloud (/item-master/api/item-master/item/save)
     */
    public Map<String, Object> saveItemDirect(Map<String, Object> itemPayload, String username) {
        String targetEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getItemPath();
        String facility = null;
        if (itemPayload != null && itemPayload.get("DestinationFacilityId") != null) {
            facility = String.valueOf(itemPayload.get("DestinationFacilityId")).trim();
        } else if (itemPayload != null && itemPayload.get("FacilityId") != null) {
            facility = String.valueOf(itemPayload.get("FacilityId")).trim();
        }
        if (facility == null || facility.isBlank()) {
            facility = mawmProperties.getDefaultFacility() != null ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe";
        }
        String effectiveUsername = (username != null && !username.isBlank())
                ? username.trim()
                : (itemPayload != null && itemPayload.get("CreatedBy") != null
                    ? String.valueOf(itemPayload.get("CreatedBy")).trim()
                    : mawmProperties.getUsername());

        try {
            String jsonPayload = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(itemPayload);
            log.info("[MAWM Direct Item Save] Saving Item to {} (Facility: {}, User: {})", targetEndpoint, facility, effectiveUsername);
            String responseBody = executeWithAuthRetry(targetEndpoint, facility, effectiveUsername, jsonPayload);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("endpoint", targetEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("message", "200 OK - Item Master Saved Successfully in MAWM");
            result.put("rawResponse", responseBody);
            try {
                result.put("data", objectMapper.readTree(responseBody));
            } catch (Exception ignored) {}
            return result;
        } catch (Exception ex) {
            log.error("[MAWM Direct Item Save] Failed saving Item to {}: {}", targetEndpoint, ex.getMessage(), ex);
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

    /**
     * Checks PO status for a specific job and updates the DB tracker row
     */
    public Map<String, Object> verifyJobPo(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) {
            return Map.of("success", false, "error", "Job not found: " + jobId);
        }
        var tracker = optTracker.get();
        String outputFiles = tracker.getOutputFiles();
        String rawContent = tracker.getRawContent();
        String purchaseOrderId = null;
        String destinationFacility = tracker.getFacilityId();
        String createdBy = tracker.getCreatedBy();

        if (outputFiles != null && !outputFiles.isBlank() && !outputFiles.startsWith("[CLAIM_CHECK:")) {
            try {
                JsonNode root = objectMapper.readTree(outputFiles);
                JsonNode dataNode = root.has("Data") ? root.get("Data") : (root.has("data") ? root.get("data") : root);
                if (dataNode.isArray() && dataNode.size() > 0) {
                    JsonNode first = dataNode.get(0);
                    if (first.has("PurchaseOrderId")) purchaseOrderId = first.get("PurchaseOrderId").asText();
                    else if (first.has("purchaseOrderId")) purchaseOrderId = first.get("purchaseOrderId").asText();
                    if (first.has("DestinationFacilityId")) destinationFacility = first.get("DestinationFacilityId").asText();
                    if (createdBy == null || createdBy.isBlank()) {
                        if (first.has("CreatedBy")) createdBy = first.get("CreatedBy").asText();
                    }
                } else if (dataNode.isObject()) {
                    if (dataNode.has("PurchaseOrderId")) purchaseOrderId = dataNode.get("PurchaseOrderId").asText();
                    else if (dataNode.has("purchaseOrderId")) purchaseOrderId = dataNode.get("purchaseOrderId").asText();
                    if (dataNode.has("DestinationFacilityId")) destinationFacility = dataNode.get("DestinationFacilityId").asText();
                    if (createdBy == null || createdBy.isBlank()) {
                        if (dataNode.has("CreatedBy")) createdBy = dataNode.get("CreatedBy").asText();
                    }
                }
            } catch (Exception ignored) {}
        }

        if (rawContent != null && !rawContent.isBlank() && !rawContent.startsWith("[CLAIM_CHECK:")) {
            try {
                JsonNode root = objectMapper.readTree(rawContent);
                if (destinationFacility == null && root.has("DestinationFacilityId")) {
                    destinationFacility = root.get("DestinationFacilityId").asText();
                }
                if (purchaseOrderId == null) {
                    if (root.has("PurchaseOrderId")) purchaseOrderId = root.get("PurchaseOrderId").asText();
                    else if (root.has("purchaseOrderId")) purchaseOrderId = root.get("purchaseOrderId").asText();
                }
                if (createdBy == null || createdBy.isBlank()) {
                    if (root.has("CreatedBy")) createdBy = root.get("CreatedBy").asText();
                }
            } catch (Exception ignored) {}
        }

        if (purchaseOrderId == null && tracker.getMawmResponse() != null && !tracker.getMawmResponse().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(tracker.getMawmResponse());
                JsonNode dataNode = root.has("data") ? root.get("data") : root;
                if (dataNode != null) {
                    if (dataNode.has("PurchaseOrderId")) purchaseOrderId = dataNode.get("PurchaseOrderId").asText();
                    else if (dataNode.has("purchaseOrderId")) purchaseOrderId = dataNode.get("purchaseOrderId").asText();
                }
            } catch (Exception ignored) {}
        }

        if (destinationFacility == null || destinationFacility.isBlank() || "OPTI".equalsIgnoreCase(destinationFacility) || "SAMPLE".equalsIgnoreCase(destinationFacility)) {
            destinationFacility = tracker.getFacilityId();
        }
        if (destinationFacility == null || destinationFacility.isBlank() || "OPTI".equalsIgnoreCase(destinationFacility) || "SAMPLE".equalsIgnoreCase(destinationFacility)) {
            destinationFacility = mawmProperties.getDefaultFacility() != null && !mawmProperties.getDefaultFacility().isBlank()
                    ? mawmProperties.getDefaultFacility() : "Food_Cbe";
        }

        if (purchaseOrderId == null || purchaseOrderId.isBlank()) {
            purchaseOrderId = tracker.getJobId();
        }

        Map<String, Object> searchResult = searchPoStatus(purchaseOrderId, destinationFacility, createdBy);
        if (Boolean.TRUE.equals(searchResult.get("success"))) {
            String statusDesc = (String) searchResult.get("statusDescription");
            transactionStore.recordMawmAsnStatus(jobId, statusDesc);
        }
        return searchResult;
    }

    /**
     * Unified job verification for both ASN and PO jobs
     */
    public Map<String, Object> verifyJob(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isPresent()) {
            var t = optTracker.get();
            if ("PO".equalsIgnoreCase(t.getTransactionType()) ||
                    (t.getOriginalFilename() != null && t.getOriginalFilename().toUpperCase().contains("PO"))) {
                return verifyJobPo(jobId);
            }
        }
        return verifyJobAsn(jobId);
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
        boolean isOpti = source != null && ("Opti".equalsIgnoreCase(source) || "OPTI".equalsIgnoreCase(source));
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
        String destinationFacility = null;
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

                    if (first.has("DestinationFacilityId")) destinationFacility = first.get("DestinationFacilityId").asText();
                    if (createdBy == null || createdBy.isBlank()) {
                        if (first.has("CreatedBy")) createdBy = first.get("CreatedBy").asText();
                    }
                } else if (dataNode.isObject()) {
                    if (dataNode.has("AsnId")) asnId = dataNode.get("AsnId").asText();
                    else if (dataNode.has("asnId")) asnId = dataNode.get("asnId").asText();

                    if (dataNode.has("DestinationFacilityId")) destinationFacility = dataNode.get("DestinationFacilityId").asText();
                    if (createdBy == null || createdBy.isBlank()) {
                        if (dataNode.has("CreatedBy")) createdBy = dataNode.get("CreatedBy").asText();
                    }
                }
            } catch (Exception ignored) {}
        }

        // Fallback from rawContent
        if (rawContent != null && !rawContent.isBlank() && !rawContent.startsWith("[CLAIM_CHECK:")) {
            try {
                JsonNode root = objectMapper.readTree(rawContent);
                if (destinationFacility == null && root.has("DestinationFacilityId")) {
                    destinationFacility = root.get("DestinationFacilityId").asText();
                }
                if (asnId == null) {
                    if (root.has("AsnId")) asnId = root.get("AsnId").asText();
                    else if (root.has("asnId")) asnId = root.get("asnId").asText();
                }
                if (createdBy == null || createdBy.isBlank()) {
                    if (root.has("CreatedBy")) createdBy = root.get("CreatedBy").asText();
                }
            } catch (Exception ignored) {}
        }

        // Fallback from mawmResponse
        if (tracker.getMawmResponse() != null && !tracker.getMawmResponse().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(tracker.getMawmResponse());
                JsonNode dataNode = root.has("data") ? root.get("data") : root;
                if (dataNode != null) {
                    if (destinationFacility == null && dataNode.has("DestinationFacilityId")) {
                        destinationFacility = dataNode.get("DestinationFacilityId").asText();
                    }
                    if (asnId == null) {
                        if (dataNode.has("AsnId")) asnId = dataNode.get("AsnId").asText();
                        else if (dataNode.has("asnId")) asnId = dataNode.get("asnId").asText();
                        else if (dataNode.has("Asn") && dataNode.get("Asn").has("AsnId")) asnId = dataNode.get("Asn").get("AsnId").asText();
                        else if (dataNode.has("AsnLine") && dataNode.get("AsnLine").isArray() && dataNode.get("AsnLine").size() > 0) {
                            JsonNode line0 = dataNode.get("AsnLine").get(0);
                            if (line0.has("AsnId")) asnId = line0.get("AsnId").asText();
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        if (destinationFacility == null || destinationFacility.isBlank() || "OPTI".equalsIgnoreCase(destinationFacility) || "SAMPLE".equalsIgnoreCase(destinationFacility)) {
            destinationFacility = tracker.getFacilityId();
        }
        if (destinationFacility == null || destinationFacility.isBlank() || "OPTI".equalsIgnoreCase(destinationFacility) || "SAMPLE".equalsIgnoreCase(destinationFacility)) {
            destinationFacility = mawmProperties.getDefaultFacility() != null && !mawmProperties.getDefaultFacility().isBlank()
                    ? mawmProperties.getDefaultFacility() : "Food_Cbe";
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
        boolean isOpti = source != null && ("Opti".equalsIgnoreCase(source) || "OPTI".equalsIgnoreCase(source));
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
