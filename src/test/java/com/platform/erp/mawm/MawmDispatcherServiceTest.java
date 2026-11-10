package com.platform.erp.mawm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.store.TransactionStore;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;

class MawmDispatcherServiceTest {

    @Test
    void shouldSkipWhenEnvelopeIsNull() {
        MawmProperties properties = new MawmProperties();
        MawmAuthService authService = mock(MawmAuthService.class);
        TransactionStore transactionStore = mock(TransactionStore.class);
        ObjectMapper objectMapper = new ObjectMapper();

        MawmDispatcherService dispatcher = new MawmDispatcherService(properties, authService, transactionStore, objectMapper);
        dispatcher.dispatch(null);

        verifyNoInteractions(transactionStore);
        verifyNoInteractions(authService);
    }

    @Test
    void shouldRecordAwaitingEndpointWhenDisabled() {
        MawmProperties properties = new MawmProperties();
        properties.setEnabled(false);
        MawmAuthService authService = mock(MawmAuthService.class);
        TransactionStore transactionStore = mock(TransactionStore.class);
        ObjectMapper objectMapper = new ObjectMapper();

        MawmDispatcherService dispatcher = new MawmDispatcherService(properties, authService, transactionStore, objectMapper);

        CanonicalEnvelope envelope = new CanonicalEnvelope();
        envelope.setTrackingId("TRK-12345");
        envelope.setDocumentType("ASN");
        envelope.setFacilityId("Food_Cbe");
        envelope.setData(List.of(Map.of("AsnId", "ASN-001")));

        dispatcher.dispatch(envelope);

        verify(transactionStore, times(1)).recordMawmStatus("TRK-12345", "SAVED_AWAITING_ENDPOINT");
        verifyNoInteractions(authService);
    }

