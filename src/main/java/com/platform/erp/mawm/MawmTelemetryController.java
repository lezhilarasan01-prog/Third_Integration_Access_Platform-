package com.platform.erp.mawm;

import com.fasterxml.jackson.databind.JsonNode;
import com.platform.erp.store.TransactionStore;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * REST API for MAWM Delivery Monitoring: telemetry, connection testing, and manual job dispatch.
 * Supports both ASN (5.4) and Purchase Order (5.3) integrations.
 */
@RestController
@RequestMapping("/api/v1/erp/mawm")
public class MawmTelemetryController {

    private static final Pattern PO_QUERY_PATTERN = Pattern.compile("PurchaseOrderId\\s*=\\s*'([^']+)'", Pattern.CASE_INSENSITIVE);
    private static final Pattern DO_QUERY_PATTERN = Pattern.compile("OrderId\\s*=\\s*'([^']+)'", Pattern.CASE_INSENSITIVE);

    private final MawmProperties mawmProperties;
    private final MawmAuthService mawmAuthService;
    private final MawmDispatcherService mawmDispatcherService;
    private final TransactionStore transactionStore;

    public MawmTelemetryController(MawmProperties mawmProperties,
                                   MawmAuthService mawmAuthService,
                                   MawmDispatcherService mawmDispatcherService,
                                   TransactionStore transactionStore) {
        this.mawmProperties = mawmProperties;
        this.mawmAuthService = mawmAuthService;
        this.mawmDispatcherService = mawmDispatcherService;
        this.transactionStore = transactionStore;
    }

