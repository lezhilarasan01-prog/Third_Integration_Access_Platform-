package com.platform.erp.mawm;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.model.ErpFileIntakeTracker;
import com.platform.erp.store.TransactionStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

/**
 * High-performance, dynamic dispatch and query gateway for Manhattan Active WMS (MAWM) Cloud.
 * Handles:
 * 1. Automatic OAuth2 Bearer token acquisition, transparent 401/403 retry, and tenant header injection.
 * 2. Hot dispatching of converted canonical ERP feeds (Opti PO, ASN, DO, Item Master).
 * 3. Dynamic schema-agnostic searching against MAWM Cloud endpoints.
 * 4. Direct CRUD proxy execution for ERPs querying or pushing orders to MAWM.
 * 5. Lifecycle audit tracking and status verification in PostgreSQL.
 */
@Service
public class MawmDispatcherService {

    private static final Logger log = LoggerFactory.getLogger(MawmDispatcherService.class);

    private final MawmProperties mawmProperties;
    private final MawmAuthService mawmAuthService;
    private final TransactionStore transactionStore;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

	public MawmDispatcherService(MawmProperties mawmProperties, MawmAuthService mawmAuthService,
			TransactionStore transactionStore, ObjectMapper objectMapper) {
		this.mawmProperties = mawmProperties;
		this.mawmAuthService = mawmAuthService;
		this.transactionStore = transactionStore;
		this.objectMapper = objectMapper;
		this.restClient = RestClient.builder().build();
	}

    // =========================================================================
    // 1. Hot Dispatch Engine
    // =========================================================================

    /**
     * Hot dispatches canonical ERP data to MAWM Cloud REST endpoints.
     */
    public void dispatch(CanonicalEnvelope envelope) {
        if (envelope == null) return;
        String trackingId = envelope.getTrackingId();

        if (!mawmProperties.isEnabled()) {
            log.info("[MAWM Dispatcher] MAWM client paused (mawm.client.enabled=false). TrackingId: {}", trackingId);
            transactionStore.recordMawmStatus(trackingId, "SAVED_AWAITING_ENDPOINT");
            return;
        }

        String source = envelope.getErpSource();
        if (source != null && !isOptiSource(source)) {
            log.info("[MAWM Dispatcher] Hot dispatch skipped for non-Opti source '{}'. Converted JSON saved for TrackingId: {}", source, trackingId);
            int count = (envelope.getData() != null && !envelope.getData().isEmpty()) ? envelope.getData().size() : 1;
            transactionStore.recordMawmStatus(trackingId, "CONVERTED (Opti Exclusive)", count, 0,
                    "{\"status\":\"CONVERTED\",\"hotDispatch\":false,\"erpSource\":\"" + source + "\",\"message\":\"Converted to MAWM Canonical JSON. Hot dispatch is exclusive to Opti.\"}");
            return;
        }

        if (envelope.getDocumentType() == null || envelope.getDocumentType().isBlank()) {
            log.error("[MAWM Dispatcher] Document type (docType) is mandatory for MAWM dispatch but was missing or blank. TrackingId: {}", trackingId);
            transactionStore.recordMawmFailure(trackingId, "Document type (docType) is mandatory for MAWM dispatch", 1, null);
            return;
        }

        String docType = envelope.getDocumentType().trim().toUpperCase();
        String targetEndpoint = resolveEndpointForDocType(docType);
        String destinationFacility = resolveFacilityFromEnvelope(envelope);
        String username = resolveUsername(envelope.getCreatedBy(), null);

        Object payloadToSend = preparePayloadForDispatch(docType, envelope, destinationFacility);
        int recordCount = (envelope.getData() != null && !envelope.getData().isEmpty()) ? envelope.getData().size() : 1;

        log.info("[MAWM Dispatcher] Dispatching {} to {} (TrackingId: {}, Facility: {}, User: {})",
                docType, targetEndpoint, trackingId, destinationFacility, username);

        Map<String, Object> response = executeMawm(HttpMethod.POST, targetEndpoint, destinationFacility, username, payloadToSend, null);

        // If duplicate entry for DO, attempt update fallback using order PK
        if (!Boolean.TRUE.equals(response.get("success")) && isDistributionOrder(docType)) {
            String rawError = (String) response.get("rawResponse");
            if (rawError != null && (rawError.contains("Duplicate entry") || rawError.contains("SQLIntegrityConstraintViolationException") || rawError.contains("DCO_ORDER.ORDER_ID"))) {
                String orderId = extractOrderIdFromPayload(payloadToSend);
                if (orderId != null && !orderId.isBlank()) {
                    log.info("[MAWM Dispatcher] Order '{}' already exists in MAWM Cloud. Attempting update via PK lookup...", orderId);
                    String pk = lookupDoPrimaryKey(orderId, destinationFacility, username);
                    if (pk != null && !pk.isBlank()) {
                        String updateEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getDoUpdatePath() + pk.trim();
                        Map<String, Object> updateResp = executeMawm(HttpMethod.POST, updateEndpoint, destinationFacility, username, payloadToSend, null);
                        if (Boolean.TRUE.equals(updateResp.get("success"))) {
                            log.info("[MAWM Dispatcher] Successfully updated existing order '{}' (PK: {}) in MAWM Cloud", orderId, pk);
                            response = updateResp;
                            response.put("message", "200 OK - Distribution Order Updated Successfully in MAWM");
                        }
                    }
                }
            }
        }

        if (Boolean.TRUE.equals(response.get("success"))) {
            String rawResponse = (String) response.getOrDefault("rawResponse", "");
            log.info("[MAWM Dispatcher] MAWM Cloud acknowledged receipt for TrackingId: {}", trackingId);
            transactionStore.recordMawmStatus(trackingId, "DELIVERED_TO_MAWM (200 OK)", recordCount, 0, rawResponse);
        } else {
            String errorSummary = (String) response.getOrDefault("cleanError", response.getOrDefault("error", "Dispatch failed"));
            String rawError = (String) response.get("rawResponse");
            log.error("[MAWM Dispatcher] MAWM Cloud rejected TrackingId: {} - {}", trackingId, errorSummary);
            transactionStore.recordMawmFailure(trackingId, errorSummary, recordCount, rawError);
        }
    }

