package com.platform.erp.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Built-in Mock MAWM Cloud Endpoint for testing end-to-end dispatch
 * before the live MAWM cloud REST endpoint is provisioned.
 */
@RestController
@RequestMapping("/api/v1/mock-mawm")
public class MockMawmController {

    private static final Logger log = LoggerFactory.getLogger(MockMawmController.class);

    @PostMapping("/orders/po")
    public ResponseEntity<Map<String, Object>> receivePo(@RequestBody Map<String, Object> payload) {
        log.info("[Mock MAWM Cloud] Successfully received Purchase Order JSON: {}", payload);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Order ingested into MAWM Cloud Mock",
                "timestamp", System.currentTimeMillis()
        ));
    }

    @PostMapping("/shipments/asn")
    public ResponseEntity<Map<String, Object>> receiveAsn(@RequestBody Map<String, Object> payload) {
        log.info("[Mock MAWM Cloud] Successfully received Advance Shipping Notice JSON: {}", payload);
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Shipment ASN ingested into MAWM Cloud Mock",
                "timestamp", System.currentTimeMillis()
        ));
    }
}
