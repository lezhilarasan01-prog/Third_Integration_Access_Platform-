import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  Check,
  CheckCheck,
  ArrowRight,
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  Truck,
  ListOrdered,
  Layers,
  Database
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';

const DEFAULT_PO_SAMPLE = {
  PurchaseOrderId: "PO-2026-0001",
  purchaseOrderType: "Standard",
  DeliveryStartDate: "2026-11-01",
  DeliveryEndDate: "2026-11-15",
  VendorId: "VEND-DAIRY-01",
  OriginFacilityId: "SUPPLIER_PLANT",
  DestinationFacilityId: "Food_Cbe",
  PurchaseOrderStatus: "Open",
  CreatedBy: "kabil",
  PurchaseOrderLine: [
    {
      PurchaseOrderLineId: "1",
      ItemId: "SKU-MILK-1001",
      OrderQuantity: 1200,
      QuantityUomId: "EA",
      ShippedQuantity: 0,
      ReceivedQuantity: 0,
      Canceled: false
    }
  ]
};

const DEFAULT_ASN_SAMPLE = {
  AsnId: "ASN-2026-0001",
  AsnOriginTypeId: "S",
  DestinationFacilityId: "Food_Cbe",
  OriginFacilityId: "SUPPLIER_PLANT",
  EstimatedDeliveryDate: "2026-11-03",
  AsnLevelId: "ITEM",
  VendorId: "VEND-DAIRY-01",
  AsnLine: [
    {
      AsnLineId: "1",
      ItemId: "SKU-MILK-1001",
      PurchaseOrderId: "PO-2026-0001",
      PurchaseOrderLineId: "1",
      QuantityUomId: "EA",
      ShippedQuantity: 1200,
      Canceled: false
    }
  ]
};

