package com.platform.erp.mawm;

import com.platform.erp.store.TransactionStore;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * REST API for MAWM Delivery Monitoring: telemetry, connection testing, and manual job dispatch.
 */
@RestController
@RequestMapping("/api/v1/erp/mawm")
public class MawmTelemetryController {

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
    @PostMapping("/save-asn")
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
     * Verify the ASN status for a specific job in PostgreSQL against live MAWM Cloud search.
     * POST /api/v1/erp/mawm/verify/{jobId}
     */
    @PostMapping("/verify/{jobId}")
    public ResponseEntity<Map<String, Object>> verifyJobAsn(@PathVariable("jobId") String jobId) {
        Map<String, Object> result = mawmDispatcherService.verifyJobAsn(jobId);
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
}