    /**
     * Get live MAWM configuration, OAuth2 token status, and delivery metrics.
     * GET /api/v1/erp/mawm/telemetry
     */
    @GetMapping("/telemetry")
    public ResponseEntity<Map<String, Object>> getTelemetry() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("enabled", mawmProperties.isEnabled());
        data.put("baseUrl", mawmProperties.getBaseUrl());
        data.put("authUrl", mawmProperties.getAuthUrl());
        data.put("asnPath", mawmProperties.getAsnPath());
        data.put("asnSearchPath", mawmProperties.getAsnSearchPath());
        data.put("poPath", mawmProperties.getPoPath());
        data.put("poSearchPath", mawmProperties.getPoSearchPath());
        data.put("poLineSearchPath", mawmProperties.getPoLineSearchPath());
        data.put("asnLineSearchPath", mawmProperties.getAsnLineSearchPath());
        data.put("itemPath", mawmProperties.getItemPath());
        data.put("itemQueryPath", mawmProperties.getItemQueryPath());
        data.put("doGetPath", mawmProperties.getDoGetPath());
        data.put("doSavePath", mawmProperties.getDoSavePath());
        data.put("doUpdatePath", mawmProperties.getDoUpdatePath());
        data.put("doSearchPath", mawmProperties.getDoSearchPath());
        data.put("doLineSearchPath", mawmProperties.getDoLineSearchPath());
        data.put("defaultFacility", mawmProperties.getDefaultFacility());
        data.put("username", mawmProperties.getUsername());
        data.put("verifiedStatus", mawmProperties.getVerifiedStatus());
        data.put("authStatus", mawmAuthService.getAuthStatus());
        data.put("stats", transactionStore.getMawmStats());
        return ResponseEntity.ok(data);
    }

    /**
     * Test OAuth2 token retrieval and endpoint latency on demand.
     * POST /api/v1/erp/mawm/test-connection
     */
    @PostMapping("/test-connection")
    public ResponseEntity<Map<String, Object>> testConnection(@RequestParam(value = "username", required = false) String username) {
        try {
            Map<String, Object> result = mawmAuthService.testConnection(username);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "status", "FAILED",
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Directly create / save an Item Master in MAWM Cloud (/item-master/api/item-master/item/save)
     * POST /api/v1/erp/mawm/save-item
     */
    @PostMapping({"/save-item", "/create-item-active"})
    public ResponseEntity<Map<String, Object>> saveItem(
            @RequestBody Map<String, Object> payload,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.saveItemDirect(payload, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Directly create / save an ASN to MAWM Cloud (5.4.1 /receiving/api/receiving/asn/save)
     * POST /api/v1/erp/mawm/save-asn
     */
    @PostMapping({"/save-asn", "/create-asn-active"})
    public ResponseEntity<Map<String, Object>> saveAsn(
            @RequestBody Map<String, Object> payload,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.saveAsnDirect(payload, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Search and check live ASN verification status in MAWM Cloud.
     * POST /api/v1/erp/mawm/search-asn
     */
    @PostMapping("/search-asn")
    public ResponseEntity<Map<String, Object>> searchAsnStatus(
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(value = "asnId", required = false) String paramAsnId,
            @RequestParam(value = "facilityId", required = false) String paramFacility,
            @RequestParam(value = "username", required = false) String paramUsername) {
        String asnId = paramAsnId != null && !paramAsnId.isBlank()
                ? paramAsnId
                : (body != null ? body.get("asnId") : null);
        String facility = paramFacility != null && !paramFacility.isBlank()
                ? paramFacility
                : (body != null ? body.get("facilityId") : null);
        String username = paramUsername != null && !paramUsername.isBlank()
                ? paramUsername
                : (body != null ? body.get("username") : null);

        Map<String, Object> result = mawmDispatcherService.searchAsnStatus(asnId, facility, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Dynamic Search for ASN in MAWM Cloud (5.4.2 /receiving/api/receiving/asn/search)
     * POST /api/v1/erp/mawm/query/asn
     * Accepts arbitrary dynamic JSON payloads from ERPs (Query + Template).
     * Query param: storeTracker=true (optional, false by default)
     */
    @PostMapping("/query/asn")
    public ResponseEntity<Map<String, Object>> queryAsnDynamic(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchAsnDynamic(body, effectiveFacility, username, effectiveStore);
        return ResponseEntity.ok(result);
    }

    /**
     * Dynamic Search for Purchase Orders in MAWM Cloud (5.3.2 /receiving/api/receiving/purchaseOrder/search)
     * POST /api/v1/erp/mawm/query/po
     * Accepts arbitrary dynamic JSON payloads from ERPs (Query + Template).
     */
    @PostMapping("/query/po")
    public ResponseEntity<Map<String, Object>> queryPoDynamic(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchPoDynamic(body, effectiveFacility, username, effectiveStore);
        return ResponseEntity.ok(result);
    }

    /**
     * Dynamic Search for Purchase Order Lines in MAWM Cloud (5.3.3 /receiving/api/receiving/purchaseOrderLine/search)
     * POST /api/v1/erp/mawm/query/po-line
     * Accepts arbitrary dynamic JSON payloads from ERPs (Query + Template).
     */
    @PostMapping("/query/po-line")
    public ResponseEntity<Map<String, Object>> queryPoLineDynamic(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchPoLineDynamic(body, effectiveFacility, username, effectiveStore);
        return ResponseEntity.ok(result);
    }

    /**
     * Dynamic Search for PO Associated ASN Lines in MAWM Cloud (5.3.4 /receiving/api/receiving/asnLine/search)
     * POST /api/v1/erp/mawm/query/asn-line
     * Accepts arbitrary dynamic JSON payloads from ERPs (Query + Template).
     */
    @PostMapping("/query/asn-line")
    public ResponseEntity<Map<String, Object>> queryAsnLineDynamic(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchPoAsnLineDynamic(body, effectiveFacility, username, effectiveStore);
        return ResponseEntity.ok(result);
    }

    /**
     * Inbound Sync: Fetch Items dynamically from MAWM Cloud (/item-master/api/item-master/item)
     * GET /api/v1/erp/mawm/sync/items
     * Supports dynamic query parameters: query, page, size, needTotalCount.
     */
    @GetMapping("/sync/items")
    public ResponseEntity<Map<String, Object>> syncItemsDynamic(
            @RequestParam Map<String, String> allParams,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, String> queryParams = new LinkedHashMap<>(allParams);
        queryParams.remove("facilityId");
        queryParams.remove("username");
        queryParams.remove("storeTracker");
        Map<String, Object> result = mawmDispatcherService.fetchItemsDynamic(effectiveFacility, username, queryParams, effectiveStore);
        return ResponseEntity.ok(result);
    }

    /**
     * Directly create / save a Purchase Order to MAWM Cloud (5.3.1 /receiving/api/receiving/purchaseOrder/save)
     * POST /api/v1/erp/mawm/save-po
     * Also mapped to /create-po-active
     */
    @PostMapping({"/save-po", "/create-po-active"})
    public ResponseEntity<Map<String, Object>> savePo(
            @RequestBody Map<String, Object> payload,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.savePoDirect(payload, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Query Purchase Order Status in MAWM Cloud (5.3.2 /receiving/api/receiving/purchaseOrder/search)
     * POST /api/v1/erp/mawm/search-po
     * Also mapped to /check-po-status-active
     */
    @PostMapping({"/search-po", "/check-po-status-active"})
    public ResponseEntity<Map<String, Object>> searchPoStatus(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "purchaseOrderId", required = false) String paramPoId,
            @RequestParam(value = "facilityId", required = false) String paramFacility,
            @RequestParam(value = "username", required = false) String paramUsername) {
        String poId = resolvePoId(body, paramPoId);
        String facility = resolveFacility(body, paramFacility);
        String username = resolveUsername(body, paramUsername);

        Map<String, Object> result = mawmDispatcherService.searchPoStatus(poId, facility, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Query Purchase Order Lines in MAWM Cloud (5.3.3 /receiving/api/receiving/purchaseOrderLine/search)
     * POST /api/v1/erp/mawm/search-po-lines
     */
    @PostMapping("/search-po-lines")
    public ResponseEntity<Map<String, Object>> searchPoLines(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "purchaseOrderId", required = false) String paramPoId,
            @RequestParam(value = "facilityId", required = false) String paramFacility,
            @RequestParam(value = "username", required = false) String paramUsername) {
        String poId = resolvePoId(body, paramPoId);
        String facility = resolveFacility(body, paramFacility);
        String username = resolveUsername(body, paramUsername);

        Map<String, Object> result = mawmDispatcherService.searchPoLines(poId, facility, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Query ASN Details Associated with PO in MAWM Cloud (5.3.4 /receiving/api/receiving/asnLine/search)
     * POST /api/v1/erp/mawm/search-po-asn-lines
     */
    @PostMapping("/search-po-asn-lines")
    public ResponseEntity<Map<String, Object>> searchPoAsnLines(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "purchaseOrderId", required = false) String paramPoId,
            @RequestParam(value = "facilityId", required = false) String paramFacility,
            @RequestParam(value = "username", required = false) String paramUsername) {
        String poId = resolvePoId(body, paramPoId);
        String facility = resolveFacility(body, paramFacility);
        String username = resolveUsername(body, paramUsername);

        Map<String, Object> result = mawmDispatcherService.searchPoAsnLines(poId, facility, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Check PO verification status for a specific job in DB
     * POST /api/v1/erp/mawm/verify-po/{jobId}
     */
    @PostMapping("/verify-po/{jobId}")
    public ResponseEntity<Map<String, Object>> verifyJobPo(@PathVariable("jobId") String jobId) {
        Map<String, Object> result = mawmDispatcherService.verifyJobPo(jobId);
        return ResponseEntity.ok(result);
    }

    /**
     * Check DO verification status for a specific job in DB
     * POST /api/v1/erp/mawm/verify-do/{jobId}
     */
    @PostMapping("/verify-do/{jobId}")
    public ResponseEntity<Map<String, Object>> verifyJobDo(@PathVariable("jobId") String jobId) {
        Map<String, Object> result = mawmDispatcherService.verifyJobDo(jobId);
        return ResponseEntity.ok(result);
    }

    /**
     * 5.5.1 Check if DO Exists (by OrderId)
     * GET /api/v1/erp/mawm/do/check/{orderId}
     */
    @GetMapping("/do/check/{orderId}")
    public ResponseEntity<Map<String, Object>> checkDoExists(
            @PathVariable("orderId") String orderId,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.checkDoExists(orderId, facilityId, username);
        return ResponseEntity.ok(result);
    }

    /**
     * 5.5.2 Create New Distribution Order (Add)
     * POST /api/v1/erp/mawm/save-do
     * Also mapped to /create-do-active
     */
    @PostMapping({"/save-do", "/create-do-active"})
    public ResponseEntity<Map<String, Object>> saveDo(
            @RequestBody JsonNode payload,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker) {
        Map<String, Object> result = mawmDispatcherService.saveDoDirectDynamic(payload, username, storeTracker);
        return ResponseEntity.ok(result);
    }

    /**
     * 5.5.3 Update Existing Distribution Order
     * POST /api/v1/erp/mawm/do/update/{pk}
     */
    @PostMapping("/do/update/{pk}")
    public ResponseEntity<Map<String, Object>> updateDo(
            @PathVariable("pk") String pk,
            @RequestBody JsonNode payload,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.updateDoDirectDynamic(pk, payload, username);
        return ResponseEntity.ok(result);
    }

    /**
     * 5.5.4 Search Distribution Order Status
     * POST /api/v1/erp/mawm/search-do
     * Also mapped to /check-do-status-active
     */
    @PostMapping({"/search-do", "/check-do-status-active"})
    public ResponseEntity<Map<String, Object>> searchDoStatus(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "orderId", required = false) String paramOrderId,
            @RequestParam(value = "facilityId", required = false) String paramFacility,
            @RequestParam(value = "username", required = false) String paramUsername) {
        String orderId = resolveOrderId(body, paramOrderId);
        String facility = resolveFacility(body, paramFacility);
        String username = resolveUsername(body, paramUsername);

        Map<String, Object> result = mawmDispatcherService.searchDoStatus(orderId, facility, username);
        return ResponseEntity.ok(result);
    }

    /**
     * 5.5.5 Search Distribution Order Line Progress
     * POST /api/v1/erp/mawm/search-do-lines
     */
    @PostMapping("/search-do-lines")
    public ResponseEntity<Map<String, Object>> searchDoLines(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "orderId", required = false) String paramOrderId,
            @RequestParam(value = "facilityId", required = false) String paramFacility,
            @RequestParam(value = "username", required = false) String paramUsername) {
        String orderId = resolveOrderId(body, paramOrderId);
        String facility = resolveFacility(body, paramFacility);
        String username = resolveUsername(body, paramUsername);

        Map<String, Object> result = mawmDispatcherService.searchDoLines(orderId, facility, username);
        return ResponseEntity.ok(result);
    }

    /**
     * Dynamic Search for Distribution Orders in MAWM Cloud (5.5.4 /dcorder/api/dcorder/order/search)
     * POST /api/v1/erp/mawm/query/do
     */
    @PostMapping("/query/do")
    public ResponseEntity<Map<String, Object>> queryDoDynamic(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchDoDynamic(body, effectiveFacility, username, effectiveStore);
        return ResponseEntity.ok(result);
    }

    /**
     * Dynamic Search for Distribution Order Lines in MAWM Cloud (5.5.5 /dcorder/api/dcorder/orderLine/search)
     * POST /api/v1/erp/mawm/query/do-line
     */
    @PostMapping("/query/do-line")
    public ResponseEntity<Map<String, Object>> queryDoLineDynamic(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchDoLineDynamic(body, effectiveFacility, username, effectiveStore);
        return ResponseEntity.ok(result);
    }

    /**
     * Verify the ASN, PO, or DO status for a specific job in PostgreSQL against live MAWM Cloud search.
     * POST /api/v1/erp/mawm/verify/{jobId}
     */
    @PostMapping("/verify/{jobId}")
    public ResponseEntity<Map<String, Object>> verifyJob(@PathVariable("jobId") String jobId) {
        Map<String, Object> result = mawmDispatcherService.verifyJob(jobId);
        return ResponseEntity.ok(result);
    }

    /**
     * Trigger or re-dispatch a specific job to MAWM Cloud.
     * POST /api/v1/erp/mawm/dispatch/{jobId}
     */
    @PostMapping("/dispatch/{jobId}")
    public ResponseEntity<Map<String, Object>> dispatchJob(@PathVariable("jobId") String jobId) {
        Map<String, Object> result = mawmDispatcherService.dispatchJob(jobId);
        return ResponseEntity.ok(result);
    }

    private String resolveOrderId(Map<String, Object> body, String paramOrderId) {
        if (paramOrderId != null && !paramOrderId.isBlank()) {
            return paramOrderId.trim();
        }
        if (body != null) {
            if (body.get("orderId") != null) return String.valueOf(body.get("orderId")).trim();
            if (body.get("OrderId") != null) return String.valueOf(body.get("OrderId")).trim();
            if (body.get("doId") != null) return String.valueOf(body.get("doId")).trim();
            if (body.get("Query") != null) {
                String q = String.valueOf(body.get("Query"));
                Matcher m = DO_QUERY_PATTERN.matcher(q);
                if (m.find()) {
                    return m.group(1).trim();
                }
            }
        }
        return null;
    }

    private String resolvePoId(Map<String, Object> body, String paramPoId) {
        if (paramPoId != null && !paramPoId.isBlank()) {
            return paramPoId.trim();
        }
        if (body != null) {
            if (body.get("purchaseOrderId") != null) return String.valueOf(body.get("purchaseOrderId")).trim();
            if (body.get("PurchaseOrderId") != null) return String.valueOf(body.get("PurchaseOrderId")).trim();
            if (body.get("poId") != null) return String.valueOf(body.get("poId")).trim();
            if (body.get("Query") != null) {
                String q = String.valueOf(body.get("Query"));
                Matcher m = PO_QUERY_PATTERN.matcher(q);
                if (m.find()) {
                    return m.group(1).trim();
                }
            }
        }
        return null;
    }

    private String resolveFacility(Map<String, Object> body, String paramFacility) {
        if (paramFacility != null && !paramFacility.isBlank()) {
            return paramFacility.trim();
        }
        if (body != null) {
            if (body.get("facilityId") != null) return String.valueOf(body.get("facilityId")).trim();
            if (body.get("OriginFacilityId") != null) return String.valueOf(body.get("OriginFacilityId")).trim();
            if (body.get("originFacilityId") != null) return String.valueOf(body.get("originFacilityId")).trim();
            if (body.get("DestinationFacilityId") != null) return String.valueOf(body.get("DestinationFacilityId")).trim();
            if (body.get("destinationFacilityId") != null) return String.valueOf(body.get("destinationFacilityId")).trim();
        }
        return null;
    }

    private String resolveUsername(Map<String, Object> body, String paramUsername) {
        if (paramUsername != null && !paramUsername.isBlank()) {
            return paramUsername.trim();
        }
        if (body != null) {
            if (body.get("username") != null) return String.valueOf(body.get("username")).trim();
            if (body.get("CreatedBy") != null) return String.valueOf(body.get("CreatedBy")).trim();
            if (body.get("createdBy") != null) return String.valueOf(body.get("createdBy")).trim();
        }
        return null;
    }
}
