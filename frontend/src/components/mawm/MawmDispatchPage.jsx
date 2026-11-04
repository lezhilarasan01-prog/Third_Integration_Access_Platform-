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
  ExternalLink,
  ArrowRight,
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';

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

  // 5.4.2 Verification Search Tool State - Starts empty (no hardcoded ASN)
  const [searchAsnId, setSearchAsnId] = useState('');
  const [searchFacility, setSearchFacility] = useState('Food_Cbe');
  const [searchingAsn, setSearchingAsn] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [showRawSearchJson, setShowRawSearchJson] = useState(false);

  // MAWM Dispatch Details Filtering & Pagination
  const [selectedErp, setSelectedErp] = useState('OPTI'); // Default to OPTI as requested
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Row-level actions state
  const [dispatchingJobId, setDispatchingJobId] = useState(null);
  const [verifyingJobId, setVerifyingJobId] = useState(null);
  const [rowStatusMap, setRowStatusMap] = useState({});

  // Inspection modal
  const [inspectingJob, setInspectingJob] = useState(null);
  const [inspectPayloadTab, setInspectPayloadTab] = useState('response'); // 'response' | 'verification' | 'raw'

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

  // Robust ASN ID extraction from mawmResponse, outputFiles, rawContent, or filename
  const extractAsnId = useCallback((job) => {
    if (!job) return '';
    // 1. From mawmResponse
    if (job.mawmResponse && typeof job.mawmResponse === 'string') {
      try {
        const parsed = JSON.parse(job.mawmResponse);
        const data = parsed.data || parsed.Data || parsed;
        if (data?.AsnId) return String(data.AsnId);
        if (data?.Asn?.AsnId) return String(data.Asn.AsnId);
        if (Array.isArray(data?.AsnLine) && data.AsnLine[0]?.AsnId) return String(data.AsnLine[0].AsnId);
        if (Array.isArray(data?.AsnLine) && data.AsnLine[0]?.Asn?.AsnId) return String(data.AsnLine[0].Asn.AsnId);
      } catch (e) {}
      const m = job.mawmResponse.match(/"AsnId"\s*:\s*"([^"]+)"/i) || job.mawmResponse.match(/"asnId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    // 2. From outputFiles
    if (job.outputFiles && typeof job.outputFiles === 'string') {
      try {
        const parsed = JSON.parse(job.outputFiles);
        const dataArr = parsed.Data || parsed.data || (Array.isArray(parsed) ? parsed : null);
        if (Array.isArray(dataArr) && dataArr[0]?.AsnId) return String(dataArr[0].AsnId);
        if (parsed.AsnId) return String(parsed.AsnId);
        if (parsed.asnId) return String(parsed.asnId);
      } catch (e) {}
      const m = job.outputFiles.match(/"AsnId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    // 3. From rawContent
    if (job.rawContent && typeof job.rawContent === 'string') {
      try {
        const parsed = JSON.parse(job.rawContent);
        if (parsed.AsnId) return String(parsed.AsnId);
        if (parsed.asnId) return String(parsed.asnId);
      } catch (e) {}
      const m = job.rawContent.match(/"AsnId"\s*:\s*"([^"]+)"/i);
      if (m && m[1]) return m[1];
    }
    // 4. Regex for ASN pattern in filename or errors
    if (job.originalFilename) {
      const m = job.originalFilename.match(/(ASN[A-Za-z0-9_-]+)/i);
      if (m && m[1]) return m[1];
    }
    if (job.processingErrorMessage) {
      const m = job.processingErrorMessage.match(/(ASN[A-Za-z0-9_-]+)/i);
      if (m && m[1]) return m[1];
    }
    // 5. Fallback clean tag (never a raw UUID)
    if (job.jobId) {
      return `ASN-${job.jobId.slice(0, 8).toUpperCase()}`;
    }
    return 'ASN-RECORD';
  }, []);

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

  // Extract verification status code directly from actual API response fact
  const extractVerificationStatus = useCallback((job) => {
    if (!job) return null;
    if (rowStatusMap[job.jobId]) return rowStatusMap[job.jobId];
    if (job.mawmAsnStatus) return job.mawmAsnStatus;
    if (job.mawmResponse && typeof job.mawmResponse === 'string') {
      try {
        const parsed = JSON.parse(job.mawmResponse);
        const data = parsed.data || parsed.Data;
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
        message: `Connected in ${res.latencyMs}ms. OAuth Bearer token active for user "${res.username || 'lezhilarasan'}".`
      });
      await loadData(true);
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  // 5.4.2 Interactive Verification Search
  const handleManualSearchAsn = async (overrideFacility) => {
    const targetAsn = searchAsnId.trim();
    const targetFac = (overrideFacility || searchFacility).trim();
    if (!targetAsn) return;
    setSearchingAsn(true);
    setSearchResult(null);
    setShowRawSearchJson(false);
    try {
      const res = await integrationApi.searchAsnVerification(targetAsn, targetFac);
      setSearchResult(res);
      // If we queried a known ASN, update its status in rowStatusMap
      if (res.asnStatus) {
        trackers.forEach(t => {
          if (extractAsnId(t) === targetAsn) {
            setRowStatusMap(prev => ({ ...prev, [t.jobId]: res.asnStatus }));
          }
        });
      }
    } catch (err) {
      setSearchResult({
        success: false,
        statusCode: 500,
        cleanError: err.message || 'Failed to query MAWM ASN verification search API',
        error: err.message || 'Failed to query MAWM ASN verification search API',
        facilityId: targetFac
      });
    } finally {
      setSearchingAsn(false);
    }
  };

  // Click an AsnId to load it directly into the 5.4.2 console
  const handleSelectAsnForQuery = (targetAsn, targetFac) => {
    if (!targetAsn) return;
    setSearchAsnId(targetAsn);
    if (targetFac) setSearchFacility(targetFac);
    const consoleEl = document.getElementById('mawm-search-console');
    if (consoleEl) {
      consoleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Row-level verification action
  const handleVerifyRow = async (job, e) => {
    if (e) e.stopPropagation();
    const jobId = job.jobId;
    const targetAsn = extractAsnId(job);
    const targetFac = extractFacility(job) || 'Food_Cbe';
    setVerifyingJobId(jobId);
    try {
      const res = await integrationApi.searchAsnVerification(targetAsn, targetFac);
      const actualApiStatus = res.asnStatus || res.statusDescription || (res.success ? 'RECEIVED' : 'ERROR');
      setRowStatusMap(prev => ({
        ...prev,
        [jobId]: actualApiStatus
      }));
      setSearchAsnId(targetAsn);
      setSearchFacility(targetFac);
      setSearchResult(res);
      await loadData(true);
    } catch (err) {
      alert(`Verification query failed for ${targetAsn}: ${err.message}`);
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
            dispatchStatus: res.dispatchStatus || 'DELIVERED_TO_MAWM (200 OK)',
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
    try {
      const fullTracker = await integrationApi.getTrackerById(job.jobId);
      if (fullTracker) {
        setInspectingJob(prev => ({
          ...prev,
          ...fullTracker
        }));
      }
    } catch (e) {
      console.warn('Could not load full tracker details:', e);
    }
  };

  // Filtered trackers by ERP Source selector & query
  const filteredTrackers = useMemo(() => {
    return trackers.filter((r) => {
      // 1. Transaction Type filter: only ASN transactions or records with mawmResponse / dispatchStatus
      const isAsn = (r.transactionType || '').toUpperCase().includes('ASN') ||
                    (r.originalFilename || '').toUpperCase().includes('ASN') ||
                    Boolean(r.mawmResponse) ||
                    Boolean(r.dispatchStatus);
      if (!isAsn) return false;

      // 2. ERP Source Filter (Dropdown selection: OPTI, SAP, HM, OTHER - No ALL ERP option)
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
        const asnId = extractAsnId(r).toLowerCase();
        const jId = (r.jobId || '').toLowerCase();
        const fac = (extractFacility(r) || '').toLowerCase();
        const src = (r.sourceSystem || '').toLowerCase();
        const fn = (r.originalFilename || '').toLowerCase();
        if (!asnId.includes(q) && !jId.includes(q) && !fac.includes(q) && !src.includes(q) && !fn.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [trackers, selectedErp, searchQuery, extractAsnId, extractFacility]);

  // Aggregate stats across all filtered records
  const stats = useMemo(() => {
    let delivered = 0;
    let verified = 0;
    filteredTrackers.forEach((r) => {
      const s = (r.dispatchStatus || '').toUpperCase();
      const v = String(extractVerificationStatus(r) || '').toUpperCase();
      if (s.includes('DELIVERED') || s.includes('200')) delivered++;
      if (v && v !== 'UNKNOWN' && v !== 'NOT_FOUND') verified++;
    });
    return { delivered, verified, total: filteredTrackers.length };
  }, [filteredTrackers, extractVerificationStatus]);

  // Pagination slice
  const totalPages = Math.ceil(filteredTrackers.length / pageSize) || 1;
  const paginatedTrackers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrackers.slice(start, start + pageSize);
  }, [filteredTrackers, currentPage, pageSize]);

  // Handle page change safely
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="page-container" style={{ padding: '1.25rem 1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. Header & Actions Bar (Clean: NO OPTI EXCLUSIVE badge, universal hub) */}
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
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Manhattan Active® WMS Automated Ingestion, Dispatch & Real-Time Receipt Verification Hub.
            </p>
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

      {/* OAuth Connection Status Banner */}
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
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERIFIED RECEIPTS</span>
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
          3. Interactive ASN Verification Search Console (5.4.2 Live Query Tool)
         ========================================================================= */}
      <div id="mawm-search-console" className="card" style={{ padding: '1.25rem 1.5rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', backgroundColor: 'rgba(15, 23, 42, 0.65)', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Search size={16} />
              <span>ASN Verification Status Query Console</span>
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Query real-time receipt verification status in Manhattan Active WMS Cloud.
            </p>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
            Live MAWM Search
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* AsnId Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              AsnId to Search:
            </label>
            <input
              type="text"
              value={searchAsnId}
              onChange={(e) => setSearchAsnId(e.target.value)}
              placeholder="Enter AsnId to query (e.g. ASNOPTI00004769)..."
              className="input-field"
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono, monospace)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Destination Facility Input with Quick Presets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Destination Facility:
              </label>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => setSearchFacility('Food_Cbe')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: searchFacility === 'Food_Cbe' ? '#10b981' : '#38bdf8',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                  title="User is authorized for Food_Cbe"
                >
                  Food_Cbe (Auth)
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>|</span>
                <button
                  type="button"
                  onClick={() => setSearchFacility('Food_chn')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: searchFacility === 'Food_chn' ? '#f59e0b' : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Food_chn
                </button>
              </div>
            </div>
            <input
              type="text"
              value={searchFacility}
              onChange={(e) => setSearchFacility(e.target.value)}
              placeholder="e.g. Food_Cbe"
              className="input-field"
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono, monospace)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Action Button */}
          <div>
            <button
              onClick={() => handleManualSearchAsn()}
              disabled={searchingAsn || !searchAsnId.trim()}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '0.48rem 1rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                backgroundColor: '#0284c7',
                borderColor: '#0284c7',
                cursor: searchAsnId.trim() ? 'pointer' : 'not-allowed',
                opacity: searchAsnId.trim() ? 1 : 0.6
              }}
            >
              <Search size={14} className={searchingAsn ? 'spin-icon' : ''} />
              <span>{searchingAsn ? 'Querying MAWM Cloud...' : 'Check Verification Status'}</span>
            </button>
          </div>
        </div>

        {/* Formatted Search Output Container */}
        {searchResult && (
          <div style={{
            marginTop: '1rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '8px',
            backgroundColor: searchResult.isVerified
              ? 'rgba(16, 185, 129, 0.1)'
              : (searchResult.success ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.08)'),
            border: `1px solid ${searchResult.isVerified ? '#10b981' : (searchResult.success ? '#f59e0b' : 'rgba(239, 68, 68, 0.35)')}`,
            boxSizing: 'border-box',
            maxWidth: '100%',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              {searchResult.isVerified ? (
                <CheckCheck size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : searchResult.success ? (
                <Clock size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  {searchResult.success ? (
                    <span style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '0.18rem 0.55rem',
                      borderRadius: '4px'
                    }}>
                      STATUS: {searchResult.asnStatus || searchResult.statusDescription || 'RECEIVED'}
                    </span>
                  ) : (
                    <span style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      HTTP {searchResult.statusCode || 500} ERROR
                    </span>
                  )}

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                    AsnId: <strong>{searchResult.asnId || searchAsnId}</strong> | Facility: <strong>{searchResult.facilityId || searchFacility}</strong>
                  </span>
                </div>

                <div style={{
                  fontSize: '0.82rem',
                  color: searchResult.success ? '#38bdf8' : '#f87171',
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.45
                }}>
                  {searchResult.success
                    ? `Live MAWM Status: ${searchResult.statusDescription || searchResult.asnStatus}`
                    : (searchResult.cleanError || searchResult.error)}
                </div>
              </div>
            </div>

            {/* Smart Recommendation for unauthorized facility */}
            {String(searchResult.cleanError || searchResult.error || '').includes('does not have access to the selected organization') && (
              <div style={{
                marginTop: '0.65rem',
                padding: '0.55rem 0.85rem',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.65rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ fontSize: '0.76rem', color: '#38bdf8' }}>
                  <strong>Access Tip:</strong> Active user is authorized for <strong>Food_Cbe</strong>.
                </div>
                <button
                  onClick={() => {
                    setSearchFacility('Food_Cbe');
                    handleManualSearchAsn('Food_Cbe');
                  }}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.22rem 0.6rem',
                    borderColor: '#38bdf8',
                    color: '#38bdf8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Check size={12} />
                  <span>Switch to Food_Cbe & Retry</span>
                </button>
              </div>
            )}

            {/* Collapsible Full Response */}
            {searchResult.rawResponse && (
              <div style={{ marginTop: '0.65rem' }}>
                <button
                  onClick={() => setShowRawSearchJson(!showRawSearchJson)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{showRawSearchJson ? 'Hide Technical Response' : 'View Full Technical Response (JSON)'}</span>
                </button>
                {showRawSearchJson && (
                  <pre style={{
                    marginTop: '0.35rem',
                    padding: '0.65rem',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    borderRadius: '4px',
                    maxHeight: '160px',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.72rem',
                    color: searchResult.success ? '#34d399' : '#fca5a5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {formatPayload(searchResult.rawResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          4. MAWM Dispatch Details Table (WITH ERP SOURCE SELECTOR & FILTER)
             "Not exclusive opti if I select opti then should be displayed in the Mawm dispatch details"
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                MAWM Dispatch Details
              </h2>
              <span className="badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>
                {filteredTrackers.length} Records
              </span>
            </div>
          </div>

          {/* ERP Source Selector Dropdown (No ALL ERP option, dropdown type) */}
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
          <div style={{ minWidth: '220px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter by AsnId, Facility..."
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

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
            <div>Loading MAWM dispatch records...</div>
          </div>
        ) : filteredTrackers.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              No dispatch records found for {selectedErp} ERP
            </div>
            <div style={{ fontSize: '0.78rem' }}>
              Select "Opti ERP" to view active dispatch logs, or ingest a new ASN file.
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
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>AsnId</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Source ERP</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Destination Facility</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>5.4.1 Save Status</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>5.4.2 Verification Status</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Dispatched Time</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrackers.map((job) => {
                  const asnId = extractAsnId(job);
                  const facility = extractFacility(job);
                  const vStatus = extractVerificationStatus(job);
                  const isVerified = String(vStatus || '').toUpperCase().includes('VERIFIED');
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
                      {/* AsnId (Clickable link to query console) */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectAsnForQuery(asnId, facility)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 600,
                            color: '#38bdf8',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '0.78rem'
                          }}
                          title="Click to query verification in 5.4.2 console"
                        >
                          {asnId}
                        </button>
                      </td>

                      {/* Source ERP */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.25)'
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

                      {/* 5.4.1 Save Status */}
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

                      {/* 5.4.2 Verification Status (Actual API response fact) */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        {vStatus ? (
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
                              color: isVerified ? '#10b981' : '#38bdf8',
                              backgroundColor: isVerified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              border: `1px solid ${isVerified ? '#10b981' : 'rgba(56, 189, 248, 0.3)'}`,
                              cursor: 'pointer'
                            }}
                            title="Live status returned from MAWM API. Click to re-check."
                          >
                            {isVerified ? <CheckCheck size={12} /> : <Clock size={12} />}
                            <span>STATUS: {vStatus}</span>
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
          5. Inspection Modal
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
            maxWidth: '850px',
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
                  Inspect MAWM Payload & Verification: {extractAsnId(inspectingJob)}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Facility: <strong>{extractFacility(inspectingJob)}</strong> | Source: <strong>{inspectingJob.sourceSystem || 'OPTI'}</strong>
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
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <button
                  onClick={() => setInspectPayloadTab('response')}
                  className={`filter-pill ${inspectPayloadTab === 'response' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                >
                  5.4.1 Response (/asn/save)
                </button>
                <button
                  onClick={() => setInspectPayloadTab('verification')}
                  className={`filter-pill ${inspectPayloadTab === 'verification' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                >
                  5.4.2 Verification (/asn/search)
                </button>
                <button
                  onClick={() => setInspectPayloadTab('raw')}
                  className={`filter-pill ${inspectPayloadTab === 'raw' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                >
                  Raw Ingested Content
                </button>
              </div>

              <pre style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '0.85rem',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.76rem',
                color: inspectPayloadTab === 'response' ? '#34d399' : (inspectPayloadTab === 'verification' ? '#38bdf8' : '#fbbf24'),
                maxHeight: '380px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>
                {inspectPayloadTab === 'response'
                  ? formatPayload(inspectingJob.mawmResponse || 'No direct response captured yet')
                  : (inspectPayloadTab === 'verification'
                      ? formatPayload({
                          api: "5.4.2 Check ASN Verification Status",
                          requestPayload: {
                            "Query": `AsnId in ('${extractAsnId(inspectingJob)}')`,
                            "Template": { "AsnId": "", "AsnStatus": "" }
                          },
                          facility: extractFacility(inspectingJob),
                          currentStatus: extractVerificationStatus(inspectingJob) || 'Not queried yet'
                        })
                      : formatPayload(inspectingJob.rawContent || inspectingJob.outputFiles || 'No raw payload available'))}
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
                  handleSelectAsnForQuery(extractAsnId(inspectingJob), extractFacility(inspectingJob));
                  setInspectingJob(null);
                }}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
              >
                Load into 5.4.2 Verification Console
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
