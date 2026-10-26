package com.platform.erp.transformer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.CanonicalEnvelope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class FileToJsonTransformerTest {

    private FileToJsonTransformer transformer;

    @BeforeEach
    void setUp() {
        CamelTransformationEngine camelEngine = new CamelTransformationEngine(new org.apache.camel.impl.DefaultCamelContext());
        transformer = new FileToJsonTransformer(camelEngine);
    }

    @Test
    @DisplayName("Transforms PO CSV into Canonical JSON via pure dynamic Apache Camel")
    void shouldTransformPoCsvToCanonicalJson() {
        String csvData = "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\n" +
                "PO-9001,ACME_SUPPLIES,WH-EAST,SKU-A100,50,EA\n" +
                "PO-9001,ACME_SUPPLIES,WH-EAST,SKU-B200,120,CS\n";

        CanonicalEnvelope envelope = transformer.transform(
                csvData.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_A_ERP",
                "PO",
                "TRACK-101",
                "sample_po.csv"
        );

        assertNotNull(envelope);
        assertEquals("TRACK-101", envelope.getTrackingId());
        assertEquals("CUSTOMER_A_ERP", envelope.getErpSource());
        assertEquals("PO", envelope.getDocumentType());
        assertEquals(2, envelope.getTotalRecords());

        Map<String, Object> firstRow = envelope.getRecords().get(0);
        assertEquals("PO-9001", firstRow.get("PO_NUMBER"));
        assertEquals("ACME_SUPPLIES", firstRow.get("SUPPLIER"));
        assertEquals("WH-EAST", firstRow.get("WAREHOUSE"));
        assertEquals("SKU-A100", firstRow.get("SKU"));
        assertEquals("50", firstRow.get("QUANTITY"));
        assertEquals("EA", firstRow.get("UOM"));
    }

    @Test
    @DisplayName("Transforms ASN CSV into Canonical JSON via pure dynamic Apache Camel")
    void shouldTransformAsnCsvToCanonicalJson() {
        String csvData = "ASN_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\n" +
                "ASN-4401,LOGISTICS_PLUS,WH-WEST,SKU-990,200,EA\n";

        CanonicalEnvelope envelope = transformer.transform(
                csvData.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_A_ERP",
                "ASN",
                "TRACK-102",
                "sample_asn.csv"
        );

        assertNotNull(envelope);
        assertEquals("ASN", envelope.getDocumentType());
        assertEquals(1, envelope.getTotalRecords());

        Map<String, Object> record = envelope.getRecords().get(0);
        assertEquals("ASN-4401", record.get("ASN_NUMBER"));
        assertEquals("LOGISTICS_PLUS", record.get("SUPPLIER"));
        assertEquals("WH-WEST", record.get("WAREHOUSE"));
        assertEquals("200", record.get("QUANTITY"));
    }

    @Test
    @DisplayName("Transforms XML into Canonical JSON via Camel XML Unmarshaler")
    void shouldTransformXmlToCanonicalJson() {
        String xmlData = "<orders><order><poNumber>PO-XML-55</poNumber><supplier>GLOBAL_CORP</supplier><warehouse>WH-SOUTH</warehouse><quantity>75</quantity></order></orders>";

        CanonicalEnvelope envelope = transformer.transform(
                xmlData.getBytes(StandardCharsets.UTF_8),
                "VENDOR_XML",
                "PO",
                "TRACK-103",
                "orders.xml"
        );

        assertNotNull(envelope);
        assertEquals("XML", envelope.getSourceFormat());
        assertEquals(1, envelope.getTotalRecords());
        Map<String, Object> record = envelope.getRecords().get(0);
        assertEquals("PO-XML-55", record.get("poNumber"));
        assertEquals("GLOBAL_CORP", record.get("supplier"));
    }

    @Test
    @DisplayName("Transforms Native JSON into Canonical JSON")
    void shouldTransformJsonToCanonicalJson() {
        String jsonData = "[{\"poNumber\":\"PO-JSON-10\",\"supplier\":\"TECH_DIRECT\",\"warehouse\":\"WH-NORTH\",\"quantity\":15}]";

        CanonicalEnvelope envelope = transformer.transform(
                jsonData.getBytes(StandardCharsets.UTF_8),
                "DIRECT_JSON",
                "PO",
                "TRACK-104",
                "payload.json"
        );

        assertNotNull(envelope);
        assertEquals("JSON", envelope.getSourceFormat());
        assertEquals(1, envelope.getTotalRecords());
        Map<String, Object> record = envelope.getRecords().get(0);
        assertEquals("PO-JSON-10", record.get("poNumber"));
        assertEquals("TECH_DIRECT", record.get("supplier"));
    }

    @Test
    @DisplayName("Transforms YAML into Canonical JSON")
    void shouldTransformYamlToCanonicalJson() {
        String yamlData = "---\npoNumber: PO-YAML-88\nsupplier: ACME_YAML\nwarehouse: WH-CENTRAL\nquantity: 10\n";

        CanonicalEnvelope envelope = transformer.transform(
                yamlData.getBytes(StandardCharsets.UTF_8),
                "VENDOR_YAML",
                "PO",
                "TRACK-106",
                "orders.yaml"
        );

        assertNotNull(envelope);
        assertEquals("YAML", envelope.getSourceFormat());
        assertEquals(1, envelope.getTotalRecords());
        Map<String, Object> record = envelope.getRecords().get(0);
        assertEquals("PO-YAML-88", record.get("poNumber"));
    }

    @Test
    @DisplayName("100% Dynamic Engine gracefully handles any host format without error")
    void shouldDynamicallyHandleAnyHostFormatWithoutHardcoding() {
        byte[] arbitraryData = new byte[] { 0x01, 0x02, 0x03, 0x04, (byte) 0xFF, (byte) 0xFE };

        CanonicalEnvelope envelope = transformer.transform(
                arbitraryData,
                "UNKNOWN_ERP",
                "PO",
                "TRACK-999",
                "custom_payload.xyz"
        );

        assertNotNull(envelope);
        assertEquals("TRACK-999", envelope.getTrackingId());
        assertEquals("XYZ", envelope.getSourceFormat());
        assertEquals(1, envelope.getTotalRecords());
        Map<String, Object> record = envelope.getRecords().get(0);
        assertEquals("XYZ", record.get("format"));
        assertEquals("custom_payload.xyz", record.get("filename"));
        assertNotNull(record.get("base64Data"));
    }

    @Test
    @DisplayName("Guarantees Universal Static 'Data' wrapper with 100% dynamic keys/values parsed via Apache Camel")
    void shouldEnforceUniversalMawmStructureContract() throws Exception {
        // Test 1: Dynamic CSV file through Apache Camel
        String csvData = "ASN_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\n" +
                "1064389422,H&M,IN_5180,1370811001264A03,29,Units\n" +
                "1064389422,H&M,IN_5180,1370811001264007,80,Units\n";

        CanonicalEnvelope envelope = transformer.transform(
                csvData.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_A_ERP",
                "ASN",
                "TRACK-MAWM-TEST",
                "hm_inbound_asn.csv"
        );

        assertNotNull(envelope);
        assertNotNull(envelope.getData(), "Data array must never be null");
        assertEquals(2, envelope.getData().size(), "Must contain dynamic records unmarshaled by Camel under Data");

        // Verify universal static "Data" JSON container with dynamic fields
        ObjectMapper om = new ObjectMapper();
        String jsonOutput = envelope.toMawmJson(om);
        assertTrue(jsonOutput.contains("\"Data\""), "Must contain static universal 'Data' root key");
        assertTrue(jsonOutput.contains("1064389422"), "Must contain dynamic value from file");
        assertTrue(jsonOutput.contains("1370811001264A03"), "Must contain dynamic SKU from file");

        // Test 2: Inbound native MAWM JSON with nested Lpn and LpnDetail
        String mawmSampleJson = """
        {
          "Data": [
            {
              "AsnOriginTypeId": "P",
              "BusinessUnitId": "CID001683",
              "AsnId": "1064389422",
              "DestinationFacilityId": "IN_5180",
              "Extended": {
                "DhlCustRef2": "W533",
                "DhlCustRef3": "InboundSupplier"
              },
              "Lpn": [
                {
                  "LpnId": "00173217306660655741",
                  "LpnDetail": [
                    {
                      "ItemId": "1370811001264A03",
                      "ShippedQuantity": "29"
                    }
                  ]
                }
              ]
            }
          ]
        }
        """;

        CanonicalEnvelope jsonEnvelope = transformer.transform(
                mawmSampleJson.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_A_ERP",
                "ASN",
                "TRACK-JSON-MAWM",
                "mawm_input.json"
        );

        assertNotNull(jsonEnvelope);
        assertNotNull(jsonEnvelope.getData());
        assertEquals(1, jsonEnvelope.getData().size());
        Map<String, Object> doc = jsonEnvelope.getData().get(0);
        assertEquals("CID001683", doc.get("BusinessUnitId"));
        assertEquals("1064389422", doc.get("AsnId"));
        assertTrue(doc.containsKey("Extended"));
        assertTrue(doc.containsKey("Lpn"));

        String mawmSerialized = jsonEnvelope.toMawmJson(om);
        assertTrue(mawmSerialized.contains("\"Data\""));
        assertTrue(mawmSerialized.contains("\"Lpn\""));
    }

    @Test
    @DisplayName("Auto converts any incoming file format directly to JSON via Camel engine")
    void shouldAutoConvertFileFormatsDirectlyToJson() {
        CamelTransformationEngine engine = new CamelTransformationEngine(new org.apache.camel.impl.DefaultCamelContext());

        // 1. CSV auto conversion to JSON
        String csv = "ITEM,PRICE\nWidget,19.99\n";
        String csvJson = engine.autoConvertToJson(csv.getBytes(StandardCharsets.UTF_8), "items.csv");
        assertNotNull(csvJson);
        assertTrue(csvJson.contains("\"ITEM\":\"Widget\""));
        assertTrue(csvJson.contains("\"PRICE\":\"19.99\""));

        // 2. XML auto conversion to JSON
        String xml = "<item><name>Gadget</name><cost>49.99</cost></item>";
        String xmlJson = engine.autoConvertToJson(xml.getBytes(StandardCharsets.UTF_8), "item.xml");
        assertNotNull(xmlJson);
        assertTrue(xmlJson.contains("\"Gadget\""));

        // 3. YAML auto conversion to JSON
        String yaml = "name: Device\ncost: 99.99\n";
        String yamlJson = engine.autoConvertToJson(yaml.getBytes(StandardCharsets.UTF_8), "device.yaml");
        assertNotNull(yamlJson);
        assertTrue(yamlJson.contains("\"Device\""));
    }

    @Test
    @DisplayName("Transforms 07_logistics_manifest.yaml into structured Canonical JSON without Base64")
    void shouldTransformLogisticsManifestYaml() {
        String yaml = "manifestId: MAN-2026-9901\n" +
                "carrier: DHL_EXPRESS\n" +
                "originHub: AP_SINGAPORE\n" +
                "destinationFacility: IN_5180\n" +
                "dispatchDate: \"2026-10-24T08:00:00Z\"\n" +
                "shipments:\n" +
                "  - trackingNumber: DHL-SG-994012\n" +
                "    asnReference: ASN-2026-8801\n";

        CanonicalEnvelope envelope = transformer.transform(
                yaml.getBytes(StandardCharsets.UTF_8),
                "LOGISTICS_PARTNER",
                "ASN",
                "TRACK-MANIFEST-1",
                "07_logistics_manifest.yaml"
        );

        assertNotNull(envelope);
        assertEquals("YAML", envelope.getSourceFormat());
        assertEquals(1, envelope.getTotalRecords());
        Map<String, Object> record = envelope.getRecords().get(0);
        assertEquals("MAN-2026-9901", record.get("manifestId"));
        assertEquals("DHL_EXPRESS", record.get("carrier"));
        assertNull(record.get("base64Data"), "Must not fall back to base64");
    }

    @Test
    @DisplayName("Dynamically transforms EDI 850 X12 into structured JSON via Camel X12 DataFormat plugin")
    void shouldTransformEdi850X12ViaCamelPlugin() {
        String x12 = "ISA*00*          *00*          *ZZ*RETAIL_HQ      *ZZ*MAWM_LOGISTICS *261023*1915*U*00401*000000850*0*P*>~\n" +
                "GS*PO*RETAIL_HQ*MAWM_LOGISTICS*20261023*1915*850001*X*004010~\n" +
                "ST*850*0001~\n" +
                "BEG*00*NE*PO-2026-X12-09*20261023~\n" +
                "N1*ST*DISTRIBUTION CENTER 5180*92*IN_5180~\n" +
                "PO1*1*120*EA*18.50*PE*BP*SKU-RUN-1001*UP*012345678905~\n" +
                "PID*F****TRAIL RUNNING SHORT MEN M~\n" +
                "PO1*2*95*EA*24.00*PE*BP*SKU-RUN-1002*UP*012345678912~\n" +
                "PID*F****TRAIL RUNNING SHORT MEN L~\n" +
                "SE*16*0001~\n" +
                "GE*1*850001~\n" +
                "IEA*1*000000850~";

        CanonicalEnvelope envelope = transformer.transform(
                x12.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_B_ERP",
                "PO",
                "TRACK-EDI-850",
                "06_edi_850_purchase_order.x12"
        );

        assertNotNull(envelope);
        assertEquals("X12", envelope.getSourceFormat());
        assertTrue(envelope.getTotalRecords() >= 10, "Should dynamically parse all segments");

        // Verify segments are dynamically parsed with tag, transactionSet, and elements
        Map<String, Object> begSeg = envelope.getRecords().stream()
                .filter(r -> "BEG".equals(r.get("segment")))
                .findFirst()
                .orElseThrow();
        assertEquals("850", begSeg.get("transactionSet"));
        assertEquals("0001", begSeg.get("controlNumber"));
        assertEquals("PO-2026-X12-09", begSeg.get("E03"));
        assertEquals("20261023", begSeg.get("E04"));

        Map<String, Object> po1Seg = envelope.getRecords().stream()
                .filter(r -> "PO1".equals(r.get("segment")))
                .findFirst()
                .orElseThrow();
        assertEquals("120", po1Seg.get("E02"));
        assertEquals("EA", po1Seg.get("E03"));
        assertEquals("18.50", po1Seg.get("E04"));
        assertEquals("SKU-RUN-1001", po1Seg.get("E07"));
        assertNull(begSeg.get("base64Data"), "Must not fall back to base64");
    }

    @Test
    @DisplayName("Automatically transforms EDI 856 Ship Notice / Manifest into structured JSON without hardcoding")
    void shouldTransformEdi856ShipNoticeDynamically() {
        String edi856 = "ISA*00*          *00*          *ZZ*CUSTOMER_A     *ZZ*MAWM_PLATFORM  *261023*1900*U*00401*000000856*0*P*>~\n" +
                "GS*SH*CUSTOMER_A*MAWM_PLATFORM*20261023*1900*856001*X*004010~\n" +
                "ST*856*0001~\n" +
                "BSN*00*ASN-2026-8801*20261023*1900~\n" +
                "HL*1**S~\n" +
                "LIN*1*BP*1370811001264A03*VP*HM-SKU-01~\n" +
                "SN1*1*29*EA~\n" +
                "SE*18*0001~\n" +
                "GE*1*856001~\n" +
                "IEA*1*000000856~";

        CanonicalEnvelope envelope = transformer.transform(
                edi856.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_A_ERP",
                "ASN",
                "TRACK-EDI-856",
                "05_edi_856_ship_notice.edi"
        );

        assertNotNull(envelope);
        assertEquals("X12", envelope.getSourceFormat());

        Map<String, Object> bsnSeg = envelope.getRecords().stream()
                .filter(r -> "BSN".equals(r.get("segment")))
                .findFirst()
                .orElseThrow();
        assertEquals("856", bsnSeg.get("transactionSet"));
        assertEquals("ASN-2026-8801", bsnSeg.get("E02"));

        Map<String, Object> linSeg = envelope.getRecords().stream()
                .filter(r -> "LIN".equals(r.get("segment")))
                .findFirst()
                .orElseThrow();
        assertEquals("1370811001264A03", linSeg.get("E03"));
    }

    @Test
    @DisplayName("Dynamically converts Excel (.xlsx) spreadsheets into JSON records")
    void shouldTransformExcelDynamically() throws Exception {
        byte[] excelBytes;
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream()) {
            org.apache.poi.ss.usermodel.Sheet sheet = wb.createSheet("manifest");
            org.apache.poi.ss.usermodel.Row r0 = sheet.createRow(0);
            r0.createCell(0).setCellValue("manifestId");
            r0.createCell(1).setCellValue("carrier");

            org.apache.poi.ss.usermodel.Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("MAN-2026-9901");
            r1.createCell(1).setCellValue("DHL_EXPRESS");

            wb.write(bos);
            excelBytes = bos.toByteArray();
        }

        CanonicalEnvelope envelope = transformer.transform(
                excelBytes,
                "LOGISTICS_PARTNER",
                "ASN",
                "TRACK-EXCEL-01",
                "07_logistics_manifest.xlsx"
        );

        assertNotNull(envelope);
        assertEquals("EXCEL", envelope.getSourceFormat());
        assertEquals(1, envelope.getTotalRecords());
        assertEquals("MAN-2026-9901", envelope.getRecords().get(0).get("manifestId"));
        assertEquals("DHL_EXPRESS", envelope.getRecords().get(0).get("carrier"));
    }

    @Test
    @DisplayName("Dynamically parses arbitrary flat text file (.dat) into structured JSON records with zero hardcoding")
    void shouldTransformFlatTextDatFile() {
        String flatPayload = """
        ASN-TEST-10001   2026102620261028SUP-100   WH-01   PO-45001234     
        LINE0001ITEM-1001   000120EA  Cotton T-Shirt          
        LINE0002ITEM-1002   000060EA  Denim Jeans             
        """;

        CanonicalEnvelope envelope = transformer.transform(
                flatPayload.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_A_ERP",
                "ASN",
                "TRACK-DAT-01",
                "asn_input_fixed_width.dat"
        );

        assertNotNull(envelope);
        assertEquals("FLAT", envelope.getSourceFormat());
        assertEquals(3, envelope.getTotalRecords());

        // Row 1
        Map<String, Object> row1 = envelope.getRecords().get(0);
        assertEquals(1, row1.get("lineNumber"));
        assertEquals("ASN-TEST-10001", row1.get("col_1"));
        assertEquals("2026102620261028SUP-100", row1.get("col_2"));
        assertEquals("WH-01", row1.get("col_3"));
        assertEquals("PO-45001234", row1.get("col_4"));

        // Row 2
        Map<String, Object> row2 = envelope.getRecords().get(1);
        assertEquals(2, row2.get("lineNumber"));
        assertEquals("LINE0001ITEM-1001", row2.get("col_1"));
        assertEquals("000120EA", row2.get("col_2"));
        assertEquals("Cotton T-Shirt", row2.get("col_3"));

        // Row 3
        Map<String, Object> row3 = envelope.getRecords().get(2);
        assertEquals(3, row3.get("lineNumber"));
        assertEquals("LINE0002ITEM-1002", row3.get("col_1"));
        assertEquals("000060EA", row3.get("col_2"));
        assertEquals("Denim Jeans", row3.get("col_3"));
    }

    @Test
    @DisplayName("Dynamically parses arbitrary space-aligned tabular text reports with auto-detected headers")
    void shouldTransformTabularSpaceAlignedReport() {
        String reportPayload = """
        INVOICE_ID    CUSTOMER_NAME     AMOUNT     STATUS
        INV-10001     Global Supply     1500.50    PAID
        INV-10002     Acme Traders      3200.00    PENDING
        """;

        CanonicalEnvelope envelope = transformer.transform(
                reportPayload.getBytes(StandardCharsets.UTF_8),
                "ORACLE_FINANCE",
                "INVOICE",
                "TRACK-INV-01",
                "monthly_billing.txt"
        );

        assertNotNull(envelope);
        assertEquals("FLAT", envelope.getSourceFormat());
        assertEquals(2, envelope.getTotalRecords());

        Map<String, Object> row1 = envelope.getRecords().get(0);
        assertEquals("INV-10001", row1.get("INVOICE_ID"));
        assertEquals("Global Supply", row1.get("CUSTOMER_NAME"));
        assertEquals(1500.50, row1.get("AMOUNT"));
        assertEquals("PAID", row1.get("STATUS"));

        Map<String, Object> row2 = envelope.getRecords().get(1);
        assertEquals("INV-10002", row2.get("INVOICE_ID"));
        assertEquals("Acme Traders", row2.get("CUSTOMER_NAME"));
        assertEquals(3200.00, row2.get("AMOUNT"));
        assertEquals("PENDING", row2.get("STATUS"));
    }

    @Test
    @DisplayName("Dynamically parses pipe-delimited flat file (.txt) into structured JSON")
    void shouldTransformPipeDelimitedFlatFile() {
        String pipePayload = "ASN_ID|SUPPLIER_NAME|DESTINATION_DC|SHIPPED_QTY\n" +
                "ASN-B-9901|CUSTOMER_B_LOGISTICS|IN_5180|140\n" +
                "ASN-B-9902|CUSTOMER_B_LOGISTICS|IN_5180|210\n";

        CanonicalEnvelope envelope = transformer.transform(
                pipePayload.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_B_ERP",
                "ASN",
                "TRACK-PIPE-01",
                "09_customer_b_pipe_delimited.txt"
        );

        assertNotNull(envelope);
        assertEquals("FLAT", envelope.getSourceFormat());
        assertEquals(2, envelope.getTotalRecords());
        assertEquals("ASN-B-9901", envelope.getRecords().get(0).get("ASN_ID"));
        assertEquals("IN_5180", envelope.getRecords().get(0).get("DESTINATION_DC"));
    }

    @Test
    @DisplayName("Auto-Mode: Dynamically converts multi-host formats (H&M delivery JSON, orders) via Apache Camel into JSON properly")
    void shouldAutoMapRecordsIntoMawmDataWithoutHardcoding() {
        CamelTransformationEngine engine = new CamelTransformationEngine(
                new org.apache.camel.impl.DefaultCamelContext()
        );
        FileToJsonTransformer autoTransformer = new FileToJsonTransformer(engine);

        String rawJson = """
        {
          "transactionType": "UNKNOWN_CUSTOM_TX_888",
          "orderId": "ORD-99901",
          "status": "APPROVED",
          "totalAmount": 1500
        }
        """;

        CanonicalEnvelope envelope = autoTransformer.transform(
                rawJson.getBytes(StandardCharsets.UTF_8),
                "NEW_GLOBAL_HOST",
                "ORDER",
                "TRACK-AUTO-888",
                "new_partner_order.json"
        );

        assertNotNull(envelope);
        assertNotNull(envelope.getData());
        assertEquals(1, envelope.getData().size());

        Map<String, Object> mawmRecord = envelope.getData().get(0);
        assertEquals("UNKNOWN_CUSTOM_TX_888", mawmRecord.get("transactionType"));
        assertEquals("ORD-99901", mawmRecord.get("orderId"));
        assertEquals("APPROVED", mawmRecord.get("status"));
        assertEquals(1500, mawmRecord.get("totalAmount"));
    }

    @Test
    @DisplayName("Transforms any nested host delivery JSON properly through Apache Camel without mapping concept")
    void shouldTransformNestedHostDeliveryJsonProperly() {
        String hmI1116Json = """
        {
          "transactionType": "I1116",
          "version": "1.0",
          "uniqueTransactionId": "0000008073977405",
          "warehouseId": "WMS533IN",
          "inboundDelivery": {
            "inboundDeliveryNumber": "1064389422",
            "siteID": "W533",
            "deliveryLine": [
              {
                "lineNumber": "000010",
                "advisedQuantity": 52,
                "sku": "1370811001264006"
              },
              {
                "lineNumber": "000060",
                "advisedQuantity": 29,
                "sku": "1370811001264A03"
              }
            ]
          }
        }
        """;

        CanonicalEnvelope envelope = transformer.transform(
                hmI1116Json.getBytes(StandardCharsets.UTF_8),
                "CUSTOMER_A_ERP",
                "ASN",
                "TRACK-MULTI-HOST-01",
                "delivery_document.json"
        );

        assertNotNull(envelope);
        assertEquals("JSON", envelope.getSourceFormat());
        assertNotNull(envelope.getData());
        assertEquals(1, envelope.getData().size());

        Map<String, Object> root = envelope.getData().get(0);
        assertEquals("I1116", root.get("transactionType"));
        assertEquals("WMS533IN", root.get("warehouseId"));
        assertTrue(root.containsKey("inboundDelivery"));

        @SuppressWarnings("unchecked")
        Map<String, Object> delivery = (Map<String, Object>) root.get("inboundDelivery");
        assertEquals("1064389422", delivery.get("inboundDeliveryNumber"));
        assertEquals("W533", delivery.get("siteID"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lines = (List<Map<String, Object>>) delivery.get("deliveryLine");
        assertNotNull(lines);
        assertEquals(2, lines.size());
        assertEquals("000010", lines.get(0).get("lineNumber"));
        assertEquals(52, lines.get(0).get("advisedQuantity"));
        assertEquals("1370811001264006", lines.get(0).get("sku"));
        assertEquals("000060", lines.get(1).get("lineNumber"));
        assertEquals(29, lines.get(1).get("advisedQuantity"));
        assertEquals("1370811001264A03", lines.get(1).get("sku"));
    }

    @Test
    @DisplayName("Detects .parquet extension and converts it to JSON through Apache Camel")
    void shouldDetectAndConvertParquetFilesToJson() {
        // Parquet header PAR1 (0x50, 0x41, 0x52, 0x31)
        byte[] parquetPayload = new byte[] { 'P', 'A', 'R', '1', 0x15, 0x00, 0x15, 0x3c };

        CanonicalEnvelope envelope = transformer.transform(
                parquetPayload,
                "CUSTOMER_ANALYTICS_ERP",
                "ORDERS",
                "TRACK-PARQUET-01",
                "shipment_batch_001.parquet"
        );

        assertNotNull(envelope);
        assertEquals("PARQUET", envelope.getSourceFormat(), "Should detect PARQUET format from filename and magic header");
        assertNotNull(envelope.getData(), "Data should not be null");
        assertFalse(envelope.getData().isEmpty(), "Should contain unmarshaled records");
        assertEquals("PARQUET", envelope.getData().get(0).get("format"));
        assertEquals("shipment_batch_001.parquet", envelope.getData().get(0).get("filename"));

        // Verify JSON conversion
        ObjectMapper mapper = new ObjectMapper();
        String jsonOutput = envelope.toMawmJson(mapper);
        assertNotNull(jsonOutput);
        assertTrue(jsonOutput.contains("\"format\" : \"PARQUET\"") || jsonOutput.contains("\"format\":\"PARQUET\""));
    }
}

