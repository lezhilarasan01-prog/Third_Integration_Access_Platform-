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
        data.put("poPath", mawmProperties.getPoPath());
        data.put("defaultFacility", mawmProperties.getDefaultFacility());
        data.put("username", mawmProperties.getUsername());
        data.put("authStatus", mawmAuthService.getAuthStatus());
        data.put("stats", transactionStore.getMawmStats());
        return ResponseEntity.ok(data);
    }

    /**
     * Test OAuth2 token retrieval and endpoint latency on demand.
     * POST /api/v1/erp/mawm/test-connection
     */
    @PostMapping("/test-connection")
    public ResponseEntity<Map<String, Object>> testConnection() {
        try {
            Map<String, Object> result = mawmAuthService.testConnection();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "status", "FAILED",
                    "error", e.getMessage()
            ));
        }
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