    /**
     * Manually triggers or retries dispatch to MAWM Cloud using stored converted JSON.
     */
    public Map<String, Object> dispatchJob(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) {
            return Map.of("success", false, "error", "Job not found: " + jobId);
        }
        var tracker = optTracker.get();
        String source = tracker.getSourceSystem();
        if (source != null && !isOptiSource(source)) {
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
                envelope.setData(objectMapper.convertValue(root.get("Data"), new TypeReference<List<Map<String, Object>>>() {}));
            } else if (root.isObject()) {
                envelope.setData(List.of(objectMapper.convertValue(root, new TypeReference<Map<String, Object>>() {})));
            }

            dispatch(envelope);

            var updated = transactionStore.getTracker(jobId).orElse(tracker);
            boolean isSuccess = updated.getDispatchStatus() != null && updated.getDispatchStatus().startsWith("DELIVERED");
            Map<String, Object> result = new LinkedHashMap<>();
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

    // =========================================================================
    // 2. Dynamic Search (Unified Manhattan Query Gateway)
    // =========================================================================

    public Map<String, Object> searchAsnDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        return executeDynamicSearch(mawmProperties.getBaseUrl() + mawmProperties.getAsnSearchPath(), "ASN", facility, username, body, "AsnId", storeTracker);
    }

    public Map<String, Object> searchPoDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        return executeDynamicSearch(mawmProperties.getBaseUrl() + mawmProperties.getPoSearchPath(), "PO", facility, username, body, "PurchaseOrderId", storeTracker);
    }

    public Map<String, Object> searchPoLineDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        return executeDynamicSearch(mawmProperties.getBaseUrl() + mawmProperties.getPoLineSearchPath(), "PO_LINE", facility, username, body, "PurchaseOrderId", storeTracker);
    }

    public Map<String, Object> searchPoAsnLineDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        return executeDynamicSearch(mawmProperties.getBaseUrl() + mawmProperties.getAsnLineSearchPath(), "ASN_LINE", facility, username, body, "PurchaseOrderId", storeTracker);
    }

    public Map<String, Object> searchDoDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        return executeDynamicSearch(mawmProperties.getBaseUrl() + mawmProperties.getDoSearchPath(), "DO", facility, username, body, "OrderId", storeTracker);
    }

    public Map<String, Object> searchDoLineDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        return executeDynamicSearch(mawmProperties.getBaseUrl() + mawmProperties.getDoLineSearchPath(), "DO_LINE", facility, username, body, "OrderId", storeTracker);
    }

    public Map<String, Object> searchBatchDynamic(JsonNode body, String facility, String username, boolean storeTracker) {
        return executeDynamicSearch(mawmProperties.getBaseUrl() + mawmProperties.getBatchSearchPath(), "BATCH", facility, username, body, "BatchNumberId", storeTracker);
    }

    public Map<String, Object> executeDynamicSearch(String targetEndpoint, String docType, String destinationFacilityId, String username, JsonNode bodyNode, String defaultQueryField, boolean storeTracker) {
        if (bodyNode == null || bodyNode.isNull() || bodyNode.isEmpty()) {
            return Map.of("success", false, "error", "Request payload cannot be empty for MAWM search");
        }
        String facility = resolveFacility(destinationFacilityId, bodyNode);
        String effectiveUsername = resolveUsername(username, bodyNode);

        Object payloadToSend = (bodyNode.has("Query") || bodyNode.has("query"))
                ? bodyNode
                : synthesizeManhattanQuery(bodyNode, defaultQueryField);

        Map<String, Object> result = executeMawm(HttpMethod.POST, targetEndpoint, facility, effectiveUsername, payloadToSend, null);

        if (storeTracker) {
            String trackingId = UUID.randomUUID().toString();
            String payloadSummary = payloadToSend.toString();
            String rawResponse = (String) result.getOrDefault("rawResponse", "");
            String status = Boolean.TRUE.equals(result.get("success")) ? "DELIVERED_TO_MAWM (200 OK)" : "DISPATCH_FAILED (" + result.get("statusCode") + ")";
            transactionStore.recordQueryAudit(trackingId, docType, facility, effectiveUsername, payloadSummary, rawResponse, status);
            result.put("jobId", trackingId);
        }
        return result;
    }

    // =========================================================================
    // 3. Single-Entity Search & Verification Methods
    // =========================================================================

    public Map<String, Object> executeEntitySearch(String endpoint, String idField, String idValue, String facility, String username) {
        if (idValue == null || idValue.isBlank()) {
            return Map.of("success", false, "error", idField + " is mandatory for search");
        }
        Map<String, Object> queryPayload = Map.of(
                "Query", idField + " = '" + idValue.trim() + "'",
                "Template", Collections.emptyMap()
        );
        Map<String, Object> result = executeMawm(HttpMethod.POST, endpoint, facility, username, queryPayload, null);
        result.put("statusDescription", extractStatus(result));
        return result;
    }

    public Map<String, Object> searchAsnStatus(String asnId, String destinationFacilityId, String username) {
        return executeEntitySearch(mawmProperties.getBaseUrl() + mawmProperties.getAsnSearchPath(), "AsnId", asnId, destinationFacilityId, username);
    }

    public Map<String, Object> searchPoStatus(String purchaseOrderId, String destinationFacilityId, String username) {
        return executeEntitySearch(mawmProperties.getBaseUrl() + mawmProperties.getPoSearchPath(), "PurchaseOrderId", purchaseOrderId, destinationFacilityId, username);
    }

    public Map<String, Object> searchPoLines(String purchaseOrderId, String destinationFacilityId, String username) {
        return executeEntitySearch(mawmProperties.getBaseUrl() + mawmProperties.getPoLineSearchPath(), "PurchaseOrderId", purchaseOrderId, destinationFacilityId, username);
    }

    public Map<String, Object> searchPoAsnLines(String purchaseOrderId, String destinationFacilityId, String username) {
        return executeEntitySearch(mawmProperties.getBaseUrl() + mawmProperties.getAsnLineSearchPath(), "PurchaseOrderId", purchaseOrderId, destinationFacilityId, username);
    }

    public Map<String, Object> searchDoStatus(String orderId, String destinationFacilityId, String username) {
        return executeEntitySearch(mawmProperties.getBaseUrl() + mawmProperties.getDoSearchPath(), "OrderId", orderId, destinationFacilityId, username);
    }

    public Map<String, Object> searchDoLines(String orderId, String destinationFacilityId, String username) {
        return executeEntitySearch(mawmProperties.getBaseUrl() + mawmProperties.getDoLineSearchPath(), "OrderId", orderId, destinationFacilityId, username);
    }

    public Map<String, Object> searchBatchStatus(String batchNumberId, String destinationFacilityId, String username) {
        return executeEntitySearch(mawmProperties.getBaseUrl() + mawmProperties.getBatchSearchPath(), "BatchNumberId", batchNumberId, destinationFacilityId, username);
    }

    private String extractStatus(Map<String, Object> result) {
        if (result.get("data") instanceof JsonNode dataNode) {
            JsonNode first = dataNode.isArray() && !dataNode.isEmpty() ? dataNode.get(0) : dataNode;
            if (first.isObject()) {
                for (String key : List.of("AsnStatus", "PurchaseOrderStatus", "StatusDescription", "PurchaseOrderStatusDescription", "MinimumStatusDescription", "MaximumStatusDescription", "Status", "status", "BatchStatus", "batchStatus", "StatusCode")) {
                    if (first.has(key)) return first.get(key).asText();
                }
            }
        }
        return Boolean.TRUE.equals(result.get("success")) ? "DELIVERED_TO_MAWM (200 OK)" : "NO_RECORD_FOUND";
    }

    // =========================================================================
    // 4. Direct Entity Save, Update, & Query Operations
    // =========================================================================

    public Map<String, Object> savePoDirect(Map<String, Object> poPayload, String username) {
        Map<String, Object> cleanPayload = cleanPoPayload(poPayload);
        String facility = extractFacilityFromMap(cleanPayload);
        String user = (username != null && !username.isBlank()) ? username : extractUserFromMap(cleanPayload);
        String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getPoPath();
        Map<String, Object> result = executeMawm(HttpMethod.POST, endpoint, facility, user, cleanPayload, null);
        if (Boolean.TRUE.equals(result.get("success"))) {
            result.put("message", "200 OK - Purchase Order Saved Successfully in MAWM");
        }
        return result;
    }

    public Map<String, Object> saveAsnDirect(Map<String, Object> asnPayload, String username) {
        Map<String, Object> cleanPayload = cleanGenericEntityPayload(asnPayload);
        String facility = extractFacilityFromMap(cleanPayload);
        String user = (username != null && !username.isBlank()) ? username : extractUserFromMap(cleanPayload);
        String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getAsnPath();
        Map<String, Object> result = executeMawm(HttpMethod.POST, endpoint, facility, user, cleanPayload, null);
        if (Boolean.TRUE.equals(result.get("success"))) {
            result.put("message", "200 OK - ASN Saved Successfully in MAWM");
        }
        return result;
    }

    public Map<String, Object> saveItemDirect(Map<String, Object> itemPayload, String username) {
        String facility = extractFacilityFromMap(itemPayload);
        String user = (username != null && !username.isBlank()) ? username : extractUserFromMap(itemPayload);
        String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getItemPath();
        Map<String, Object> result = executeMawm(HttpMethod.POST, endpoint, facility, user, itemPayload, null);
        if (Boolean.TRUE.equals(result.get("success"))) {
            result.put("message", "200 OK - Item Master Saved Successfully in MAWM");
        }
        return result;
    }

    public Map<String, Object> saveBatchDirect(Map<String, Object> batchPayload, String username) {
        String facility = extractFacilityFromMap(batchPayload);
        String user = (username != null && !username.isBlank()) ? username : extractUserFromMap(batchPayload);
        String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getBatchPath();
        Map<String, Object> result = executeMawm(HttpMethod.POST, endpoint, facility, user, batchPayload, null);
        if (Boolean.TRUE.equals(result.get("success"))) {
            result.put("message", "200 OK - Batch Master Saved Successfully in MAWM");
        }
        return result;
    }

    public Map<String, Object> checkDoExists(String orderId, String facilityId, String username) {
        if (orderId == null || orderId.isBlank()) {
            return Map.of("success", false, "error", "OrderId is mandatory for DO existence check");
        }
        String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getDoGetPath() + orderId.trim();
        Map<String, Object> result = executeMawm(HttpMethod.GET, endpoint, facilityId, username, null, null);
        boolean exists = Boolean.TRUE.equals(result.get("success"));
        result.put("orderExists", exists);
        result.put("orderId", orderId.trim());
        if (!exists && Integer.valueOf(404).equals(result.get("statusCode"))) {
            result.put("error", "Distribution Order '" + orderId + "' does not exist in MAWM Cloud (404 Not Found).");
        }
        if (result.get("data") instanceof JsonNode dataNode && dataNode.has("PK")) {
            result.put("pk", dataNode.get("PK").asText());
        }
        return result;
    }

    public Map<String, Object> saveDoDirectDynamic(JsonNode doPayloadNode, String username, boolean storeTracker) {
        if (doPayloadNode == null || doPayloadNode.isNull() || doPayloadNode.isEmpty()) {
            return Map.of("success", false, "error", "Distribution Order payload cannot be empty");
        }
        JsonNode payloadToSend = unwrapSingleRecord(doPayloadNode);

        String facility = resolveFacility(null, payloadToSend);
        String user = resolveUsername(username, payloadToSend);
        String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getDoSavePath();

        Map<String, Object> result = executeMawm(HttpMethod.POST, endpoint, facility, user, payloadToSend, null);
        if (Boolean.TRUE.equals(result.get("success"))) {
            result.put("message", "200 OK - Distribution Order Created Successfully in MAWM");
        } else {
            // Check for Duplicate entry fallback
            String rawError = (String) result.get("rawResponse");
            if (rawError != null && (rawError.contains("Duplicate entry") || rawError.contains("SQLIntegrityConstraintViolationException") || rawError.contains("DCO_ORDER.ORDER_ID"))) {
                String orderId = extractOrderIdFromPayload(payloadToSend);
                if (orderId != null && !orderId.isBlank()) {
                    String pk = lookupDoPrimaryKey(orderId, facility, user);
                    if (pk != null && !pk.isBlank()) {
                        String updateEndpoint = mawmProperties.getBaseUrl() + mawmProperties.getDoUpdatePath() + pk.trim();
                        Map<String, Object> updateResp = executeMawm(HttpMethod.POST, updateEndpoint, facility, user, payloadToSend, null);
                        if (Boolean.TRUE.equals(updateResp.get("success"))) {
                            result = updateResp;
                            result.put("message", "200 OK - Distribution Order Updated Successfully in MAWM");
                        }
                    }
                }
            }
        }
        if (storeTracker) {
            String trackingId = "DO-" + UUID.randomUUID().toString().substring(0, 8);
            String rawResponse = (String) result.getOrDefault("rawResponse", "");
            String status = Boolean.TRUE.equals(result.get("success")) ? "DELIVERED_TO_MAWM (200 OK)" : "DISPATCH_FAILED (" + result.get("statusCode") + ")";
            transactionStore.recordQueryAudit(trackingId, "DO", facility, user, payloadToSend.toString(), rawResponse, status);
            result.put("jobId", trackingId);
        }
        return result;
    }

    public Map<String, Object> saveDoDirect(Map<String, Object> doPayload, String username) {
        return saveDoDirectDynamic(objectMapper.valueToTree(doPayload), username, false);
    }

    public Map<String, Object> updateDoDirectDynamic(String pk, JsonNode doPayloadNode, String username) {
        if (pk == null || pk.isBlank()) {
            return Map.of("success", false, "error", "PK is mandatory for DO update");
        }
        JsonNode payloadToSend = unwrapSingleRecord(doPayloadNode);

        String facility = resolveFacility(null, payloadToSend);
        String user = resolveUsername(username, payloadToSend);
        String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getDoUpdatePath() + pk.trim();

        Map<String, Object> result = executeMawm(HttpMethod.POST, endpoint, facility, user, payloadToSend, null);
        result.put("pk", pk.trim());
        if (Boolean.TRUE.equals(result.get("success"))) {
            result.put("message", "200 OK - Distribution Order Updated Successfully in MAWM");
        }
        return result;
    }

    public Map<String, Object> updateDoDirect(String pk, Map<String, Object> doPayload, String username) {
        return updateDoDirectDynamic(pk, objectMapper.valueToTree(doPayload), username);
    }

    public Map<String, Object> fetchItemsDynamic(String facilityId, String username, Map<String, String> queryParams, boolean storeTracker) {
        String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getItemQueryPath();
        Map<String, String> params = new LinkedHashMap<>();
        params.put("page", "0");
        params.put("size", "1000");
        params.put("needTotalCount", "true");
        if (queryParams != null) params.putAll(queryParams);

        String facility = resolveFacility(facilityId, null);
        String user = resolveUsername(username, null);
        Map<String, Object> result = executeMawm(HttpMethod.GET, endpoint, facility, user, null, params);
        result.put("queryParams", params);

        if (storeTracker) {
            String trackingId = UUID.randomUUID().toString();
            String querySummary = "GET " + endpoint + "?" + params;
            String rawResponse = (String) result.getOrDefault("rawResponse", "");
            String status = Boolean.TRUE.equals(result.get("success")) ? "DELIVERED_TO_MAWM (200 OK)" : "DISPATCH_FAILED (" + result.get("statusCode") + ")";
            transactionStore.recordQueryAudit(trackingId, "ITEM", facility, user, querySummary, rawResponse, status);
            result.put("jobId", trackingId);
        }
        return result;
    }

    // =========================================================================
    // 5. Job Verification
    // =========================================================================

    public Map<String, Object> verifyJob(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) {
            return Map.of("success", false, "error", "Job not found: " + jobId);
        }
        var t = optTracker.get();
        String type = (t.getTransactionType() != null ? t.getTransactionType() : "").toUpperCase();
        String file = (t.getOriginalFilename() != null ? t.getOriginalFilename() : "").toUpperCase();

        if (type.contains("DO") || type.contains("DISTRIBUTION") || file.contains("DO") || file.contains("DISTRIBUTION")) {
            return verifyJobDo(jobId);
        }
        if (type.contains("BATCH") || file.contains("BATCH")) {
            return verifyJobBatch(jobId);
        }
        if (type.contains("PO") || file.contains("PO")) {
            return verifyJobPo(jobId);
        }
        return verifyJobAsn(jobId);
    }

    public Map<String, Object> verifyJobPo(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) return Map.of("success", false, "error", "Job not found: " + jobId);
        var tracker = optTracker.get();
        String id = extractEntityId(tracker, "PurchaseOrderId", "purchaseOrderId", "poNumber", "PoNumber");
        String facility = resolveFacility(tracker.getFacilityId(), null);
        Map<String, Object> result = searchPoStatus(id, facility, tracker.getCreatedBy());
        if (Boolean.TRUE.equals(result.get("success"))) {
            transactionStore.recordMawmAsnStatus(jobId, (String) result.get("statusDescription"));
        }
        return result;
    }

    public Map<String, Object> verifyJobAsn(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) return Map.of("success", false, "error", "Job not found: " + jobId);
        var tracker = optTracker.get();
        if (tracker.getSourceSystem() != null && !isOptiSource(tracker.getSourceSystem())) {
            return Map.of("success", true, "isOptiExclusive", true, "statusDescription", "CONVERTED (Opti Exclusive)");
        }
        String id = extractEntityId(tracker, "AsnId", "asnId", "asnNumber");
        String facility = resolveFacility(tracker.getFacilityId(), null);
        Map<String, Object> result = searchAsnStatus(id, facility, tracker.getCreatedBy());
        if (Boolean.TRUE.equals(result.get("success"))) {
            transactionStore.recordMawmAsnStatus(jobId, (String) result.get("statusDescription"));
        }
        return result;
    }

    public Map<String, Object> verifyJobDo(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) return Map.of("success", false, "error", "Job not found: " + jobId);
        var tracker = optTracker.get();
        String id = extractEntityId(tracker, "OrderId", "orderId", "DistributionOrderId", "distributionOrderId");
        String facility = resolveFacility(tracker.getFacilityId(), null);
        Map<String, Object> result = searchDoStatus(id, facility, tracker.getCreatedBy());
        if (Boolean.TRUE.equals(result.get("success"))) {
            transactionStore.recordMawmAsnStatus(jobId, (String) result.get("statusDescription"));
        }
        return result;
    }

    public Map<String, Object> verifyJobBatch(String jobId) {
        var optTracker = transactionStore.getTracker(jobId);
        if (optTracker.isEmpty()) return Map.of("success", false, "error", "Job not found: " + jobId);
        var tracker = optTracker.get();
        String id = extractEntityId(tracker, "BatchNumberId", "batchNumberId", "BatchId", "batchId");
        String facility = resolveFacility(tracker.getFacilityId(), null);
        Map<String, Object> result = searchBatchStatus(id, facility, tracker.getCreatedBy());
        if (Boolean.TRUE.equals(result.get("success"))) {
            transactionStore.recordMawmAsnStatus(jobId, (String) result.get("statusDescription"));
        }
        return result;
    }

    // =========================================================================
    // 6. Centralized HTTP Invocation with Auth Retry & Error Standardization
    // =========================================================================

    private Map<String, Object> executeMawm(HttpMethod method, String targetEndpoint, String destinationFacilityId, String username, Object payload, Map<String, String> queryParams) {
        String facility = resolveFacility(destinationFacilityId, null);
        String effectiveUsername = resolveUsername(username, null);
        long startTime = System.currentTimeMillis();

        try {
            String responseBody = executeWithAuthRetry(method, targetEndpoint, facility, effectiveUsername, payload, queryParams);
            long latencyMs = System.currentTimeMillis() - startTime;

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("statusCode", 200);
            result.put("endpoint", targetEndpoint);
            result.put("facilityId", facility);
            result.put("username", effectiveUsername);
            result.put("latencyMs", latencyMs);
            result.put("rawResponse", responseBody);

            if (responseBody != null && !responseBody.isBlank()) {
                try {
                    JsonNode root = objectMapper.readTree(responseBody);
                    result.put("data", root.has("data") ? root.get("data") : root);
                    if (root.has("totalCount")) {
                        result.put("totalCount", root.get("totalCount").asInt());
                    }
                } catch (Exception ignored) {}
            }
            return result;

        } catch (Exception ex) {
            long latencyMs = System.currentTimeMillis() - startTime;
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
            errResult.put("latencyMs", latencyMs);
            if (rawErrorBody != null && !rawErrorBody.isBlank()) {
                errResult.put("rawResponse", rawErrorBody);
            }
            return errResult;
        }
    }

    private String executeWithAuthRetry(HttpMethod method, String targetEndpoint, String facility, String username, Object payload, Map<String, String> queryParams) {
        String bearerToken = mawmAuthService.getAccessToken(username);
        try {
            return sendHttpRequest(method, targetEndpoint, facility, bearerToken, payload, queryParams);
        } catch (RestClientResponseException rcre) {
            int code = rcre.getStatusCode().value();
            if (code == 401 || code == 403) {
                log.warn("[MAWM Gateway] HTTP {} Unauthorized for user '{}'. Invaliding cached token and retrying with fresh Bearer token...", code, username);
                mawmAuthService.invalidateToken(username);
                String freshToken = mawmAuthService.getAccessToken(username);
                return sendHttpRequest(method, targetEndpoint, facility, freshToken, payload, queryParams);
            }
            throw rcre;
        }
    }

	private String sendHttpRequest(HttpMethod method, String targetEndpoint, String facility, String bearerToken,
			Object payload, Map<String, String> queryParams) {
		if (HttpMethod.GET.equals(method)) {
			UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(targetEndpoint);
			if (queryParams != null) {
				queryParams.forEach((k, v) -> {
					if (k != null && v != null && !k.isBlank())
						builder.queryParam(k, v);
				});
			}
			return restClient.get().uri(builder.build().toUri()).header("Authorization", "Bearer " + bearerToken)
					.header("selectedLocation", facility).header("selectedOrganization", facility)
					.header("selectedBusinessUnit", facility).retrieve().body(String.class);
		} else {
			String jsonPayload;
			try {
				jsonPayload = (payload instanceof String s) ? s
						: objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload);
			} catch (Exception e) {
				jsonPayload = String.valueOf(payload);
			}

			return restClient.post().uri(targetEndpoint).contentType(MediaType.APPLICATION_JSON)
					.header("Authorization", "Bearer " + bearerToken).header("selectedLocation", facility)
					.header("selectedOrganization", facility).header("selectedBusinessUnit", facility).body(jsonPayload)
					.retrieve().body(String.class);
		}
	}

    // =========================================================================
    // 7. Dynamic Helpers & Clean Resolution
    // =========================================================================

    public String extractCleanErrorMessage(String rawErrorBody, int statusCode, String facility, String username) {
        if (rawErrorBody == null || rawErrorBody.isBlank()) {
            return "HTTP " + statusCode + " error from MAWM Cloud (" + (facility != null ? facility : "default") + ").";
        }
        try {
            JsonNode root = objectMapper.readTree(rawErrorBody);

            // 1. Check MAWM messages.Message array (contains detailed field-level validation errors)
            if (root.has("messages") && root.get("messages").has("Message") && root.get("messages").get("Message").isArray()) {
                JsonNode msgArr = root.get("messages").get("Message");
                if (msgArr.size() > 0) {
                    List<String> details = new ArrayList<>();
                    for (JsonNode m : msgArr) {
                        String desc = m.has("Description") ? m.get("Description").asText()
                                : (m.has("description") ? m.get("description").asText() : "");
                        String field = m.has("ErrorField") ? m.get("ErrorField").asText() : "";
                        if (!desc.isBlank()) {
                            details.add(!field.isBlank() && !desc.contains(field) ? desc + " (Field: " + field + ")" : desc);
                        }
                    }
                    if (!details.isEmpty()) {
                        return String.join("; ", details);
                    }
                }
            }

            // 2. Check MAWM exceptions array
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
            if (root.has("message") && !root.get("message").asText().isBlank() && !"error.500".equals(root.get("message").asText()) && !"error.400".equals(root.get("message").asText())) {
                return root.get("message").asText().trim();
            }
        } catch (Exception ignored) {}

        return "HTTP " + statusCode + " response from MAWM Cloud (" + (facility != null ? facility : "default") + ").";
    }

    private boolean isValidFacility(String fac) {
        if (fac == null || fac.isBlank()) return false;
        String upper = fac.trim().toUpperCase();
        return !upper.equals("ITEM") && !upper.equals("ITEMS") && !upper.equals("PO")
                && !upper.equals("ASN") && !upper.equals("DO") && !upper.equals("DCORDER")
                && !upper.equals("ORDER") && !upper.equals("ORDERS") && !upper.equals("SHIPMENT")
                && !upper.equals("DEFAULT") && !upper.equals("UNKNOWN") && !upper.equals("PAYLOAD")
                && !upper.equals("BATCH") && !upper.equals("BATCHES") && !upper.equals("BATCH_MASTER");
    }

    private String resolveFacility(String facility, JsonNode body) {
        if (facility != null && !facility.isBlank() && isValidFacility(facility)) return facility.trim();
        if (body != null && body.isObject()) {
            for (String key : List.of("OriginFacilityId", "DestinationFacilityId", "FacilityId", "facilityId", "originFacilityId", "destinationFacilityId")) {
                if (body.has(key) && !body.get(key).asText().isBlank()) {
                    String candidate = body.get(key).asText().trim();
                    if (isValidFacility(candidate)) return candidate;
                }
            }
        }
        return (mawmProperties.getDefaultFacility() != null && !mawmProperties.getDefaultFacility().isBlank())
                ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe";
    }

    private String resolveUsername(String username, JsonNode body) {
        String configured = (mawmProperties.getUsername() != null && !mawmProperties.getUsername().isBlank())
                ? mawmProperties.getUsername().trim() : "lezhilarasan";
        if (username != null && !username.isBlank() && isValidMawmUser(username)) {
            return username.trim();
        }
        if (body != null && body.isObject()) {
            for (String key : List.of("CreatedBy", "createdBy", "username", "Username")) {
                if (body.has(key) && !body.get(key).asText().isBlank()) {
                    String candidate = body.get(key).asText().trim();
                    if (isValidMawmUser(candidate)) {
                        return candidate;
                    }
                }
            }
        }
        return configured;
    }

    private boolean isValidMawmUser(String u) {
        if (u == null || u.isBlank()) return false;
        String upper = u.trim().toUpperCase();
        return !upper.equals("OPTI") && !upper.equals("SAP") && !upper.equals("ORACLE")
                && !upper.equals("NETSUITE") && !upper.equals("SYSTEM") && !upper.startsWith("CUSTOMER_")
                && !upper.equals("DEFAULT") && !upper.contains("@") && !upper.contains(" ");
    }

    private String resolveEndpointForDocType(String docType) {
        String base = mawmProperties.getBaseUrl();
        if ("ITEM".equals(docType) || "ITEM_MASTER".equals(docType)) {
            return base + mawmProperties.getItemPath();
        } else if ("ASN".equals(docType)) {
            return base + mawmProperties.getAsnPath();
        } else if (isDistributionOrder(docType)) {
            return base + mawmProperties.getDoSavePath();
        } else if ("PO".equals(docType) || "PURCHASE_ORDER".equals(docType)) {
            return base + mawmProperties.getPoPath();
        } else if ("BATCH".equals(docType) || "BATCH_MASTER".equals(docType)) {
            return base + mawmProperties.getBatchPath();
        } else {
            throw new IllegalArgumentException("Unsupported document type for MAWM dispatch: " + docType);
        }
    }

    private String resolveFacilityFromEnvelope(CanonicalEnvelope env) {
        if (env.getData() != null && !env.getData().isEmpty()) {
            String fac = extractFacilityFromMap(env.getData().get(0));
            if (fac != null && !fac.isBlank() && isValidFacility(fac)) return fac;
        }
        if (env.getRecords() != null && !env.getRecords().isEmpty()) {
            String fac = extractFacilityFromMap(env.getRecords().get(0));
            if (fac != null && !fac.isBlank() && isValidFacility(fac)) return fac;
        }
        if (env.getFacilityId() != null && !env.getFacilityId().isBlank() && isValidFacility(env.getFacilityId())) {
            return env.getFacilityId().trim();
        }
        return (mawmProperties.getDefaultFacility() != null && !mawmProperties.getDefaultFacility().isBlank())
                ? mawmProperties.getDefaultFacility().trim() : "Food_Cbe";
    }

    private String extractFacilityFromMap(Map<String, Object> map) {
        if (map == null) return null;
        for (String k : List.of("OriginFacilityId", "DestinationFacilityId", "FacilityId", "facilityId", "originFacilityId", "destinationFacilityId")) {
            Object v = map.get(k);
            if (v != null && !String.valueOf(v).isBlank()) return String.valueOf(v).trim();
        }
        return null;
    }

    private String extractUserFromMap(Map<String, Object> map) {
        if (map == null) return null;
        for (String k : List.of("CreatedBy", "createdBy", "username", "Username")) {
            Object v = map.get(k);
            if (v != null && !String.valueOf(v).isBlank()) return String.valueOf(v).trim();
        }
        return null;
    }

    /**
     * Cleans incoming Purchase Order payloads for MAWM Receiving (/receiving/api/receiving/purchaseOrder/save).
     * 1. Strips invalid PurchaseOrderStatus="Open" which causes MAWM RCV::155 rejection.
     * 2. Strips nulls and empty strings that break MAWM's strict entity validation.
     * 3. Cleans PurchaseOrderLine entries.
     */
    public Map<String, Object> cleanPoPayload(Map<String, Object> poPayload) {
        if (poPayload == null || poPayload.isEmpty()) {
            return new LinkedHashMap<>();
        }
        Map<String, Object> clean = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : poPayload.entrySet()) {
            String key = entry.getKey();
            Object val = entry.getValue();
            if (val == null) {
                continue;
            }
            if (val instanceof String s && s.trim().isEmpty()) {
                continue;
            }
            // MAWM Receiving rejects "Open" status with "RCV::155: Invalid status Open on PO ...".
            // MAWM manages PO statuses internally. Omitting it allows MAWM to assign the initial valid status (Created).
            if ("PurchaseOrderStatus".equalsIgnoreCase(key) || "purchaseOrderStatus".equalsIgnoreCase(key) || "status".equalsIgnoreCase(key)) {
                String statusStr = String.valueOf(val).trim();
                if (statusStr.isEmpty() || "Open".equalsIgnoreCase(statusStr) || "null".equalsIgnoreCase(statusStr)) {
                    continue;
                }
            }
            if (("PurchaseOrderLine".equalsIgnoreCase(key) || "purchaseOrderLine".equalsIgnoreCase(key)) && val instanceof List<?> lines) {
                List<Map<String, Object>> cleanLines = new ArrayList<>();
                for (Object item : lines) {
                    if (item instanceof Map<?, ?> lineMap) {
                        Map<String, Object> cleanLine = new LinkedHashMap<>();
                        for (Map.Entry<?, ?> le : lineMap.entrySet()) {
                            Object lv = le.getValue();
                            if (lv != null && !(lv instanceof String ls && ls.trim().isEmpty())) {
                                cleanLine.put(String.valueOf(le.getKey()), lv);
                            }
                        }
                        if (!cleanLine.isEmpty()) {
                            cleanLines.add(cleanLine);
                        }
                    }
                }
                clean.put(key, cleanLines);
            } else {
                clean.put(key, val);
            }
        }
        return clean;
    }

    public Map<String, Object> cleanGenericEntityPayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return new LinkedHashMap<>();
        }
        Map<String, Object> clean = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            Object val = entry.getValue();
            if (val == null || (val instanceof String s && s.trim().isEmpty())) {
                continue;
            }
            clean.put(entry.getKey(), val);
        }
        return clean;
    }

    private Object preparePayloadForDispatch(String docType, CanonicalEnvelope env, String facility) {
        List<Map<String, Object>> records = (env.getData() != null && !env.getData().isEmpty())
                ? env.getData()
                : (env.getRecords() != null ? env.getRecords() : Collections.emptyList());

        if (records.isEmpty()) {
            return env.toMawmPayload();
        }

        boolean isPo = "PO".equalsIgnoreCase(docType) || "PURCHASE_ORDER".equalsIgnoreCase(docType);
        if (isPo) {
            List<Map<String, Object>> cleaned = new ArrayList<>();
            for (Map<String, Object> rec : records) {
                Map<String, Object> c = cleanPoPayload(rec);
                if (facility != null && !facility.isBlank()) {
                    c.putIfAbsent("DestinationFacilityId", facility);
                }
                cleaned.add(c);
            }
            return records.size() == 1 ? cleaned.get(0) : cleaned;
        }

        // Single entity endpoints (MAWM /asn/save, /order, /item/save, /batchMaster/save)
        if (records.size() == 1) {
            Map<String, Object> first = new LinkedHashMap<>(records.get(0));
            // Remove empty/blank strings and nulls so MAWM entity validation does not reject empty optional fields
            first.entrySet().removeIf(e -> e.getValue() == null);
            first.entrySet().removeIf(e -> e.getValue() instanceof String s && s.trim().isEmpty());
            if (facility != null && !facility.isBlank()) {
                if ("ASN".equalsIgnoreCase(docType)) {
                    first.putIfAbsent("DestinationFacilityId", facility);
                } else if ("BATCH".equalsIgnoreCase(docType) || "BATCH_MASTER".equalsIgnoreCase(docType)) {
                    first.putIfAbsent("FacilityId", facility);
                    first.putIfAbsent("OrgId", facility);
                }
            }
            return first;
        }

        // Multi-record payloads
        return records;
    }

    private boolean isDistributionOrder(String docType) {
        if (docType == null) return false;
        String upper = docType.toUpperCase();
        return upper.equals("DO") || upper.contains("DISTRIBUTION") || upper.contains("DCORDER");
    }

    private String lookupDoPrimaryKey(String orderId, String facility, String username) {
        try {
            String endpoint = mawmProperties.getBaseUrl() + mawmProperties.getDoSearchPath();
            Map<String, Object> queryPayload = Map.of(
                    "Query", "OrderId = '" + orderId.trim() + "'",
                    "Template", Map.of("OrderId", "", "PK", "")
            );
            Map<String, Object> result = executeMawm(HttpMethod.POST, endpoint, facility, username, queryPayload, null);
            if (result.get("data") instanceof JsonNode dataNode) {
                JsonNode arr = dataNode.isArray() ? dataNode : (dataNode.has("data") ? dataNode.get("data") : (dataNode.has("Data") ? dataNode.get("Data") : null));
                if (arr != null && arr.isArray() && arr.size() > 0) {
                    JsonNode first = arr.get(0);
                    if (first.has("PK")) return first.get("PK").asText();
                    if (first.has("pk")) return first.get("pk").asText();
                }
            }
        } catch (Exception e) {
            log.warn("[MAWM Dispatcher] Could not lookup PK for OrderId '{}': {}", orderId, e.getMessage());
        }
        return null;
    }

    private String extractOrderIdFromPayload(Object payload) {
        if (payload instanceof Map<?, ?> map) {
            Object id = map.get("OrderId");
            if (id == null) id = map.get("orderId");
            return id != null ? String.valueOf(id).trim() : null;
        } else if (payload instanceof JsonNode node) {
            if (node.has("OrderId")) return node.get("OrderId").asText().trim();
            if (node.has("orderId")) return node.get("orderId").asText().trim();
        }
        return null;
    }

    private JsonNode unwrapSingleRecord(JsonNode node) {
        if (node == null) return null;
        if (node.isArray() && node.size() > 0) return node.get(0);
        if (node.has("Data") && node.get("Data").isArray() && node.get("Data").size() > 0) return node.get("Data").get(0);
        if (node.has("data") && node.get("data").isArray() && node.get("data").size() > 0) return node.get("data").get(0);
        return node;
    }

    private Map<String, Object> synthesizeManhattanQuery(JsonNode node, String defaultQueryField) {
        Map<String, Object> result = new LinkedHashMap<>();
        String queryString = null;

        if (defaultQueryField != null && !defaultQueryField.isBlank()) {
            String val = findFieldValue(node, defaultQueryField);
            if (!val.isBlank()) {
                queryString = "AsnId".equalsIgnoreCase(defaultQueryField)
                        ? defaultQueryField + " in ('" + val + "')"
                        : defaultQueryField + " = '" + val + "'";
            }
        }

        if (queryString == null && node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> it = node.fields();
            while (it.hasNext()) {
                Map.Entry<String, JsonNode> entry = it.next();
                String k = entry.getKey();
                JsonNode v = entry.getValue();
                if (v.isValueNode() && !k.equalsIgnoreCase("Template") && !k.equalsIgnoreCase("fields") && !k.equalsIgnoreCase("facilityId") && !k.equalsIgnoreCase("username")) {
                    queryString = k + " = '" + v.asText().trim() + "'";
                    break;
                }
            }
        }

        result.put("Query", (queryString != null && !queryString.isBlank()) ? queryString : "1=1");

        if (node.has("Template") && node.get("Template").isObject()) {
            result.put("Template", objectMapper.convertValue(node.get("Template"), Map.class));
        } else if (node.has("template") && node.get("template").isObject()) {
            result.put("Template", objectMapper.convertValue(node.get("template"), Map.class));
        } else if (node.has("fields") && node.get("fields").isArray()) {
            Map<String, String> template = new LinkedHashMap<>();
            node.get("fields").forEach(f -> template.put(f.asText(), ""));
            result.put("Template", template);
        } else {
            result.put("Template", Map.of());
        }

        return result;
    }

    private String findFieldValue(JsonNode node, String fieldName) {
        if (node == null || !node.isObject()) return "";
        if (node.has(fieldName)) return node.get(fieldName).asText().trim();
        Iterator<Map.Entry<String, JsonNode>> it = node.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> entry = it.next();
            if (entry.getKey().equalsIgnoreCase(fieldName)) {
                return entry.getValue().asText().trim();
            }
        }
        return "";
    }

    private String extractEntityId(ErpFileIntakeTracker tracker, String... candidateKeys) {
        for (String content : List.of(
                tracker.getOutputFiles() != null ? tracker.getOutputFiles() : "",
                tracker.getRawContent() != null ? tracker.getRawContent() : "",
                tracker.getMawmResponse() != null ? tracker.getMawmResponse() : ""
        )) {
            if (content.isBlank() || content.startsWith("[CLAIM_CHECK:")) continue;
            try {
                JsonNode node = objectMapper.readTree(content);
                if (node.has("data")) node = node.get("data");
                else if (node.has("Data")) node = node.get("Data");
                if (node.isArray() && node.size() > 0) node = node.get(0);

                for (String key : candidateKeys) {
                    String val = findFieldValue(node, key);
                    if (!val.isBlank()) return val;
                }
            } catch (Exception ignored) {}
        }
        return tracker.getJobId();
    }

    private boolean isOptiSource(String source) {
        return source != null && "OPTI".equalsIgnoreCase(source.trim());
    }

    public MawmProperties getMawmProperties() {
        return mawmProperties;
    }

    public MawmAuthService getMawmAuthService() {
        return mawmAuthService;
    }
}
