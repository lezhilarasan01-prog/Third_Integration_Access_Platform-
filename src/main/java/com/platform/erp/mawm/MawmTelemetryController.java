package com.platform.erp.mawm;

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
     * Verify the ASN or PO status for a specific job in PostgreSQL against live MAWM Cloud search.
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