export default function MawmDispatchPage({
  onReturnOverview,
  onNavigateToJobs,
  onOpenTestUpload,
  onOpenBeautifier
}) {
  const [telemetry, setTelemetry] = useState(null);
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Top-Level Document Category Mode: 'PO' | 'ASN'
  const [selectedDocCategory, setSelectedDocCategory] = useState('PO');

  // Active Query Console Tool Tab within Category:
  // For PO: 'PO_STATUS' | 'PO_LINES' | 'PO_ASN' | 'PO_SAVE'
  // For ASN: 'ASN_STATUS' | 'ASN_SAVE'
  const [activeConsoleTab, setActiveConsoleTab] = useState('PO_STATUS');

  // Shared Facility & Username (managed in background by default, no default input clutter)
  const [searchFacility, setSearchFacility] = useState('Food_Cbe');
  const [searchUsername, setSearchUsername] = useState('kabil');

  // PO Status State
  const [poSearchId, setPoSearchId] = useState('PO-2026-0001');
  const [searchingPoStatus, setSearchingPoStatus] = useState(false);
  const [poStatusResult, setPoStatusResult] = useState(null);

  // PO Lines State
  const [poLinesSearchId, setPoLinesSearchId] = useState('PO-2026-0001');
  const [searchingPoLines, setSearchingPoLines] = useState(false);
  const [poLinesResult, setPoLinesResult] = useState(null);

  // PO Associated ASNs State
  const [poAsnSearchId, setPoAsnSearchId] = useState('PO-2026-0001');
  const [searchingPoAsn, setSearchingPoAsn] = useState(false);
  const [poAsnResult, setPoAsnResult] = useState(null);

  // ASN Verification Search State
  const [searchAsnId, setSearchAsnId] = useState('');
  const [searchingAsn, setSearchingAsn] = useState(false);
  const [asnSearchResult, setAsnSearchResult] = useState(null);

  // Direct PO Save State
  const [directPoJson, setDirectPoJson] = useState(JSON.stringify(DEFAULT_PO_SAMPLE, null, 2));
  const [savingPoDirect, setSavingPoDirect] = useState(false);
  const [directPoResult, setDirectPoResult] = useState(null);

  // Direct ASN Save State
  const [directAsnJson, setDirectAsnJson] = useState(JSON.stringify(DEFAULT_ASN_SAMPLE, null, 2));
  const [savingAsnDirect, setSavingAsnDirect] = useState(false);
  const [directAsnResult, setDirectAsnResult] = useState(null);

  const [showRawJsonMap, setShowRawJsonMap] = useState({});

  // MAWM Dispatch Details Filtering & Pagination
  const [selectedErp, setSelectedErp] = useState('OPTI'); // Dropdown type, default to OPTI
  const [selectedDocTypeFilter, setSelectedDocTypeFilter] = useState('PO'); // Defaults to match selected category
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Row-level actions state
  const [dispatchingJobId, setDispatchingJobId] = useState(null);
  const [verifyingJobId, setVerifyingJobId] = useState(null);
  const [rowStatusMap, setRowStatusMap] = useState({});

  // Inspection modal
  const [inspectingJob, setInspectingJob] = useState(null);
  const [inspectPayloadTab, setInspectPayloadTab] = useState('response'); // 'response' | 'status' | 'lines' | 'asns' | 'raw'
  const [inspectingDetails, setInspectingDetails] = useState({ lines: null, asns: null, status: null });

  const formatPayload = (val) => {
    if (!val) return '';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch (e) {
        return String(val);
      }
    }
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return val;
    }
  };

  const isAsnRecord = useCallback((job) => {
    if (!job) return false;
    const type = (job.transactionType || '').toUpperCase();
    if (type === 'ASN' || type.includes('ASN') || type.includes('SHIPMENT')) return true;
    const storage = (job.storagePath || '').toLowerCase();
    if (storage.includes('asn')) return true;
    const profile = (job.mappingProfile || '').toLowerCase();
    if (profile.includes('asn')) return true;
    const fn = (job.originalFilename || '').toUpperCase();
    if (fn.includes('ASN')) return true;
    if (job.outputFiles && (job.outputFiles.includes('AsnId') || job.outputFiles.includes('asnId') || job.outputFiles.includes('AsnLine'))) return true;
    if (job.rawContent && (job.rawContent.includes('AsnId') || job.rawContent.includes('asnId') || job.rawContent.includes('AsnLine'))) return true;
    if (job.mawmResponse && (job.mawmResponse.includes('AsnId') || job.mawmResponse.includes('asnId') || job.mawmResponse.includes('AsnLine'))) return true;
    return false;
  }, []);

  const isPoRecord = useCallback((job) => {
    if (!job) return false;
    if (isAsnRecord(job)) return false;
    const type = (job.transactionType || '').toUpperCase();
    if (type === 'PO' || type.includes('PURCHASE') || type.includes('ORDER')) return true;
    const storage = (job.storagePath || '').toLowerCase();
    if (storage.includes('po')) return true;
    const profile = (job.mappingProfile || '').toLowerCase();
    if (profile.includes('po')) return true;
    const fn = (job.originalFilename || '').toUpperCase();
    if (fn.includes('PO') || fn.includes('ORDER') || fn.includes('PURCHASE')) return true;
    if (job.outputFiles && (job.outputFiles.includes('PurchaseOrderId') || job.outputFiles.includes('purchaseOrder'))) return true;
    if (job.rawContent && (job.rawContent.includes('PurchaseOrderId') || job.rawContent.includes('purchaseOrder'))) return true;
    if (job.mawmResponse && (job.mawmResponse.includes('PurchaseOrderId') || job.mawmResponse.includes('purchaseOrder'))) return true;
    return false;
  }, [isAsnRecord]);

  // Robust PO ID extraction
  const extractPoId = useCallback((job) => {
    if (!job) return '';
    if (job.outputFiles && typeof job.outputFiles === 'string') {
      try {
        const parsed = JSON.parse(job.outputFiles);
        const dataArr = parsed.Data || parsed.data || (Array.isArray(parsed) ? parsed : null);
        if (Array.isArray(dataArr) && dataArr[0]?.PurchaseOrderId) return String(dataArr[0].PurchaseOrderId);
        if (parsed.PurchaseOrderId) return String(parsed.PurchaseOrderId);
        if (parsed.purchaseOrderId) return String(parsed.purchaseOrderId);
      } catch (e) {}
      const m = job.outputFiles.match(/"PurchaseOrderId"\s*:\s*"([^"]+)"/i) || job.outputFiles.match(/"purchaseOrderId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    if (job.mawmResponse && typeof job.mawmResponse === 'string') {
      try {
        const parsed = JSON.parse(job.mawmResponse);
        const data = parsed.data || parsed.Data || parsed;
        if (data?.PurchaseOrderId) return String(data.PurchaseOrderId);
        if (Array.isArray(data) && data[0]?.PurchaseOrderId) return String(data[0].PurchaseOrderId);
      } catch (e) {}
      const m = job.mawmResponse.match(/"PurchaseOrderId"\s*:\s*"([^"]+)"/i) || job.mawmResponse.match(/"purchaseOrderId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    if (job.rawContent && typeof job.rawContent === 'string') {
      try {
        const parsed = JSON.parse(job.rawContent);
        if (parsed.PurchaseOrderId) return String(parsed.PurchaseOrderId);
        if (parsed.purchaseOrderId) return String(parsed.purchaseOrderId);
      } catch (e) {}
      const m = job.rawContent.match(/"PurchaseOrderId"\s*:\s*"([^"]+)"/i) || job.rawContent.match(/"purchaseOrderId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    if (job.originalFilename) {
      const m = job.originalFilename.match(/(PO[-_A-Za-z0-9]+)/i);
      if (m && m[1]) return m[1];
    }
    if (job.jobId) {
      return `PO-${job.jobId.slice(0, 8).toUpperCase()}`;
    }
    return 'PO-RECORD';
  }, []);

  // Robust ASN ID extraction
  const extractAsnId = useCallback((job) => {
    if (!job) return '';
    if (job.outputFiles && typeof job.outputFiles === 'string') {
      try {
        const parsed = JSON.parse(job.outputFiles);
        const dataArr = parsed.Data || parsed.data || (Array.isArray(parsed) ? parsed : null);
        if (Array.isArray(dataArr) && dataArr[0]?.AsnId) return String(dataArr[0].AsnId);
        if (parsed.AsnId) return String(parsed.AsnId);
        if (parsed.asnId) return String(parsed.asnId);
      } catch (e) {}
      const m = job.outputFiles.match(/"AsnId"\s*:\s*"([^"]+)"/i) || job.outputFiles.match(/"asnId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    if (job.mawmResponse && typeof job.mawmResponse === 'string') {
      try {
        const parsed = JSON.parse(job.mawmResponse);
        const data = parsed.data || parsed.Data || parsed;
        if (data?.AsnId) return String(data.AsnId);
        if (data?.Asn?.AsnId) return String(data.Asn.AsnId);
        if (Array.isArray(data?.AsnLine) && data.AsnLine[0]?.AsnId) return String(data.AsnLine[0].AsnId);
        if (Array.isArray(data) && data[0]?.AsnId) return String(data[0].AsnId);
      } catch (e) {}
      const m = job.mawmResponse.match(/"AsnId"\s*:\s*"([^"]+)"/i) || job.mawmResponse.match(/"asnId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    if (job.rawContent && typeof job.rawContent === 'string') {
      try {
        const parsed = JSON.parse(job.rawContent);
        if (parsed.AsnId) return String(parsed.AsnId);
        if (parsed.asnId) return String(parsed.asnId);
      } catch (e) {}
      const m = job.rawContent.match(/"AsnId"\s*:\s*"([^"]+)"/i) || job.rawContent.match(/"asnId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    if (job.originalFilename) {
      const m = job.originalFilename.match(/(ASN[A-Za-z0-9_-]+)/i);
      if (m && m[1]) return m[1];
    }
    if (job.jobId) {
      return `ASN-${job.jobId.slice(0, 8).toUpperCase()}`;
    }
    return 'ASN-RECORD';
  }, []);

  // Unified Document ID extraction
  const extractDocId = useCallback((job) => {
    if (!job) return { id: '', type: 'ASN' };
    if (isAsnRecord(job)) {
      return { id: extractAsnId(job), type: 'ASN' };
    }
    if (isPoRecord(job)) {
      return { id: extractPoId(job), type: 'PO' };
    }
    const fn = (job.originalFilename || '').toUpperCase();
    if (fn.includes('ASN')) {
      return { id: extractAsnId(job), type: 'ASN' };
    }
    return { id: extractPoId(job), type: 'PO' };
  }, [isAsnRecord, isPoRecord, extractAsnId, extractPoId]);

  // Robust Destination Facility extraction
  const extractFacility = useCallback((job) => {
    if (!job) return 'Food_Cbe';
    if (job.mawmResponse && typeof job.mawmResponse === 'string') {
      try {
        const parsed = JSON.parse(job.mawmResponse);
        const data = parsed.data || parsed.Data || parsed;
        if (data?.DestinationFacilityId) return data.DestinationFacilityId;
        if (data?.FacilityId && data.FacilityId !== 'OPTI' && data.FacilityId !== 'SAMPLE') return data.FacilityId;
      } catch (e) {}
    }
    if (job.outputFiles && typeof job.outputFiles === 'string') {
      try {
        const parsed = JSON.parse(job.outputFiles);
        if (parsed.DestinationFacilityId) return parsed.DestinationFacilityId;
        if (Array.isArray(parsed) && parsed[0]?.DestinationFacilityId) return parsed[0].DestinationFacilityId;
      } catch (e) {}
    }
    if (job.facilityId && job.facilityId !== 'OPTI' && job.facilityId !== 'SAMPLE') {
      return job.facilityId;
    }
    return 'Food_Cbe';
  }, []);

  // Extract status directly from actual API response fact
  const extractLiveStatus = useCallback((job) => {
    if (!job) return null;
    if (rowStatusMap[job.jobId]) return rowStatusMap[job.jobId];
    if (job.mawmAsnStatus) return job.mawmAsnStatus;
    if (job.mawmResponse && typeof job.mawmResponse === 'string') {
      try {
        const parsed = JSON.parse(job.mawmResponse);
        const data = parsed.data || parsed.Data;
        if (Array.isArray(data) && data[0]) {
          if (data[0].PurchaseOrderStatus) return String(data[0].PurchaseOrderStatus);
          if (data[0].purchaseOrderStatusDescription) return String(data[0].purchaseOrderStatusDescription);
          if (data[0].AsnStatus) return String(data[0].AsnStatus);
        }
        if (data?.PurchaseOrderStatus) return String(data.PurchaseOrderStatus);
        if (data?.purchaseOrderStatusDescription) return String(data.purchaseOrderStatusDescription);
        if (data?.AsnStatus) return String(data.AsnStatus);
        if (data?.StatusDescription) return String(data.StatusDescription);
      } catch (e) {}
    }
    return null;
  }, [rowStatusMap]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [telemetryData, allTrackers] = await Promise.all([
        integrationApi.getMawmTelemetry().catch(() => null),
        integrationApi.getAllTrackers().catch(() => [])
      ]);
      if (telemetryData) setTelemetry(telemetryData);
      if (Array.isArray(allTrackers)) setTrackers(allTrackers);
    } catch (err) {
      console.error('Failed to load MAWM dispatch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 12000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await integrationApi.testMawmConnection();
      setTestResult({
        success: true,
        message: `Connected in ${res.latencyMs}ms. OAuth Bearer token active for user "${res.username || 'kabil'}".`
      });
      await loadData(true);
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  // Query PO Status
  const handleQueryPoStatus = async (overridePoId, overrideFac) => {
    const targetPo = (overridePoId || poSearchId).trim();
    const targetFac = (overrideFac || searchFacility).trim();
    if (!targetPo) return;
    setSearchingPoStatus(true);
    setPoStatusResult(null);
    try {
      const res = await integrationApi.searchPoStatus(targetPo, targetFac, searchUsername);
      setPoStatusResult(res);
      if (res.statusDescription || res.purchaseOrderStatus) {
        const val = res.statusDescription || res.purchaseOrderStatus;
        trackers.forEach(t => {
          if (extractPoId(t) === targetPo) {
            setRowStatusMap(prev => ({ ...prev, [t.jobId]: val }));
          }
        });
      }
    } catch (err) {
      setPoStatusResult({
        success: false,
        statusCode: 500,
        cleanError: err.message || 'Failed to query MAWM PO status API',
        facilityId: targetFac
      });
    } finally {
      setSearchingPoStatus(false);
    }
  };

  // Query PO Lines
  const handleQueryPoLines = async (overridePoId, overrideFac) => {
    const targetPo = (overridePoId || poLinesSearchId).trim();
    const targetFac = (overrideFac || searchFacility).trim();
    if (!targetPo) return;
    setSearchingPoLines(true);
    setPoLinesResult(null);
    try {
      const res = await integrationApi.searchPoLines(targetPo, targetFac, searchUsername);
      setPoLinesResult(res);
    } catch (err) {
      setPoLinesResult({
        success: false,
        statusCode: 500,
        cleanError: err.message || 'Failed to query MAWM PO lines API',
        facilityId: targetFac
      });
    } finally {
      setSearchingPoLines(false);
    }
  };

  // Query PO Associated ASNs
  const handleQueryPoAsnLines = async (overridePoId, overrideFac) => {
    const targetPo = (overridePoId || poAsnSearchId).trim();
    const targetFac = (overrideFac || searchFacility).trim();
    if (!targetPo) return;
    setSearchingPoAsn(true);
    setPoAsnResult(null);
    try {
      const res = await integrationApi.searchPoAsnLines(targetPo, targetFac, searchUsername);
      setPoAsnResult(res);
    } catch (err) {
      setPoAsnResult({
        success: false,
        statusCode: 500,
        cleanError: err.message || 'Failed to query MAWM PO ASN lines API',
        facilityId: targetFac
      });
    } finally {
      setSearchingPoAsn(false);
    }
  };

  // ASN Verification Search
  const handleManualSearchAsn = async (overrideAsn, overrideFac) => {
    const targetAsn = (overrideAsn || searchAsnId).trim();
    const targetFac = (overrideFac || searchFacility).trim();
    if (!targetAsn) return;
    setSearchingAsn(true);
    setAsnSearchResult(null);
    try {
      const res = await integrationApi.searchAsnVerification(targetAsn, targetFac, searchUsername);
      setAsnSearchResult(res);
      if (res.asnStatus) {
        trackers.forEach(t => {
          if (extractAsnId(t) === targetAsn) {
            setRowStatusMap(prev => ({ ...prev, [t.jobId]: res.asnStatus }));
          }
        });
      }
    } catch (err) {
      setAsnSearchResult({
        success: false,
        statusCode: 500,
        cleanError: err.message || 'Failed to query MAWM ASN verification API',
        facilityId: targetFac
      });
    } finally {
      setSearchingAsn(false);
    }
  };

  // Direct Save PO Action
  const handleDirectPoSave = async () => {
    setSavingPoDirect(true);
    setDirectPoResult(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(directPoJson);
      } catch (jsonErr) {
        throw new Error('Invalid JSON format: ' + jsonErr.message);
      }
      const res = await integrationApi.savePoDirect(parsed, searchUsername);
      setDirectPoResult(res);
      await loadData(true);
    } catch (err) {
      setDirectPoResult({
        success: false,
        statusCode: 500,
        cleanError: err.message || 'Direct PO save failed'
      });
    } finally {
      setSavingPoDirect(false);
    }
  };

  // Direct Save ASN Action
  const handleDirectAsnSave = async () => {
    setSavingAsnDirect(true);
    setDirectAsnResult(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(directAsnJson);
      } catch (jsonErr) {
        throw new Error('Invalid JSON format: ' + jsonErr.message);
      }
      const res = await integrationApi.saveAsnDirect(parsed, searchUsername);
      setDirectAsnResult(res);
      await loadData(true);
    } catch (err) {
      setDirectAsnResult({
        success: false,
        statusCode: 500,
        cleanError: err.message || 'Direct ASN save failed'
      });
    } finally {
      setSavingAsnDirect(false);
    }
  };

  // Click an ID from the table to load into the appropriate query tool
  const handleSelectDocForQuery = (job) => {
    const { id, type } = extractDocId(job);
    const fac = extractFacility(job) || 'Food_Cbe';
    if (!id) return;
    setSearchFacility(fac);
    if (type === 'PO') {
      setSelectedDocCategory('PO');
      setActiveConsoleTab('PO_STATUS');
      setPoSearchId(id);
      setPoLinesSearchId(id);
      setPoAsnSearchId(id);
      handleQueryPoStatus(id, fac);
    } else {
      setSelectedDocCategory('ASN');
      setActiveConsoleTab('ASN_STATUS');
      setSearchAsnId(id);
      handleManualSearchAsn(id, fac);
    }
    const consoleEl = document.getElementById('mawm-search-console');
    if (consoleEl) {
      consoleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Row-level verification action
  const handleVerifyRow = async (job, e) => {
    if (e) e.stopPropagation();
    const jobId = job.jobId;
    const { id, type } = extractDocId(job);
    const fac = extractFacility(job) || 'Food_Cbe';
    setVerifyingJobId(jobId);
    try {
      if (type === 'PO') {
        const res = await integrationApi.searchPoStatus(id, fac, searchUsername);
        const actualStatus = res.statusDescription || res.purchaseOrderStatus || (res.success ? 'RECEIVED' : 'ERROR');
        setRowStatusMap(prev => ({ ...prev, [jobId]: actualStatus }));
        setPoSearchId(id);
        setPoStatusResult(res);
        setSelectedDocCategory('PO');
        setActiveConsoleTab('PO_STATUS');
      } else {
        const res = await integrationApi.searchAsnVerification(id, fac, searchUsername);
        const actualStatus = res.asnStatus || res.statusDescription || (res.success ? 'RECEIVED' : 'ERROR');
        setRowStatusMap(prev => ({ ...prev, [jobId]: actualStatus }));
        setSearchAsnId(id);
        setAsnSearchResult(res);
        setSelectedDocCategory('ASN');
        setActiveConsoleTab('ASN_STATUS');
      }
      await loadData(true);
    } catch (err) {
      alert(`Verification query failed for ${id}: ${err.message}`);
    } finally {
      setVerifyingJobId(null);
    }
  };

  // Row-level dispatch action
  const handleDispatchJob = async (jobId, e) => {
    if (e) e.stopPropagation();
    setDispatchingJobId(jobId);
    try {
      const res = await integrationApi.dispatchMawmJob(jobId);
      if (res.success) {
        if (inspectingJob && inspectingJob.jobId === jobId) {
          setInspectingJob((prev) => ({
            ...prev,
            dispatchStatus: res.dispatchStatus || 'DELIVERED (200 OK)',
            mawmResponse: res.mawmResponse || prev.mawmResponse
          }));
        }
        await loadData(true);
      } else {
        alert(res.error || 'Dispatch returned failure status');
      }
    } catch (err) {
      alert('Error triggering dispatch: ' + err.message);
    } finally {
      setDispatchingJobId(null);
    }
  };

  // Inspect modal opener
  const handleInspectJob = async (job) => {
    setInspectingJob(job);
    setInspectPayloadTab('response');
    const { id, type } = extractDocId(job);
    const fac = extractFacility(job) || 'Food_Cbe';
    try {
      const fullTracker = await integrationApi.getTrackerById(job.jobId);
      if (fullTracker) {
        setInspectingJob(prev => ({ ...prev, ...fullTracker }));
      }
    } catch (e) {
      console.warn('Could not load full tracker details:', e);
    }

    if (type === 'PO' && id && !id.startsWith('PO-RECORD')) {
      integrationApi.searchPoLines(id, fac, searchUsername)
        .then(linesRes => setInspectingDetails(prev => ({ ...prev, lines: linesRes })))
        .catch(() => {});
      integrationApi.searchPoAsnLines(id, fac, searchUsername)
        .then(asnRes => setInspectingDetails(prev => ({ ...prev, asns: asnRes })))
        .catch(() => {});
    }
  };

  // Filtered trackers by ERP Source selector, DocType, and Query
  const filteredTrackers = useMemo(() => {
    return trackers.filter((r) => {
      const isAsn = isAsnRecord(r);
      const isPo = isPoRecord(r);

      // 1. DocType filter (Strictly Purchase Orders or ASN Deliveries)
      if (selectedDocTypeFilter === 'PO') {
        if (!isPo) return false;
      } else if (selectedDocTypeFilter === 'ASN') {
        if (!isAsn) return false;
      } else {
        if (!isPo && !isAsn) return false;
      }

      // 2. ERP Source Filter (Dropdown selection: OPTI, SAP, HM, OTHER)
      const src = (r.sourceSystem || '').toUpperCase();
      if (selectedErp === 'OPTI') {
        if (!src.includes('OPTI') && !src.includes('OTPI') && !src.includes('OPI')) return false;
      } else if (selectedErp === 'SAP') {
        if (!src.includes('SAP')) return false;
      } else if (selectedErp === 'HM') {
        if (!src.includes('HM') && !src.includes('H&M')) return false;
      } else if (selectedErp === 'OTHER') {
        if (src.includes('OPTI') || src.includes('OTPI') || src.includes('OPI') || src.includes('SAP') || src.includes('HM')) return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const { id } = extractDocId(r);
        const jId = (r.jobId || '').toLowerCase();
        const fac = (extractFacility(r) || '').toLowerCase();
        const s = (r.sourceSystem || '').toLowerCase();
        const fn = (r.originalFilename || '').toLowerCase();
        if (!id.toLowerCase().includes(q) && !jId.includes(q) && !fac.includes(q) && !s.includes(q) && !fn.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [trackers, selectedErp, selectedDocTypeFilter, searchQuery, isAsnRecord, isPoRecord, extractDocId, extractFacility]);

  // Aggregate stats across all filtered records
  const stats = useMemo(() => {
    let delivered = 0;
    let verified = 0;
    filteredTrackers.forEach((r) => {
      const s = (r.dispatchStatus || '').toUpperCase();
      const v = String(extractLiveStatus(r) || '').toUpperCase();
      if (s.includes('DELIVERED') || s.includes('200')) delivered++;
      if (v && v !== 'UNKNOWN' && v !== 'NOT_FOUND') verified++;
    });
    return { delivered, verified, total: filteredTrackers.length };
  }, [filteredTrackers, extractLiveStatus]);

  // Pagination slice
  const totalPages = Math.ceil(filteredTrackers.length / pageSize) || 1;
  const paginatedTrackers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrackers.slice(start, start + pageSize);
  }, [filteredTrackers, currentPage, pageSize]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const toggleRawJson = (key) => {
    setShowRawJsonMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="page-container" style={{ padding: '1.25rem 1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <Radio size={22} className="pulse-icon" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                MAWM Dispatch & Verification Hub
              </h1>
              <span className="badge" style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                LIVE CLOUD
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 0.85rem', fontSize: '0.8rem' }}
          >
            <ShieldCheck size={14} color="#10b981" />
            <span>{testingConnection ? 'Testing...' : 'Test OAuth Connection'}</span>
          </button>

          <button
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 0.85rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          {onNavigateToJobs && (
            <button
              onClick={onNavigateToJobs}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 0.9rem', fontSize: '0.8rem' }}
              title="Open the central File Tracker & API Audit engine"
            >
              <span>File Tracker & Jobs</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Connection Result Banner */}
      {testResult && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.65rem 1rem',
          borderRadius: '6px',
          backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
          color: testResult.success ? '#10b981' : '#ef4444',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* 2. Top Metric KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>WMS CLOUD INTEGRATION</span>
            <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              ONLINE
            </span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Active & Connected
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>FACILITY</span>
            <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700, backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              ROUTING
            </span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {telemetry?.defaultFacility || 'Food_Cbe'}
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERIFIED DELIVERIES</span>
            <CheckCheck size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.2 }}>
            {stats.verified}
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL DELIVERED</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
            {stats.delivered}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. Proper Document Console: Clean Category Selection (PO vs ASN)
         ========================================================================= */}
      <div id="mawm-search-console" className="card" style={{ padding: '1.25rem 1.5rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', backgroundColor: 'rgba(15, 23, 42, 0.65)', marginBottom: '1.25rem' }}>
        
        {/* Top-Level Document Category Selector: Purchase Order vs ASN */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setSelectedDocCategory('PO');
                setActiveConsoleTab('PO_STATUS');
                setSelectedDocTypeFilter('PO');
                setCurrentPage(1);
              }}
              className={`filter-pill ${selectedDocCategory === 'PO' ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '0.4rem 0.95rem',
                borderRadius: '6px'
              }}
            >
              <FileText size={15} />
              <span>Purchase Order (PO)</span>
            </button>

            <button
              onClick={() => {
                setSelectedDocCategory('ASN');
                setActiveConsoleTab('ASN_STATUS');
                setSelectedDocTypeFilter('ASN');
                setCurrentPage(1);
              }}
              className={`filter-pill ${selectedDocCategory === 'ASN' ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '0.4rem 0.95rem',
                borderRadius: '6px'
              }}
            >
              <Truck size={15} />
              <span>Advanced Shipping Notice (ASN)</span>
            </button>
          </div>
        </div>

        {/* Sub-tools for Selected Category (Clean Names, Zero Section Numbers) */}
        {selectedDocCategory === 'PO' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.15rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveConsoleTab('PO_STATUS')}
              className={`filter-pill ${activeConsoleTab === 'PO_STATUS' ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <FileText size={14} />
              <span>PO Status</span>
            </button>

            <button
              onClick={() => setActiveConsoleTab('PO_LINES')}
              className={`filter-pill ${activeConsoleTab === 'PO_LINES' ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <ListOrdered size={14} />
              <span>PO Lines</span>
            </button>

            <button
              onClick={() => setActiveConsoleTab('PO_ASN')}
              className={`filter-pill ${activeConsoleTab === 'PO_ASN' ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <Layers size={14} />
              <span>Associated ASNs</span>
            </button>

            <button
              onClick={() => setActiveConsoleTab('PO_SAVE')}
              className={`filter-pill ${activeConsoleTab === 'PO_SAVE' ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <Send size={14} />
              <span>Save PO</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.15rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveConsoleTab('ASN_STATUS')}
              className={`filter-pill ${activeConsoleTab === 'ASN_STATUS' ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <Truck size={14} />
              <span>ASN Verification</span>
            </button>

            <button
              onClick={() => setActiveConsoleTab('ASN_SAVE')}
              className={`filter-pill ${activeConsoleTab === 'ASN_SAVE' ? 'active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <Send size={14} />
              <span>Save ASN</span>
            </button>
          </div>
        )}

        {/* --- PO: Query PO Status --- */}
        {selectedDocCategory === 'PO' && activeConsoleTab === 'PO_STATUS' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PurchaseOrderId:
                </label>
                <input
                  type="text"
                  value={poSearchId}
                  onChange={(e) => setPoSearchId(e.target.value)}
                  placeholder="e.g. PO-2026-0001"
                  className="input-field"
                  style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)' }}
                />
              </div>

              <div>
                <button
                  onClick={() => handleQueryPoStatus()}
                  disabled={searchingPoStatus || !poSearchId.trim()}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.48rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', backgroundColor: '#0284c7' }}
                >
                  <Search size={14} className={searchingPoStatus ? 'spin-icon' : ''} />
                  <span>{searchingPoStatus ? 'Querying MAWM...' : 'Check PO Status'}</span>
                </button>
              </div>
            </div>

            {/* Result Box */}
            {poStatusResult && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1.15rem', borderRadius: '8px', backgroundColor: poStatusResult.success ? 'rgba(56, 189, 248, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${poStatusResult.success ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.35)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ backgroundColor: poStatusResult.success ? 'rgba(56, 189, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: poStatusResult.success ? '#38bdf8' : '#ef4444', fontSize: '0.74rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: '4px' }}>
                      {poStatusResult.success ? `STATUS: ${poStatusResult.purchaseOrderStatus || poStatusResult.statusDescription || 'OK'}` : `HTTP ${poStatusResult.statusCode || 500} ERROR`}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      PO: <strong>{poStatusResult.purchaseOrderId || poSearchId}</strong>
                    </span>
                  </div>
                  <button onClick={() => toggleRawJson('poStatus')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    {showRawJsonMap['poStatus'] ? 'Hide Technical Response' : 'View Full JSON Response'}
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: poStatusResult.success ? '#38bdf8' : '#f87171', fontWeight: 600 }}>
                  {poStatusResult.success ? `Live Response Fact: ${poStatusResult.statusDescription || poStatusResult.purchaseOrderStatus}` : (poStatusResult.cleanError || poStatusResult.error)}
                </div>

                {showRawJsonMap['poStatus'] && poStatusResult.rawResponse && (
                  <pre style={{ marginTop: '0.5rem', padding: '0.65rem', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '4px', maxHeight: '160px', overflow: 'auto', fontSize: '0.72rem', color: '#34d399', whiteSpace: 'pre-wrap' }}>
                    {formatPayload(poStatusResult.rawResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- PO: Query PO Lines --- */}
        {selectedDocCategory === 'PO' && activeConsoleTab === 'PO_LINES' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PurchaseOrderId:
                </label>
                <input
                  type="text"
                  value={poLinesSearchId}
                  onChange={(e) => setPoLinesSearchId(e.target.value)}
                  placeholder="e.g. PO-2026-0001"
                  className="input-field"
                  style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)' }}
                />
              </div>

              <div>
                <button
                  onClick={() => handleQueryPoLines()}
                  disabled={searchingPoLines || !poLinesSearchId.trim()}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.48rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', backgroundColor: '#0284c7' }}
                >
                  <Search size={14} className={searchingPoLines ? 'spin-icon' : ''} />
                  <span>{searchingPoLines ? 'Querying Lines...' : 'Query PO Lines'}</span>
                </button>
              </div>
            </div>

            {/* PO Lines Result Table */}
            {poLinesResult && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1.15rem', borderRadius: '8px', backgroundColor: poLinesResult.success ? 'rgba(56, 189, 248, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${poLinesResult.success ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.35)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8' }}>
                    Purchase Order Lines ({poLinesResult.lines ? poLinesResult.lines.length : 0})
                  </span>
                  <button onClick={() => toggleRawJson('poLines')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    {showRawJsonMap['poLines'] ? 'Hide Technical Response' : 'View Full JSON Response'}
                  </button>
                </div>

                {Array.isArray(poLinesResult.lines) && poLinesResult.lines.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Line ID</th>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Shipped Qty</th>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Received Qty</th>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Line Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poLinesResult.lines.map((line, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
                              {line.PurchaseOrderLineId || line.purchaseOrderLineId || idx + 1}
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem', color: '#38bdf8' }}>
                              {line.ShippedQuantity ?? line.shippedQuantity ?? 0}
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem', color: '#10b981' }}>
                              {line.ReceivedQuantity ?? line.receivedQuantity ?? 0}
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem' }}>
                              <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                {line.PoLineStatus || line.poLineStatus || 'Open'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {poLinesResult.cleanError || 'No line items returned for this Purchase Order'}
                  </div>
                )}

                {showRawJsonMap['poLines'] && poLinesResult.rawResponse && (
                  <pre style={{ marginTop: '0.5rem', padding: '0.65rem', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '4px', maxHeight: '160px', overflow: 'auto', fontSize: '0.72rem', color: '#34d399', whiteSpace: 'pre-wrap' }}>
                    {formatPayload(poLinesResult.rawResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- PO: Query Associated ASNs --- */}
        {selectedDocCategory === 'PO' && activeConsoleTab === 'PO_ASN' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PurchaseOrderId:
                </label>
                <input
                  type="text"
                  value={poAsnSearchId}
                  onChange={(e) => setPoAsnSearchId(e.target.value)}
                  placeholder="e.g. PO-2026-0001"
                  className="input-field"
                  style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)' }}
                />
              </div>

              <div>
                <button
                  onClick={() => handleQueryPoAsnLines()}
                  disabled={searchingPoAsn || !poAsnSearchId.trim()}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.48rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', backgroundColor: '#0284c7' }}
                >
                  <Search size={14} className={searchingPoAsn ? 'spin-icon' : ''} />
                  <span>{searchingPoAsn ? 'Querying ASNs...' : 'Query Associated ASNs'}</span>
                </button>
              </div>
            </div>

            {/* PO Associated ASNs Table */}
            {poAsnResult && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1.15rem', borderRadius: '8px', backgroundColor: poAsnResult.success ? 'rgba(56, 189, 248, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${poAsnResult.success ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.35)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8' }}>
                    Associated ASNs ({poAsnResult.asnLines ? poAsnResult.asnLines.length : 0})
                  </span>
                  <button onClick={() => toggleRawJson('poAsn')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    {showRawJsonMap['poAsn'] ? 'Hide Technical Response' : 'View Full JSON Response'}
                  </button>
                </div>

                {Array.isArray(poAsnResult.asnLines) && poAsnResult.asnLines.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', textAlign: 'left' }}>
                          <th style={{ padding: '0.35rem 0.5rem' }}>AsnId</th>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Item ID</th>
                          <th style={{ padding: '0.35rem 0.5rem' }}>Shipped Qty</th>
                          <th style={{ padding: '0.35rem 0.5rem' }}>PO Line ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poAsnResult.asnLines.map((line, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, color: '#10b981' }}>
                              {line.AsnId || line.asnId || '—'}
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem' }}>
                              {line.ItemId || line.itemId || '—'}
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem', color: '#38bdf8' }}>
                              {line.ShippedQuantity ?? line.shippedQuantity ?? 0}
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'var(--font-mono, monospace)' }}>
                              {line.PurchaseOrderLineId || line.purchaseOrderLineId || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {poAsnResult.cleanError || 'No ASN deliveries associated with this PO yet'}
                  </div>
                )}

                {showRawJsonMap['poAsn'] && poAsnResult.rawResponse && (
                  <pre style={{ marginTop: '0.5rem', padding: '0.65rem', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '4px', maxHeight: '160px', overflow: 'auto', fontSize: '0.72rem', color: '#34d399', whiteSpace: 'pre-wrap' }}>
                    {formatPayload(poAsnResult.rawResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- PO: Direct Save PO --- */}
        {selectedDocCategory === 'PO' && activeConsoleTab === 'PO_SAVE' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Purchase Order Payload:
              </span>
              <button
                type="button"
                onClick={() => setDirectPoJson(JSON.stringify(DEFAULT_PO_SAMPLE, null, 2))}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Reset Specification Default
              </button>
            </div>

            <textarea
              rows={8}
              value={directPoJson}
              onChange={(e) => setDirectPoJson(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.78rem', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.6rem' }}>
              <button
                onClick={handleDirectPoSave}
                disabled={savingPoDirect}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1.1rem', fontSize: '0.82rem', backgroundColor: '#059669', borderColor: '#059669' }}
              >
                <Send size={14} className={savingPoDirect ? 'spin-icon' : ''} />
                <span>{savingPoDirect ? 'Saving PO to MAWM...' : 'Dispatch / Save PO to MAWM (200 OK)'}</span>
              </button>
            </div>

            {directPoResult && (
              <div style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: directPoResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${directPoResult.success ? '#10b981' : '#ef4444'}` }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: directPoResult.success ? '#10b981' : '#ef4444' }}>
                  {directPoResult.success ? (directPoResult.message || '200 OK - Purchase Order Saved Successfully') : (directPoResult.cleanError || directPoResult.error)}
                </div>
                {directPoResult.rawResponse && (
                  <pre style={{ marginTop: '0.4rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '4px', maxHeight: '140px', overflow: 'auto', fontSize: '0.72rem', color: '#34d399', whiteSpace: 'pre-wrap' }}>
                    {formatPayload(directPoResult.rawResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- ASN: ASN Verification Search --- */}
        {selectedDocCategory === 'ASN' && activeConsoleTab === 'ASN_STATUS' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  AsnId to Search:
                </label>
                <input
                  type="text"
                  value={searchAsnId}
                  onChange={(e) => setSearchAsnId(e.target.value)}
                  placeholder="Enter AsnId to query (e.g. ASN-2026-0001)..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono, monospace)' }}
                />
              </div>

              <div>
                <button
                  onClick={() => handleManualSearchAsn()}
                  disabled={searchingAsn || !searchAsnId.trim()}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.48rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', backgroundColor: '#0284c7' }}
                >
                  <Search size={14} className={searchingAsn ? 'spin-icon' : ''} />
                  <span>{searchingAsn ? 'Querying MAWM...' : 'Check ASN Status'}</span>
                </button>
              </div>
            </div>

            {/* ASN Search Output Box */}
            {asnSearchResult && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1.15rem', borderRadius: '8px', backgroundColor: asnSearchResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${asnSearchResult.success ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ backgroundColor: asnSearchResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: asnSearchResult.success ? '#10b981' : '#ef4444', fontSize: '0.74rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: '4px' }}>
                      {asnSearchResult.success ? `STATUS: ${asnSearchResult.asnStatus || asnSearchResult.statusDescription || 'OK'}` : `HTTP ${asnSearchResult.statusCode || 500} ERROR`}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      AsnId: <strong>{asnSearchResult.asnId || searchAsnId}</strong>
                    </span>
                  </div>
                  <button onClick={() => toggleRawJson('asnSearch')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    {showRawJsonMap['asnSearch'] ? 'Hide Technical Response' : 'View Full JSON Response'}
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: asnSearchResult.success ? '#10b981' : '#f87171', fontWeight: 600 }}>
                  {asnSearchResult.success ? `Live Response Fact: ${asnSearchResult.statusDescription || asnSearchResult.asnStatus}` : (asnSearchResult.cleanError || asnSearchResult.error)}
                </div>

                {showRawJsonMap['asnSearch'] && asnSearchResult.rawResponse && (
                  <pre style={{ marginTop: '0.5rem', padding: '0.65rem', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '4px', maxHeight: '160px', overflow: 'auto', fontSize: '0.72rem', color: '#34d399', whiteSpace: 'pre-wrap' }}>
                    {formatPayload(asnSearchResult.rawResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- ASN: Direct Save ASN --- */}
        {selectedDocCategory === 'ASN' && activeConsoleTab === 'ASN_SAVE' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                ASN Payload:
              </span>
              <button
                type="button"
                onClick={() => setDirectAsnJson(JSON.stringify(DEFAULT_ASN_SAMPLE, null, 2))}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Reset Specification Default
              </button>
            </div>

            <textarea
              rows={8}
              value={directAsnJson}
              onChange={(e) => setDirectAsnJson(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.78rem', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.6rem' }}>
              <button
                onClick={handleDirectAsnSave}
                disabled={savingAsnDirect}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1.1rem', fontSize: '0.82rem', backgroundColor: '#059669', borderColor: '#059669' }}
              >
                <Send size={14} className={savingAsnDirect ? 'spin-icon' : ''} />
                <span>{savingAsnDirect ? 'Saving ASN to MAWM...' : 'Dispatch / Save ASN to MAWM (200 OK)'}</span>
              </button>
            </div>

            {directAsnResult && (
              <div style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: directAsnResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${directAsnResult.success ? '#10b981' : '#ef4444'}` }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: directAsnResult.success ? '#10b981' : '#ef4444' }}>
                  {directAsnResult.success ? (directAsnResult.message || '200 OK - ASN Saved Successfully') : (directAsnResult.cleanError || directAsnResult.error)}
                </div>
                {directAsnResult.rawResponse && (
                  <pre style={{ marginTop: '0.4rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '4px', maxHeight: '140px', overflow: 'auto', fontSize: '0.72rem', color: '#34d399', whiteSpace: 'pre-wrap' }}>
                    {formatPayload(directAsnResult.rawResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          4. MAWM Dispatch Details Table (With ERP Selector & Document Type Filter)
         ========================================================================= */}
      <div className="card" style={{ padding: '1.25rem', borderRadius: '10px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem',
          marginBottom: '1rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid var(--border-default)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              MAWM Dispatch Details
            </h2>
            <span className="badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>
              {filteredTrackers.length} Records
            </span>

            {/* Doc Type Selector */}
            <div style={{ display: 'flex', gap: '0.3rem', marginLeft: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setSelectedDocTypeFilter('PO'); setSelectedDocCategory('PO'); setCurrentPage(1); }}
                className={`filter-pill ${selectedDocTypeFilter === 'PO' ? 'active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
              >
                Purchase Orders (PO)
              </button>
              <button
                type="button"
                onClick={() => { setSelectedDocTypeFilter('ASN'); setSelectedDocCategory('ASN'); setCurrentPage(1); }}
                className={`filter-pill ${selectedDocTypeFilter === 'ASN' ? 'active' : ''}`}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
              >
                ASN Deliveries
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* ERP Source Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <label htmlFor="erp-source-select" style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Filter size={13} color="#10b981" />
                <span>ERP Source:</span>
              </label>
              <select
                id="erp-source-select"
                value={selectedErp}
                onChange={(e) => {
                  setSelectedErp(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  color: selectedErp === 'OPTI' ? '#10b981' : '#38bdf8',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '135px'
                }}
              >
                <option value="OPTI" style={{ backgroundColor: '#0f172a', color: '#10b981', fontWeight: 600 }}>Opti ERP</option>
                <option value="SAP" style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>SAP ERP</option>
                <option value="HM" style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>H&M</option>
                <option value="OTHER" style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>Other ERP</option>
              </select>
            </div>

            {/* Quick Search */}
            <div style={{ minWidth: '200px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter by PO, ASN, Facility..."
                className="input-field"
                style={{
                  width: '100%',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.76rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
            <div>Loading MAWM dispatch records...</div>
          </div>
        ) : filteredTrackers.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              No dispatch records found for {selectedErp} ERP ({selectedDocTypeFilter === 'PO' ? 'Purchase Orders' : 'ASN Deliveries'})
            </div>
            <div style={{ fontSize: '0.78rem' }}>
              Select "Opti ERP" to view active dispatch logs, or send a new PO/ASN payload via Files API.
            </div>
            {selectedErp !== 'OPTI' && (
              <button
                onClick={() => setSelectedErp('OPTI')}
                className="btn-secondary"
                style={{ marginTop: '0.85rem', fontSize: '0.76rem', padding: '0.3rem 0.75rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              >
                Switch to Opti ERP
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Document ID</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Source ERP</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Destination Facility</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Save Status</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Live Status</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Dispatched Time</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrackers.map((job) => {
                  const { id: docId, type: docType } = extractDocId(job);
                  const facility = extractFacility(job);
                  const liveStatus = extractLiveStatus(job);
                  const isDelivered = (job.dispatchStatus || '').toUpperCase().includes('DELIVERED') || (job.dispatchStatus || '').includes('200');
                  const isFailed = (job.dispatchStatus || '').toUpperCase().includes('FAILED');

                  return (
                    <tr
                      key={job.jobId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="table-row-hover"
                    >
                      {/* Document ID */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectDocForQuery(job)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 600,
                            color: docType === 'PO' ? '#38bdf8' : '#34d399',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '0.78rem'
                          }}
                          title={`Click to load ${docType} into Query Console`}
                        >
                          {docId}
                        </button>
                      </td>

                      {/* Document Type Badge */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: docType === 'PO' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: docType === 'PO' ? '#38bdf8' : '#10b981',
                          border: `1px solid ${docType === 'PO' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                          {docType}
                        </span>
                      </td>

                      {/* Source ERP */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--text-primary)'
                        }}>
                          {job.sourceSystem || 'OPTI'}
                        </span>
                      </td>

                      {/* Destination Facility */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.25)'
                        }}>
                          {facility}
                        </span>
                      </td>

                      {/* Save Status */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        {isDelivered ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            <CheckCircle2 size={12} />
                            <span>DELIVERED (200 OK)</span>
                          </span>
                        ) : isFailed ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}>
                            <AlertTriangle size={12} />
                            <span>DISPATCH_FAILED</span>
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px'
                          }}>
                            {job.dispatchStatus || 'CONVERTED'}
                          </span>
                        )}
                      </td>

                      {/* Live Status */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        {liveStatus ? (
                          <button
                            type="button"
                            onClick={(e) => handleVerifyRow(job, e)}
                            disabled={verifyingJobId === job.jobId}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              cursor: 'pointer'
                            }}
                            title="Live status returned from MAWM API. Click to re-check."
                          >
                            <Clock size={12} />
                            <span>STATUS: {liveStatus}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleVerifyRow(job, e)}
                            disabled={verifyingJobId === job.jobId}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.08)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              cursor: 'pointer'
                            }}
                          >
                            <Search size={11} className={verifyingJobId === job.jobId ? 'spin-icon' : ''} />
                            <span>{verifyingJobId === job.jobId ? 'Checking...' : 'Check Status'}</span>
                          </button>
                        )}
                      </td>

                      {/* Dispatched Time */}
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        {job.dispatchCompletedAt
                          ? new Date(job.dispatchCompletedAt).toLocaleTimeString()
                          : (job.receivedAt ? new Date(job.receivedAt).toLocaleTimeString() : '—')}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleInspectJob(job)}
                            className="btn-secondary"
                            style={{
                              padding: '0.22rem 0.55rem',
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            title="Inspect full payload and cloud responses"
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDispatchJob(job.jobId, e)}
                            disabled={dispatchingJobId === job.jobId}
                            className="btn-primary"
                            style={{
                              padding: '0.22rem 0.55rem',
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              backgroundColor: isDelivered ? '#059669' : '#0284c7',
                              borderColor: isDelivered ? '#059669' : '#0284c7'
                            }}
                            title="Redeliver / dispatch directly to MAWM Cloud"
                          >
                            <Send size={12} className={dispatchingJobId === job.jobId ? 'spin-icon' : ''} />
                            <span>{dispatchingJobId === job.jobId ? 'Sending...' : (isDelivered ? 'Redeliver' : 'Dispatch')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.85rem',
                marginTop: '0.85rem',
                borderTop: '1px solid var(--border-default)',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTrackers.length)} of {filteredTrackers.length} records
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0.35rem' }}>
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          5. Inspection Modal with PO & ASN Multi-Tab Analysis
         ========================================================================= */}
      {inspectingJob && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Inspect MAWM Payload & Verification: {extractDocId(inspectingJob).id}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Document Type: <strong>{extractDocId(inspectingJob).type}</strong> | Facility: <strong>{extractFacility(inspectingJob)}</strong> | Source: <strong>{inspectingJob.sourceSystem || 'OPTI'}</strong>
                </div>
              </div>
              <button
                onClick={() => setInspectingJob(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem 1.25rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setInspectPayloadTab('response')}
                  className={`filter-pill ${inspectPayloadTab === 'response' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                >
                  Save Response
                </button>
                <button
                  onClick={() => setInspectPayloadTab('status')}
                  className={`filter-pill ${inspectPayloadTab === 'status' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                >
                  Live Status
                </button>
                {isPoRecord(inspectingJob) && (
                  <>
                    <button
                      onClick={() => setInspectPayloadTab('lines')}
                      className={`filter-pill ${inspectPayloadTab === 'lines' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                    >
                      PO Lines
                    </button>
                    <button
                      onClick={() => setInspectPayloadTab('asns')}
                      className={`filter-pill ${inspectPayloadTab === 'asns' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                    >
                      Associated ASNs
                    </button>
                  </>
                )}
                <button
                  onClick={() => setInspectPayloadTab('raw')}
                  className={`filter-pill ${inspectPayloadTab === 'raw' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                >
                  Raw Payload
                </button>
              </div>

              <pre style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '0.85rem',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.76rem',
                color: inspectPayloadTab === 'response' ? '#34d399' : '#38bdf8',
                maxHeight: '380px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>
                {inspectPayloadTab === 'response'
                  ? formatPayload(inspectingJob.mawmResponse || 'No direct response captured yet')
                  : inspectPayloadTab === 'status'
                    ? formatPayload({
                        documentId: extractDocId(inspectingJob).id,
                        documentType: extractDocId(inspectingJob).type,
                        facility: extractFacility(inspectingJob),
                        liveStatus: extractLiveStatus(inspectingJob) || 'Not queried yet'
                      })
                    : inspectPayloadTab === 'lines'
                      ? formatPayload(inspectingDetails.lines || 'Loading or no lines returned')
                      : inspectPayloadTab === 'asns'
                        ? formatPayload(inspectingDetails.asns || 'Loading or no associated ASNs')
                        : formatPayload(inspectingJob.rawContent || inspectingJob.outputFiles || 'No raw payload available')}
              </pre>
            </div>

            <div style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={() => {
                  handleSelectDocForQuery(inspectingJob);
                  setInspectingJob(null);
                }}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
              >
                Load into Query Console
              </button>

              <button
                onClick={() => setInspectingJob(null)}
                className="btn-secondary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
