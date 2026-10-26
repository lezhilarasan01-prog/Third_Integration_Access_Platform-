/**
 * MAWM Integration Platform — Enterprise Data Service
 */

export const systemInfo = {
  "platformName": "MAWM Integration Access Platform",
  "version": "v1.4.2-enterprise",
  "environment": "Enterprise Sandbox",
  "springBootBackend": "http://localhost:8080",
  "backendStatus": "OPERATIONAL",
  "targetSystem": "Manhattan Active Warehouse Management (MAWM)",
  "totalJobs": 117
};

export const kpiCards = [
  {
    id: "total-jobs",
    label: "Total Integration Jobs",
    value: 117,
    subtext: "Total submitted integration jobs",
    iconName: "Layers",
    variant: "blue",
    badgeText: "117 Submitted",
    badgeType: "neutral",
    pulse: false,
  },
  {
    id: "processing-jobs",
    label: "Processing",
    value: 8,
    subtext: "Jobs currently being processed",
    iconName: "Loader2",
    variant: "amber",
    badgeText: "In Progress",
    badgeType: "warning",
    pulse: true,
  },
  {
    id: "completed-jobs",
    label: "Completed",
    value: 92,
    subtext: "Jobs completed successfully",
    iconName: "CheckCircle2",
    variant: "emerald",
    badgeText: "78.6% Completed",
    badgeType: "positive",
    pulse: false,
  },
  {
    id: "failed-jobs",
    label: "Failed",
    value: 17,
    subtext: "Jobs that failed execution",
    iconName: "AlertCircle",
    variant: "red",
    badgeText: "17 Exceptions",
    badgeType: "danger",
    pulse: false,
  },
];

export const kpiSummary = {
  "totalJobs": {
    "value": 117,
    "processing": 8,
    "completed": 43,
    "completedWithErrors": 57,
    "failed": 17,
    "subtext": "43 clean completed, 57 with errors, 17 failed",
    "description": "Total integration jobs submitted"
  },
  "totalRecords": {
    "value": 233,
    "formatted": "233",
    "subtext": "Gross records parsed across all channels",
    "description": "Total records parsed from input feeds"
  },
  "convertedRecords": {
    "value": 135,
    "formatted": "135",
    "rate": "58%",
    "subtext": "Normalized canonical envelopes generated",
    "description": "Canonical MAWM envelopes produced"
  },
  "errorRecords": {
    "value": 98,
    "formatted": "98",
    "rate": "42%",
    "subtext": "Isolated in dead-letter error store",
    "description": "Dead-letter rows isolated with error diagnostics"
  },
  "activeSourceSystems": {
    "value": 4,
    "systems": [
      "CUSTOMER_A_ERP",
      "LOGISTICS_PARTNER",
      "CUSTOMER_B_ERP",
      "SAP_ERP"
    ],
    "status": "4 Source Systems Active (Customer A, Customer B, Logistics, SAP)"
  }
};

export const hourlyThroughput = [
  {
    "time": "10/14 11:00",
    "valid": 11,
    "errors": 23,
    "total": 34
  },
  {
    "time": "10/14 12:00",
    "valid": 39,
    "errors": 10,
    "total": 49
  },
  {
    "time": "10/14 13:00",
    "valid": 8,
    "errors": 4,
    "total": 12
  },
  {
    "time": "10/14 15:00",
    "valid": 17,
    "errors": 13,
    "total": 30
  },
  {
    "time": "10/14 16:00",
    "valid": 19,
    "errors": 19,
    "total": 38
  },
  {
    "time": "10/14 18:00",
    "valid": 25,
    "errors": 15,
    "total": 40
  },
  {
    "time": "10/15 10:00",
    "valid": 16,
    "errors": 14,
    "total": 30
  }
];

export const sourceSystemStats = [
  {
    "id": "CUSTOMER_A_ERP",
    "name": "Enterprise ERP (Americas)",
    "badgeColor": "teal",
    "share": 72,
    "jobCount": 84,
    "records": 180,
    "validRate": "63%",
    "activeJobs": 84,
    "defaultFormat": "CSV / JSON Auto-Detected",
    "status": "OPERATIONAL"
  },
  {
    "id": "LOGISTICS_PARTNER",
    "name": "Global 3PL Logistics Network",
    "badgeColor": "purple",
    "share": 16,
    "jobCount": 19,
    "records": 15,
    "validRate": "0% (ASN Validation Triage)",
    "activeJobs": 19,
    "defaultFormat": "JSON Array",
    "status": "ATTENTION_NEEDED"
  },
  {
    "id": "CUSTOMER_B_ERP",
    "name": "Omnichannel Retail ERP",
    "badgeColor": "orange",
    "share": 11,
    "jobCount": 13,
    "records": 35,
    "validRate": "73%",
    "activeJobs": 13,
    "defaultFormat": "CSV (Smart Synonym)",
    "status": "OPERATIONAL"
  },
  {
    "id": "SAP_ERP",
    "name": "SAP S/4HANA Enterprise",
    "badgeColor": "blue",
    "share": 1,
    "jobCount": 1,
    "records": 3,
    "validRate": "100%",
    "activeJobs": 1,
    "defaultFormat": "RFC-4180 CSV",
    "status": "OPERATIONAL"
  }
];

export const transactionTypeStats = [
  {
    "type": "PO",
    "name": "Purchase Orders",
    "count": 95,
    "percentage": 81,
    "color": "#0284c7"
  },
  {
    "type": "ASN",
    "name": "Adv. Shipment Notices",
    "count": 22,
    "percentage": 19,
    "color": "#8b5cf6"
  }
];

