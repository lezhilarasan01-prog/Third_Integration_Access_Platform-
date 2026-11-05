package com.platform.erp.controller;

import com.platform.erp.mawm.MawmDispatcherService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Opti ERP Active Controller supporting direct endpoints specified in Opti ERP Integration Guide:
 * - 5.3.1 POST /create-po-active
 * - 5.3.2 POST /check-po-status-active
 * - 5.4.1 POST /create-asn-active
 */
@RestController
public class OptiActiveController {

    private static final Pattern PO_QUERY_PATTERN = Pattern.compile("PurchaseOrderId\\s*=\\s*'([^']+)'", Pattern.CASE_INSENSITIVE);
    private static final Pattern ASN_QUERY_PATTERN = Pattern.compile("AsnId\\s*(?:in\\s*\\('|='|in\\s*\\(\")\\s*([^'\")]+)", Pattern.CASE_INSENSITIVE);

    private final MawmDispatcherService mawmDispatcherService;

    public OptiActiveController(MawmDispatcherService mawmDispatcherService) {
        this.mawmDispatcherService = mawmDispatcherService;
    }

    /**
     * 5.3.1 Create / Save Purchase Order
     * Mapped to POST /create-po-active and /api/v1/erp/create-po-active
     */
    @PostMapping({"/create-po-active", "/api/v1/erp/create-po-active"})
    public ResponseEntity<Map<String, Object>> createPoActive(
            @RequestBody Map<String, Object> payload,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.savePoDirect(payload, username);
        return ResponseEntity.ok(result);
    }

    /**
     * 5.3.2 Query Purchase Order Status
     * Mapped to POST /check-po-status-active and /api/v1/erp/check-po-status-active
     */
    @PostMapping({"/check-po-status-active", "/api/v1/erp/check-po-status-active"})
    public ResponseEntity<Map<String, Object>> checkPoStatusActive(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "purchaseOrderId", required = false) String paramPoId,
            @RequestParam(value = "facilityId", required = false) String paramFacility,
            @RequestParam(value = "username", required = false) String paramUsername) {

        String poId = paramPoId != null && !paramPoId.isBlank() ? paramPoId.trim() : null;
        if (poId == null && body != null) {
            if (body.get("purchaseOrderId") != null) poId = String.valueOf(body.get("purchaseOrderId")).trim();
            else if (body.get("PurchaseOrderId") != null) poId = String.valueOf(body.get("PurchaseOrderId")).trim();
            else if (body.get("Query") != null) {
                Matcher m = PO_QUERY_PATTERN.matcher(String.valueOf(body.get("Query")));
                if (m.find()) poId = m.group(1).trim();
            }
        }

        String facility = paramFacility != null && !paramFacility.isBlank() ? paramFacility.trim() : null;
        if (facility == null && body != null) {
            if (body.get("facilityId") != null) facility = String.valueOf(body.get("facilityId")).trim();
            else if (body.get("DestinationFacilityId") != null) facility = String.valueOf(body.get("DestinationFacilityId")).trim();
        }

        String username = paramUsername != null && !paramUsername.isBlank() ? paramUsername.trim() : null;
        if (username == null && body != null) {
            if (body.get("username") != null) username = String.valueOf(body.get("username")).trim();
            else if (body.get("CreatedBy") != null) username = String.valueOf(body.get("CreatedBy")).trim();
        }

        Map<String, Object> result = mawmDispatcherService.searchPoStatus(poId, facility, username);
        return ResponseEntity.ok(result);
    }

    /**
     * 5.4.1 Create / Save ASN
     * Mapped to POST /create-asn-active and /api/v1/erp/create-asn-active
     */
    @PostMapping({"/create-asn-active", "/api/v1/erp/create-asn-active"})
    public ResponseEntity<Map<String, Object>> createAsnActive(
            @RequestBody Map<String, Object> payload,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.saveAsnDirect(payload, username);
        return ResponseEntity.ok(result);
    }

    /**
     * 5.4.2 Check ASN Verification Status
     * Mapped to POST /check-asn-status-active and /api/v1/erp/check-asn-status-active
     */
    @PostMapping({"/check-asn-status-active", "/api/v1/erp/check-asn-status-active"})
    public ResponseEntity<Map<String, Object>> checkAsnStatusActive(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "asnId", required = false) String paramAsnId,
            @RequestParam(value = "facilityId", required = false) String paramFacility,
            @RequestParam(value = "username", required = false) String paramUsername) {

        String asnId = paramAsnId != null && !paramAsnId.isBlank() ? paramAsnId.trim() : null;
        if (asnId == null && body != null) {
            if (body.get("asnId") != null) asnId = String.valueOf(body.get("asnId")).trim();
            else if (body.get("AsnId") != null) asnId = String.valueOf(body.get("AsnId")).trim();
            else if (body.get("Query") != null) {
                Matcher m = ASN_QUERY_PATTERN.matcher(String.valueOf(body.get("Query")));
                if (m.find()) asnId = m.group(1).trim();
            }
        }

        String facility = paramFacility != null && !paramFacility.isBlank() ? paramFacility.trim() : null;
        if (facility == null && body != null) {
            if (body.get("facilityId") != null) facility = String.valueOf(body.get("facilityId")).trim();
            else if (body.get("DestinationFacilityId") != null) facility = String.valueOf(body.get("DestinationFacilityId")).trim();
        }

        String username = paramUsername != null && !paramUsername.isBlank() ? paramUsername.trim() : null;
        if (username == null && body != null) {
            if (body.get("username") != null) username = String.valueOf(body.get("username")).trim();
        }

        Map<String, Object> result = mawmDispatcherService.searchAsnStatus(asnId, facility, username);
        return ResponseEntity.ok(result);
    }
}