    @Test
    void shouldPreserveDistributionOrderFidelityWithoutDataLoss() {
        Map<String, Object> rawDo = new java.util.LinkedHashMap<>();
        rawDo.put("OrderId", "OPTIDO000000227");
        rawDo.put("OrderType", "Standard");
        rawDo.put("Priority", 3);
        rawDo.put("BillToName", "Lezhil");
        rawDo.put("OriginFacilityId", "Food_Cbe");
        rawDo.put("DestinationFacilityId", "Food_Chn");
        rawDo.put("CreatedBy", "lezhilarasan");

        Map<String, Object> rawLine = new java.util.LinkedHashMap<>();
        rawLine.put("OrderLineId", "1");
        rawLine.put("ItemId", "244_Butter_cubes_100g");
        rawLine.put("OrderedQuantity", 10);
        rawLine.put("QuantityUomId", "unit");
        rawLine.put("HotOrder", true);
        rawLine.put("Status", "Created");

        rawDo.put("OrderLine", List.of(rawLine));

        Map<String, Object> dispatched = MawmCanonicalBuilder.sanitizeDistributionOrder(rawDo);

        // Verify full fidelity passthrough: nothing stripped, nothing invented
        org.junit.jupiter.api.Assertions.assertEquals("OPTIDO000000227", dispatched.get("OrderId"));
        org.junit.jupiter.api.Assertions.assertEquals("Standard", dispatched.get("OrderType"));
        org.junit.jupiter.api.Assertions.assertEquals(3, dispatched.get("Priority"));
        org.junit.jupiter.api.Assertions.assertEquals("Food_Cbe", dispatched.get("OriginFacilityId"));
        org.junit.jupiter.api.Assertions.assertEquals("Food_Chn", dispatched.get("DestinationFacilityId"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lines = (List<Map<String, Object>>) dispatched.get("OrderLine");
        org.junit.jupiter.api.Assertions.assertNotNull(lines);
        org.junit.jupiter.api.Assertions.assertEquals(1, lines.size());
        Map<String, Object> line = lines.get(0);

        org.junit.jupiter.api.Assertions.assertEquals("1", line.get("OrderLineId"));
        org.junit.jupiter.api.Assertions.assertEquals("244_Butter_cubes_100g", line.get("ItemId"));
        org.junit.jupiter.api.Assertions.assertEquals(10, line.get("OrderedQuantity"));
        org.junit.jupiter.api.Assertions.assertEquals("unit", line.get("QuantityUomId"));
        org.junit.jupiter.api.Assertions.assertEquals(true, line.get("HotOrder"), "ERP business fields like HotOrder must be preserved");
    }

    @Test
    void shouldNotFabricateDefaultsWhenMissing() {
        Map<String, Object> rawDo = Map.of(
                "OrderId", "DO-TEST-999",
                "OrderLine", List.of(Map.of(
                        "ItemId", "TEST-ITEM-1"
                ))
        );

        Map<String, Object> dispatched = MawmCanonicalBuilder.sanitizeDistributionOrder(rawDo);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lines = (List<Map<String, Object>>) dispatched.get("OrderLine");
        org.junit.jupiter.api.Assertions.assertEquals(1, lines.size());
        org.junit.jupiter.api.Assertions.assertEquals("TEST-ITEM-1", lines.get(0).get("ItemId"));
        // Pure passthrough: Do NOT invent fake defaults; let MAWM perform authentic validation
        org.junit.jupiter.api.Assertions.assertNull(lines.get(0).get("OrderedQuantity"));
        org.junit.jupiter.api.Assertions.assertNull(lines.get(0).get("QuantityUomId"));
    }

    @Test
    void shouldExtractFieldLevelValidationError() {
        MawmDispatcherService service = new MawmDispatcherService(new MawmProperties(), mock(MawmAuthService.class), mock(TransactionStore.class), new ObjectMapper());
        String rawError = """
                {
                  "messages": {
                    "Message": [
                      {
                        "Type": "ERROR",
                        "Code": "OrderedQuantity",
                        "Description": "Required field OrderedQuantity not present",
                        "ErrorField": "OrderedQuantity"
                      }
                    ]
                  },
                  "exceptions": [
                    {
                      "message": "com.manh.cp.fw.entity.exception.ManhValidationException: Entity Validation Error Occured"
                    }
                  ]
                }
                """;

        String clean = service.extractCleanErrorMessage(rawError, 400, "Food_Cbe", "lezhilarasan");
        org.junit.jupiter.api.Assertions.assertEquals("Required field OrderedQuantity not present", clean);
    }

    @Test
    void shouldPrepareBatchPayloadWithFacilityAndOrgId() {
        MawmProperties properties = new MawmProperties();
        MawmAuthService authService = mock(MawmAuthService.class);
        TransactionStore transactionStore = mock(TransactionStore.class);
        ObjectMapper objectMapper = new ObjectMapper();

        MawmDispatcherService dispatcher = new MawmDispatcherService(properties, authService, transactionStore, objectMapper);

        org.junit.jupiter.api.Assertions.assertEquals("/dcinventory/api/dcinventory/batchMaster/save", properties.getBatchPath());
        org.junit.jupiter.api.Assertions.assertEquals("/dcinventory/api/dcinventory/batchMaster/search", properties.getBatchSearchPath());
    }

    @Test
    void shouldCleanPoPayloadToPreventMawmOpenStatusRejection() {
        MawmDispatcherService service = new MawmDispatcherService(new MawmProperties(), mock(MawmAuthService.class), mock(TransactionStore.class), new ObjectMapper());
        
        Map<String, Object> rawPo = new java.util.LinkedHashMap<>();
        rawPo.put("PurchaseOrderId", "OPTIPO000007899");
        rawPo.put("purchaseOrderType", null);
        rawPo.put("VendorId", "");
        rawPo.put("OriginFacilityId", "Food_Cbe");
        rawPo.put("DestinationFacilityId", "Food_Cbe");
        rawPo.put("PurchaseOrderStatus", "Open");
        rawPo.put("CreatedBy", "lezhilarasan");

        Map<String, Object> rawLine = new java.util.LinkedHashMap<>();
        rawLine.put("PurchaseOrderLineId", "1");
        rawLine.put("ItemId", "235_Rice_25000g");
        rawLine.put("OrderQuantity", 10);
        rawLine.put("BlankField", "");
        rawLine.put("NullField", null);
        rawPo.put("PurchaseOrderLine", List.of(rawLine));

        Map<String, Object> clean = service.cleanPoPayload(rawPo);

        // Verify "PurchaseOrderStatus": "Open" is stripped
        org.junit.jupiter.api.Assertions.assertFalse(clean.containsKey("PurchaseOrderStatus"));
        // Verify null and empty string entries are stripped
        org.junit.jupiter.api.Assertions.assertFalse(clean.containsKey("purchaseOrderType"));
        org.junit.jupiter.api.Assertions.assertFalse(clean.containsKey("VendorId"));
        // Verify canonical fields are preserved
        org.junit.jupiter.api.Assertions.assertEquals("OPTIPO000007899", clean.get("PurchaseOrderId"));
        org.junit.jupiter.api.Assertions.assertEquals("Food_Cbe", clean.get("DestinationFacilityId"));
        org.junit.jupiter.api.Assertions.assertEquals("lezhilarasan", clean.get("CreatedBy"));

        // Verify line is cleaned
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lines = (List<Map<String, Object>>) clean.get("PurchaseOrderLine");
        org.junit.jupiter.api.Assertions.assertNotNull(lines);
        org.junit.jupiter.api.Assertions.assertEquals(1, lines.size());
        org.junit.jupiter.api.Assertions.assertEquals("235_Rice_25000g", lines.get(0).get("ItemId"));
        org.junit.jupiter.api.Assertions.assertEquals(10, lines.get(0).get("OrderQuantity"));
        org.junit.jupiter.api.Assertions.assertFalse(lines.get(0).containsKey("BlankField"));
        org.junit.jupiter.api.Assertions.assertFalse(lines.get(0).containsKey("NullField"));
    }
}