export const recentJobs = [
  {
    "jobId": "064f95c5-3af4-40ab-8e47-f3be0cc4a122",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "orders.json",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-15T05:06:16.478519Z",
    "updatedAt": "2026-10-15T05:06:16.511055900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\064f95c5-3af4-40ab-8e47-f3be0cc4a122_orders.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\064f95c5-3af4-40ab-8e47-f3be0cc4a122\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-JSON-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-15T05:06:16.510053Z",
      "payload": {
        "quantity": 40,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-JSON-1",
        "warehouse": "WH-1",
        "sku": "SKU-J1"
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\"PO_NUMBER\": \"PO-JSON-1\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J1\", \"QUANTITY\": 40, \"UOM\": \"EA\"},\n  {\"PO_NUMBER\": \"PO-JSON-2\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J2\", \"QUANTITY\": 80, \"UOM\": \"EA\"}\n]\n"
  },
  {
    "jobId": "e8dc6b24-4cf1-4ff4-82dc-b6ba98535f27",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-15T05:06:16.438519300Z",
    "updatedAt": "2026-10-15T05:06:16.499529100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\e8dc6b24-4cf1-4ff4-82dc-b6ba98535f27_inbound_orders.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\e8dc6b24-4cf1-4ff4-82dc-b6ba98535f27-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "[{\"po_number\": \"PO-JSON-1\", \"sku\": \"ITEM-J1\", \"qty\": 5, \"supplier\": \"SUP-1\"}]"
  },
  {
    "jobId": "5db46a4d-f30c-4525-9568-5eeb8fd74223",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-15T05:06:16.429468200Z",
    "updatedAt": "2026-10-15T05:06:16.454519200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\5db46a4d-f30c-4525-9568-5eeb8fd74223_inbound_orders.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\5db46a4d-f30c-4525-9568-5eeb8fd74223-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "po_number,sku,qty,supplier\nPO-AUTO-1,ITEM-AUTO,10,SUP-1\n"
  },
  {
    "jobId": "8962f0aa-b431-486d-bf81-757c85ece487",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-15T05:06:16.274885300Z",
    "updatedAt": "2026-10-15T05:06:16.301896100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\8962f0aa-b431-486d-bf81-757c85ece487_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\8962f0aa-b431-486d-bf81-757c85ece487\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\8962f0aa-b431-486d-bf81-757c85ece487-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-15T05:06:16.300895800Z",
      "payload": {
        "quantity": 10,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-8001",
        "warehouse": "WH-1",
        "sku": "ITEM-A"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "4f72881f-d1b8-4c05-a955-b020106cecd5",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-15T05:06:16.110215600Z",
    "updatedAt": "2026-10-15T05:06:16.132215500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\4f72881f-d1b8-4c05-a955-b020106cecd5_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\4f72881f-d1b8-4c05-a955-b020106cecd5\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-15T05:06:16.132215500Z",
      "payload": {
        "quantity": 10,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-9901",
        "warehouse": "WH-1",
        "sku": "ITEM-X"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "d4ab3a34-cdca-467b-a27e-8a9b5d3c5bff",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 3,
    "convertedRecords": 0,
    "errorRecords": 3,
    "createdAt": "2026-10-15T05:06:16.078696Z",
    "updatedAt": "2026-10-15T05:06:16.121213500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\d4ab3a34-cdca-467b-a27e-8a9b5d3c5bff_asn_feed.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\d4ab3a34-cdca-467b-a27e-8a9b5d3c5bff-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "3725c55e-f0a2-4c21-a346-ed7f58d574d9",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "data_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-15T05:06:15.912576300Z",
    "updatedAt": "2026-10-15T05:06:15.944248200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\3725c55e-f0a2-4c21-a346-ed7f58d574d9_data_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\3725c55e-f0a2-4c21-a346-ed7f58d574d9\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-DATA-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-15T05:06:15.943264300Z",
      "payload": {
        "quantity": 15,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-DATA-1",
        "warehouse": "WH-1",
        "sku": "ITEM-D1"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-DATA-1,SUP-1,WH-1,ITEM-D1,15,EA\nPO-DATA-2,SUP-1,WH-1,ITEM-D2,30,EA\n"
  },
  {
    "jobId": "459d7fb2-932b-4a82-a887-7aa50a6c2776",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-15T05:06:15.887868900Z",
    "updatedAt": "2026-10-15T05:06:15.924077300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\459d7fb2-932b-4a82-a887-7aa50a6c2776_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\459d7fb2-932b-4a82-a887-7aa50a6c2776-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "97a0a4d2-5219-4621-83bc-9f95413e9cb2",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "customer_b_po.csv",
    "status": "COMPLETED",
    "totalRecords": 1,
    "convertedRecords": 1,
    "errorRecords": 0,
    "createdAt": "2026-10-15T05:06:15.715793200Z",
    "updatedAt": "2026-10-15T05:06:15.759059200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\97a0a4d2-5219-4621-83bc-9f95413e9cb2_customer_b_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\97a0a4d2-5219-4621-83bc-9f95413e9cb2\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "PO",
      "externalReference": "PO-B-101",
      "profileVersion": "dynamic-customer_b_erp-po",
      "timestamp": "2026-10-15T05:06:15.756060700Z",
      "payload": {
        "quantity": 75,
        "uom": null,
        "supplier": "SUP-B",
        "poNumber": "PO-B-101",
        "warehouse": "WH-B-01",
        "sku": "SKU-B1"
      }
    },
    "sampleErrors": [],
    "sampleInput": "order_number,sku,qty,supplier,plant\nPO-B-101,SKU-B1,75,SUP-B,WH-B-01\n"
  },
  {
    "jobId": "41c58634-4589-4155-866b-7e250785b73e",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "orders.json",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-15T05:04:04.746452200Z",
    "updatedAt": "2026-10-15T05:04:04.777445700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\41c58634-4589-4155-866b-7e250785b73e_orders.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\41c58634-4589-4155-866b-7e250785b73e\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-JSON-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-15T05:04:04.776467900Z",
      "payload": {
        "supplier": "SUP-1",
        "poNumber": "PO-JSON-1",
        "warehouse": "WH-1",
        "sku": "SKU-J1",
        "quantity": 40,
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\"PO_NUMBER\": \"PO-JSON-1\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J1\", \"QUANTITY\": 40, \"UOM\": \"EA\"},\n  {\"PO_NUMBER\": \"PO-JSON-2\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J2\", \"QUANTITY\": 80, \"UOM\": \"EA\"}\n]\n"
  },
  {
    "jobId": "ebb70d3a-94d9-4e5e-a6f1-967a553a0295",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-15T05:04:04.724457600Z",
    "updatedAt": "2026-10-15T05:04:04.761453Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\ebb70d3a-94d9-4e5e-a6f1-967a553a0295_inbound_orders.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\ebb70d3a-94d9-4e5e-a6f1-967a553a0295-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "[{\"po_number\": \"PO-JSON-1\", \"sku\": \"ITEM-J1\", \"qty\": 5, \"supplier\": \"SUP-1\"}]"
  },
  {
    "jobId": "da4c9678-e4f6-49a9-a1e7-786ee936b797",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-15T05:04:04.716923100Z",
    "updatedAt": "2026-10-15T05:04:04.749451900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\da4c9678-e4f6-49a9-a1e7-786ee936b797_inbound_orders.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\da4c9678-e4f6-49a9-a1e7-786ee936b797-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "po_number,sku,qty,supplier\nPO-AUTO-1,ITEM-AUTO,10,SUP-1\n"
  },
  {
    "jobId": "9f1c623b-2120-4e3b-a70a-edaf43477858",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-15T05:04:04.574379800Z",
    "updatedAt": "2026-10-15T05:04:04.607378200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\9f1c623b-2120-4e3b-a70a-edaf43477858_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\9f1c623b-2120-4e3b-a70a-edaf43477858\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\9f1c623b-2120-4e3b-a70a-edaf43477858-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-15T05:04:04.606375600Z",
      "payload": {
        "supplier": "SUP-1",
        "poNumber": "PO-8001",
        "warehouse": "WH-1",
        "sku": "ITEM-A",
        "quantity": 10,
        "uom": "EA"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "0650530a-5c4e-4898-b610-d77105f8ae75",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-15T05:04:04.410328300Z",
    "updatedAt": "2026-10-15T05:04:04.436846800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\0650530a-5c4e-4898-b610-d77105f8ae75_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\0650530a-5c4e-4898-b610-d77105f8ae75\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-15T05:04:04.435848700Z",
      "payload": {
        "supplier": "SUP-1",
        "poNumber": "PO-9901",
        "warehouse": "WH-1",
        "sku": "ITEM-X",
        "quantity": 10,
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "5281f137-a4c7-406f-9a8f-5f7429ebe332",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 3,
    "convertedRecords": 0,
    "errorRecords": 3,
    "createdAt": "2026-10-15T05:04:04.376320500Z",
    "updatedAt": "2026-10-15T05:04:04.414336100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\5281f137-a4c7-406f-9a8f-5f7429ebe332_asn_feed.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\5281f137-a4c7-406f-9a8f-5f7429ebe332-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "7b0f4004-a52c-4d3f-8208-8fb28f9bf617",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "data_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-15T05:04:04.099622200Z",
    "updatedAt": "2026-10-15T05:04:04.238784200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\7b0f4004-a52c-4d3f-8208-8fb28f9bf617_data_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\7b0f4004-a52c-4d3f-8208-8fb28f9bf617\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-DATA-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-15T05:04:04.237777800Z",
      "payload": {
        "supplier": "SUP-1",
        "poNumber": "PO-DATA-1",
        "warehouse": "WH-1",
        "sku": "ITEM-D1",
        "quantity": 15,
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-DATA-1,SUP-1,WH-1,ITEM-D1,15,EA\nPO-DATA-2,SUP-1,WH-1,ITEM-D2,30,EA\n"
  },
  {
    "jobId": "d7ccb6b4-8217-4370-bacf-cdedac53f3c1",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-15T05:04:04.074394800Z",
    "updatedAt": "2026-10-15T05:04:04.125144600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\d7ccb6b4-8217-4370-bacf-cdedac53f3c1_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\d7ccb6b4-8217-4370-bacf-cdedac53f3c1-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "b644525e-e69d-4721-ab85-1be40162a3f5",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "customer_b_po.csv",
    "status": "COMPLETED",
    "totalRecords": 1,
    "convertedRecords": 1,
    "errorRecords": 0,
    "createdAt": "2026-10-15T05:04:03.895105200Z",
    "updatedAt": "2026-10-15T05:04:03.945650400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\b644525e-e69d-4721-ab85-1be40162a3f5_customer_b_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\b644525e-e69d-4721-ab85-1be40162a3f5\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "PO",
      "externalReference": "PO-B-101",
      "profileVersion": "dynamic-customer_b_erp-po",
      "timestamp": "2026-10-15T05:04:03.942664Z",
      "payload": {
        "supplier": "SUP-B",
        "poNumber": "PO-B-101",
        "warehouse": "WH-B-01",
        "sku": "SKU-B1",
        "quantity": 75,
        "uom": null
      }
    },
    "sampleErrors": [],
    "sampleInput": "order_number,sku,qty,supplier,plant\nPO-B-101,SKU-B1,75,SUP-B,WH-B-01\n"
  },
  {
    "jobId": "b210d831-c81f-4f60-a71b-9a5e540a0d2b",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "ASN",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v2",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 6,
    "convertedRecords": 0,
    "errorRecords": 6,
    "createdAt": "2026-10-14T13:16:04.316526500Z",
    "updatedAt": "2026-10-14T13:16:04.335886400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\b210d831-c81f-4f60-a71b-9a5e540a0d2b_sample_po_with_errors.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\b210d831-c81f-4f60-a71b-9a5e540a0d2b-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_ASN_NUMBER",
        "field": "asnNumber",
        "message": "Field 'asnNumber' is required and cannot be blank."
      },
      {
        "recordNumber": 2,
        "errorCode": "MISSING_ASN_NUMBER",
        "field": "asnNumber",
        "message": "Field 'asnNumber' is required and cannot be blank."
      },
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "afb285b4-a336-4e54-a47d-52151e80395e",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "ASN",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v2",
    "originalFilename": "sample_asn.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T13:12:17.208675100Z",
    "updatedAt": "2026-10-14T13:12:17.232405200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\afb285b4-a336-4e54-a47d-52151e80395e_sample_asn.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\afb285b4-a336-4e54-a47d-52151e80395e\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "ASN",
      "externalReference": "ASN-1001",
      "profileVersion": "dynamic-customer_b_erp-asn",
      "timestamp": "2026-10-14T13:12:17.231792500Z",
      "payload": {
        "asnNumber": "ASN-1001",
        "warehouse": "WH-001",
        "sku": "ITEM001",
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101"
      }
    },
    "sampleErrors": [],
    "sampleInput": "ASN_NUMBER,WAREHOUSE,SUPPLIER,SKU,QUANTITY,UOM\nASN-1001,WH-001,SUP-101,ITEM001,100,EA\nASN-1001,WH-001,SUP-101,ITEM002,250,EA\nASN-1002,WH-002,SUP-202,ITEM003,50,BOX\nASN-1003,WH-001,SUP-303,ITEM004,15,PLT\n"
  },
  {
    "jobId": "432b489f-9ccd-4285-b801-94d2388490d4",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "ASN",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "sample_asn.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T13:09:46.745508400Z",
    "updatedAt": "2026-10-14T13:09:46.769406400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\432b489f-9ccd-4285-b801-94d2388490d4_sample_asn.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\432b489f-9ccd-4285-b801-94d2388490d4\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "ASN",
      "externalReference": "ASN-1001",
      "profileVersion": "dynamic-customer_b_erp-asn",
      "timestamp": "2026-10-14T13:09:46.768906100Z",
      "payload": {
        "asnNumber": "ASN-1001",
        "warehouse": "WH-001",
        "sku": "ITEM001",
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101"
      }
    },
    "sampleErrors": [],
    "sampleInput": "ASN_NUMBER,WAREHOUSE,SUPPLIER,SKU,QUANTITY,UOM\nASN-1001,WH-001,SUP-101,ITEM001,100,EA\nASN-1001,WH-001,SUP-101,ITEM002,250,EA\nASN-1002,WH-002,SUP-202,ITEM003,50,BOX\nASN-1003,WH-001,SUP-303,ITEM004,15,PLT\n"
  },
  {
    "jobId": "c012f3f8-5d1f-4f3d-8609-5fde0a5afa57",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "orders.json",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T13:04:02.034342900Z",
    "updatedAt": "2026-10-14T13:04:02.050341200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\c012f3f8-5d1f-4f3d-8609-5fde0a5afa57_orders.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\c012f3f8-5d1f-4f3d-8609-5fde0a5afa57\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-JSON-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T13:04:02.048342Z",
      "payload": {
        "quantity": 40,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-JSON-1",
        "warehouse": "WH-1",
        "sku": "SKU-J1"
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\"PO_NUMBER\": \"PO-JSON-1\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J1\", \"QUANTITY\": 40, \"UOM\": \"EA\"},\n  {\"PO_NUMBER\": \"PO-JSON-2\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J2\", \"QUANTITY\": 80, \"UOM\": \"EA\"}\n]\n"
  },
  {
    "jobId": "55e0f759-1b79-408f-b36d-6ad832d9fdbc",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T13:04:02.010339300Z",
    "updatedAt": "2026-10-14T13:04:02.036343900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\55e0f759-1b79-408f-b36d-6ad832d9fdbc_inbound_orders.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\55e0f759-1b79-408f-b36d-6ad832d9fdbc-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "[{\"po_number\": \"PO-JSON-1\", \"sku\": \"ITEM-J1\", \"qty\": 5, \"supplier\": \"SUP-1\"}]"
  },
  {
    "jobId": "5c97a960-0205-4f03-b60e-e5802edbf3a2",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T13:04:02.001345100Z",
    "updatedAt": "2026-10-14T13:04:02.023342800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\5c97a960-0205-4f03-b60e-e5802edbf3a2_inbound_orders.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\5c97a960-0205-4f03-b60e-e5802edbf3a2-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "po_number,sku,qty,supplier\nPO-AUTO-1,ITEM-AUTO,10,SUP-1\n"
  },
  {
    "jobId": "dbb925c6-437c-4fff-bb16-891008e4d8bb",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-14T13:04:01.859563100Z",
    "updatedAt": "2026-10-14T13:04:01.876078600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\dbb925c6-437c-4fff-bb16-891008e4d8bb_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\dbb925c6-437c-4fff-bb16-891008e4d8bb\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\dbb925c6-437c-4fff-bb16-891008e4d8bb-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T13:04:01.874046700Z",
      "payload": {
        "quantity": 10,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-8001",
        "warehouse": "WH-1",
        "sku": "ITEM-A"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "679798bb-40af-4dee-b94b-05a0d3796082",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T13:04:01.687889600Z",
    "updatedAt": "2026-10-14T13:04:01.704904900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\679798bb-40af-4dee-b94b-05a0d3796082_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\679798bb-40af-4dee-b94b-05a0d3796082\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T13:04:01.703895800Z",
      "payload": {
        "quantity": 10,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-9901",
        "warehouse": "WH-1",
        "sku": "ITEM-X"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "3419022d-0a1a-4a70-b5f0-7a15a2cfaf3a",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 3,
    "convertedRecords": 0,
    "errorRecords": 3,
    "createdAt": "2026-10-14T13:04:01.657039300Z",
    "updatedAt": "2026-10-14T13:04:01.683831300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\3419022d-0a1a-4a70-b5f0-7a15a2cfaf3a_asn_feed.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\3419022d-0a1a-4a70-b5f0-7a15a2cfaf3a-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "8596f22f-2a70-4493-bd62-42e1551c7d76",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "data_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T13:04:01.502554400Z",
    "updatedAt": "2026-10-14T13:04:01.521386700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\8596f22f-2a70-4493-bd62-42e1551c7d76_data_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\8596f22f-2a70-4493-bd62-42e1551c7d76\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-DATA-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T13:04:01.521386700Z",
      "payload": {
        "quantity": 15,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-DATA-1",
        "warehouse": "WH-1",
        "sku": "ITEM-D1"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-DATA-1,SUP-1,WH-1,ITEM-D1,15,EA\nPO-DATA-2,SUP-1,WH-1,ITEM-D2,30,EA\n"
  },
  {
    "jobId": "3fafacab-2dca-4d5b-9708-92106c1626ac",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T13:04:01.481042700Z",
    "updatedAt": "2026-10-14T13:04:01.504554700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\3fafacab-2dca-4d5b-9708-92106c1626ac_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\3fafacab-2dca-4d5b-9708-92106c1626ac-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "52acad69-b5e1-4605-98c8-838f594f5cc7",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "customer_b_po.csv",
    "status": "COMPLETED",
    "totalRecords": 1,
    "convertedRecords": 1,
    "errorRecords": 0,
    "createdAt": "2026-10-14T13:04:01.274955500Z",
    "updatedAt": "2026-10-14T13:04:01.341872900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\52acad69-b5e1-4605-98c8-838f594f5cc7_customer_b_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\52acad69-b5e1-4605-98c8-838f594f5cc7\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "PO",
      "externalReference": "PO-B-101",
      "profileVersion": "dynamic-customer_b_erp-po",
      "timestamp": "2026-10-14T13:04:01.334854100Z",
      "payload": {
        "quantity": 75,
        "uom": null,
        "supplier": "SUP-B",
        "poNumber": "PO-B-101",
        "warehouse": "WH-B-01",
        "sku": "SKU-B1"
      }
    },
    "sampleErrors": [],
    "sampleInput": "order_number,sku,qty,supplier,plant\nPO-B-101,SKU-B1,75,SUP-B,WH-B-01\n"
  },
  {
    "jobId": "94b011bc-0dca-4d7f-b9f3-9492da32ca62",
    "sourceSystem": "SAP_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "sample_po.json",
    "status": "COMPLETED",
    "totalRecords": 3,
    "convertedRecords": 3,
    "errorRecords": 0,
    "createdAt": "2026-10-14T13:01:23.491895900Z",
    "updatedAt": "2026-10-14T13:01:23.521406200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\94b011bc-0dca-4d7f-b9f3-9492da32ca62_sample_po.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\94b011bc-0dca-4d7f-b9f3-9492da32ca62\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "SAP_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "dynamic-sap_erp-po",
      "timestamp": "2026-10-14T13:01:23.519229700Z",
      "payload": {
        "poNumber": "PO-8001",
        "warehouse": "WH-001",
        "sku": "ITEM001",
        "quantity": 120,
        "uom": "EA",
        "supplier": "SUP-101"
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\n    \"PO_NUMBER\": \"PO-8001\",\n    \"SUPPLIER\": \"SUP-101\",\n    \"WAREHOUSE\": \"WH-001\",\n    \"SKU\": \"ITEM001\",\n    \"QUANTITY\": 120,\n    \"UOM\": \"EA\"\n  },\n  {\n    \"PO_NUMBER\": \"PO-8002\",\n    \"SUPPLIER\": \"SUP-202\",\n    \"WAREHOUSE\": \"WH-002\",\n    \"SKU\": \"ITEM002\",\n    \"QUANTITY\": 60,\n    \"UOM\": \"BOX\"\n  },\n  {\n    \"PO_NUMBER\": \"PO-8003\",\n    \"SUPPLIER\": \"SUP-303\",\n    \"WAREHOUSE\": \"WH-001\",\n    \"SKU\": \"ITEM003\",\n    \"QUANTITY\": 35,\n    \"UOM\": \"PLT\"\n  }\n]\n"
  },
  {
    "jobId": "c36ca957-987c-4eaf-8ccd-58b2e9be3428",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T12:58:47.914942400Z",
    "updatedAt": "2026-10-14T12:58:47.942499600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\c36ca957-987c-4eaf-8ccd-58b2e9be3428_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\c36ca957-987c-4eaf-8ccd-58b2e9be3428\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\c36ca957-987c-4eaf-8ccd-58b2e9be3428-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "dynamic-customer_b_erp-po",
      "timestamp": "2026-10-14T12:58:47.938833200Z",
      "payload": {
        "poNumber": "PO-7001",
        "warehouse": "WH-001",
        "sku": "ITEM001",
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "59f457cb-0730-468a-bb2d-5d2f0a079a9d",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T12:31:56.539028600Z",
    "updatedAt": "2026-10-14T12:31:56.616840700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\59f457cb-0730-468a-bb2d-5d2f0a079a9d_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\59f457cb-0730-468a-bb2d-5d2f0a079a9d\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "dynamic-customer_b_erp-po",
      "timestamp": "2026-10-14T12:31:56.603431300Z",
      "payload": {
        "poNumber": "PO-5001",
        "warehouse": "WH-001",
        "sku": "ITEM001",
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "72f958ec-8098-477e-b25f-59b298fc6d1b",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v2",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T11:22:03.636244900Z",
    "updatedAt": "2026-10-14T11:22:03.664631500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\72f958ec-8098-477e-b25f-59b298fc6d1b_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\72f958ec-8098-477e-b25f-59b298fc6d1b\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\72f958ec-8098-477e-b25f-59b298fc6d1b-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "dynamic-customer_b_erp-po",
      "timestamp": "2026-10-14T11:22:03.662585800Z",
      "payload": {
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-7001",
        "supplier": "SUP-101",
        "uom": "EA"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "05ef1212-43d2-4414-ba03-13f56318d1d6",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T10:53:20.070266900Z",
    "updatedAt": "2026-10-14T10:53:20.111218500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\05ef1212-43d2-4414-ba03-13f56318d1d6_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\05ef1212-43d2-4414-ba03-13f56318d1d6\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\05ef1212-43d2-4414-ba03-13f56318d1d6-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "dynamic-customer_b_erp-po",
      "timestamp": "2026-10-14T10:53:20.102075700Z",
      "payload": {
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-7001",
        "supplier": "SUP-101",
        "uom": "EA"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "1e59a776-6192-4c82-995e-11983c650389",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "orders.json",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T10:48:58.085696400Z",
    "updatedAt": "2026-10-14T10:48:58.107127200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\1e59a776-6192-4c82-995e-11983c650389_orders.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\1e59a776-6192-4c82-995e-11983c650389\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-JSON-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T10:48:58.106028300Z",
      "payload": {
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-JSON-1",
        "warehouse": "WH-1",
        "sku": "SKU-J1",
        "quantity": 40
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\"PO_NUMBER\": \"PO-JSON-1\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J1\", \"QUANTITY\": 40, \"UOM\": \"EA\"},\n  {\"PO_NUMBER\": \"PO-JSON-2\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J2\", \"QUANTITY\": 80, \"UOM\": \"EA\"}\n]\n"
  },
  {
    "jobId": "f980dbaa-c39d-469c-a068-01844ee02024",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:48:58.057661Z",
    "updatedAt": "2026-10-14T10:48:58.082813700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\f980dbaa-c39d-469c-a068-01844ee02024_inbound_orders.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\f980dbaa-c39d-469c-a068-01844ee02024-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "[{\"po_number\": \"PO-JSON-1\", \"sku\": \"ITEM-J1\", \"qty\": 5, \"supplier\": \"SUP-1\"}]"
  },
  {
    "jobId": "3540b20a-de30-4572-b733-64403a24d8d8",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:48:58.032282400Z",
    "updatedAt": "2026-10-14T10:48:58.058669100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\3540b20a-de30-4572-b733-64403a24d8d8_inbound_orders.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\3540b20a-de30-4572-b733-64403a24d8d8-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "po_number,sku,qty,supplier\nPO-AUTO-1,ITEM-AUTO,10,SUP-1\n"
  },
  {
    "jobId": "1905810c-3287-4dc4-ac97-9fc1b3175178",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:48:57.849344200Z",
    "updatedAt": "2026-10-14T10:48:57.870472800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\1905810c-3287-4dc4-ac97-9fc1b3175178_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\1905810c-3287-4dc4-ac97-9fc1b3175178\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\1905810c-3287-4dc4-ac97-9fc1b3175178-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T10:48:57.868480400Z",
      "payload": {
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-8001",
        "warehouse": "WH-1",
        "sku": "ITEM-A",
        "quantity": 10
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "d915e11b-5f98-4e03-bba5-3f1aefb2ddab",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T10:48:57.641860100Z",
    "updatedAt": "2026-10-14T10:48:57.664649500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\d915e11b-5f98-4e03-bba5-3f1aefb2ddab_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\d915e11b-5f98-4e03-bba5-3f1aefb2ddab\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T10:48:57.663649800Z",
      "payload": {
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-9901",
        "warehouse": "WH-1",
        "sku": "ITEM-X",
        "quantity": 10
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "9b273c41-4354-47a1-8272-cc6a92182f4f",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 3,
    "convertedRecords": 0,
    "errorRecords": 3,
    "createdAt": "2026-10-14T10:48:57.617243400Z",
    "updatedAt": "2026-10-14T10:48:57.641860100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\9b273c41-4354-47a1-8272-cc6a92182f4f_asn_feed.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\9b273c41-4354-47a1-8272-cc6a92182f4f-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "f5a0373f-f68c-457d-881b-1b2b61381ff7",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "data_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T10:48:57.396686200Z",
    "updatedAt": "2026-10-14T10:48:57.418761700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\f5a0373f-f68c-457d-881b-1b2b61381ff7_data_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\f5a0373f-f68c-457d-881b-1b2b61381ff7\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-DATA-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T10:48:57.417763500Z",
      "payload": {
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-DATA-1",
        "warehouse": "WH-1",
        "sku": "ITEM-D1",
        "quantity": 15
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-DATA-1,SUP-1,WH-1,ITEM-D1,15,EA\nPO-DATA-2,SUP-1,WH-1,ITEM-D2,30,EA\n"
  },
  {
    "jobId": "4c1f93d8-2aa7-49b6-9b46-7062e4273f7b",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:48:57.350869600Z",
    "updatedAt": "2026-10-14T10:48:57.384213400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\4c1f93d8-2aa7-49b6-9b46-7062e4273f7b_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\4c1f93d8-2aa7-49b6-9b46-7062e4273f7b-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "be8e2009-4240-4dd7-8eb7-0a1de9edab80",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "customer_b_po.csv",
    "status": "COMPLETED",
    "totalRecords": 1,
    "convertedRecords": 1,
    "errorRecords": 0,
    "createdAt": "2026-10-14T10:48:57.041851100Z",
    "updatedAt": "2026-10-14T10:48:57.174375400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\be8e2009-4240-4dd7-8eb7-0a1de9edab80_customer_b_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\be8e2009-4240-4dd7-8eb7-0a1de9edab80\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_B_ERP",
      "transactionType": "PO",
      "externalReference": "PO-B-101",
      "profileVersion": "dynamic-customer_b_erp-po",
      "timestamp": "2026-10-14T10:48:57.159683400Z",
      "payload": {
        "uom": null,
        "supplier": "SUP-B",
        "poNumber": "PO-B-101",
        "warehouse": "WH-B-01",
        "sku": "SKU-B1",
        "quantity": 75
      }
    },
    "sampleErrors": [],
    "sampleInput": "order_number,sku,qty,supplier,plant\nPO-B-101,SKU-B1,75,SUP-B,WH-B-01\n"
  },
  {
    "jobId": "4dfd2569-7f2f-4de7-9ae7-7bbf503fb4bc",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "orders.json",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T10:47:10.217392100Z",
    "updatedAt": "2026-10-14T10:47:10.236616800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\4dfd2569-7f2f-4de7-9ae7-7bbf503fb4bc_orders.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\4dfd2569-7f2f-4de7-9ae7-7bbf503fb4bc\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-JSON-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T10:47:10.235698600Z",
      "payload": {
        "quantity": 40,
        "sku": "SKU-J1",
        "warehouse": "WH-1",
        "poNumber": "PO-JSON-1",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\"PO_NUMBER\": \"PO-JSON-1\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J1\", \"QUANTITY\": 40, \"UOM\": \"EA\"},\n  {\"PO_NUMBER\": \"PO-JSON-2\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J2\", \"QUANTITY\": 80, \"UOM\": \"EA\"}\n]\n"
  },
  {
    "jobId": "1dc4100a-4cc5-4b70-a4a0-74be295c3357",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:47:10.173647600Z",
    "updatedAt": "2026-10-14T10:47:10.213720Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\1dc4100a-4cc5-4b70-a4a0-74be295c3357_inbound_orders.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\1dc4100a-4cc5-4b70-a4a0-74be295c3357-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "[{\"po_number\": \"PO-JSON-1\", \"sku\": \"ITEM-J1\", \"qty\": 5, \"supplier\": \"SUP-1\"}]"
  },
  {
    "jobId": "604c2f76-df49-4b3f-a177-1e96304cdc03",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:47:10.165677300Z",
    "updatedAt": "2026-10-14T10:47:10.198550100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\604c2f76-df49-4b3f-a177-1e96304cdc03_inbound_orders.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\604c2f76-df49-4b3f-a177-1e96304cdc03-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "po_number,sku,qty,supplier\nPO-AUTO-1,ITEM-AUTO,10,SUP-1\n"
  },
  {
    "jobId": "6fd0c92c-3070-48eb-a21e-c45661f00689",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:47:10.004752800Z",
    "updatedAt": "2026-10-14T10:47:10.025410400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\6fd0c92c-3070-48eb-a21e-c45661f00689_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\6fd0c92c-3070-48eb-a21e-c45661f00689\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\6fd0c92c-3070-48eb-a21e-c45661f00689-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T10:47:10.024399300Z",
      "payload": {
        "quantity": 10,
        "sku": "ITEM-A",
        "warehouse": "WH-1",
        "poNumber": "PO-8001",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "aabcf96f-5c53-42b5-ad12-a028917f72f6",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T10:47:09.793351Z",
    "updatedAt": "2026-10-14T10:47:09.813532Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\aabcf96f-5c53-42b5-ad12-a028917f72f6_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\aabcf96f-5c53-42b5-ad12-a028917f72f6\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T10:47:09.812537Z",
      "payload": {
        "quantity": 10,
        "sku": "ITEM-X",
        "warehouse": "WH-1",
        "poNumber": "PO-9901",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "0db67159-c184-49d6-b803-03ba4a68d809",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 3,
    "convertedRecords": 0,
    "errorRecords": 3,
    "createdAt": "2026-10-14T10:47:09.767018300Z",
    "updatedAt": "2026-10-14T10:47:09.789107800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\0db67159-c184-49d6-b803-03ba4a68d809_asn_feed.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\0db67159-c184-49d6-b803-03ba4a68d809-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "eecbc227-e2c1-47b5-91e0-ac344baa66a7",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "data_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T10:47:09.597937600Z",
    "updatedAt": "2026-10-14T10:47:09.634672300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\eecbc227-e2c1-47b5-91e0-ac344baa66a7_data_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\eecbc227-e2c1-47b5-91e0-ac344baa66a7\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-DATA-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T10:47:09.628918300Z",
      "payload": {
        "quantity": 15,
        "sku": "ITEM-D1",
        "warehouse": "WH-1",
        "poNumber": "PO-DATA-1",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-DATA-1,SUP-1,WH-1,ITEM-D1,15,EA\nPO-DATA-2,SUP-1,WH-1,ITEM-D2,30,EA\n"
  },
  {
    "jobId": "9f6c21bb-5d08-4a2f-9716-57defae8bbc1",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:47:09.518386300Z",
    "updatedAt": "2026-10-14T10:47:09.582806100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\9f6c21bb-5d08-4a2f-9716-57defae8bbc1_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\9f6c21bb-5d08-4a2f-9716-57defae8bbc1-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "ea5eefb8-dbc5-4e27-9de0-43e1e127ba6d",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "customer_b_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 1,
    "convertedRecords": 0,
    "errorRecords": 1,
    "createdAt": "2026-10-14T10:47:06.089450700Z",
    "updatedAt": "2026-10-14T10:47:06.185929Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\ea5eefb8-dbc5-4e27-9de0-43e1e127ba6d_customer_b_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\ea5eefb8-dbc5-4e27-9de0-43e1e127ba6d-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      }
    ],
    "sampleInput": "order_number,sku,qty,supplier\nPO-B-101,SKU-B1,75,SUP-B\n"
  },
  {
    "jobId": "1973a2ec-66fc-4b48-8acc-266811b74e3f",
    "sourceSystem": "CUSTOMER_B_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v2",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T09:55:02.257095800Z",
    "updatedAt": "2026-10-14T09:55:02.289740800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\1973a2ec-66fc-4b48-8acc-266811b74e3f_sample_po_with_errors.csv",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "ecc4e0ef-69c4-497f-ab6c-bf163dbe11af",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T09:51:50.122550600Z",
    "updatedAt": "2026-10-14T09:51:50.152153200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\ecc4e0ef-69c4-497f-ab6c-bf163dbe11af_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\ecc4e0ef-69c4-497f-ab6c-bf163dbe11af\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\ecc4e0ef-69c4-497f-ab6c-bf163dbe11af-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T09:51:50.151027300Z",
      "payload": {
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101",
        "poNumber": "PO-7001",
        "warehouse": "WH-001",
        "sku": "ITEM001"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "7a931dcc-b250-4575-ad5f-fcd49d00e20e",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v2",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T09:51:20.369109Z",
    "updatedAt": "2026-10-14T09:51:20.393656Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\7a931dcc-b250-4575-ad5f-fcd49d00e20e_sample_po_with_errors.csv",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "5d658e7c-3fc7-4f05-ba85-892567748530",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v2",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T09:50:24.311879200Z",
    "updatedAt": "2026-10-14T09:50:24.338388500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\5d658e7c-3fc7-4f05-ba85-892567748530_sample_po_with_errors.csv",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "18beca49-b0cc-47ba-9be3-7e286feda670",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T09:44:12.820829200Z",
    "updatedAt": "2026-10-14T09:44:12.837839500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\18beca49-b0cc-47ba-9be3-7e286feda670_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\18beca49-b0cc-47ba-9be3-7e286feda670\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\18beca49-b0cc-47ba-9be3-7e286feda670-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T09:44:12.836664800Z",
      "payload": {
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101",
        "poNumber": "PO-7001",
        "warehouse": "WH-001",
        "sku": "ITEM001"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "3a52ad10-6b63-4087-bec9-55c0e1828b01",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T09:43:18.788111900Z",
    "updatedAt": "2026-10-14T09:43:18.812569900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\3a52ad10-6b63-4087-bec9-55c0e1828b01_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\3a52ad10-6b63-4087-bec9-55c0e1828b01\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T09:43:18.810654600Z",
      "payload": {
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101",
        "poNumber": "PO-5001",
        "warehouse": "WH-001",
        "sku": "ITEM001"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "314bfdfa-ed3c-4a5d-bb17-e843d4f1968a",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T09:43:11.231109500Z",
    "updatedAt": "2026-10-14T09:43:11.320212800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\314bfdfa-ed3c-4a5d-bb17-e843d4f1968a_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\314bfdfa-ed3c-4a5d-bb17-e843d4f1968a\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\314bfdfa-ed3c-4a5d-bb17-e843d4f1968a-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T09:43:11.300487900Z",
      "payload": {
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101",
        "poNumber": "PO-7001",
        "warehouse": "WH-001",
        "sku": "ITEM001"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "92a03dc8-7f49-4d4a-84ea-76bbd4902e3b",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "orders.json",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T09:39:26.532971100Z",
    "updatedAt": "2026-10-14T09:39:26.551802Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\92a03dc8-7f49-4d4a-84ea-76bbd4902e3b_orders.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\92a03dc8-7f49-4d4a-84ea-76bbd4902e3b\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-JSON-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T09:39:26.550815200Z",
      "payload": {
        "quantity": 40,
        "sku": "SKU-J1",
        "warehouse": "WH-1",
        "poNumber": "PO-JSON-1",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\"PO_NUMBER\": \"PO-JSON-1\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J1\", \"QUANTITY\": 40, \"UOM\": \"EA\"},\n  {\"PO_NUMBER\": \"PO-JSON-2\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J2\", \"QUANTITY\": 80, \"UOM\": \"EA\"}\n]\n"
  },
  {
    "jobId": "bb10dbb8-676c-4c18-9505-e7ade8c4be76",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.json",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T09:39:26.510461100Z",
    "updatedAt": "2026-10-14T09:39:26.543195800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\bb10dbb8-676c-4c18-9505-e7ade8c4be76_inbound_orders.json",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\bb10dbb8-676c-4c18-9505-e7ade8c4be76-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "[{\"po_number\": \"PO-JSON-1\", \"sku\": \"ITEM-J1\", \"qty\": 5, \"supplier\": \"SUP-1\"}]"
  },
  {
    "jobId": "929890ca-aae5-4bb2-862f-5a9404010888",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "dynamic-auto-detected",
    "originalFilename": "inbound_orders.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T09:39:26.504138800Z",
    "updatedAt": "2026-10-14T09:39:26.532971100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\929890ca-aae5-4bb2-862f-5a9404010888_inbound_orders.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\929890ca-aae5-4bb2-862f-5a9404010888-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "po_number,sku,qty,supplier\nPO-AUTO-1,ITEM-AUTO,10,SUP-1\n"
  },
  {
    "jobId": "068c48f8-627f-4579-9873-4f8736a58f57",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-14T09:39:26.335532900Z",
    "updatedAt": "2026-10-14T09:39:26.366646900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\068c48f8-627f-4579-9873-4f8736a58f57_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\068c48f8-627f-4579-9873-4f8736a58f57\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\068c48f8-627f-4579-9873-4f8736a58f57-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T09:39:26.365656Z",
      "payload": {
        "quantity": 10,
        "sku": "ITEM-A",
        "warehouse": "WH-1",
        "poNumber": "PO-8001",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "b31f01ba-b2d0-418d-8de3-1cda050907b3",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T09:39:26.168363200Z",
    "updatedAt": "2026-10-14T09:39:26.187964Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\b31f01ba-b2d0-418d-8de3-1cda050907b3_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\b31f01ba-b2d0-418d-8de3-1cda050907b3\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T09:39:26.186950700Z",
      "payload": {
        "quantity": 10,
        "sku": "ITEM-X",
        "warehouse": "WH-1",
        "poNumber": "PO-9901",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "29712196-6ba0-416a-b714-1ad4e3fb8fae",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T09:39:26.143905900Z",
    "updatedAt": "2026-10-14T09:39:26.161886700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\29712196-6ba0-416a-b714-1ad4e3fb8fae_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "aaeb8cfa-485a-49c2-97f8-3787b78865c9",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "data_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T09:39:25.954848800Z",
    "updatedAt": "2026-10-14T09:39:25.981198600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\aaeb8cfa-485a-49c2-97f8-3787b78865c9_data_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\aaeb8cfa-485a-49c2-97f8-3787b78865c9\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-DATA-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T09:39:25.972198200Z",
      "payload": {
        "quantity": 15,
        "sku": "ITEM-D1",
        "warehouse": "WH-1",
        "poNumber": "PO-DATA-1",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-DATA-1,SUP-1,WH-1,ITEM-D1,15,EA\nPO-DATA-2,SUP-1,WH-1,ITEM-D2,30,EA\n"
  },
  {
    "jobId": "3c9901c5-4243-4796-af51-f4f01c4dea9b",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T09:39:25.897694200Z",
    "updatedAt": "2026-10-14T09:39:25.965254200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\3c9901c5-4243-4796-af51-f4f01c4dea9b_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\3c9901c5-4243-4796-af51-f4f01c4dea9b-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "4c5e5c99-24e0-4d83-b509-34b509c9dde1",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T07:44:15.774303500Z",
    "updatedAt": "2026-10-14T07:44:15.797793600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\4c5e5c99-24e0-4d83-b509-34b509c9dde1_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\4c5e5c99-24e0-4d83-b509-34b509c9dde1\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\4c5e5c99-24e0-4d83-b509-34b509c9dde1-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:44:15.795705100Z",
      "payload": {
        "supplier": "SUP-101",
        "uom": "EA",
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-7001"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "2367d931-4cc9-4582-8518-1f0949e130ea",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T07:43:19.250750200Z",
    "updatedAt": "2026-10-14T07:43:19.276305800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\2367d931-4cc9-4582-8518-1f0949e130ea_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\2367d931-4cc9-4582-8518-1f0949e130ea\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\2367d931-4cc9-4582-8518-1f0949e130ea-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:43:19.272495600Z",
      "payload": {
        "supplier": "SUP-101",
        "uom": "EA",
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-7001"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "9cb81b60-6c31-4654-8777-2b22d04c1026",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:39:33.788885100Z",
    "updatedAt": "2026-10-14T07:39:33.826822300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\9cb81b60-6c31-4654-8777-2b22d04c1026_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\9cb81b60-6c31-4654-8777-2b22d04c1026\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:39:33.824643Z",
      "payload": {
        "supplier": "SUP-101",
        "uom": "EA",
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-5001"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "e8950814-9d78-4939-8f55-9d72f5bc3abe",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:28:53.452778900Z",
    "updatedAt": "2026-10-14T07:28:53.473170800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\e8950814-9d78-4939-8f55-9d72f5bc3abe_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\e8950814-9d78-4939-8f55-9d72f5bc3abe\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:28:53.472156900Z",
      "payload": {
        "supplier": "SUP-101",
        "uom": "EA",
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-5001"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "16be8302-dcdf-4abb-a7d9-75058eed7195",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:27:44.118884900Z",
    "updatedAt": "2026-10-14T07:27:44.142189700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\16be8302-dcdf-4abb-a7d9-75058eed7195_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\16be8302-dcdf-4abb-a7d9-75058eed7195\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:27:44.141064300Z",
      "payload": {
        "supplier": "SUP-101",
        "uom": "EA",
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-5001"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "02babedd-9b67-4816-b63e-45140755eef1",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:19:42.845330400Z",
    "updatedAt": "2026-10-14T07:19:42.866976400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\02babedd-9b67-4816-b63e-45140755eef1_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\02babedd-9b67-4816-b63e-45140755eef1\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:19:42.866353500Z",
      "payload": {
        "supplier": "SUP-101",
        "uom": "EA",
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-5001"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "eaeca9cc-424e-4a10-994a-4e7db4a956cd",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:09:41.579660300Z",
    "updatedAt": "2026-10-14T07:09:41.622629500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\eaeca9cc-424e-4a10-994a-4e7db4a956cd_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\eaeca9cc-424e-4a10-994a-4e7db4a956cd\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:09:41.615985100Z",
      "payload": {
        "supplier": "SUP-101",
        "uom": "EA",
        "quantity": 100,
        "sku": "ITEM001",
        "warehouse": "WH-001",
        "poNumber": "PO-5001"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "e883f8c7-158b-4013-8b3e-903e663b1f28",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "orders.json",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:08:37.051578900Z",
    "updatedAt": "2026-10-14T07:08:37.082040Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\e883f8c7-158b-4013-8b3e-903e663b1f28_orders.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\e883f8c7-158b-4013-8b3e-903e663b1f28\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-JSON-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:08:37.080934600Z",
      "payload": {
        "quantity": 40,
        "sku": "SKU-J1",
        "warehouse": "WH-1",
        "poNumber": "PO-JSON-1",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\"PO_NUMBER\": \"PO-JSON-1\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J1\", \"QUANTITY\": 40, \"UOM\": \"EA\"},\n  {\"PO_NUMBER\": \"PO-JSON-2\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J2\", \"QUANTITY\": 80, \"UOM\": \"EA\"}\n]\n"
  },
  {
    "jobId": "3ab37503-3519-4a15-bdd6-3d6a93922552",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-14T07:08:36.855703400Z",
    "updatedAt": "2026-10-14T07:08:36.890359100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\3ab37503-3519-4a15-bdd6-3d6a93922552_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\3ab37503-3519-4a15-bdd6-3d6a93922552\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\3ab37503-3519-4a15-bdd6-3d6a93922552-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:08:36.889358200Z",
      "payload": {
        "quantity": 10,
        "sku": "ITEM-A",
        "warehouse": "WH-1",
        "poNumber": "PO-8001",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "2a45eef3-d289-4a0a-8e5c-85dd9272449b",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:08:36.676047900Z",
    "updatedAt": "2026-10-14T07:08:36.697655900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\2a45eef3-d289-4a0a-8e5c-85dd9272449b_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\2a45eef3-d289-4a0a-8e5c-85dd9272449b\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:08:36.697655900Z",
      "payload": {
        "quantity": 10,
        "sku": "ITEM-X",
        "warehouse": "WH-1",
        "poNumber": "PO-9901",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "b8aff0b6-1537-47d2-814c-326a6a36a9d3",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:08:36.646067300Z",
    "updatedAt": "2026-10-14T07:08:36.664979300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\b8aff0b6-1537-47d2-814c-326a6a36a9d3_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "6ebf7df4-0590-4328-99d5-b62501aa86d7",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "data_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T07:08:36.460559100Z",
    "updatedAt": "2026-10-14T07:08:36.496058800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\6ebf7df4-0590-4328-99d5-b62501aa86d7_data_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\6ebf7df4-0590-4328-99d5-b62501aa86d7\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-DATA-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T07:08:36.477867400Z",
      "payload": {
        "quantity": 15,
        "sku": "ITEM-D1",
        "warehouse": "WH-1",
        "poNumber": "PO-DATA-1",
        "supplier": "SUP-1",
        "uom": "EA"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-DATA-1,SUP-1,WH-1,ITEM-D1,15,EA\nPO-DATA-2,SUP-1,WH-1,ITEM-D2,30,EA\n"
  },
  {
    "jobId": "788a8eba-bed6-4cd3-b0b2-8414d4479b65",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T07:08:36.378942100Z",
    "updatedAt": "2026-10-14T07:08:36.470776500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\788a8eba-bed6-4cd3-b0b2-8414d4479b65_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\788a8eba-bed6-4cd3-b0b2-8414d4479b65-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "144df026-6b01-49c0-b3c5-f2dc96371760",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:59:09.795842200Z",
    "updatedAt": "2026-10-14T06:59:09.820600900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\144df026-6b01-49c0-b3c5-f2dc96371760_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\144df026-6b01-49c0-b3c5-f2dc96371760\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\144df026-6b01-49c0-b3c5-f2dc96371760-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:59:09.818896400Z",
      "payload": {
        "sku": "ITEM001",
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101",
        "poNumber": "PO-7001",
        "warehouse": "WH-001"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "6cdbff50-a046-435e-ac53-3cecd2429510",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.json",
    "status": "COMPLETED",
    "totalRecords": 3,
    "convertedRecords": 3,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:56:03.185908400Z",
    "updatedAt": "2026-10-14T06:56:03.209324800Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\6cdbff50-a046-435e-ac53-3cecd2429510_sample_po.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\6cdbff50-a046-435e-ac53-3cecd2429510\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:56:03.207733400Z",
      "payload": {
        "sku": "ITEM001",
        "quantity": 120,
        "uom": "EA",
        "supplier": "SUP-101",
        "poNumber": "PO-8001",
        "warehouse": "WH-001"
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\n    \"PO_NUMBER\": \"PO-8001\",\n    \"SUPPLIER\": \"SUP-101\",\n    \"WAREHOUSE\": \"WH-001\",\n    \"SKU\": \"ITEM001\",\n    \"QUANTITY\": 120,\n    \"UOM\": \"EA\"\n  },\n  {\n    \"PO_NUMBER\": \"PO-8002\",\n    \"SUPPLIER\": \"SUP-202\",\n    \"WAREHOUSE\": \"WH-002\",\n    \"SKU\": \"ITEM002\",\n    \"QUANTITY\": 60,\n    \"UOM\": \"BOX\"\n  },\n  {\n    \"PO_NUMBER\": \"PO-8003\",\n    \"SUPPLIER\": \"SUP-303\",\n    \"WAREHOUSE\": \"WH-001\",\n    \"SKU\": \"ITEM003\",\n    \"QUANTITY\": 35,\n    \"UOM\": \"PLT\"\n  }\n]\n"
  },
  {
    "jobId": "0b239a6a-278c-445a-91e6-c917b4d22687",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po_with_errors.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 4,
    "convertedRecords": 2,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:55:30.405813900Z",
    "updatedAt": "2026-10-14T06:55:30.425902300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\0b239a6a-278c-445a-91e6-c917b4d22687_sample_po_with_errors.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\0b239a6a-278c-445a-91e6-c917b4d22687\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\0b239a6a-278c-445a-91e6-c917b4d22687-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-7001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:55:30.424255300Z",
      "payload": {
        "sku": "ITEM001",
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101",
        "poNumber": "PO-7001",
        "warehouse": "WH-001"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "MISSING_SKU",
        "field": "sku",
        "message": "Field 'sku' is required and cannot be blank."
      },
      {
        "recordNumber": 3,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-7001,SUP-101,WH-001,ITEM001,100,EA\nPO-7002,SUP-101,WH-001,,50,EA\nPO-7003,SUP-202,WH-002,ITEM003,-15,BOX\nPO-7004,SUP-303,WH-001,ITEM004,20,PLT\n"
  },
  {
    "jobId": "2ce258bb-a7c1-4a3d-aff3-30fa1ac7354b",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:55:06.072526900Z",
    "updatedAt": "2026-10-14T06:55:06.109385100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\2ce258bb-a7c1-4a3d-aff3-30fa1ac7354b_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\2ce258bb-a7c1-4a3d-aff3-30fa1ac7354b\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:55:06.099856800Z",
      "payload": {
        "sku": "ITEM001",
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101",
        "poNumber": "PO-5001",
        "warehouse": "WH-001"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "83a7eb2d-3227-498e-a257-4364735fa011",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "JSON",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "orders.json",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:33:10.774700400Z",
    "updatedAt": "2026-10-14T06:33:10.808407200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\83a7eb2d-3227-498e-a257-4364735fa011_orders.json",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\83a7eb2d-3227-498e-a257-4364735fa011\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-JSON-1",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:33:10.807408900Z",
      "payload": {
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-JSON-1",
        "warehouse": "WH-1",
        "sku": "SKU-J1",
        "quantity": 40
      }
    },
    "sampleErrors": [],
    "sampleInput": "[\n  {\"PO_NUMBER\": \"PO-JSON-1\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J1\", \"QUANTITY\": 40, \"UOM\": \"EA\"},\n  {\"PO_NUMBER\": \"PO-JSON-2\", \"SUPPLIER\": \"SUP-1\", \"WAREHOUSE\": \"WH-1\", \"SKU\": \"SKU-J2\", \"QUANTITY\": 80, \"UOM\": \"EA\"}\n]\n"
  },
  {
    "jobId": "af90d846-d52a-4f8b-9eea-dc8cf6bd9402",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-14T06:33:10.608314Z",
    "updatedAt": "2026-10-14T06:33:10.625228600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\af90d846-d52a-4f8b-9eea-dc8cf6bd9402_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\af90d846-d52a-4f8b-9eea-dc8cf6bd9402\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\af90d846-d52a-4f8b-9eea-dc8cf6bd9402-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:33:10.623696600Z",
      "payload": {
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-8001",
        "warehouse": "WH-1",
        "sku": "ITEM-A",
        "quantity": 10
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "0652ffc0-ae72-4e6e-b18d-ce7a67f22923",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:33:10.436046100Z",
    "updatedAt": "2026-10-14T06:33:10.455077900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\0652ffc0-ae72-4e6e-b18d-ce7a67f22923_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\0652ffc0-ae72-4e6e-b18d-ce7a67f22923\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:33:10.451018800Z",
      "payload": {
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-9901",
        "warehouse": "WH-1",
        "sku": "ITEM-X",
        "quantity": 10
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "729b087c-d899-4bf7-8872-0672a0fd056e",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:33:10.413670700Z",
    "updatedAt": "2026-10-14T06:33:10.426293700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\729b087c-d899-4bf7-8872-0672a0fd056e_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "17f19f23-581d-418d-a72b-cced174ada54",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:33:10.363034200Z",
    "updatedAt": "2026-10-14T06:33:10.422749600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\17f19f23-581d-418d-a72b-cced174ada54_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\17f19f23-581d-418d-a72b-cced174ada54-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "bdb739fc-e965-4415-80cb-d5b99680512d",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "mixed_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 1,
    "errorRecords": 1,
    "createdAt": "2026-10-14T06:29:55.184165700Z",
    "updatedAt": "2026-10-14T06:29:55.210933100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\bdb739fc-e965-4415-80cb-d5b99680512d_mixed_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\bdb739fc-e965-4415-80cb-d5b99680512d\\data-0001.jsonl"
    ],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\bdb739fc-e965-4415-80cb-d5b99680512d-errors.jsonl",
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-8001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:29:55.208933100Z",
      "payload": {
        "sku": "ITEM-A",
        "quantity": 10,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-8001",
        "warehouse": "WH-1"
      }
    },
    "sampleErrors": [
      {
        "recordNumber": 2,
        "errorCode": "INVALID_QUANTITY_VALUE",
        "field": "quantity",
        "message": "Field 'quantity' must be greater than zero."
      }
    ],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-8001,SUP-1,WH-1,ITEM-A,10,EA\nPO-8002,SUP-1,WH-1,ITEM-B,-5,EA\n"
  },
  {
    "jobId": "de6e5c16-4ae9-4f24-ae62-5ca5786642e8",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:29:55.022244200Z",
    "updatedAt": "2026-10-14T06:29:55.040124Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\de6e5c16-4ae9-4f24-ae62-5ca5786642e8_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\de6e5c16-4ae9-4f24-ae62-5ca5786642e8\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:29:55.035069900Z",
      "payload": {
        "sku": "ITEM-X",
        "quantity": 10,
        "uom": "EA",
        "supplier": "SUP-1",
        "poNumber": "PO-9901",
        "warehouse": "WH-1"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "95ddf63e-31d8-48b3-a39a-fb6459deee1f",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:29:54.994441Z",
    "updatedAt": "2026-10-14T06:29:55.012253900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\95ddf63e-31d8-48b3-a39a-fb6459deee1f_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "689a0468-51aa-4585-8449-b0ebab1dfe8a",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:29:54.937177500Z",
    "updatedAt": "2026-10-14T06:29:54.998319100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\689a0468-51aa-4585-8449-b0ebab1dfe8a_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\689a0468-51aa-4585-8449-b0ebab1dfe8a-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "e2e0868f-7be6-432e-8813-91b2ec14f591",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:25:22.981656400Z",
    "updatedAt": "2026-10-14T06:25:23.007731200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\e2e0868f-7be6-432e-8813-91b2ec14f591_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\e2e0868f-7be6-432e-8813-91b2ec14f591\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:25:23.000731600Z",
      "payload": {
        "warehouse": "WH-1",
        "poNumber": "PO-9901",
        "supplier": "SUP-1",
        "uom": "EA",
        "quantity": 10,
        "sku": "ITEM-X"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "7c4a639b-40a8-4e7d-9ef4-3500b987bbb1",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:25:22.955639400Z",
    "updatedAt": "2026-10-14T06:25:22.971649700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\7c4a639b-40a8-4e7d-9ef4-3500b987bbb1_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "17e56769-8268-4ebd-b831-141e2ab0d011",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:25:22.896432200Z",
    "updatedAt": "2026-10-14T06:25:22.957324300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\17e56769-8268-4ebd-b831-141e2ab0d011_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\17e56769-8268-4ebd-b831-141e2ab0d011-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "a914a870-feb9-46e9-9973-02c1b3e1e754",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "async_po.csv",
    "status": "COMPLETED",
    "totalRecords": 2,
    "convertedRecords": 2,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:25:02.348717Z",
    "updatedAt": "2026-10-14T06:25:02.381800100Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\a914a870-feb9-46e9-9973-02c1b3e1e754_async_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\a914a870-feb9-46e9-9973-02c1b3e1e754\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-9901",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:25:02.376779500Z",
      "payload": {
        "poNumber": "PO-9901",
        "warehouse": "WH-1",
        "sku": "ITEM-X",
        "quantity": 10,
        "uom": "EA",
        "supplier": "SUP-1"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-9901,SUP-1,WH-1,ITEM-X,10,EA\nPO-9902,SUP-1,WH-1,ITEM-Y,20,EA\n"
  },
  {
    "jobId": "2ba8a386-695a-4e78-bf0b-bc216390178d",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:25:02.323199600Z",
    "updatedAt": "2026-10-14T06:25:02.337887300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\2ba8a386-695a-4e78-bf0b-bc216390178d_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "4f094f9c-cafb-4421-8544-d61a5839b964",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:25:02.231252100Z",
    "updatedAt": "2026-10-14T06:25:02.263949200Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\4f094f9c-cafb-4421-8544-d61a5839b964_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\4f094f9c-cafb-4421-8544-d61a5839b964-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "6b5c8023-9bbf-4997-8335-b03687a283a5",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:24:04.344991300Z",
    "updatedAt": "2026-10-14T06:24:04.360618400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\6b5c8023-9bbf-4997-8335-b03687a283a5_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "b833915f-e920-4248-95dc-40cd9cd76efa",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:24:04.279768100Z",
    "updatedAt": "2026-10-14T06:24:04.353327900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\b833915f-e920-4248-95dc-40cd9cd76efa_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\b833915f-e920-4248-95dc-40cd9cd76efa-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "be3852da-2046-45ea-a6bc-9eecbbc4d337",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:20:08.125801200Z",
    "updatedAt": "2026-10-14T06:20:08.150927400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\be3852da-2046-45ea-a6bc-9eecbbc4d337_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "1e3d3196-d629-4cdb-9475-c2a530fb3f40",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:20:08.063190100Z",
    "updatedAt": "2026-10-14T06:20:08.134823500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\1e3d3196-d629-4cdb-9475-c2a530fb3f40_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\1e3d3196-d629-4cdb-9475-c2a530fb3f40-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "f57f64ca-fb30-44f1-b5fe-91097b1c6b03",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:19:49.455672700Z",
    "updatedAt": "2026-10-14T06:19:49.470198500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\f57f64ca-fb30-44f1-b5fe-91097b1c6b03_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "8037daea-8f10-46c9-876b-a9f7033a5dda",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:19:49.368706100Z",
    "updatedAt": "2026-10-14T06:19:49.388220500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\8037daea-8f10-46c9-876b-a9f7033a5dda_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\8037daea-8f10-46c9-876b-a9f7033a5dda-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "e405dab7-ae82-43ee-9edb-4664ebe8a568",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:09:55.327183400Z",
    "updatedAt": "2026-10-14T06:24:04.944044900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\e405dab7-ae82-43ee-9edb-4664ebe8a568_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "c49d5720-e404-47f6-a17c-436f66dbf6fc",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:09:55.251473Z",
    "updatedAt": "2026-10-14T06:24:04.382925600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\c49d5720-e404-47f6-a17c-436f66dbf6fc_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\c49d5720-e404-47f6-a17c-436f66dbf6fc-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "babde6f8-4a36-4026-ac38-25898a4856f2",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:06:30.407022900Z",
    "updatedAt": "2026-10-14T06:20:08.633214300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\babde6f8-4a36-4026-ac38-25898a4856f2_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "4dc730db-8afa-4693-b01d-634da895735c",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:06:30.338955Z",
    "updatedAt": "2026-10-14T06:20:08.151451500Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\4dc730db-8afa-4693-b01d-634da895735c_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\4dc730db-8afa-4693-b01d-634da895735c-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "88228706-a80e-41c0-922e-c59bc0529cc7",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:01:30.543220800Z",
    "updatedAt": "2026-10-14T06:20:08.188638700Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\88228706-a80e-41c0-922e-c59bc0529cc7_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "dd3cccb9-9053-483d-a8d5-14f4c32853b6",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:01:30.467486600Z",
    "updatedAt": "2026-10-14T06:24:04.432331600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\dd3cccb9-9053-483d-a8d5-14f4c32853b6_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\dd3cccb9-9053-483d-a8d5-14f4c32853b6-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "2fc6c724-ee93-4434-8c02-bd2827346a57",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T06:00:50.231124200Z",
    "updatedAt": "2026-10-14T06:19:48.566872400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\2fc6c724-ee93-4434-8c02-bd2827346a57_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "0b8ecdea-f1a7-4553-84d8-ce04d83c8af2",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T06:00:50.152785200Z",
    "updatedAt": "2026-10-14T06:19:48.553375900Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\0b8ecdea-f1a7-4553-84d8-ce04d83c8af2_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\0b8ecdea-f1a7-4553-84d8-ce04d83c8af2-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  },
  {
    "jobId": "97c3ca3d-14bd-4d09-9c80-a0377b77f767",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED",
    "totalRecords": 4,
    "convertedRecords": 4,
    "errorRecords": 0,
    "createdAt": "2026-10-14T05:55:41.102871900Z",
    "updatedAt": "2026-10-14T06:20:08.589926600Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\97c3ca3d-14bd-4d09-9c80-a0377b77f767_sample_po.csv",
    "outputFiles": [
      "D:\\Third_Integration_Access_Platform\\data\\output\\97c3ca3d-14bd-4d09-9c80-a0377b77f767\\data-0001.jsonl"
    ],
    "errorFile": null,
    "sampleOutput": {
      "sourceSystem": "CUSTOMER_A_ERP",
      "transactionType": "PO",
      "externalReference": "PO-5001",
      "profileVersion": "customer-a-po-v1",
      "timestamp": "2026-10-14T06:20:08.588598700Z",
      "payload": {
        "poNumber": "PO-5001",
        "warehouse": "WH-001",
        "sku": "ITEM001",
        "quantity": 100,
        "uom": "EA",
        "supplier": "SUP-101"
      }
    },
    "sampleErrors": [],
    "sampleInput": "PO_NUMBER,SUPPLIER,WAREHOUSE,SKU,QUANTITY,UOM\nPO-5001,SUP-101,WH-001,ITEM001,100,EA\nPO-5001,SUP-101,WH-001,ITEM002,250,EA\nPO-5002,SUP-202,WH-002,ITEM003,50,BOX\nPO-5003,SUP-303,WH-001,ITEM004,15,PLT\n"
  },
  {
    "jobId": "df36eabb-17fe-4b49-bdd6-b454e771f72f",
    "sourceSystem": "LOGISTICS_PARTNER",
    "transactionType": "ASN",
    "inputFormat": "JSON",
    "mappingProfile": "partner-asn-v1",
    "originalFilename": "asn_feed.json",
    "status": "FAILED",
    "totalRecords": 0,
    "convertedRecords": 0,
    "errorRecords": 0,
    "createdAt": "2026-10-14T05:39:38.662901Z",
    "updatedAt": "2026-10-14T06:24:04.447333300Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\df36eabb-17fe-4b49-bdd6-b454e771f72f_asn_feed.json",
    "outputFiles": [],
    "errorFile": null,
    "sampleOutput": null,
    "sampleErrors": [],
    "sampleInput": "{\"asnNumber\":\"ASN-501\"}"
  },
  {
    "jobId": "b4690705-3e0d-4b3d-9e0f-17a99737e5d6",
    "sourceSystem": "CUSTOMER_A_ERP",
    "transactionType": "PO",
    "inputFormat": "CSV",
    "mappingProfile": "customer-a-po-v1",
    "originalFilename": "sample_po.csv",
    "status": "COMPLETED_WITH_ERRORS",
    "totalRecords": 2,
    "convertedRecords": 0,
    "errorRecords": 2,
    "createdAt": "2026-10-14T05:39:38.568408600Z",
    "updatedAt": "2026-10-14T06:20:08.617907400Z",
    "inputFileRef": "D:\\Third_Integration_Access_Platform\\data\\input\\b4690705-3e0d-4b3d-9e0f-17a99737e5d6_sample_po.csv",
    "outputFiles": [],
    "errorFile": "D:\\Third_Integration_Access_Platform\\data\\errors\\b4690705-3e0d-4b3d-9e0f-17a99737e5d6-errors.jsonl",
    "sampleOutput": null,
    "sampleErrors": [
      {
        "recordNumber": 1,
        "errorCode": "MISSING_WAREHOUSE",
        "field": "warehouse",
        "message": "Field 'warehouse' is required and cannot be blank."
      },
      {
        "recordNumber": 1,
        "errorCode": "MISSING_QUANTITY",
        "field": "quantity",
        "message": "Field 'quantity' is required."
      }
    ],
    "sampleInput": "PO_NUMBER,SKU,QTY\nPO-1001,ITEM-A,50\n"
  }
];
