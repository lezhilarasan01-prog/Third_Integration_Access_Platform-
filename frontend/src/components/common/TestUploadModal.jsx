import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  FileCode,
  ArrowRight,
  Sparkles,
  Database,
  Send,
  Code,
  Download,
  Info
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';
import { copyToClipboard } from '../../utils/clipboard';

const DEFAULT_ERP_SOURCES = [
  'Opti',
  'ORACLE_NETSUITE',
  'SAP',
  'HM',
  'CUSTOMER_A_ERP',
  'CUSTOMER_B_ERP',
  'CUSTOMER_C_ERP',
  'CUSTOMER_D_ERP',
  'LOGISTICS_PARTNER',
  'RETAIL_HQ',
  'WAREHOUSE_DC',
  'ECOMMERCE'
];

const DEFAULT_DOC_TYPES = ['ASN', 'PO'];

const PRESET_SAMPLES = [
  {
    id: '01-opti-asn-json',
    format: 'JSON',
    label: '1. Opti Inbound ASN (JSON)',
    desc: 'Opti standard inbound ASN with AsnId, DestinationFacilityId, AsnLine',
    erp: 'Opti',
    docType: 'ASN',
    filename: 'opti_rep.json',
    mime: 'application/json',
    content: JSON.stringify({
      AsnId: "ASNOPTI00004769",
      AsnOriginTypeId: "S",
      DestinationFacilityId: "Food_Cbe",
      OriginFacilityId: "",
      EstimatedDeliveryDate: null,
      AsnLevelId: "ITEM",
      VendorId: "",
      AsnLine: [
        {
          QuantityUomId: "UNIT",
          ItemId: "231_board",
          ShippedQuantity: 10,
          AsnLineId: "1",
          PurchaseOrderId: "OPTIPO000004760",
          PurchaseOrderLineId: "1",
          Canceled: false
        }
      ]
    }, null, 2)
  },
  {
    id: '02-hm-asn-csv',
    format: 'CSV',
    label: '2. H&M Inbound ASN (CSV)',
    desc: 'CSV with ASN_NUMBER, LPN_ID, SKU, QUANTITY, RETAIL_PRICE',
    erp: 'HM',
    docType: 'ASN',
    filename: '01_hm_inbound_asn.csv',
    mime: 'text/csv',
    content: `ASN_NUMBER,BUSINESS_UNIT,SUPPLIER,DESTINATION_WAREHOUSE,LPN_ID,SKU,QUANTITY,UOM,RETAIL_PRICE,COUNTRY_OF_ORIGIN
1064389422,CID001683,H&M,IN_5180,00173217306660655741,1370811001264A03,29,Units,999,MA
1064389422,CID001683,H&M,IN_5180,00173217306660655741,1370811001264007,80,Units,999,MA
1064389422,CID001683,H&M,IN_5180,00173217306660655742,1370811001264008,75,Units,999,MA
1064389422,CID001683,H&M,IN_5180,00173217306660655743,1370811001264009,120,Units,1299,IN`
  },
  {
    id: '03-sap-orders-xml',
    format: 'XML',
    label: '3. SAP Purchase Orders (XML)',
    desc: 'Nested XML with <orders><order><poNumber>...</poNumber></order>',
    erp: 'SAP',
    docType: 'PO',
    filename: '02_sap_purchase_orders.xml',
    mime: 'application/xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<orders>
  <order>
    <poNumber>PO-2026-9041</poNumber>
    <supplier>ACME_LOGISTICS</supplier>
    <warehouse>IN_5180</warehouse>
    <sku>SKU-1004-PRIME</sku>
    <quantity>150</quantity>
    <uom>Units</uom>
    <price>45.50</price>
    <currency>USD</currency>
    <deliveryDate>2026-11-15</deliveryDate>
  </order>
  <order>
    <poNumber>PO-2026-9041</poNumber>
    <supplier>ACME_LOGISTICS</supplier>
    <warehouse>IN_5180</warehouse>
    <sku>SKU-1005-PRIME</sku>
    <quantity>220</quantity>
    <uom>Units</uom>
    <price>62.00</price>
    <currency>USD</currency>
    <deliveryDate>2026-11-15</deliveryDate>
  </order>
  <order>
    <poNumber>PO-2026-9042</poNumber>
    <supplier>FAST_SUPPLY_CORP</supplier>
    <warehouse>WH_CENTRAL</warehouse>
    <sku>SKU-9021-HEAVY</sku>
    <quantity>50</quantity>
    <uom>Boxes</uom>
    <price>120.00</price>
    <currency>USD</currency>
    <deliveryDate>2026-11-20</deliveryDate>
  </order>
</orders>`
  },
  {
    id: '04-oracle-po-csv',
    format: 'CSV',
    label: '4. Oracle NetSuite PO (CSV)',
    desc: 'Multi-line PO feed with VENDOR, ITEM_CODE, ORDER_QTY, UNIT_COST',
    erp: 'ORACLE_NETSUITE',
    docType: 'PO',
    filename: '03_oracle_po_feed.csv',
    mime: 'text/csv',
    content: `PO_HEADER,LINE_NUM,VENDOR_ID,VENDOR_NAME,FACILITY_CODE,ITEM_CODE,DESCRIPTION,ORDER_QTY,UOM,UNIT_COST
PO-ORA-5510,1,VEND-882,GLOBAL_TEXTILES,IN_5180,TX-COTTON-01,Organic Cotton T-Shirt,500,EA,12.50
PO-ORA-5510,2,VEND-882,GLOBAL_TEXTILES,IN_5180,TX-COTTON-02,Slim Denim Jeans,300,EA,28.00
PO-ORA-5511,1,VEND-904,MODERN_FOOTWEAR,IN_5180,SH-SNEAKER-09,Runner Sneaker Black,150,PR,45.00
PO-ORA-5512,1,VEND-102,PACIFIC_ACCESSORIES,WH_CENTRAL,AC-CAP-BASEBALL,Cotton Baseball Cap,400,EA,8.00`
  },
  {
    id: '05-edi-856-asn',
    format: 'EDI',
    label: '5. EDI X12 856 Ship Notice (EDI)',
    desc: 'Standard ANSI ASC X12 Ship Notice / Manifest transaction set',
    erp: 'CUSTOMER_A_ERP',
    docType: 'ASN',
    filename: '04_edi_856_ship_notice.edi',
    mime: 'application/edi-x12',
    content: `ISA*00*          *00*          *ZZ*CUSTOMER_A     *ZZ*MAWM_PLATFORM  *261023*1900*U*00401*000000856*0*P*>~
GS*SH*CUSTOMER_A*MAWM_PLATFORM*20261023*1900*856001*X*004010~
ST*856*0001~
BSN*00*ASN-2026-8801*20261023*1900~
HL*1**S~
TD1*CTN25*10~
TD5*B*2*FEDX*M*FEDERAL EXPRESS~
REF*BM*BOL-990214~
DTM*011*20261025~
N1*ST*FACILITY IN_5180*92*IN_5180~
HL*2*1*O~
PRF*PO-884102~
HL*3*2*I~
LIN*1*BP*1370811001264A03*VP*HM-SKU-01~
SN1*1*29*EA~
PO4*10*2.9*EA~
HL*4*2*I~
LIN*2*BP*1370811001264007*VP*HM-SKU-02~
SN1*2*80*EA~
PO4*20*4.0*EA~
SE*18*0001~
GE*1*856001~
IEA*1*000000856~`
  },
  {
    id: '06-edi-850-po',
    format: 'X12',
    label: '6. EDI X12 850 Purchase Order (X12)',
    desc: 'Standard ANSI ASC X12 850 Electronic Purchase Order',
    erp: 'RETAIL_HQ',
    docType: 'PO',
    filename: '05_edi_850_purchase_order.x12',
    mime: 'application/edi-x12',
    content: `ISA*00*          *00*          *ZZ*RETAIL_HQ      *ZZ*MAWM_LOGISTICS *261023*1915*U*00401*000000850*0*P*>~
GS*PO*RETAIL_HQ*MAWM_LOGISTICS*20261023*1915*850001*X*004010~
ST*850*0001~
BEG*00*NE*PO-2026-X12-09*20261023~
CUR*BY*USD~
REF*DP*DEPT-SPORTING~
PER*BD*PROCUREMENT DEPT*TE*8005550199~
N1*BY*GLOBAL RETAIL INC*9*1234567890123~
N3*1000 COMMERCE WAY~
N4*CHICAGO*IL*60601*US~
N1*ST*DISTRIBUTION CENTER 5180*92*IN_5180~
PO1*1*120*EA*18.50*PE*BP*SKU-RUN-1001*UP*012345678905~
PID*F****TRAIL RUNNING SHORT MEN M~
PO1*2*95*EA*24.00*PE*BP*SKU-RUN-1002*UP*012345678912~
PID*F****TRAIL RUNNING SHORT MEN L~
CTT*2~
SE*16*0001~
GE*1*850001~
IEA*1*000000850~`
  },
  {
    id: '07-logistics-yaml',
    format: 'YAML',
    label: '7. Logistics Manifest (YAML)',
    desc: 'Hierarchical YAML manifest with shipments, pallets, and SKU items',
    erp: 'LOGISTICS_PARTNER',
    docType: 'ASN',
    filename: '06_logistics_manifest.yaml',
    mime: 'text/yaml',
    content: `manifestId: MAN-2026-9901
carrier: DHL_EXPRESS
originHub: AP_SINGAPORE
destinationFacility: IN_5180
dispatchDate: "2026-10-24T08:00:00Z"
shipments:
  - trackingNumber: DHL-SG-994012
    asnReference: ASN-2026-8801
    palletId: PALLET-001
    packages: 12
    grossWeightKg: 340.5
    skuItems:
      - itemCode: 1370811001264A03
        description: Girl Sizes 92-140 Cotton Top
        shippedQty: 29
        uom: Units
      - itemCode: 1370811001264007
        description: Girl Sizes 92-140 Pattern Legging
        shippedQty: 80
        uom: Units
  - trackingNumber: DHL-SG-994013
    asnReference: ASN-2026-8802
    palletId: PALLET-002
    packages: 8
    grossWeightKg: 210.0
    skuItems:
      - itemCode: 1370811001264008
        description: Boys Outdoor Windbreaker
        shippedQty: 75
        uom: Units`
  },
  {
    id: '08-warehouse-tsv',
    format: 'TSV',
    label: '8. Warehouse Receiving (TSV)',
    desc: 'Tab-delimited warehouse feed with RECEIPT_NBR, LOT, EXPIRATION',
    erp: 'WAREHOUSE_DC',
    docType: 'PO',
    filename: '07_warehouse_inbound.tsv',
    mime: 'text/tab-separated-values',
    content: `RECEIPT_NBR\tWAREHOUSE_ID\tCARRIER_CODE\tCONTAINER_ID\tITEM_ID\tLOT_NUMBER\tRECEIVED_QTY\tUOM\tEXPIRATION_DATE
RC-2026-101\tIN_5180\tDHL\tCONT-99101\tSKU-PHARMA-101\tLOT-2026A\t1000\tEA\t2028-12-31
RC-2026-101\tIN_5180\tDHL\tCONT-99101\tSKU-PHARMA-102\tLOT-2026B\t850\tEA\t2028-11-30
RC-2026-102\tIN_5180\tFEDEX\tCONT-99205\tSKU-COSMETIC-01\tLOT-9911X\t450\tBOX\t2027-06-30
RC-2026-103\tIN_5180\tUPS\tCONT-99312\tSKU-COSMETIC-02\tLOT-9912Y\t300\tBOX\t2027-07-31`
  },
  {
    id: '09-pipe-txt',
    format: 'TXT',
    label: '9. Customer Flat File (Pipe TXT)',
    desc: 'Pipe-delimited flat file (ASN_ID|SUPPLIER|SKU|SHIPPED_QTY)',
    erp: 'CUSTOMER_B_ERP',
    docType: 'ASN',
    filename: '08_customer_b_pipe_delimited.txt',
    mime: 'text/plain',
    content: `ASN_ID|SUPPLIER_NAME|DESTINATION_DC|LPN_NUMBER|SKU_NUMBER|SHIPPED_QTY|UNIT_OF_MEASURE|ITEM_STATUS
ASN-B-9901|CUSTOMER_B_LOGISTICS|IN_5180|LPN-B-001091|SKU-B-8801|140|UNITS|AVAILABLE
ASN-B-9901|CUSTOMER_B_LOGISTICS|IN_5180|LPN-B-001092|SKU-B-8802|210|UNITS|AVAILABLE
ASN-B-9902|CUSTOMER_B_LOGISTICS|IN_5180|LPN-B-001093|SKU-B-9901|85|UNITS|INSPECTION_HOLD
ASN-B-9902|CUSTOMER_B_LOGISTICS|IN_5180|LPN-B-001094|SKU-B-9902|160|UNITS|AVAILABLE`
  },
  {
    id: '10-ecom-orders-json',
    format: 'JSON',
    label: '10. E-Commerce Multi-Item Orders (JSON)',
    desc: 'Multi-order array with orderId, shippingSpeed, and nested items[]',
    erp: 'ECOMMERCE',
    docType: 'PO',
    filename: '09_ecommerce_fulfillment_orders.json',
    mime: 'application/json',
    content: JSON.stringify([
      {
        orderId: "ORD-ECOM-88201",
        customer: "Sarah Jenkins",
        channel: "DIRECT_STORE",
        fulfillmentWarehouse: "IN_5180",
        orderDate: "2026-10-23T18:30:00Z",
        shippingSpeed: "NEXT_DAY_PRIORITY",
        items: [
          {
            sku: "ECOM-HOODIE-M",
            description: "Fleece Hoodie Heather Grey M",
            quantity: 2,
            unitPrice: 59.99
          },
          {
            sku: "ECOM-JOGGER-M",
            description: "Slim Fit Joggers Black M",
            quantity: 1,
            unitPrice: 44.99
          }
        ]
      },
      {
        orderId: "ORD-ECOM-88202",
        customer: "Michael Chang",
        channel: "MARKETPLACE",
        fulfillmentWarehouse: "IN_5180",
        orderDate: "2026-10-23T18:45:00Z",
        shippingSpeed: "STANDARD_GROUND",
        items: [
          {
            sku: "ECOM-BACKPACK-PRO",
            description: "Waterproof Commuter Backpack 25L",
            quantity: 1,
            unitPrice: 89.00
          }
        ]
      }
    ], null, 2)
  }
];

function formatMawmOutput(payload) {
  if (!payload) return '';
  let parsed = payload;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        return payload;
      }
    } else {
      return payload;
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (parsed.Data && Array.isArray(parsed.Data) && Object.keys(parsed).length === 1) {
      return JSON.stringify(parsed, null, 2);
    }
    if (parsed.Data && Array.isArray(parsed.Data)) {
      return JSON.stringify({ Data: parsed.Data }, null, 2);
    }
    if (parsed.records && Array.isArray(parsed.records)) {
      return JSON.stringify({ Data: parsed.records }, null, 2);
    }
    if (parsed.data && Array.isArray(parsed.data)) {
      return JSON.stringify({ Data: parsed.data }, null, 2);
    }
    if (parsed.payload) {
      return JSON.stringify({ Data: Array.isArray(parsed.payload) ? parsed.payload : [parsed.payload] }, null, 2);
    }
  }

  if (Array.isArray(parsed)) {
    return JSON.stringify({ Data: parsed }, null, 2);
  }

  if (parsed && typeof parsed === 'object') {
    const { trackingId, erpSource, facilityId, documentType, originalFilename, totalRecords, convertedAt, sourceFormat, records, data, ...rest } = parsed;
    const clean = Object.keys(rest).length > 0 ? rest : parsed;
    return JSON.stringify({ Data: [clean] }, null, 2);
  }

  return JSON.stringify({ Data: [] }, null, 2);
}

function getStatusStyles(status) {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'CONVERTED':
    case 'COMPLETED':
      return {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.35)',
        label: 'CONVERTED'
      };
    case 'FAILED':
      return {
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.4)',
        label: 'FAILED (Routed to DLQ)'
      };
    case 'PROCESSING':
      return {
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
        label: 'PROCESSING'
      };
    case 'QUEUED':
    case 'RECEIVED':
    default:
      return {
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.35)',
        label: s || 'QUEUED'
      };
  }
}

function formatErrorOutput(rawError, targetDlq) {
  if (!rawError) {
    const fallback = {
      status: 'FAILED',
      message: 'Schema validation failed. Check backend logs or DLQ for details.'
    };
    if (targetDlq) {
      fallback.dlqTopic = targetDlq;
    }
    return JSON.stringify(fallback, null, 2);
  }
  const trimmed = rawError.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed.dlqTopic && targetDlq) {
        parsed.dlqTopic = targetDlq;
      }
      delete parsed.errorType;
      delete parsed.deliveryLine;
      if (Array.isArray(parsed.errors)) {
        parsed.errors.forEach(err => {
          delete err.errorType;
          delete err.deliveryLine;
          delete err.lineNumber;
          delete err.rejectedValue;
          if (err.field && err.field.startsWith('deliveryLine[') && err.field.includes('].')) {
            const idx = err.field.indexOf('].');
            err.field = err.field.substring(idx + 2);
          } else if (err.field && err.field.startsWith('deliveryLine.')) {
            err.field = err.field.substring(13);
          }
        });
      }
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // fallback
    }
  }

  // Parse raw validation exception string if present
  if (trimmed.includes('[') && trimmed.includes(']:')) {
    try {
      const errorList = [];
      const errorsPart = trimmed.substring(trimmed.indexOf('['));
      const tokens = errorsPart.split(/;\s*(?=\[)/);
      tokens.forEach(tok => {
        tok = tok.trim();
        if (tok.startsWith('[') && tok.includes(']:')) {
          const closeIdx = tok.indexOf(']:');
          let field = tok.substring(1, closeIdx).trim();
          let reason = tok.substring(closeIdx + 2).trim();
          if (reason.includes("(value: '") && reason.endsWith("')")) {
            const valIdx = reason.lastIndexOf("(value: '");
            reason = reason.substring(0, valIdx).trim();
          }
          reason = reason.replace(/\s*\(MAWM\s+[^)]+\)/gi, '');
          if (field.startsWith('deliveryLine[') && field.includes('].')) {
            const endBracket = field.indexOf('].');
            field = field.substring(endBracket + 2);
          } else if (field.startsWith('deliveryLine.')) {
            field = field.substring(13);
          }
          if (field.includes('packing[') && field.includes('].')) {
            field = field.replace(/packing\[\d+\]\./g, 'packing.');
          }
          const item = {};
          item.field = field;
          item.message = reason;
          errorList.push(item);
        }
      });
      let mainMsg = trimmed.substring(0, trimmed.indexOf('[')).replace(/:$/, '').trim();
      if (mainMsg.includes('failed:')) {
        mainMsg = mainMsg.substring(mainMsg.lastIndexOf('failed:') + 7).trim();
      }
      if (!mainMsg || mainMsg.toLowerCase().includes('h&m')) {
        mainMsg = 'Schema validation failed';
      }
      const out = {
        status: 'FAILED',
        message: mainMsg,
        errors: errorList
      };
      if (targetDlq) {
        out.dlqTopic = targetDlq;
      }
      return JSON.stringify(out, null, 2);
    } catch (e) {
      // fallback
    }
  }

  const out = {
    status: 'FAILED',
    message: rawError
  };
  if (targetDlq) {
    out.dlqTopic = targetDlq;
  }
  return JSON.stringify(out, null, 2);
}

function autoDetectMetadata(filename, content) {
  const name = (filename || '').toLowerCase();
  let detectedErp = '';
  let detectedDocType = '';

  // 1. Detect ERP from filename
  if (name.includes('oracle') || name.includes('netsuite')) detectedErp = 'ORACLE_NETSUITE';
  else if (name.includes('sap')) detectedErp = 'SAP';
  else if (name.includes('hm') || name.includes('h&m')) detectedErp = 'HM';
  else if (name.includes('opti')) detectedErp = 'Opti';
  else if (name.includes('customer_a') || name.includes('customera')) detectedErp = 'CUSTOMER_A_ERP';
  else if (name.includes('customer_b') || name.includes('customerb')) detectedErp = 'CUSTOMER_B_ERP';
  else if (name.includes('logistics') || name.includes('dhl')) detectedErp = 'LOGISTICS_PARTNER';
  else if (name.includes('warehouse')) detectedErp = 'WAREHOUSE_DC';
  else if (name.includes('ecom')) detectedErp = 'ECOMMERCE';
  else if (name.includes('retail')) detectedErp = 'RETAIL_HQ';

  // 2. Detect DocType from filename
  if (name.includes('asn') || name.includes('ship') || name.includes('desadv') || name.includes('856') || name.includes('manifest') || name.includes('delivery')) {
    detectedDocType = 'ASN';
  } else if (name.includes('po') || name.includes('order') || name.includes('purchase') || name.includes('850') || name.includes('inbound') || name.includes('feed')) {
    detectedDocType = 'PO';
  }

  // 3. Fallback: inspect sample text content if available
  if (content && typeof content === 'string') {
    const text = content.slice(0, 1000);
    if (!detectedErp) {
      if (text.includes('ASNOPTI') || text.includes('OPTIPO') || text.includes('Opti') || text.includes('OPTI')) detectedErp = 'Opti';
      else if (text.includes('H&M') || text.includes('CID001683')) detectedErp = 'HM';
      else if (text.includes('ACME_LOGISTICS') || text.includes('SAP')) detectedErp = 'SAP';
      else if (text.includes('GLOBAL_TEXTILES') || text.includes('PO-ORA')) detectedErp = 'ORACLE_NETSUITE';
      else if (text.includes('CUSTOMER_A')) detectedErp = 'CUSTOMER_A_ERP';
      else if (text.includes('CUSTOMER_B')) detectedErp = 'CUSTOMER_B_ERP';
    }
    if (!detectedDocType) {
      if (text.includes('AsnId') || text.includes('ASN_NUMBER') || text.includes('856') || text.includes('inboundDelivery')) {
        detectedDocType = 'ASN';
      } else if (text.includes('poNumber') || text.includes('PO_HEADER') || text.includes('orderId') || text.includes('850') || text.includes('PurchaseOrder')) {
        detectedDocType = 'PO';
      }
    }
  }

  return {
    erp: detectedErp,
    docType: detectedDocType
  };
}

export default function TestUploadModal({ isOpen, onClose, onOpenBeautifier }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [erpSource, setErpSource] = useState('Opti');
  const [customErp, setCustomErp] = useState('');
  const [docType, setDocType] = useState('ASN');
  const [customDocType, setCustomDocType] = useState('');
  const [dbSources, setDbSources] = useState([]);
  const [dbDocTypes, setDbDocTypes] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [liveTracker, setLiveTracker] = useState(null);
  const [convertedJson, setConvertedJson] = useState(null);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);
  const [copiedError, setCopiedError] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState('mawm'); // 'mawm' | 'canonical'

  const fileInputRef = useRef(null);
  const pollTimerRef = useRef(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const pollJobStatus = (jobId, attempt = 1, maxAttempts = 30) => {
    stopPolling();

    pollTimerRef.current = setTimeout(async () => {
      try {
        const tracker = await integrationApi.getTrackerById(jobId);
        if (tracker) {
          setLiveTracker(tracker);
          const status = (tracker.intakeStatus || '').toUpperCase();
          const hasMawm = tracker.mawmResponse || tracker.dispatchStatus?.includes('DELIVERED') || tracker.dispatchStatus?.includes('200');

          if (tracker.outputFiles && !convertedJson) {
            setConvertedJson(formatMawmOutput(tracker.outputFiles));
          }

          if (status === 'CONVERTED' || status === 'COMPLETED') {
            const isOptiRecord = (tracker.sourceSystem || activeErp || '').toUpperCase() === 'OPTI';
            if (hasMawm || !isOptiRecord || tracker.dispatchStatus?.includes('Opti Exclusive')) {
              setIsLoadingJson(false);
              if (!isOptiRecord) {
                setActiveOutputTab('canonical');
              } else {
                setActiveOutputTab('mawm');
              }
              return;
            }
            if (attempt < maxAttempts) {
              setIsLoadingJson(true);
              pollJobStatus(jobId, attempt + 1, maxAttempts);
              return;
            } else {
              setIsLoadingJson(false);
              return;
            }
          }

          if (status === 'FAILED') {
            setIsLoadingJson(false);
            setConvertedJson(null);
            setUploadError(null);
            return;
          }
        }

        if (attempt < maxAttempts) {
          pollJobStatus(jobId, attempt + 1, maxAttempts);
        } else {
          setIsLoadingJson(false);
        }
      } catch (err) {
        console.warn('Error polling tracker status:', err);
        if (attempt < maxAttempts) {
          pollJobStatus(jobId, attempt + 1, maxAttempts);
        } else {
          setIsLoadingJson(false);
        }
      }
    }, attempt === 1 ? 500 : 1000);
  };

  // Pre-load default OPTI ASN sample on open
  useEffect(() => {
    if (isOpen && !selectedFile) {
      const optiSample = PRESET_SAMPLES[0];
      const blob = new Blob([optiSample.content], { type: optiSample.mime || 'application/json' });
      const file = new File([blob], optiSample.filename, { type: optiSample.mime || 'application/json' });
      setSelectedFile(file);
      setErpSource(optiSample.erp || 'OPTI');
      setDocType(optiSample.docType || 'ASN');
    }
  }, [isOpen]);

  // Dynamically fetch live distinct sources and document types from the database
  useEffect(() => {
    let isMounted = true;
    const fetchOptions = async () => {
      try {
        const { sourceSystems, transactionTypes } = await integrationApi.getIngestionOptions();
        if (isMounted) {
          if (Array.isArray(sourceSystems) && sourceSystems.length > 0) {
            setDbSources(sourceSystems);
          }
          if (Array.isArray(transactionTypes) && transactionTypes.length > 0) {
            setDbDocTypes(transactionTypes);
          }
        }
      } catch (err) {
        console.warn('Failed to load dynamic options from DB:', err);
      }
    };
    if (isOpen) {
      fetchOptions();
    }
    return () => { isMounted = false; };
  }, [isOpen]);

  const effectiveSources = useMemo(() => {
    const list = [...DEFAULT_ERP_SOURCES];
    dbSources.forEach(s => {
      if (s && !list.includes(s) && !['files', 'ingest', 'raw'].includes(s.toLowerCase())) {
        list.push(s);
      }
    });
    if (erpSource && erpSource !== 'CUSTOM' && !list.includes(erpSource)) {
      list.push(erpSource);
    }
    return list;
  }, [dbSources, erpSource]);

  const effectiveDocTypes = useMemo(() => {
    const base = dbDocTypes.length > 0 ? dbDocTypes : DEFAULT_DOC_TYPES;
    const list = [...base];
    if (docType && docType !== 'CUSTOM' && !list.includes(docType)) {
      list.unshift(docType);
    }
    return list;
  }, [dbDocTypes, docType]);

  if (!isOpen) return null;

  const activeErp = erpSource === 'CUSTOM' ? customErp.trim() || 'CUSTOM_ERP' : erpSource;
  const activeDocType = docType === 'CUSTOM' ? (customDocType.trim().toUpperCase() || 'CUSTOM_DOC') : docType;
  const isOpti = (activeErp || '').toUpperCase() === 'OPTI';

  const hasValidFileExtension = (name) => {
    if (!name || typeof name !== 'string') return false;
    const clean = name.replace(/\\/g, '/').split('/').pop().trim();
    const dot = clean.lastIndexOf('.');
    return dot > 0 && dot < clean.length - 1;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!hasValidFileExtension(file.name)) {
        setUploadError(`File extension is mandatory. "${file.name}" does not have a valid extension (e.g. .csv, .json, .xml, .edi). Files without extensions are not supported.`);
        setSelectedFile(null);
        return;
      }
      stopPolling();
      setSelectedFile(file);

      // Auto-detect ERP source and document type from file name
      const detected = autoDetectMetadata(file.name);
      if (detected.erp) {
        setErpSource(detected.erp);
      }
      if (detected.docType) {
        setDocType(detected.docType);
      }

      setUploadError(null);
      setUploadResult(null);
      setLiveTracker(null);
      setConvertedJson(null);
    }
  };

  const handleSelectSample = (sample) => {
    stopPolling();
    const blob = new Blob([sample.content], { type: sample.mime || 'text/plain' });
    const file = new File([blob], sample.filename, { type: sample.mime || 'text/plain' });
    setSelectedFile(file);
    if (sample.erp) {
      setErpSource(sample.erp);
    }
    if (sample.docType) {
      setDocType(sample.docType);
    }
    setUploadError(null);
    setUploadResult(null);
    setLiveTracker(null);
    setConvertedJson(null);
  };

  const handleDownloadSample = (e, sample) => {
    e.stopPropagation();
    const blob = new Blob([sample.content], { type: sample.mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sample.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!hasValidFileExtension(file.name)) {
        setUploadError(`File extension is mandatory. "${file.name}" does not have a valid extension (e.g. .csv, .json, .xml, .edi). Files without extensions are not supported.`);
        setSelectedFile(null);
        return;
      }
      stopPolling();
      setSelectedFile(file);

      // Auto-detect ERP source and document type from dropped file
      const detected = autoDetectMetadata(file.name);
      if (detected.erp) {
        setErpSource(detected.erp);
      }
      if (detected.docType) {
        setDocType(detected.docType);
      }

      setUploadError(null);
      setUploadResult(null);
      setLiveTracker(null);
      setConvertedJson(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select or load a file first.');
      return;
    }

    if (!activeErp) {
      setUploadError('Please select or specify an ERP Source System.');
      return;
    }

    if (!activeDocType) {
      setUploadError('Please select or specify a Document Type (e.g. ASN, PO).');
      return;
    }

    if (!hasValidFileExtension(selectedFile.name)) {
      setUploadError(`File extension is mandatory. "${selectedFile.name}" does not have a valid extension (e.g. .csv, .json, .xml, .edi). Files without extensions are not supported.`);
      return;
    }

    stopPolling();
    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setLiveTracker(null);
    setConvertedJson(null);

    try {
      const res = await integrationApi.uploadFile(activeErp, activeDocType, selectedFile, null);
      setUploadResult(res);

      if (res && res.trackingId) {
        setIsLoadingJson(true);
        setActiveOutputTab(isOpti ? 'mawm' : 'canonical');
        if (res.mawmResponse || res.dispatchStatus?.includes('Opti Exclusive')) {
          setLiveTracker(res);
          setIsLoadingJson(false);
        } else {
          pollJobStatus(res.trackingId, 1, 30);
        }

        // Fetch converted JSON immediately so payload view is ready without extra clicks
        integrationApi.fetchConvertedJsonText(res.trackingId).then(text => {
          if (text) setConvertedJson(formatMawmOutput(text));
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Test upload failed:', err);
      setUploadError(err.message || 'File upload failed. Ensure backend server is running on port 8080.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetchConverted = async () => {
    const jobId = uploadResult?.trackingId || liveTracker?.jobId;
    if (!jobId) return;

    setIsLoadingJson(true);
    setUploadError(null);

    try {
      const tracker = await integrationApi.getTrackerById(jobId);
      if (tracker) {
        setLiveTracker(tracker);
        const status = (tracker.intakeStatus || '').toUpperCase();

        if (status === 'FAILED') {
          setIsLoadingJson(false);
          setConvertedJson(null);
          return;
        }

        if (status === 'CONVERTED' || status === 'COMPLETED') {
          const text = await integrationApi.fetchConvertedJsonText(jobId);
          setConvertedJson(formatMawmOutput(text));
          setIsLoadingJson(false);
          return;
        }
      }

      const text = await integrationApi.fetchConvertedJsonText(jobId);
      setConvertedJson(formatMawmOutput(text));
    } catch (err) {
      if (liveTracker?.intakeStatus !== 'FAILED') {
        setUploadError(`Could not fetch converted output: ${err.message}`);
      }
    } finally {
      setIsLoadingJson(false);
    }
  };

  const handleCopyJson = async () => {
    if (!convertedJson) return;
    const ok = await copyToClipboard(formatMawmOutput(convertedJson));
    if (ok) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleCopyJobId = async () => {
    if (!uploadResult?.trackingId) return;
    const ok = await copyToClipboard(uploadResult.trackingId);
    if (ok) {
      setCopiedJobId(true);
      setTimeout(() => setCopiedJobId(false), 2000);
    }
  };

  const currentStatus = (liveTracker?.intakeStatus || uploadResult?.status || 'QUEUED').toUpperCase();
  const statusMeta = getStatusStyles(currentStatus);
  const isFailed = currentStatus === 'FAILED';
  const isConverted = currentStatus === 'CONVERTED' || currentStatus === 'COMPLETED';
  const resolvedDlqTopic = liveTracker?.errorFile 
    || (activeDocType ? `erp_file_${activeDocType.toLowerCase()}_dlq` : (liveTracker?.transactionType ? `erp_file_${liveTracker.transactionType.toLowerCase()}_dlq` : ''));

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 880, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Test File Ingestion Hub
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Directly upload &amp; process ANY file format dynamically through Apache Camel
              </p>
            </div>
          </div>
          <button
            type="button"
            className="header-icon-button"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Drag & Drop File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(2, 132, 199, 0.35)',
              borderRadius: '10px',
              padding: '1.5rem 1rem',
              textAlign: 'center',
              backgroundColor: 'rgba(2, 132, 199, 0.03)',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <UploadCloud size={32} color="#0284c7" style={{ margin: '0 auto 0.5rem auto' }} />
            {selectedFile ? (
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Dynamic Payload'} • Click to change
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Drag &amp; drop ANY file here, or click to browse
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Universal Dynamic Ingestion: 100% format agnostic (CSV, XML, JSON, YAML, Excel, EDI, TSV, Flat File, or ANY custom file)
                </div>
              </div>
            )}
          </div>

          {/* Quick 10 Test File Samples */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} color="#0284c7" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Quick Test File Samples ({PRESET_SAMPLES.length} Presets)
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Click any sample to load payload instantly
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.6rem',
              maxHeight: '190px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {PRESET_SAMPLES.map((sample) => {
                const isSelected = selectedFile?.name === sample.filename;
                return (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    style={{
                      border: isSelected ? '1.5px solid #0284c7' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'var(--card-bg, rgba(255, 255, 255, 0.03))',
                      borderRadius: '8px',
                      padding: '0.55rem 0.65rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(2, 132, 199, 0.15)',
                        color: '#38bdf8',
                        textTransform: 'uppercase'
                      }}>
                        {sample.format}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadSample(e, sample)}
                        title="Download sample file"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          color: 'var(--text-dim)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Download size={12} />
                      </button>
                    </div>

                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: isSelected ? '#38bdf8' : 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {sample.label}
                    </div>

                    <div style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      marginTop: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {sample.filename}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuration Form Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
            
            {/* ERP Source */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4 }}>
                ERP Source System
              </label>
              <select
                value={erpSource}
                onChange={(e) => setErpSource(e.target.value)}
                className="select-field"
                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px' }}
              >
                <option value="">-- Select ERP Source System --</option>
                {effectiveSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
                <option value="CUSTOM">Custom System Name...</option>
              </select>
              {erpSource === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Enter custom ERP ID"
                  value={customErp}
                  onChange={(e) => setCustomErp(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', marginTop: '0.4rem', padding: '0.4rem 0.6rem' }}
                />
              )}
              {activeErp && activeErp.toUpperCase() !== 'OPTI' && (
                <div style={{
                  marginTop: '0.45rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: '#93c5fd',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  lineHeight: '1.4'
                }}>
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <div>
                    Standard processing active (Live MAWM Cloud HTTP dispatch is exclusive to <strong>Opti</strong>).
                  </div>
                </div>
              )}
            </div>

            {/* Document Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4 }}>
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="select-field"
                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px' }}
              >
                <option value="">-- Select Document Type --</option>
                {effectiveDocTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value="CUSTOM">Custom Document Type...</option>
              </select>
              {docType === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Enter custom Document Type (e.g. INVOICE)"
                  value={customDocType}
                  onChange={(e) => setCustomDocType(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', marginTop: '0.4rem', padding: '0.4rem 0.6rem' }}
                />
              )}
            </div>
          </div>

          {/* Error Alert (Only show for client/network upload errors, not for job validation failure which has its own card) */}
          {uploadError && !isFailed && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.78rem'
            }}>
              <AlertTriangle size={15} />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Submit Ingestion Button */}
          <div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: '8px'
              }}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={16} className="spin-icon" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Execute Ingestion</span>
                </>
              )}
            </button>
          </div>

          {/* Live Ingestion Result & Converted JSON */}
          {uploadResult && (
            <div style={{
              border: isFailed ? '1px solid rgba(239, 68, 68, 0.45)' : isConverted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: isFailed ? 'rgba(239, 68, 68, 0.05)' : isConverted ? 'rgba(16, 185, 129, 0.04)' : 'rgba(56, 189, 248, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {isFailed ? (
                    <>
                      <AlertTriangle size={18} color="#ef4444" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ef4444' }}>
                        Ingestion Rejected: Schema Validation Failed
                      </span>
                    </>
                  ) : isConverted ? (
                    <>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                        Successfully Processed
                      </span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={15} color="#38bdf8" className="spin-icon" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                        Processing Ingestion...
                      </span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={handleCopyJobId}
                    className="hero-btn hero-btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    title="Copy Tracking ID"
                  >
                    {copiedJobId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedJobId ? 'Copied' : 'Copy Job ID'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchConverted}
                    className="hero-btn hero-btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    title="Refresh Live Status &amp; Output"
                  >
                    <RefreshCw size={12} className={isLoadingJson ? 'spin-icon' : ''} />
                    <span>{isFailed ? 'Refresh Status' : 'Poll JSON'}</span>
                  </button>
                </div>
              </div>

              {/* Ingestion Metadata Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.85rem' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  Job ID: <code style={{ color: '#38bdf8' }}>{uploadResult.trackingId}</code>
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: statusMeta.bg,
                  border: `1px solid ${statusMeta.border}`,
                  color: statusMeta.color,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isLoadingJson && !isFailed && !isConverted && <RefreshCw size={10} className="spin-icon" />}
                  Status: {statusMeta.label}
                </span>
                {liveTracker?.errorRecords > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    Errors: <strong>{liveTracker.errorRecords}</strong>
                  </span>
                )}
                {liveTracker?.convertedRecords > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    Converted Records: <strong>{liveTracker.convertedRecords}</strong>
                  </span>
                )}
                {/* MAWM Dispatch Status Pill */}
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: liveTracker?.dispatchStatus?.includes('200') || liveTracker?.dispatchStatus?.includes('DELIVERED') || liveTracker?.mawmResponse
                    ? 'rgba(16, 185, 129, 0.15)'
                    : (isOpti ? (liveTracker?.dispatchStatus?.includes('FAIL') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)') : 'rgba(59, 130, 246, 0.15)'),
                  border: `1px solid ${
                    liveTracker?.dispatchStatus?.includes('200') || liveTracker?.dispatchStatus?.includes('DELIVERED') || liveTracker?.mawmResponse
                      ? '#10b981'
                      : (isOpti ? (liveTracker?.dispatchStatus?.includes('FAIL') ? '#ef4444' : '#f59e0b') : '#3b82f6')
                  }`,
                  color: liveTracker?.dispatchStatus?.includes('200') || liveTracker?.dispatchStatus?.includes('DELIVERED') || liveTracker?.mawmResponse
                    ? '#10b981'
                    : (isOpti ? (liveTracker?.dispatchStatus?.includes('FAIL') ? '#ef4444' : '#f59e0b') : '#60a5fa'),
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  MAWM Dispatch: <strong>{
                    isOpti
                      ? (liveTracker?.dispatchStatus?.includes('200') || liveTracker?.mawmResponse ? 'DELIVERED (200 OK)' : (liveTracker?.dispatchStatus || 'AWAITING'))
                      : 'Opti Exclusive'
                  }</strong>
                </span>
              </div>

              {/* Conditional Content: Failure Details vs Converted MAWM Output */}
              {isFailed ? (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '6px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertTriangle size={15} color="#ef4444" />
                      <span>Schema &amp; Business Rule Validation Failure (JSON)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const errMsg = formatErrorOutput(liveTracker?.processingErrorMessage, resolvedDlqTopic);
                        navigator.clipboard.writeText(errMsg);
                        setCopiedError(true);
                        setTimeout(() => setCopiedError(false), 2000);
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '4px',
                        padding: '0.2rem 0.55rem',
                        color: '#f87171',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      title="Copy full error JSON"
                    >
                      {copiedError ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedError ? 'Copied Error JSON!' : 'Copy Error JSON'}</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    The message was rejected during ingestion and routed to the Dead-Letter Queue (DLQ).
                  </div>

                  <div style={{
                    backgroundColor: '#070b12',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    fontFamily: 'monospace',
                    fontSize: '0.74rem',
                    lineHeight: '1.45',
                    color: '#fca5a5',
                    maxHeight: 220,
                    overflowY: 'auto'
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {formatErrorOutput(liveTracker?.processingErrorMessage, resolvedDlqTopic)}
                    </pre>
                  </div>

                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '2px'
                  }}>
                    <span>DLQ Topic: <strong style={{ color: '#f87171' }}>{resolvedDlqTopic}</strong></span>
                    <span>No output JSON generated because record failed validation.</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setActiveOutputTab('mawm')}
                        style={{
                          background: activeOutputTab === 'mawm' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                          border: activeOutputTab === 'mawm' ? '1px solid #10b981' : '1px solid var(--border-color)',
                          color: activeOutputTab === 'mawm' ? '#34d399' : 'var(--text-muted)',
                          borderRadius: '4px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Check size={12} color="#10b981" />
                        <span>MAWM Cloud Response {liveTracker?.mawmResponse ? '✓' : ''}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveOutputTab('canonical')}
                        style={{
                          background: activeOutputTab === 'canonical' ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                          border: activeOutputTab === 'canonical' ? '1px solid #0284c7' : '1px solid var(--border-color)',
                          color: activeOutputTab === 'canonical' ? '#38bdf8' : 'var(--text-muted)',
                          borderRadius: '4px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Code size={12} />
                        <span>Processed Payload</span>
                      </button>
                    </div>

                    {(convertedJson || liveTracker?.mawmResponse || liveTracker?.dispatchStatus) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {onOpenBeautifier && (
                          <button
                            type="button"
                            onClick={() => {
                              const resp = liveTracker?.mawmResponse || uploadResult?.mawmResponse;
                              let mawmText;
                              if (resp) {
                                mawmText = typeof resp === 'string' ? (() => { try { return JSON.stringify(JSON.parse(resp), null, 2); } catch { return resp; } })() : JSON.stringify(resp, null, 2);
                              } else {
                                const isDelivered = liveTracker?.dispatchStatus?.includes('200') || liveTracker?.dispatchStatus?.includes('DELIVERED');
                                mawmText = JSON.stringify({
                                  dispatchStatus: liveTracker?.dispatchStatus || uploadResult?.dispatchStatus || (isDelivered ? "DELIVERED_TO_MAWM (200 OK)" : "PENDING"),
                                  facility: liveTracker?.facilityId || "Food_Cbe",
                                  trackingId: liveTracker?.jobId || uploadResult?.trackingId,
                                  message: isDelivered ? "Acknowledged receipt by Manhattan Active WMS Cloud" : "Waiting for MAWM Cloud response acknowledgment..."
                                }, null, 2);
                              }
                              const textToOpen = activeOutputTab === 'mawm' ? mawmText : formatMawmOutput(convertedJson);
                              onOpenBeautifier(textToOpen);
                              onClose();
                            }}
                            style={{
                              background: 'rgba(2, 132, 199, 0.15)',
                              border: '1px solid rgba(2, 132, 199, 0.4)',
                              borderRadius: '4px',
                              padding: '0.2rem 0.5rem',
                              color: '#38bdf8',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            title="Open and edit this payload in the JSON Beautifier"
                          >
                            <Sparkles size={11} />
                            <span>Open in Beautifier</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const resp = liveTracker?.mawmResponse || uploadResult?.mawmResponse;
                            let mawmText;
                            if (resp) {
                              mawmText = typeof resp === 'string' ? (() => { try { return JSON.stringify(JSON.parse(resp), null, 2); } catch { return resp; } })() : JSON.stringify(resp, null, 2);
                            } else {
                              const isDelivered = liveTracker?.dispatchStatus?.includes('200') || liveTracker?.dispatchStatus?.includes('DELIVERED');
                              mawmText = JSON.stringify({
                                dispatchStatus: liveTracker?.dispatchStatus || uploadResult?.dispatchStatus || (isDelivered ? "DELIVERED_TO_MAWM (200 OK)" : "PENDING"),
                                facility: liveTracker?.facilityId || "Food_Cbe",
                                trackingId: liveTracker?.jobId || uploadResult?.trackingId,
                                message: isDelivered ? "Acknowledged receipt by Manhattan Active WMS Cloud" : "Waiting for MAWM Cloud response acknowledgment..."
                              }, null, 2);
                            }
                            const textToCopy = activeOutputTab === 'mawm' ? mawmText : (convertedJson || '');
                            navigator.clipboard.writeText(textToCopy);
                            setCopiedJson(true);
                            setTimeout(() => setCopiedJson(false), 2000);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedJson ? '#10b981' : 'var(--text-dim)',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedJson ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{
                    backgroundColor: '#070b12',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    maxHeight: 220,
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    lineHeight: '1.4',
                    color: activeOutputTab === 'mawm' ? '#34d399' : '#e2e8f0'
                  }}>
                    {isLoadingJson ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', padding: '0.5rem' }}>
                        <RefreshCw size={13} className="spin-icon" />
                        <span>Processing...</span>
                      </div>
                    ) : activeOutputTab === 'mawm' ? (
                      (() => {
                        if (!isOpti) {
                          return (
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#93c5fd' }}>
                              {JSON.stringify({
                                dispatchStatus: "Opti Exclusive",
                                erpSource: activeErp,
                                message: "Hot dispatch to live MAWM Cloud REST API is configured exclusively for Opti feeds. Processed payload is available in the 'Processed Payload' tab.",
                                trackingId: liveTracker?.jobId || uploadResult?.trackingId
                              }, null, 2)}
                            </pre>
                          );
                        }
                        const resp = liveTracker?.mawmResponse || uploadResult?.mawmResponse;
                        if (resp) {
                          const formatted = typeof resp === 'string' ? (() => { try { return JSON.stringify(JSON.parse(resp), null, 2); } catch { return resp; } })() : JSON.stringify(resp, null, 2);
                          return (
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {formatted}
                            </pre>
                          );
                        }
                        const isDelivered = liveTracker?.dispatchStatus?.includes('200') || liveTracker?.dispatchStatus?.includes('DELIVERED');
                        return (
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify({
                              dispatchStatus: liveTracker?.dispatchStatus || uploadResult?.dispatchStatus || (isDelivered ? "DELIVERED_TO_MAWM (200 OK)" : "PENDING"),
                              facility: liveTracker?.facilityId || "Food_Cbe",
                              trackingId: liveTracker?.jobId || uploadResult?.trackingId,
                              message: isDelivered ? "Acknowledged receipt by Manhattan Active WMS Cloud" : "Waiting for MAWM Cloud response acknowledgment..."
                            }, null, 2)}
                          </pre>
                        );
                      })()
                    ) : convertedJson ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {convertedJson}
                      </pre>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', padding: '0.5rem' }}>
                        No payload generated yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '0.85rem 1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-default)' }}>
          <button
            type="button"
            className="hero-btn hero-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
