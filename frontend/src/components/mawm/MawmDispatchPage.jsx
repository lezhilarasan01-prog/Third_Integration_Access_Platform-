import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Eye,
  Send,
  ShieldCheck,
  Server,
  Copy,
  Check,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Code,
  CheckCheck,
  ExternalLink,
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
  const [dispatchingJobId, setDispatchingJobId] = useState(null);
  const [verifyingJobId, setVerifyingJobId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // 5.4.2 Interactive Verification Inspector State
  const [searchAsnId, setSearchAsnId] = useState('ASN-2026-0001');
  const [searchFacility, setSearchFacility] = useState('Food_Cbe');
  const [searchingAsn, setSearchingAsn] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('7d'); // 'today', '24h', '7d', '30d', 'custom'
  const [customStartDateTime, setCustomStartDateTime] = useState('');
  const [customEndDateTime, setCustomEndDateTime] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected tracker for inspection modal
  const [inspectingJob, setInspectingJob] = useState(null);
  const [inspectPayloadTab, setInspectPayloadTab] = useState('response'); // 'response' | 'verification' | 'outbound' | 'inbound' | 'error'

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

  const extractAsnId = (job) => {
    if (!job) return 'ASN-2026-0001';
    if (job.outputFiles && typeof job.outputFiles === 'string') {
      try {
        const parsed = JSON.parse(job.outputFiles);
        const dataArr = parsed.Data || parsed.data || (Array.isArray(parsed) ? parsed : null);
        if (Array.isArray(dataArr) && dataArr[0]?.AsnId) return dataArr[0].AsnId;
        if (parsed.AsnId) return parsed.AsnId;
      } catch (e) {}
    }
    if (job.rawContent && typeof job.rawContent === 'string') {
      try {
        const parsed = JSON.parse(job.rawContent);
        if (parsed.AsnId) return parsed.AsnId;
        if (parsed.asnId) return parsed.asnId;
      } catch (e) {}
    }
    if (job.originalFilename && job.originalFilename.toUpperCase().includes('ASN')) {
      const base = job.originalFilename.replace(/\.[^/.]+$/, '');
      return base;
    }
    return job.jobId || 'ASN-2026-0001';
  };

  const handleInspectJob = async (row) => {
    setInspectPayloadTab('response');
    setInspectingJob({ ...row, isLoadingPayload: true });
    try {
      const fullDetails = await integrationApi.getTrackerById(row.jobId);
      setInspectingJob((prev) => {
        if (!prev || prev.jobId !== row.jobId) return prev;
        return { ...prev, ...fullDetails, isLoadingPayload: false };
      });
    } catch (err) {
      console.error('Failed to load full tracker payload:', err);
      setInspectingJob((prev) => prev ? { ...prev, isLoadingPayload: false } : null);
    }
  };

  const activePayloadText = useMemo(() => {
    if (!inspectingJob) return '';
    if (inspectPayloadTab === 'error') {
      return inspectingJob.processingErrorMessage || '';
    }
    if (inspectPayloadTab === 'inbound') {
      return formatPayload(inspectingJob.rawContent);
    }
    if (inspectPayloadTab === 'outbound') {
      return formatPayload(inspectingJob.outputFiles);
    }
    if (inspectPayloadTab === 'verification') {
      if (inspectingJob.verificationResult) {
        return formatPayload(inspectingJob.verificationResult);
      }
      return JSON.stringify({
        api: "5.4.2 Check ASN Verification Status",
        endpoint: `${telemetry?.baseUrl || 'https://ncsps.sce.manh.com'}/receiving/api/receiving/asn/search`,
        method: "POST",
        headers: {
          "selectedLocation": inspectingJob.facilityId || "Food_Cbe",
          "selectedOrganization": inspectingJob.facilityId || "Food_Cbe",
          "selectedBusinessUnit": inspectingJob.facilityId || "Food_Cbe",
          "Authorization": "Bearer <OAuth2 Token>",
          "Content-Type": "application/json"
        },
        requestPayload: {
          "Query": `AsnId in ('${extractAsnId(inspectingJob)}')`,
          "Template": {
            "AsnId": "",
            "AsnStatus": ""
          }
        },
        expectedResponse: {
          "data": [
            {
              "AsnId": extractAsnId(inspectingJob),
              "AsnStatus": "8000"
            }
          ]
        },
        note: "Status code 8000 indicates Verified in MAWM (completes verification in Opti ERP). Click 'Verify in MAWM Now' to execute."
      }, null, 2);
    }

    // Default 'response': The actual output response received from MAWM Cloud!
    if (inspectingJob.mawmResponse) {
      return formatPayload(inspectingJob.mawmResponse);
    }

    // If delivered successfully but raw body wasn't stored in old schema, show verified receipt
    const dStatus = (inspectingJob.dispatchStatus || '').toUpperCase();
    if (dStatus.includes('DELIVERED') || dStatus.includes('200')) {
      return JSON.stringify({
        status: "DELIVERED_TO_MAWM (200 OK)",
        statusCode: "OK",
        targetFacility: inspectingJob.facilityId || telemetry?.defaultFacility || 'Food_Cbe',
        trackingId: inspectingJob.jobId,
        message: "Acknowledged receipt by Manhattan Active WMS Cloud receiving API (/receiving/api/receiving/asn/save)"
      }, null, 2);
    }

    return JSON.stringify({
      status: inspectingJob.dispatchStatus || "AWAITING_DISPATCH",
      message: "Waiting for outbound HTTP dispatch to Manhattan Active WMS. Click 'Dispatch to Live Cloud' to send now."
    }, null, 2);
  }, [inspectingJob, inspectPayloadTab, telemetry]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [telData, trackerRows] = await Promise.all([
        integrationApi.getMawmTelemetry(),
        integrationApi.getTrackers(true)
      ]);
      setTelemetry(telData);
      setTrackers(Array.isArray(trackerRows) ? trackerRows : []);
    } catch (err) {
      console.error('Failed to load MAWM dispatch telemetry:', err);
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
      setTestResult({ success: true, message: `Connected in ${res.latencyMs}ms. Token valid for user ${res.username || 'lezhilarasan'}.` });
      await loadData(true);
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

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
          setInspectPayloadTab('response');
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

  const handleVerifyJob = async (jobId, e) => {
    if (e) e.stopPropagation();
    setVerifyingJobId(jobId);
    try {
      const res = await integrationApi.verifyJobAsn(jobId);
      if (inspectingJob && inspectingJob.jobId === jobId) {
        setInspectingJob((prev) => ({
          ...prev,
          mawmAsnStatus: res.statusDescription || res.asnStatus,
          verificationResult: res
        }));
        setInspectPayloadTab('verification');
      }
      await loadData(true);
    } catch (err) {
      alert('Verification query failed: ' + err.message);
    } finally {
      setVerifyingJobId(null);
    }
  };

  const handleManualSearchAsn = async () => {
    if (!searchAsnId.trim()) return;
    setSearchingAsn(true);
    setSearchResult(null);
    try {
      const res = await integrationApi.searchAsnVerification(searchAsnId.trim(), searchFacility.trim());
      setSearchResult(res);
    } catch (err) {
      setSearchResult({ success: false, error: err.message || 'Failed to query MAWM ASN verification search API' });
    } finally {
      setSearchingAsn(false);
    }
  };

  const handleCopy = (text, id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered rows: only include converted or dispatched jobs
  const filteredRows = useMemo(() => {
    return trackers.filter((r) => {
      const dStatus = (r.dispatchStatus || '').toUpperCase();
      const iStatus = (r.intakeStatus || '').toUpperCase();
      const hasDispatchData = dStatus.length > 0 || iStatus === 'CONVERTED';
      if (!hasDispatchData) return false;

      // Status filter
      if (statusFilter === 'DELIVERED') {
        if (!dStatus.includes('DELIVERED') && !dStatus.includes('200')) return false;
      } else if (statusFilter === 'VERIFIED') {
        const vStatus = (r.mawmAsnStatus || '').toUpperCase();
        if (!vStatus.includes('8000') && !vStatus.includes('VERIFIED')) return false;
      } else if (statusFilter === 'PENDING') {
        if (!dStatus.includes('PENDING') && !dStatus.includes('AWAITING') && !dStatus.includes('SAVED')) return false;
      } else if (statusFilter === 'FAILED') {
        if (!dStatus.includes('FAILED')) return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && (r.transactionType || '').toUpperCase() !== typeFilter) {
        return false;
      }

      // Date & Time Range filter
      const timeStr = r.dispatchCompletedAt || r.updatedAt || r.receivedAt;
      if (timeStr) {
        const rowTime = new Date(timeStr).getTime();
        const now = Date.now();
        if (dateRange === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (rowTime < startOfToday.getTime()) return false;
        } else if (dateRange === '24h') {
          if (rowTime < (now - 24 * 60 * 60 * 1000)) return false;
        } else if (dateRange === '7d') {
          if (rowTime < (now - 7 * 24 * 60 * 60 * 1000)) return false;
        } else if (dateRange === '30d') {
          if (rowTime < (now - 30 * 24 * 60 * 60 * 1000)) return false;
        } else if (dateRange === 'custom') {
          if (customStartDateTime) {
            const start = new Date(customStartDateTime).getTime();
            if (rowTime < start) return false;
          }
          if (customEndDateTime) {
            const end = new Date(customEndDateTime).getTime();
            if (rowTime > end) return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (r.jobId || '').toLowerCase().includes(q);
        const matchFile = (r.originalFilename || '').toLowerCase().includes(q);
        const matchFacility = (r.facilityId || '').toLowerCase().includes(q);
        const matchSource = (r.sourceSystem || '').toLowerCase().includes(q);
        if (!matchId && !matchFile && !matchFacility && !matchSource) return false;
      }

      return true;
    });
  }, [trackers, statusFilter, typeFilter, dateRange, customStartDateTime, customEndDateTime, searchQuery]);

  // Pagination calculation
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Aggregate stats
  const stats = useMemo(() => {
    let delivered = 0;
    let verified = 0;
    let pending = 0;
    let failed = 0;
    trackers.forEach((r) => {
      const s = (r.dispatchStatus || '').toUpperCase();
      const v = (r.mawmAsnStatus || '').toUpperCase();
      if (s.includes('DELIVERED') || s.includes('200')) delivered++;
      if (v.includes('8000') || v.includes('VERIFIED')) verified++;
      else if (s.includes('FAILED')) failed++;
      else if (s.includes('PENDING') || s.includes('AWAITING') || s.includes('SAVED')) pending++;
    });
    return {
      total: delivered + pending + failed,
      delivered,
      verified,
      pending,
      failed
    };
  }, [trackers]);

  return (
    <div className="page-container" style={{ padding: '1.25rem 1.75rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* 1. Header & Live Telemetry Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40,
            height: 40,
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
                MAWM ASN Dispatch & Verification Hub
              </h1>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                OPTI EXCLUSIVE DISPATCH
              </span>
              <span className="badge" style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                LIVE CLOUD
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Manhattan Active® WMS 5.4 ASN Ingestion (<code style={{ color: '#10b981' }}>/asn/save</code>) & 5.4.2 Verification (<code style={{ color: '#38bdf8' }}>/asn/search</code>) dedicated exclusively to Opti ERP feeds.
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

          {onOpenTestUpload && (
            <button
              onClick={onOpenTestUpload}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 0.95rem', fontSize: '0.8rem' }}
            >
              <UploadCloud size={14} />
              <span>Test Opti ASN Upload</span>
            </button>
          )}
        </div>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div style={{
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
          color: testResult.success ? '#10b981' : '#ef4444',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* 2. Top Specifications Card & Architecture Overview */}
      <div className="card" style={{
        padding: '0.9rem 1.25rem',
        marginBottom: '1.25rem',
        borderRadius: '10px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        backgroundColor: 'rgba(15, 23, 42, 0.65)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={15} color="#10b981" />
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              5.4 Manhattan Active® WMS (MAWM) ASN Integration Specifications (Opti Exclusive)
            </strong>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            Direct Endpoints Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {/* Save ASN API */}
          <div style={{ padding: '0.6rem 0.85rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Send size={12} />
              <span>5.4.1 Create / Save ASN API</span>
            </div>
            <div><strong>Endpoint:</strong> <code style={{ color: '#38bdf8' }}>POST /receiving/api/receiving/asn/save</code></div>
            <div><strong>Controller:</strong> <code style={{ color: '#f59e0b' }}>POST /create-asn-active</code></div>
            <div><strong>Expected Response:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>200 OK</span></div>
          </div>

          {/* Check Verification Status */}
          <div style={{ padding: '0.6rem 0.85rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Search size={12} />
              <span>5.4.2 Check ASN Verification Status</span>
            </div>
            <div><strong>Endpoint:</strong> <code style={{ color: '#38bdf8' }}>POST /receiving/api/receiving/asn/search</code></div>
            <div><strong>Query:</strong> <code style={{ color: '#f59e0b' }}>AsnId in ('...')</code></div>
            <div><strong>Verified Code:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>8000 (Verified in MAWM)</span></div>
          </div>

          {/* Dynamic Header & Auth Config */}
          <div style={{ padding: '0.6rem 0.85rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={12} />
              <span>Dynamic Routing & Auth Headers</span>
            </div>
            <div><strong>Facility Headers:</strong> <code style={{ color: '#10b981' }}>selectedLocation</code>, <code style={{ color: '#10b981' }}>selectedOrganization</code>, <code style={{ color: '#10b981' }}>selectedBusinessUnit</code> &rarr; derived from <strong>DestinationFacilityId</strong> (<code style={{ color: '#f59e0b' }}>Food_Cbe</code>)</div>
            <div><strong>Token Credentials:</strong> Read from properties; username overridden by <strong>CreatedBy</strong> in payload if present.</div>
          </div>
        </div>
      </div>

      {/* 3. Interactive ASN Verification Status Checker (5.4.2 /search Tool) */}
      <div className="card" style={{
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        borderRadius: '10px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        backgroundColor: 'rgba(15, 23, 42, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Search size={15} color="#38bdf8" />
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Interactive MAWM ASN Verification Search (5.4.2 Live Query Tool)
            </strong>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Query: <code style={{ color: '#38bdf8' }}>POST /receiving/api/receiving/asn/search</code>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AsnId:</label>
            <input
              type="text"
              value={searchAsnId}
              onChange={(e) => setSearchAsnId(e.target.value)}
              placeholder="e.g. ASN-2026-0001"
              style={{
                flex: 1,
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono, monospace)'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '180px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Facility:</label>
            <input
              type="text"
              value={searchFacility}
              onChange={(e) => setSearchFacility(e.target.value)}
              placeholder="Food_Cbe"
              style={{
                width: '120px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono, monospace)'
              }}
            />
          </div>

          <button
            onClick={handleManualSearchAsn}
            disabled={searchingAsn || !searchAsnId.trim()}
            className="btn-primary"
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#0284c7',
              borderColor: '#0284c7'
            }}
          >
            <Search size={13} className={searchingAsn ? 'spin-icon' : ''} />
            <span>{searchingAsn ? 'Querying MAWM...' : 'Check Verification Status'}</span>
          </button>
        </div>

        {/* Live Search Result Output */}
        {searchResult && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            backgroundColor: searchResult.isVerified ? 'rgba(16, 185, 129, 0.12)' : (searchResult.success ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
            border: `1px solid ${searchResult.isVerified ? '#10b981' : (searchResult.success ? '#f59e0b' : '#ef4444')}`,
            fontSize: '0.78rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {searchResult.isVerified ? <CheckCheck size={16} color="#10b981" /> : (searchResult.success ? <Clock size={16} color="#f59e0b" /> : <AlertTriangle size={16} color="#ef4444" />)}
                <strong style={{ color: searchResult.isVerified ? '#10b981' : (searchResult.success ? '#f59e0b' : '#ef4444') }}>
                  {searchResult.isVerified ? 'Status 8000: Verified in MAWM (Completed in Opti ERP)' : (searchResult.statusDescription || searchResult.error)}
                </strong>
              </div>
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Target: {searchResult.endpoint}
              </span>
            </div>
            {searchResult.rawResponse && (
              <pre style={{
                margin: '0.35rem 0 0',
                padding: '0.5rem',
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
                maxHeight: '130px',
                overflowY: 'auto',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.72rem',
                color: 'var(--text-primary)'
              }}>
                {formatPayload(searchResult.rawResponse)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* 4. Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {/* Endpoint Card */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>MAWM TARGET HOST</span>
            <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              ONLINE
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {telemetry?.baseUrl || 'https://ncsps.sce.manh.com'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Save: <code style={{ color: '#10b981' }}>{telemetry?.asnPath || '/receiving/api/receiving/asn/save'}</code>
          </div>
        </div>

        {/* OAuth2 Card */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>OAUTH2 TOKEN</span>
            <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, backgroundColor: 'rgba(56, 189, 248, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              AUTO REFRESH
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            User: {telemetry?.username || 'lezhilarasan'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Dynamic User: <strong style={{ color: '#f59e0b' }}>CreatedBy</strong> key in payload
          </div>
        </div>

        {/* Delivered Metric */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>DELIVERED (5.4.1)</span>
            <CheckCircle2 size={15} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
            {stats.delivered}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Status: <span style={{ color: '#10b981', fontWeight: 600 }}>200 OK</span>
          </div>
        </div>

        {/* Verified Metric (5.4.2) */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>VERIFIED (5.4.2)</span>
            <CheckCheck size={15} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.2 }}>
            {stats.verified}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            MAWM Status: <strong style={{ color: '#38bdf8' }}>8000</strong>
          </div>
        </div>

        {/* Awaiting Metric */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>AWAITING</span>
            <Clock size={15} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1.2 }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Converted in PostgreSQL
          </div>
        </div>
      </div>

      {/* 5. Search & Filter Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '260px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by Job ID, ASN ID, File..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.35rem 0.65rem 0.35rem 2rem',
                fontSize: '0.8rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.8rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              color: 'var(--text-primary)'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DELIVERED">Delivered (200 OK)</option>
            <option value="VERIFIED">Verified in MAWM (8000)</option>
            <option value="PENDING">Awaiting Dispatch</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.8rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              color: 'var(--text-primary)'
            }}
          >
            <option value="today">Today</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredRows.length}</strong> matching transaction(s)
        </div>
      </div>

      {/* 6. Jobs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '10px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Tracking ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Source ERP</th>
                <th style={{ padding: '0.75rem 1rem' }}>Document</th>
                <th style={{ padding: '0.75rem 1rem' }}>DestinationFacilityId</th>
                <th style={{ padding: '0.75rem 1rem' }}>Original Filename</th>
                <th style={{ padding: '0.75rem 1rem' }}>MAWM Dispatch (5.4.1)</th>
                <th style={{ padding: '0.75rem 1rem' }}>MAWM Verification (5.4.2)</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isOptiRow = row.sourceSystem?.toUpperCase() === 'OPTI' || row.sourceSystem?.toUpperCase() === 'OTPI';
                  const isDelivered = (row.dispatchStatus || '').includes('200') || (row.dispatchStatus || '').includes('DELIVERED');
                  const isFailed = (row.dispatchStatus || '').includes('FAILED');
                  const isVerified = (row.mawmAsnStatus || '').includes('8000') || (row.mawmAsnStatus || '').includes('Verified');
                  const facilityDisplay = row.facilityId || 'Food_Cbe';

                  return (
                    <tr
                      key={row.jobId}
                      style={{ borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}
                      onClick={() => handleInspectJob(row)}
                    >
                      {/* Tracking ID */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className="mono-job-id" title={row.jobId}>
                            {row.jobId.slice(0, 8)}...
                          </span>
                          <button
                            onClick={(e) => handleCopy(row.jobId, row.jobId, e)}
                            title="Copy Tracking UUID"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'inline-flex' }}
                          >
                            {copiedId === row.jobId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Source ERP */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isOptiRow ? (
                          <span className="badge" style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid #10b981',
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem',
                            fontWeight: 700
                          }}>
                            Opti (Active)
                          </span>
                        ) : (
                          <span className="badge" style={{
                            backgroundColor: 'rgba(100, 116, 139, 0.15)',
                            color: '#94a3b8',
                            border: '1px solid rgba(100, 116, 139, 0.3)',
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem'
                          }} title="Live MAWM Cloud dispatch is exclusive to Opti feeds">
                            {row.sourceSystem || 'HOST'} (Converted)
                          </span>
                        )}
                      </td>

                      {/* Doc Type */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#38bdf8' }}>
                          {row.transactionType || 'ASN'}
                        </span>
                      </td>

                      {/* DestinationFacilityId */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(16, 185, 129, 0.08)',
                          color: '#10b981',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          fontWeight: 600
                        }}>
                          {facilityDisplay}
                        </span>
                      </td>

                      {/* Original Filename */}
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.originalFilename}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {row.originalFilename || 'opti_payload.json'}
                        </span>
                      </td>

                      {/* MAWM Dispatch (5.4.1) */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isDelivered ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid #10b981',
                            padding: '0.18rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            <CheckCircle2 size={12} />
                            DELIVERED (200 OK)
                          </span>
                        ) : isFailed ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            padding: '0.18rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            <AlertTriangle size={12} />
                            FAILED
                          </span>
                        ) : !isOptiRow ? (
                          <span style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            backgroundColor: 'rgba(100, 116, 139, 0.12)',
                            padding: '0.18rem 0.5rem',
                            borderRadius: '999px',
                            border: '1px solid rgba(100, 116, 139, 0.25)'
                          }}>
                            Opti Exclusive
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid #f59e0b',
                            padding: '0.18rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            <Clock size={12} />
                            AWAITING
                          </span>
                        )}
                      </td>

                      {/* MAWM Verification (5.4.2) */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isVerified ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid #38bdf8',
                            padding: '0.18rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            <CheckCheck size={12} />
                            8000 VERIFIED
                          </span>
                        ) : isOptiRow ? (
                          <button
                            onClick={(e) => handleVerifyJob(row.jobId, e)}
                            disabled={verifyingJobId === row.jobId}
                            className="btn-secondary"
                            title="Query MAWM /receiving/api/receiving/asn/search live"
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Search size={11} className={verifyingJobId === row.jobId ? 'spin-icon' : ''} />
                            <span>{verifyingJobId === row.jobId ? 'Checking...' : 'Check Status'}</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            Opti Only
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', paddingRight: '1.25rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectJob(row);
                            }}
                            className="btn-secondary"
                            title="Inspect MAWM Payload & Delivery Details"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </button>

                          <button
                            onClick={(e) => isOptiRow && handleDispatchJob(row.jobId, e)}
                            disabled={dispatchingJobId === row.jobId || !isOptiRow}
                            className="btn-primary"
                            title={isOptiRow ? "Dispatch payload to MAWM Cloud" : "Rejection: Only Opti ERP is authorized to dispatch to MAWM Cloud"}
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              opacity: isOptiRow ? 1 : 0.45,
                              cursor: isOptiRow ? 'pointer' : 'not-allowed',
                              backgroundColor: !isOptiRow ? 'rgba(100, 116, 139, 0.2)' : isDelivered ? 'rgba(16, 185, 129, 0.2)' : 'var(--primary-color)',
                              borderColor: !isOptiRow ? 'rgba(100, 116, 139, 0.3)' : isDelivered ? '#10b981' : 'transparent',
                              color: !isOptiRow ? '#94a3b8' : isDelivered ? '#10b981' : '#ffffff'
                            }}
                          >
                            <Send size={11} className={dispatchingJobId === row.jobId ? 'spin-icon' : ''} />
                            <span>{!isOptiRow ? 'Opti Only' : dispatchingJobId === row.jobId ? 'Sending...' : (isDelivered ? 'Redeliver' : 'Dispatch')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 7. Pagination Footer */}
        {totalItems > 0 && (
          <div style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              Showing <strong>{Math.min(totalItems, (currentPage - 1) * pageSize + 1)}</strong> - <strong>{Math.min(totalItems, currentPage * pageSize)}</strong> of <strong>{totalItems}</strong> transactions
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>

              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 8. Inspection Modal */}
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
          padding: '1.25rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            borderRadius: '12px'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface-elevated)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    MAWM ASN Dispatch & Verification Telemetry
                  </h3>
                  <span className="mono-job-id" style={{ fontSize: '0.72rem' }}>
                    {inspectingJob.jobId}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  File: {inspectingJob.originalFilename} • Facility: <strong style={{ color: '#10b981' }}>{inspectingJob.facilityId || 'Food_Cbe'}</strong>
                </div>
              </div>

              <button
                onClick={() => setInspectingJob(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
              {/* Delivery Parameters Box */}
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.8rem'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Server size={14} color="#10b981" />
                    <span>Outbound MAWM Cloud HTTP Specifications (Derived from DestinationFacilityId)</span>
                  </div>
                  {(() => {
                    const isOptiInspect = inspectingJob.sourceSystem?.toUpperCase() === 'OPTI' || inspectingJob.sourceSystem?.toUpperCase() === 'OTPI';
                    return (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {isOptiInspect && (
                          <button
                            onClick={() => handleVerifyJob(inspectingJob.jobId)}
                            disabled={verifyingJobId === inspectingJob.jobId}
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Search size={12} className={verifyingJobId === inspectingJob.jobId ? 'spin-icon' : ''} />
                            <span>{verifyingJobId === inspectingJob.jobId ? 'Verifying...' : 'Verify in MAWM (5.4.2)'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => isOptiInspect && handleDispatchJob(inspectingJob.jobId)}
                          disabled={dispatchingJobId === inspectingJob.jobId || !isOptiInspect}
                          className="btn-primary"
                          style={{
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            opacity: isOptiInspect ? 1 : 0.45,
                            cursor: isOptiInspect ? 'pointer' : 'not-allowed'
                          }}
                        >
                          <Send size={12} />
                          <span>{!isOptiInspect ? 'Opti Exclusive' : dispatchingJobId === inspectingJob.jobId ? 'Dispatching...' : 'Dispatch to Live Cloud'}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <div><strong>HTTP Method:</strong> <code style={{ color: '#10b981' }}>POST</code></div>
                  <div><strong>Target Host:</strong> <code style={{ color: '#38bdf8' }}>{telemetry?.baseUrl || 'https://ncsps.sce.manh.com'}</code></div>
                  <div><strong>selectedLocation:</strong> <code style={{ color: '#f59e0b' }}>{inspectingJob.facilityId || 'Food_Cbe'}</code></div>
                  <div><strong>selectedOrganization:</strong> <code style={{ color: '#f59e0b' }}>{inspectingJob.facilityId || 'Food_Cbe'}</code></div>
                  <div><strong>selectedBusinessUnit:</strong> <code style={{ color: '#f59e0b' }}>{inspectingJob.facilityId || 'Food_Cbe'}</code></div>
                  <div><strong>Authorization:</strong> <code>Bearer &lt;OAuth2 Cached Token&gt;</code></div>
                  <div><strong>User:</strong> <strong style={{ color: '#38bdf8' }}>{inspectingJob.createdBy || telemetry?.username || 'lezhilarasan'}</strong></div>
                  <div><strong>Dispatch Status:</strong> <strong style={{ color: inspectingJob.dispatchStatus?.includes('200') ? '#10b981' : (inspectingJob.dispatchStatus?.includes('FAILED') ? '#ef4444' : '#f59e0b') }}>{inspectingJob.dispatchStatus || 'PENDING'}</strong></div>
                  <div><strong>MAWM AsnStatus:</strong> <strong style={{ color: inspectingJob.mawmAsnStatus?.includes('8000') ? '#10b981' : '#f59e0b' }}>{inspectingJob.mawmAsnStatus || 'Not Checked'}</strong></div>
                </div>
              </div>

              {/* Payload Inspection Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setInspectPayloadTab('response')}
                      className={`filter-pill ${inspectPayloadTab === 'response' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                    >
                      5.4.1 Save ASN Response (200 OK)
                    </button>
                    <button
                      onClick={() => setInspectPayloadTab('verification')}
                      className={`filter-pill ${inspectPayloadTab === 'verification' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                    >
                      5.4.2 Verification Search (/search)
                    </button>
                    <button
                      onClick={() => setInspectPayloadTab('outbound')}
                      className={`filter-pill ${inspectPayloadTab === 'outbound' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                    >
                      Converted Request Payload
                    </button>
                    <button
                      onClick={() => setInspectPayloadTab('inbound')}
                      className={`filter-pill ${inspectPayloadTab === 'inbound' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                    >
                      Inbound Raw File
                    </button>
                    {inspectingJob.processingErrorMessage && (
                      <button
                        onClick={() => setInspectPayloadTab('error')}
                        className={`filter-pill ${inspectPayloadTab === 'error' ? 'active' : ''}`}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', color: '#ef4444' }}
                      >
                        Errors
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {onOpenBeautifier && activePayloadText && (
                      <button
                        onClick={() => onOpenBeautifier(activePayloadText)}
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <FileCode2 size={12} />
                        <span>Beautifier</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(activePayloadText, 'modal_payload')}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      {copiedId === 'modal_payload' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedId === 'modal_payload' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <pre style={{
                  margin: 0,
                  padding: '1rem',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5
                }}>
                  {activePayloadText || '// No payload available for selected tab'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
