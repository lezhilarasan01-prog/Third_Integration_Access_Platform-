/**
 * MAWM Connect — Business Transaction Service
 *
 * Provides a decoupled data access layer for individual business transaction records
 * (Purchase Orders and Advance Shipment Notices) processed across integration jobs.
 *
 * Illustrative transaction dataset linked directly to sample jobs in recentJobs.
 * Demonstrates discrete PO lines and ASN shipments without fabricating live delivery
 * to Manhattan Active Warehouse Management (MAWM).
 *
 * When a real Spring Boot REST backend is connected, this service can be updated
 * to fetch from `/api/v1/transactions` without modifying UI components.
 */

import { getSuggestedCorrection } from './jobService.js';

export const illustrativeTransactions = [
  // 1. Transactions from clean PO job (064f95c5-3af4-40ab-8e47-f3be0cc4a122)
  {
    transactionId: 'TXN-PO-064F95-01',
    externalReference: 'PO-JSON-1',
    transactionType: 'PO',
    parentJobId: '064f95c5-3af4-40ab-8e47-f3be0cc4a122',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.478Z',
    processedAt: '2026-10-15T05:06:16.511Z',
    sourcePayload: {
      PO_NUMBER: 'PO-JSON-1',
      SUPPLIER: 'SUP-1',
      WAREHOUSE: 'WH-1',
      SKU: 'SKU-J1',
      QUANTITY: 40,
      UOM: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-JSON-1',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:06:16.510Z',
      payload: {
        poNumber: 'PO-JSON-1',
        warehouse: 'WH-1',
        sku: 'SKU-J1',
        quantity: 40,
        uom: 'EA',
        supplier: 'SUP-1'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-PO-064F95-02',
    externalReference: 'PO-JSON-2',
    transactionType: 'PO',
    parentJobId: '064f95c5-3af4-40ab-8e47-f3be0cc4a122',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.478Z',
    processedAt: '2026-10-15T05:06:16.511Z',
    sourcePayload: {
      PO_NUMBER: 'PO-JSON-2',
      SUPPLIER: 'SUP-1',
      WAREHOUSE: 'WH-1',
      SKU: 'SKU-J2',
      QUANTITY: 80,
      UOM: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-JSON-2',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:06:16.510Z',
      payload: {
        poNumber: 'PO-JSON-2',
        warehouse: 'WH-1',
        sku: 'SKU-J2',
        quantity: 80,
        uom: 'EA',
        supplier: 'SUP-1'
      }
    },
    validationErrors: []
  },

  // 2. Transaction from error PO job (e8dc6b24-4cf1-4ff4-82dc-b6ba98535f27)
  {
    transactionId: 'TXN-PO-E8DC6B-01',
    externalReference: 'PO-JSON-1',
    transactionType: 'PO',
    parentJobId: 'e8dc6b24-4cf1-4ff4-82dc-b6ba98535f27',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'INVALID',
    transformationStatus: 'FAILED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.438Z',
    processedAt: '2026-10-15T05:06:16.499Z',
    sourcePayload: {
      po_number: 'PO-JSON-1',
      sku: 'ITEM-J1',
      qty: 5,
      supplier: 'SUP-1'
    },
    normalizedPayload: null,
    validationErrors: [
      {
        recordNumber: 1,
        errorCode: 'MISSING_WAREHOUSE',
        field: 'warehouse',
        message: "Field 'warehouse' is required and cannot be blank.",
        suggestedCorrection: "Provide a valid warehouse facility identifier (e.g., 'WH-1', 'DC-01') in the inbound record or map an equivalent ERP column."
      }
    ]
  },

  // 3. Transactions from mixed PO job (8962f0aa-b431-486d-bf81-757c85ece487)
  {
    transactionId: 'TXN-PO-8962F0-01',
    externalReference: 'PO-8001',
    transactionType: 'PO',
    parentJobId: '8962f0aa-b431-486d-bf81-757c85ece487',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.274Z',
    processedAt: '2026-10-15T05:06:16.301Z',
    sourcePayload: {
      PO_NUMBER: 'PO-8001',
      SUPPLIER: 'SUP-1',
      WAREHOUSE: 'WH-1',
      SKU: 'ITEM-A',
      QUANTITY: 10,
      UOM: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-8001',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:06:16.300Z',
      payload: {
        poNumber: 'PO-8001',
        warehouse: 'WH-1',
        sku: 'ITEM-A',
        quantity: 10,
        uom: 'EA',
        supplier: 'SUP-1'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-PO-8962F0-02',
    externalReference: 'PO-8002',
    transactionType: 'PO',
    parentJobId: '8962f0aa-b431-486d-bf81-757c85ece487',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'INVALID',
    transformationStatus: 'FAILED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.274Z',
    processedAt: '2026-10-15T05:06:16.301Z',
    sourcePayload: {
      PO_NUMBER: 'PO-8002',
      SUPPLIER: 'SUP-1',
      WAREHOUSE: 'WH-1',
      SKU: 'ITEM-B',
      QUANTITY: -5,
      UOM: 'EA'
    },
    normalizedPayload: null,
    validationErrors: [
      {
        recordNumber: 2,
        errorCode: 'INVALID_QUANTITY_VALUE',
        field: 'quantity',
        message: "Field 'quantity' must be greater than zero.",
        suggestedCorrection: "Update the quantity field to a positive integer value strictly greater than zero (> 0)."
      }
    ]
  },

  // 4. Transactions from clean async PO job (4f72881f-d1b8-4c05-a955-b020106cecd5)
  {
    transactionId: 'TXN-PO-4F7288-01',
    externalReference: 'PO-9901',
    transactionType: 'PO',
    parentJobId: '4f72881f-d1b8-4c05-a955-b020106cecd5',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.110Z',
    processedAt: '2026-10-15T05:06:16.132Z',
    sourcePayload: {
      PO_NUMBER: 'PO-9901',
      SUPPLIER: 'SUP-1',
      WAREHOUSE: 'WH-1',
      SKU: 'ITEM-X',
      QUANTITY: 10,
      UOM: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-9901',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:06:16.132Z',
      payload: {
        poNumber: 'PO-9901',
        warehouse: 'WH-1',
        sku: 'ITEM-X',
        quantity: 10,
        uom: 'EA',
        supplier: 'SUP-1'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-PO-4F7288-02',
    externalReference: 'PO-9902',
    transactionType: 'PO',
    parentJobId: '4f72881f-d1b8-4c05-a955-b020106cecd5',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.110Z',
    processedAt: '2026-10-15T05:06:16.132Z',
    sourcePayload: {
      PO_NUMBER: 'PO-9902',
      SUPPLIER: 'SUP-1',
      WAREHOUSE: 'WH-1',
      SKU: 'ITEM-Y',
      QUANTITY: 20,
      UOM: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-9902',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:06:16.132Z',
      payload: {
        poNumber: 'PO-9902',
        warehouse: 'WH-1',
        sku: 'ITEM-Y',
        quantity: 20,
        uom: 'EA',
        supplier: 'SUP-1'
      }
    },
    validationErrors: []
  },

  // 5. Transactions from ASN job (d4ab3a34-cdca-467b-a27e-8a9b5d3c5bff)
  {
    transactionId: 'TXN-ASN-D4AB3A-01',
    externalReference: 'ASN-501',
    transactionType: 'ASN',
    parentJobId: 'd4ab3a34-cdca-467b-a27e-8a9b5d3c5bff',
    sourceSystem: 'LOGISTICS_PARTNER',
    validationStatus: 'INVALID',
    transformationStatus: 'FAILED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.078Z',
    processedAt: '2026-10-15T05:06:16.121Z',
    sourcePayload: {
      asnNumber: 'ASN-501',
      carrier: 'FEDEX-FREIGHT'
    },
    normalizedPayload: null,
    validationErrors: [
      {
        recordNumber: 1,
        errorCode: 'MISSING_WAREHOUSE',
        field: 'warehouse',
        message: "Field 'warehouse' is required and cannot be blank.",
        suggestedCorrection: "Provide a valid warehouse facility identifier (e.g., 'WH-1', 'DC-01') in the inbound record or map an equivalent ERP column."
      },
      {
        recordNumber: 1,
        errorCode: 'MISSING_SKU',
        field: 'sku',
        message: "Field 'sku' is required and cannot be blank.",
        suggestedCorrection: "Specify a valid non-empty item or SKU identifier string in the source record."
      },
      {
        recordNumber: 1,
        errorCode: 'MISSING_QUANTITY',
        field: 'quantity',
        message: "Field 'quantity' is required.",
        suggestedCorrection: "Populate the required numeric line-item quantity in the inbound payload."
      }
    ]
  },
  {
    transactionId: 'TXN-ASN-D4AB3A-02',
    externalReference: 'ASN-502',
    transactionType: 'ASN',
    parentJobId: 'd4ab3a34-cdca-467b-a27e-8a9b5d3c5bff',
    sourceSystem: 'LOGISTICS_PARTNER',
    validationStatus: 'INVALID',
    transformationStatus: 'FAILED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:16.078Z',
    processedAt: '2026-10-15T05:06:16.121Z',
    sourcePayload: {
      asnNumber: 'ASN-502',
      carrier: 'UPS-SUPPLY-CHAIN'
    },
    normalizedPayload: null,
    validationErrors: [
      {
        recordNumber: 2,
        errorCode: 'MISSING_WAREHOUSE',
        field: 'warehouse',
        message: "Field 'warehouse' is required and cannot be blank.",
        suggestedCorrection: "Provide a valid warehouse facility identifier (e.g., 'WH-1', 'DC-01') in the inbound record or map an equivalent ERP column."
      }
    ]
  },

  // 6. Transactions from Customer B PO Job (97a0a4d2-5219-4621-83bc-9f95413e9cb2)
  {
    transactionId: 'TXN-PO-97A0A4-01',
    externalReference: 'PO-B-101',
    transactionType: 'PO',
    parentJobId: '97a0a4d2-5219-4621-83bc-9f95413e9cb2',
    sourceSystem: 'CUSTOMER_B_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:15.715Z',
    processedAt: '2026-10-15T05:06:15.759Z',
    sourcePayload: {
      order_number: 'PO-B-101',
      sku: 'SKU-B1',
      qty: 75,
      supplier: 'SUP-B',
      plant: 'WH-B-01'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_B_ERP',
      transactionType: 'PO',
      externalReference: 'PO-B-101',
      profileVersion: 'dynamic-customer_b_erp-po',
      timestamp: '2026-10-15T05:06:15.756Z',
      payload: {
        poNumber: 'PO-B-101',
        warehouse: 'WH-B-01',
        sku: 'SKU-B1',
        quantity: 75,
        uom: null,
        supplier: 'SUP-B'
      }
    },
    validationErrors: []
  },

  // 7. Transactions from SAP S/4HANA PO Job (94b011bc-0dca-4d7f-b9f3-9492da32ca62)
  {
    transactionId: 'TXN-PO-SAP-01',
    externalReference: 'PO-8001',
    transactionType: 'PO',
    parentJobId: '94b011bc-0dca-4d7f-b9f3-9492da32ca62',
    sourceSystem: 'SAP_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-14T13:01:23.491Z',
    processedAt: '2026-10-14T13:01:23.521Z',
    sourcePayload: {
      PO_NUMBER: 'PO-8001',
      SUPPLIER: 'SUP-101',
      WAREHOUSE: 'WH-001',
      SKU: 'ITEM001',
      QUANTITY: 120,
      UOM: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'SAP_ERP',
      transactionType: 'PO',
      externalReference: 'PO-8001',
      profileVersion: 'dynamic-sap_erp-po',
      timestamp: '2026-10-14T13:01:23.519Z',
      payload: {
        poNumber: 'PO-8001',
        warehouse: 'WH-001',
        sku: 'ITEM001',
        quantity: 120,
        uom: 'EA',
        supplier: 'SUP-101'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-PO-SAP-02',
    externalReference: 'PO-8002',
    transactionType: 'PO',
    parentJobId: '94b011bc-0dca-4d7f-b9f3-9492da32ca62',
    sourceSystem: 'SAP_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-14T13:01:23.491Z',
    processedAt: '2026-10-14T13:01:23.521Z',
    sourcePayload: {
      PO_NUMBER: 'PO-8002',
      SUPPLIER: 'SUP-202',
      WAREHOUSE: 'WH-002',
      SKU: 'ITEM002',
      QUANTITY: 60,
      UOM: 'BOX'
    },
    normalizedPayload: {
      sourceSystem: 'SAP_ERP',
      transactionType: 'PO',
      externalReference: 'PO-8002',
      profileVersion: 'dynamic-sap_erp-po',
      timestamp: '2026-10-14T13:01:23.519Z',
      payload: {
        poNumber: 'PO-8002',
        warehouse: 'WH-002',
        sku: 'ITEM002',
        quantity: 60,
        uom: 'BOX',
        supplier: 'SUP-202'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-PO-SAP-03',
    externalReference: 'PO-8003',
    transactionType: 'PO',
    parentJobId: '94b011bc-0dca-4d7f-b9f3-9492da32ca62',
    sourceSystem: 'SAP_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-14T13:01:23.491Z',
    processedAt: '2026-10-14T13:01:23.521Z',
    sourcePayload: {
      PO_NUMBER: 'PO-8003',
      SUPPLIER: 'SUP-303',
      WAREHOUSE: 'WH-001',
      SKU: 'ITEM003',
      QUANTITY: 35,
      UOM: 'PLT'
    },
    normalizedPayload: {
      sourceSystem: 'SAP_ERP',
      transactionType: 'PO',
      externalReference: 'PO-8003',
      profileVersion: 'dynamic-sap_erp-po',
      timestamp: '2026-10-14T13:01:23.519Z',
      payload: {
        poNumber: 'PO-8003',
        warehouse: 'WH-001',
        sku: 'ITEM003',
        quantity: 35,
        uom: 'PLT',
        supplier: 'SUP-303'
      }
    },
    validationErrors: []
  },

  // 8. Transactions from data_po.csv job (3725c55e-f0a2-4c21-a346-ed7f58d574d9)
  {
    transactionId: 'TXN-PO-3725C5-01',
    externalReference: 'PO-DATA-1',
    transactionType: 'PO',
    parentJobId: '3725c55e-f0a2-4c21-a346-ed7f58d574d9',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:15.912Z',
    processedAt: '2026-10-15T05:06:15.944Z',
    sourcePayload: {
      po_number: 'PO-DATA-1',
      supplier: 'SUP-1',
      warehouse: 'WH-1',
      sku: 'SKU-100',
      quantity: 50,
      uom: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-DATA-1',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:06:15.943Z',
      payload: {
        poNumber: 'PO-DATA-1',
        warehouse: 'WH-1',
        sku: 'SKU-100',
        quantity: 50,
        uom: 'EA',
        supplier: 'SUP-1'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-PO-3725C5-02',
    externalReference: 'PO-DATA-2',
    transactionType: 'PO',
    parentJobId: '3725c55e-f0a2-4c21-a346-ed7f58d574d9',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:06:15.912Z',
    processedAt: '2026-10-15T05:06:15.944Z',
    sourcePayload: {
      po_number: 'PO-DATA-2',
      supplier: 'SUP-1',
      warehouse: 'WH-1',
      sku: 'SKU-200',
      quantity: 120,
      uom: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-DATA-2',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:06:15.943Z',
      payload: {
        poNumber: 'PO-DATA-2',
        warehouse: 'WH-1',
        sku: 'SKU-200',
        quantity: 120,
        uom: 'EA',
        supplier: 'SUP-1'
      }
    },
    validationErrors: []
  },

  // 9. ASN Transactions from Customer B ASN feed (b210d831-c81f-4f60-a71b-9a5e540a0d2b)
  {
    transactionId: 'TXN-ASN-B210D8-01',
    externalReference: 'ASN-800192',
    transactionType: 'ASN',
    parentJobId: 'b210d831-c81f-4f60-a71b-9a5e540a0d2b',
    sourceSystem: 'CUSTOMER_B_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:02:18.120Z',
    processedAt: '2026-10-15T05:02:18.155Z',
    sourcePayload: {
      asn_number: 'ASN-800192',
      po_number: 'PO-B-101',
      warehouse: 'WH-B-01',
      sku: 'SKU-B1',
      shipped_qty: 75,
      carrier: 'XPO-LOGISTICS'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_B_ERP',
      transactionType: 'ASN',
      externalReference: 'ASN-800192',
      profileVersion: 'dynamic-customer_b_erp-asn',
      timestamp: '2026-10-15T05:02:18.150Z',
      payload: {
        asnNumber: 'ASN-800192',
        poNumber: 'PO-B-101',
        warehouse: 'WH-B-01',
        sku: 'SKU-B1',
        quantity: 75,
        carrier: 'XPO-LOGISTICS'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-ASN-B210D8-02',
    externalReference: 'ASN-800193',
    transactionType: 'ASN',
    parentJobId: 'b210d831-c81f-4f60-a71b-9a5e540a0d2b',
    sourceSystem: 'CUSTOMER_B_ERP',
    validationStatus: 'INVALID',
    transformationStatus: 'FAILED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:02:18.120Z',
    processedAt: '2026-10-15T05:02:18.155Z',
    sourcePayload: {
      asn_number: 'ASN-800193',
      po_number: 'PO-B-102',
      sku: 'SKU-B2',
      shipped_qty: 0,
      carrier: 'XPO-LOGISTICS'
    },
    normalizedPayload: null,
    validationErrors: [
      {
        recordNumber: 2,
        errorCode: 'MISSING_WAREHOUSE',
        field: 'warehouse',
        message: "Field 'warehouse' is required and cannot be blank.",
        suggestedCorrection: "Provide a valid warehouse facility identifier (e.g., 'WH-1', 'DC-01') in the inbound record or map an equivalent ERP column."
      },
      {
        recordNumber: 2,
        errorCode: 'INVALID_QUANTITY_VALUE',
        field: 'quantity',
        message: "Field 'quantity' must be greater than zero.",
        suggestedCorrection: "Update the quantity field to a positive integer value strictly greater than zero (> 0)."
      }
    ]
  },

  // 10. Illustrative In-Flight / Pending Transactions (Simulating active buffer intake)
  {
    transactionId: 'TXN-PO-BUFFER-01',
    externalReference: 'PO-2026-BUFFER',
    transactionType: 'PO',
    parentJobId: '41c58634-4589-4155-866b-7e250785b73e',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'PENDING',
    transformationStatus: 'PENDING',
    deliveryStatus: 'PENDING',
    createdAt: '2026-10-15T05:04:04.746Z',
    processedAt: null,
    sourcePayload: {
      po_number: 'PO-2026-BUFFER',
      supplier: 'SUP-EXP',
      warehouse: 'WH-EAST',
      sku: 'SKU-PENDING-01',
      quantity: 150
    },
    normalizedPayload: null,
    validationErrors: []
  },
  {
    transactionId: 'TXN-ASN-BUFFER-02',
    externalReference: 'ASN-2026-BUFFER',
    transactionType: 'ASN',
    parentJobId: '5281f137-a4c7-406f-9a8f-5f7429ebe332',
    sourceSystem: 'LOGISTICS_PARTNER',
    validationStatus: 'PENDING',
    transformationStatus: 'NOT_AVAILABLE',
    deliveryStatus: 'NOT_AVAILABLE',
    createdAt: '2026-10-15T05:04:04.376Z',
    processedAt: null,
    sourcePayload: null,
    normalizedPayload: null,
    validationErrors: []
  },

  // 11. Additional PO & ASN Records from Customer A & B
  {
    transactionId: 'TXN-PO-065053-01',
    externalReference: 'PO-ASYNC-01',
    transactionType: 'PO',
    parentJobId: '0650530a-5c4e-4898-b610-d77105f8ae75',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:04:04.410Z',
    processedAt: '2026-10-15T05:04:04.436Z',
    sourcePayload: {
      PO_NUMBER: 'PO-ASYNC-01',
      SUPPLIER: 'SUP-A',
      WAREHOUSE: 'WH-1',
      SKU: 'SKU-A10',
      QUANTITY: 25,
      UOM: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-ASYNC-01',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:04:04.435Z',
      payload: {
        poNumber: 'PO-ASYNC-01',
        warehouse: 'WH-1',
        sku: 'SKU-A10',
        quantity: 25,
        uom: 'EA',
        supplier: 'SUP-A'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-PO-065053-02',
    externalReference: 'PO-ASYNC-02',
    transactionType: 'PO',
    parentJobId: '0650530a-5c4e-4898-b610-d77105f8ae75',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'VALID',
    transformationStatus: 'COMPLETED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:04:04.410Z',
    processedAt: '2026-10-15T05:04:04.436Z',
    sourcePayload: {
      PO_NUMBER: 'PO-ASYNC-02',
      SUPPLIER: 'SUP-A',
      WAREHOUSE: 'WH-1',
      SKU: 'SKU-A20',
      QUANTITY: 50,
      UOM: 'EA'
    },
    normalizedPayload: {
      sourceSystem: 'CUSTOMER_A_ERP',
      transactionType: 'PO',
      externalReference: 'PO-ASYNC-02',
      profileVersion: 'customer-a-po-v1',
      timestamp: '2026-10-15T05:04:04.435Z',
      payload: {
        poNumber: 'PO-ASYNC-02',
        warehouse: 'WH-1',
        sku: 'SKU-A20',
        quantity: 50,
        uom: 'EA',
        supplier: 'SUP-A'
      }
    },
    validationErrors: []
  },
  {
    transactionId: 'TXN-PO-EBB70D-01',
    externalReference: 'PO-JSON-1',
    transactionType: 'PO',
    parentJobId: 'ebb70d3a-94d9-4e5e-a6f1-967a553a0295',
    sourceSystem: 'CUSTOMER_A_ERP',
    validationStatus: 'INVALID',
    transformationStatus: 'FAILED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:04:04.724Z',
    processedAt: '2026-10-15T05:04:04.761Z',
    sourcePayload: {
      po_number: 'PO-JSON-1',
      sku: 'ITEM-J1',
      qty: 5,
      supplier: 'SUP-1'
    },
    normalizedPayload: null,
    validationErrors: [
      {
        recordNumber: 1,
        errorCode: 'MISSING_WAREHOUSE',
        field: 'warehouse',
        message: "Field 'warehouse' is required and cannot be blank.",
        suggestedCorrection: "Provide a valid warehouse facility identifier (e.g., 'WH-1', 'DC-01') in the inbound record or map an equivalent ERP column."
      }
    ]
  },
  {
    transactionId: 'TXN-ASN-PARTNER-01',
    externalReference: 'ASN-SHP-9021',
    transactionType: 'ASN',
    parentJobId: '5281f137-a4c7-406f-9a8f-5f7429ebe332',
    sourceSystem: 'LOGISTICS_PARTNER',
    validationStatus: 'INVALID',
    transformationStatus: 'FAILED',
    deliveryStatus: 'NOT_CONNECTED',
    createdAt: '2026-10-15T05:04:04.376Z',
    processedAt: '2026-10-15T05:04:04.414Z',
    sourcePayload: {
      asnNumber: 'ASN-SHP-9021',
      vendor: '3PL-PARTNER',
      lines: []
    },
    normalizedPayload: null,
    validationErrors: [
      {
        recordNumber: 1,
        errorCode: 'EMPTY_PAYLOAD',
        field: 'lines',
        message: "Shipment payload contains no line items.",
        suggestedCorrection: "Ensure the inbound file contains valid line item records before submitting for conversion."
      }
    ]
  }
];

/**
 * Retrieve all transactions.
 */
export function getAllTransactions() {
  return illustrativeTransactions;
}

/**
 * Retrieve a single transaction by ID.
 *
 * @param {string} transactionId
 * @returns {Object|null}
 */
export function getTransactionById(transactionId) {
  if (!transactionId) return null;
  const normalized = String(transactionId).trim().toLowerCase();
  return illustrativeTransactions.find(
    (t) => String(t.transactionId).trim().toLowerCase() === normalized
  ) || null;
}

/**
 * Retrieve all transactions linked to a specific parent job ID.
 *
 * @param {string} jobId
 * @returns {Array}
 */
export function getTransactionsByJobId(jobId) {
  if (!jobId) return [];
  const normalized = String(jobId).trim().toLowerCase();
  return illustrativeTransactions.filter(
    (t) => String(t.parentJobId).trim().toLowerCase() === normalized
  );
}

/**
 * Summary counts for transaction KPI strip.
 */
export function getTransactionSummary() {
  const total = illustrativeTransactions.length;
  const valid = illustrativeTransactions.filter((t) => t.validationStatus === 'VALID').length;
  const invalid = illustrativeTransactions.filter((t) => t.validationStatus === 'INVALID').length;
  const pending = illustrativeTransactions.filter((t) => t.validationStatus === 'PENDING').length;

  const transformed = illustrativeTransactions.filter((t) => t.transformationStatus === 'COMPLETED').length;
  const transformFailed = illustrativeTransactions.filter((t) => t.transformationStatus === 'FAILED').length;

  return {
    total,
    valid,
    invalid,
    pending,
    transformed,
    transformFailed
  };
}

export function formatSourceName(source) {
  return source || 'Unknown Source';
}

/**
 * ERP Badge CSS class
 */
export function sourceBadgeClass(source) {
  switch (source) {
    case 'CUSTOMER_A_ERP':
      return 'badge-blue';
    case 'CUSTOMER_B_ERP':
      return 'badge-orange';
    case 'LOGISTICS_PARTNER':
      return 'badge-purple';
    case 'SAP_ERP':
      return 'badge-teal';
    default:
      return 'badge-blue';
  }
}
