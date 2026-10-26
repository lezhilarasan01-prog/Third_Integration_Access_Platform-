import React, { useState, useRef } from 'react';
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
  Download
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';

const PRESET_SAMPLES = [
  {
    id: '01-hm-asn-csv',
    format: 'CSV',
    label: '1. H&M Inbound ASN (CSV)',
    desc: 'CSV with ASN_NUMBER, LPN_ID, SKU, QUANTITY, RETAIL_PRICE',
    erp: 'CUSTOMER_A_ERP',
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
    id: '02-mawm-native-json',
    format: 'JSON',
    label: '2. MAWM Native ASN (JSON)',
    desc: 'Hierarchical { Data: [ { AsnId, Lpn: [ { LpnDetail: [...] } ] } ] }',
    erp: 'CUSTOMER_D_ERP',
    docType: 'ASN',
    filename: '02_mawm_native_asn.json',
    mime: 'application/json',
    content: JSON.stringify({
      Data: [
        {
          AsnId: "1064389422",
          AsnOriginTypeId: "P",
          BusinessUnitId: "CID001683",
          DestinationFacilityId: "IN_5180",
          Extended: {
            DhlCustRef1: "false",
            DhlCustRef2: "W533",
            DhlCustRef3: "InboundSupplier",
            DhlCustRef4: "A"
          },
          Lpn: [
            {
              LpnId: "00173217306660655741",
              Actions: { LpnDetail: "RESET" },
              LpnSizeTypeId: "A49",
              Extended: {
                DhlCustRefTtext1: "WAITING",
                DhlCustRef1: "58",
                DhlCustRef2: "40"
              },
              LpnDetail: [
                {
                  ItemId: "1370811001264A03",
                  ShippedQuantity: "29",
                  QuantityUomId: "Units",
                  InventoryTypeId: "F",
                  ProductStatusId: "W533",
                  RetailPrice: "999",
                  CountryOfOrigin: "MA"
                },
                {
                  ItemId: "1370811001264007",
                  ShippedQuantity: "80",
                  QuantityUomId: "Units",
                  InventoryTypeId: "F",
                  ProductStatusId: "W533",
                  RetailPrice: "999",
                  CountryOfOrigin: "MA"
                }
              ]
            }
          ]
        }
      ]
    }, null, 2)
  },
  {
    id: '03-sap-orders-xml',
    format: 'XML',
    label: '3. SAP Purchase Orders (XML)',
    desc: 'Nested XML with <orders><order><poNumber>...</poNumber></order>',
    erp: 'CUSTOMER_C_ERP',
    docType: 'PO',
    filename: '03_sap_purchase_orders.xml',
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
    filename: '04_oracle_po_feed.csv',
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
    filename: '05_edi_856_ship_notice.edi',
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
    erp: 'CUSTOMER_B_ERP',
    docType: 'PO',
    filename: '06_edi_850_purchase_order.x12',
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
    filename: '07_logistics_manifest.yaml',
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
    erp: 'CUSTOMER_D_ERP',
    docType: 'PO',
    filename: '08_warehouse_inbound.tsv',
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
    filename: '09_customer_b_pipe_delimited.txt',
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
    erp: 'CUSTOMER_A_ERP',
    docType: 'PO',
    filename: '10_ecommerce_fulfillment_orders.json',
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

export default function TestUploadModal({ isOpen, onClose, onOpenBeautifier }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [erpSource, setErpSource] = useState('CUSTOMER_A_ERP');
  const [customErp, setCustomErp] = useState('');
  const [docType, setDocType] = useState('ASN');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [convertedJson, setConvertedJson] = useState(null);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const activeErp = erpSource === 'CUSTOM' ? customErp.trim() || 'CUSTOM_ERP' : erpSource;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
      setUploadResult(null);
      setConvertedJson(null);
    }
  };

  const handleSelectSample = (sample) => {
    const blob = new Blob([sample.content], { type: sample.mime || 'text/plain' });
    const file = new File([blob], sample.filename, { type: sample.mime || 'text/plain' });
    setSelectedFile(file);
    setErpSource(sample.erp);
    setDocType(sample.docType);
    setUploadError(null);
    setUploadResult(null);
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
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadError(null);
      setUploadResult(null);
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

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setConvertedJson(null);

    try {
      const res = await integrationApi.uploadFile(activeErp, docType, selectedFile, null);
      setUploadResult(res);

      // Automatically fetch converted JSON after brief ingestion cycle
      if (res.trackingId) {
        setIsLoadingJson(true);
        setTimeout(async () => {
          try {
            const jsonText = await integrationApi.fetchConvertedJsonText(res.trackingId);
            setConvertedJson(formatMawmOutput(jsonText));
          } catch (e) {
            console.warn('Initial converted JSON fetch scheduled, retrying...', e);
          } finally {
            setIsLoadingJson(false);
          }
        }, 1200);
      }
    } catch (err) {
      console.error('Test upload failed:', err);
      setUploadError(err.message || 'File upload failed. Ensure backend server is running on port 8080.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetchConverted = async () => {
    if (!uploadResult?.trackingId) return;
    setIsLoadingJson(true);
    try {
      const text = await integrationApi.fetchConvertedJsonText(uploadResult.trackingId);
      setConvertedJson(formatMawmOutput(text));
    } catch (err) {
      setUploadError(`Could not fetch converted output: ${err.message}`);
    } finally {
      setIsLoadingJson(false);
    }
  };

  const handleCopyJson = () => {
    if (!convertedJson) return;
    navigator.clipboard.writeText(formatMawmOutput(convertedJson));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyJobId = () => {
    if (!uploadResult?.trackingId) return;
    navigator.clipboard.writeText(uploadResult.trackingId);
    setCopiedJobId(true);
    setTimeout(() => setCopiedJobId(false), 2000);
  };

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
                Directly upload &amp; convert ANY file format dynamically through Apache Camel to MAWM JSON
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
                  Quick Test File Samples (10 Presets)
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
                    title={sample.desc}
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
                <option value="CUSTOMER_A_ERP">CUSTOMER_A_ERP (H&amp;M Feed)</option>
                <option value="CUSTOMER_B_ERP">CUSTOMER_B_ERP (Retail CSV)</option>
                <option value="CUSTOMER_C_ERP">CUSTOMER_C_ERP (XML Supplier)</option>
                <option value="CUSTOMER_D_ERP">CUSTOMER_D_ERP (MAWM JSON)</option>
                <option value="SAP_ERP">SAP_ERP (Enterprise S/4)</option>
                <option value="LOGISTICS_PARTNER">LOGISTICS_PARTNER (EDI Feed)</option>
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
                <option value="ASN">ASN (Advanced Shipping Notice)</option>
                <option value="PO">PO (Purchase Order)</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
          </div>

          {/* Error Alert */}
          {uploadError && (
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
                  <span>Ingesting via Apache Camel &amp; Publishing to Kafka...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Execute Ingestion &amp; Convert to MAWM JSON</span>
                </>
              )}
            </button>
          </div>

          {/* Live Ingestion Result & Converted JSON */}
          {uploadResult && (
            <div style={{
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                    File Ingested Successfully (HTTP 200)
                  </span>
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
                    title="Refresh Live Converted JSON"
                  >
                    <RefreshCw size={12} className={isLoadingJson ? 'spin-icon' : ''} />
                    <span>Poll JSON</span>
                  </button>
                </div>
              </div>

              {/* Ingestion Metadata Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.85rem' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  Job ID: <code style={{ color: '#38bdf8' }}>{uploadResult.trackingId}</code>
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  Status: <strong style={{ color: '#10b981' }}>{uploadResult.status || 'RECEIVED'}</strong>
                </span>
              </div>

              {/* Converted MAWM JSON Output Viewer */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Code size={13} color="#0284c7" />
                    <span>Converted MAWM Output JSON ({`{ "Data": [ ... ] }`})</span>
                  </span>
                  {convertedJson && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {onOpenBeautifier && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenBeautifier(formatMawmOutput(convertedJson));
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
                        onClick={handleCopyJson}
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
                        <span>{copiedJson ? 'Copied!' : 'Copy Converted JSON'}</span>
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
                  color: '#e2e8f0'
                }}>
                  {isLoadingJson ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', padding: '0.5rem' }}>
                      <RefreshCw size={13} className="spin-icon" />
                      <span>Camel conversion in progress... Streaming transformed JSON...</span>
                    </div>
                  ) : convertedJson ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {convertedJson}
                    </pre>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', padding: '0.5rem' }}>
                      Click [Poll JSON] above to stream the transformed MAWM output from PostgreSQL/S3.
                    </div>
                  )}
                </div>
              </div>
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
