package com.platform.erp.mawm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Direct Manhattan Active WMS (MAWM) API Proxy Controller.
 * Provides direct URL matching for external ERPs calling standard Manhattan endpoints
 * against this integration gateway:
 *
 * 5.3.4 POST /receiving/api/receiving/asnLine/search (Query ASN Details Associated with PO)
 * 5.4.2 POST /receiving/api/receiving/asn/search (Check ASN Verification Status)
 * 5.3.2 POST /receiving/api/receiving/purchaseOrder/search (Query PO Status)
 * 5.3.3 POST /receiving/api/receiving/purchaseOrderLine/search (Query PO Lines)
 * 5.3.1 POST /receiving/api/receiving/purchaseOrder/save (Create Purchase Order)
 * 5.4.1 POST /receiving/api/receiving/asn/save (Create ASN)
 * 5.2.2 GET  /item-master/api/item-master/item (Fetch Items from MAWM / Inbound Sync)
 * 5.2.1 POST /item-master/api/item-master/item/save (Create Item Master)
 */
@RestController
public class MawmDirectProxyController {

    private final MawmDispatcherService mawmDispatcherService;
    private final ObjectMapper objectMapper;

    public MawmDirectProxyController(MawmDispatcherService mawmDispatcherService, ObjectMapper objectMapper) {
        this.mawmDispatcherService = mawmDispatcherService;
        this.objectMapper = objectMapper;
    }

    /**
     * 5.3.4 Query ASN Details Associated with PO
     * POST /receiving/api/receiving/asnLine/search
     */
    @PostMapping(value = "/receiving/api/receiving/asnLine/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> searchAsnLineDirect(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchPoAsnLineDynamic(body, effectiveFacility, username, effectiveStore);
        return forwardResponse(result);
    }

    /**
     * 5.4.2 Check ASN Verification Status
     * POST /receiving/api/receiving/asn/search
     */
    @PostMapping(value = "/receiving/api/receiving/asn/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> searchAsnDirect(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchAsnDynamic(body, effectiveFacility, username, effectiveStore);
        return forwardResponse(result);
    }

    /**
     * 5.3.2 Query PO Status
     * POST /receiving/api/receiving/purchaseOrder/search
     */
    @PostMapping(value = "/receiving/api/receiving/purchaseOrder/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> searchPoDirect(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchPoDynamic(body, effectiveFacility, username, effectiveStore);
        return forwardResponse(result);
    }

    /**
     * 5.3.3 Query PO Lines
     * POST /receiving/api/receiving/purchaseOrderLine/search
     */
    @PostMapping(value = "/receiving/api/receiving/purchaseOrderLine/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> searchPoLineDirect(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchPoLineDynamic(body, effectiveFacility, username, effectiveStore);
        return forwardResponse(result);
    }

    /**
     * 5.3.1 Create Purchase Order
     * POST /receiving/api/receiving/purchaseOrder/save
     */
    @PostMapping(value = "/receiving/api/receiving/purchaseOrder/save", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> savePoDirect(
            @RequestBody Map<String, Object> body,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.savePoDirect(body, username);
        return forwardResponse(result);
    }

    /**
     * 5.4.1 Create ASN
     * POST /receiving/api/receiving/asn/save
     */
    @PostMapping(value = "/receiving/api/receiving/asn/save", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> saveAsnDirect(
            @RequestBody Map<String, Object> body,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.saveAsnDirect(body, username);
        return forwardResponse(result);
    }

    /**
     * 5.2.2 Fetch Items from MAWM (Inbound Sync)
     * GET /item-master/api/item-master/item
     */
    @GetMapping(value = "/item-master/api/item-master/item", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> fetchItemsDirect(
            @RequestParam Map<String, String> allParams,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String facility = allParams.remove("facilityId");
        if (facility == null || facility.isBlank()) facility = headerFacility;
        String username = allParams.remove("username");
        boolean storeTracker = "true".equalsIgnoreCase(allParams.remove("storeTracker"));
        if (headerStoreTracker != null) storeTracker = headerStoreTracker;

        Map<String, Object> result = mawmDispatcherService.fetchItemsDynamic(facility, username, allParams, storeTracker);
        return forwardResponse(result);
    }

    /**
     * 5.2.1 Create Item Master
     * POST /item-master/api/item-master/item/save
     */
    @PostMapping(value = "/item-master/api/item-master/item/save", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> saveItemDirect(
            @RequestBody Map<String, Object> body,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.saveItemDirect(body, username);
        return forwardResponse(result);
    }

    private ResponseEntity<String> forwardResponse(Map<String, Object> result) {
        int status = 200;
        if (result.containsKey("statusCode")) {
            try {
                status = Integer.parseInt(result.get("statusCode").toString());
            } catch (Exception ignored) {}
        } else if (Boolean.FALSE.equals(result.get("success"))) {
            status = 500;
        }

        String body = "";
        if (result.containsKey("rawResponse") && result.get("rawResponse") != null) {
            body = result.get("rawResponse").toString();
        } else {
            try {
                body = objectMapper.writeValueAsString(result);
            } catch (Exception ignored) {
                body = "{\"success\":" + result.getOrDefault("success", false) + "}";
            }
        }

        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }
}
