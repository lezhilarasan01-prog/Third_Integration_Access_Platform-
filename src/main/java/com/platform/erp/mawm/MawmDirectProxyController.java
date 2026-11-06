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

    /**
     * 5.5.1 Check if DO Exists (by OrderId)
     * GET /dcorder/api/dcorder/order/orderId/{orderId}
     */
    @GetMapping(value = "/dcorder/api/dcorder/order/orderId/{orderId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> checkDoExistsDirect(
            @PathVariable("orderId") String orderId,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        Map<String, Object> result = mawmDispatcherService.checkDoExists(orderId, effectiveFacility, username);
        return forwardResponse(result);
    }

    /**
     * 5.5.2 Create New Distribution Order (Add)
     * POST /dcorder/api/dcorder/order
     * Also mapped to POST /create-do-active
     */
    @PostMapping(value = {"/dcorder/api/dcorder/order", "/create-do-active"}, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> saveDoDirect(
            @RequestBody JsonNode body,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.saveDoDirectDynamic(body, username, effectiveStore);
        return forwardResponse(result);
    }

    /**
     * 5.5.3 Update Existing Distribution Order
     * POST /dcorder/api/dcorder/order/{pk}
     */
    @PostMapping(value = "/dcorder/api/dcorder/order/{pk}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> updateDoDirect(
            @PathVariable("pk") String pk,
            @RequestBody JsonNode body,
            @RequestParam(value = "username", required = false) String username) {
        Map<String, Object> result = mawmDispatcherService.updateDoDirectDynamic(pk, body, username);
        return forwardResponse(result);
    }

    /**
     * 5.5.4 Search Distribution Order Status
     * POST /dcorder/api/dcorder/order/search
     * Also mapped to POST /check-do-status-active
     */
    @PostMapping(value = {"/dcorder/api/dcorder/order/search", "/check-do-status-active"}, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> searchDoDirect(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchDoDynamic(body, effectiveFacility, username, effectiveStore);
        return forwardResponse(result);
    }

    /**
     * 5.5.5 Search Distribution Order Line Progress
     * POST /dcorder/api/dcorder/orderLine/search
     */
    @PostMapping(value = "/dcorder/api/dcorder/orderLine/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> searchDoLineDirect(
            @RequestBody JsonNode body,
            @RequestParam(value = "facilityId", required = false) String facilityId,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "storeTracker", defaultValue = "false") boolean storeTracker,
            @RequestHeader(value = "X-Facility-Id", required = false) String headerFacility,
            @RequestHeader(value = "X-Store-Tracker", required = false) Boolean headerStoreTracker) {
        String effectiveFacility = (facilityId != null && !facilityId.isBlank()) ? facilityId : headerFacility;
        boolean effectiveStore = (headerStoreTracker != null) ? headerStoreTracker : storeTracker;
        Map<String, Object> result = mawmDispatcherService.searchDoLineDynamic(body, effectiveFacility, username, effectiveStore);
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
