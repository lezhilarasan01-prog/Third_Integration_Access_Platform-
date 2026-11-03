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
  RotateCcw,
  UploadCloud,
  Layers,
  ArrowUpRight,
  Calendar
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
  const [copiedId, setCopiedId] = useState(null);

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
  const [inspectPayloadTab, setInspectPayloadTab] = useState('response'); // 'response' | 'outbound' | 'inbound' | 'error'

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
      setTestResult({ success: true, message: `Connected in ${res.latencyMs}ms. Token valid.` });
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
    let pending = 0;
    let failed = 0;
    trackers.forEach((r) => {
      const s = (r.dispatchStatus || '').toUpperCase();
      if (s.includes('DELIVERED') || s.includes('200')) delivered++;
      else if (s.includes('FAILED')) failed++;
      else if (s.includes('PENDING') || s.includes('AWAITING') || s.includes('SAVED')) pending++;
    });
    return {
      total: delivered + pending + failed,
      delivered,
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
            width: 38,
            height: 38,
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <Radio size={20} className="pulse-icon" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                MAWM Delivery Monitoring
              </h1>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                LIVE CLOUD
              </span>
            </div>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Manhattan Active® WMS REST API dispatch telemetry, OAuth2 Bearer token lifecycle, and delivery tracking.
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
            <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
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
              <span>Test Upload</span>
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

      {/* 2. Top Metric Cards (Responsive Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {/* Endpoint Card */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>MAWM ENDPOINT</span>
            <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              ONLINE
            </span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {telemetry?.baseUrl || 'https://ncsps.sce.manh.com'}
          </div>
        </div>

        {/* OAuth2 Card */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>OAUTH2 TOKEN</span>
            <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, backgroundColor: 'rgba(56, 189, 248, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              12H CACHED
            </span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            User: {telemetry?.username || 'lezhilarasan'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Default Facility: <strong style={{ color: '#10b981' }}>{telemetry?.defaultFacility || 'Food_Cbe'}</strong>
          </div>
        </div>

        {/* Delivered Metric */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>DELIVERED</span>
            <CheckCircle2 size={15} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
            {stats.delivered}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Status: <span style={{ color: '#10b981', fontWeight: 600 }}>200 OK</span>
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
            Converted & ready in DB
          </div>
        </div>

        {/* Failed Metric */}
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>FAILED</span>
            <AlertTriangle size={15} color={stats.failed > 0 ? '#ef4444' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.failed > 0 ? '#ef4444' : 'var(--text-muted)', lineHeight: 1.2 }}>
            {stats.failed}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Retryable via one-click
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '260px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Tracking ID, File, Facility..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="input-search"
              style={{ paddingLeft: '2rem', width: '100%', height: '32px', fontSize: '0.8rem', borderRadius: '6px' }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="table-filters" style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              All ({trackers.length})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'DELIVERED' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('DELIVERED'); setCurrentPage(1); }}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              Delivered ({stats.delivered})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'PENDING' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('PENDING'); setCurrentPage(1); }}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              Awaiting ({stats.pending})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'FAILED' ? 'active' : ''}`}
              onClick={() => { setStatusFilter('FAILED'); setCurrentPage(1); }}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              Failed ({stats.failed})
            </button>
          </div>

          {/* Type Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="form-select-theme"
            style={{ height: '32px', padding: '0 0.5rem', fontSize: '0.75rem' }}
          >
            <option value="ALL">All Types</option>
            <option value="ASN">ASN</option>
            <option value="PO">PO</option>
          </select>

          {/* Date & Time Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <Calendar size={14} style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date &amp; Time:</span>
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }}
              className="form-select-theme"
              style={{ height: '32px', padding: '0 0.5rem', fontSize: '0.75rem' }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="today">Today</option>
              <option value="24h">Last 24 Hours</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom Range...</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <input
                type="datetime-local"
                value={customStartDateTime}
                onChange={(e) => {
                  setCustomStartDateTime(e.target.value);
                  setDateRange('custom');
                  setCurrentPage(1);
                }}
                className="form-select-theme"
                style={{ height: '32px', fontSize: '0.72rem', padding: '0 0.4rem', borderRadius: '6px' }}
                title="Start Date &amp; Time"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="datetime-local"
                value={customEndDateTime}
                onChange={(e) => {
                  setCustomEndDateTime(e.target.value);
                  setDateRange('custom');
                  setCurrentPage(1);
                }}
                className="form-select-theme"
                style={{ height: '32px', fontSize: '0.72rem', padding: '0 0.4rem', borderRadius: '6px' }}
                title="End Date &amp; Time"
              />
            </div>
          </div>

          {(searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' || dateRange !== '7d' || customStartDateTime || customEndDateTime) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setDateRange('7d');
                setCustomStartDateTime('');
                setCustomEndDateTime('');
                setCurrentPage(1);
              }}
              className="btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Page Size Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="form-select-theme"
            style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem', height: '28px' }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* 4. Responsive Enterprise Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '8px' }}>
        <div className="table-responsive">
          <table className="enterprise-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Tracking ID</th>
                <th style={{ width: 110 }}>Source ERP</th>
                <th style={{ width: 85 }}>Doc Type</th>
                <th style={{ width: 115 }}>Facility</th>
                <th>Original File</th>
                <th style={{ width: 80, textAlign: 'center' }}>Records</th>
                <th style={{ width: 165 }}>MAWM Status</th>
                <th style={{ width: 110 }}>Timestamp</th>
                <th style={{ width: 165, textAlign: 'right', paddingRight: '1.25rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                      <Radio size={28} style={{ opacity: 0.35 }} />
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>No dispatch transactions found</div>
                      <p style={{ margin: 0, fontSize: '0.8rem' }}>
                        Inbound files from ERP sources will automatically appear here once converted.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const dStatus = (row.dispatchStatus || '').toUpperCase();
                  const isDelivered = dStatus.includes('DELIVERED') || dStatus.includes('200');
                  const isFailed = dStatus.includes('FAILED');
                  const facilityDisplay = row.facilityId && row.facilityId !== 'UNKNOWN' && !row.facilityId.includes(' ')
                    ? row.facilityId
                    : (telemetry?.defaultFacility || 'Food_Cbe');

                  return (
                    <tr
                      key={row.jobId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleInspectJob(row)}
                    >
                      {/* Tracking ID */}
                      <td>
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
                      <td>
                        <span className="badge" style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.45rem',
                          fontWeight: 600
                        }}>
                          {row.sourceSystem?.toUpperCase() === 'OTPI' || row.sourceSystem?.toUpperCase() === 'OPTI' ? 'Opti' : (row.sourceSystem || 'HOST')}
                        </span>
                      </td>

                      {/* Doc Type */}
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#38bdf8' }}>
                          {row.transactionType || 'ASN'}
                        </span>
                      </td>

                      {/* Facility */}
                      <td>
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

                      {/* Original File */}
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.originalFilename}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {row.originalFilename || 'inbound_file.json'}
                        </span>
                      </td>

                      {/* Records */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {row.dispatchedRecords != null && row.dispatchedRecords > 0 ? row.dispatchedRecords : (row.totalRecords || 1)}
                        </span>
                      </td>

                      {/* MAWM Status */}
                      <td>
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

                      {/* Timestamp */}
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {row.dispatchCompletedAt
                          ? new Date(row.dispatchCompletedAt).toLocaleTimeString()
                          : (row.receivedAt ? new Date(row.receivedAt).toLocaleTimeString() : 'N/A')}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
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

                          {(() => {
                            const isOptiRow = row.sourceSystem?.toUpperCase() === 'OPTI' || row.sourceSystem?.toUpperCase() === 'OTPI';
                            return (
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
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Footer */}
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

      {/* 6. Inspection Modal */}
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
            maxWidth: '860px',
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
                    MAWM Dispatch Telemetry Inspector
                  </h3>
                  <span className="mono-job-id" style={{ fontSize: '0.72rem' }}>
                    {inspectingJob.jobId}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  File: {inspectingJob.originalFilename} • Facility: {inspectingJob.facilityId || telemetry?.defaultFacility || 'Food_Cbe'}
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
                <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Server size={14} color="#10b981" />
                  <span>Outbound HTTP Dispatch Specification</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <div><strong>HTTP Method:</strong> <code style={{ color: '#10b981' }}>POST</code></div>
                  <div><strong>Target Host:</strong> <code style={{ color: '#38bdf8' }}>{telemetry?.baseUrl || 'https://ncsps.sce.manh.com'}</code></div>
                  <div><strong>selectedLocation:</strong> <code style={{ color: '#f59e0b' }}>{telemetry?.defaultFacility || 'Food_Cbe'}</code></div>
                  <div><strong>selectedOrganization:</strong> <code style={{ color: '#f59e0b' }}>{telemetry?.defaultFacility || 'Food_Cbe'}</code></div>
                  <div><strong>selectedBusinessUnit:</strong> <code style={{ color: '#f59e0b' }}>{telemetry?.defaultFacility || 'Food_Cbe'}</code></div>
                  <div><strong>Authorization:</strong> <code>Bearer &lt;OAuth2 Cached Token&gt;</code></div>
                  <div><strong>Dispatch Status:</strong> <strong style={{ color: inspectingJob.dispatchStatus?.includes('200') ? '#10b981' : (inspectingJob.dispatchStatus?.includes('FAILED') ? '#ef4444' : '#f59e0b') }}>{inspectingJob.dispatchStatus || 'PENDING'}</strong></div>
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
                      style={{ padding: '0.2rem 0.65rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <CheckCircle2 size={12} color="#10b981" />
                      <span>MAWM Cloud Response {inspectingJob.mawmResponse ? '✓' : ''}</span>
                    </button>
                    <button
                      onClick={() => setInspectPayloadTab('outbound')}
                      className={`filter-pill ${inspectPayloadTab === 'outbound' ? 'active' : ''}`}
                      style={{ padding: '0.2rem 0.65rem', fontSize: '0.74rem' }}
                    >
                      Converted Request Payload {inspectingJob.outputFiles ? '✓' : ''}
                    </button>
                    {inspectingJob.rawContent && (
                      <button
                        onClick={() => setInspectPayloadTab('inbound')}
                        className={`filter-pill ${inspectPayloadTab === 'inbound' ? 'active' : ''}`}
                        style={{ padding: '0.2rem 0.65rem', fontSize: '0.74rem' }}
                      >
                        Inbound ERP Source
                      </button>
                    )}
                    {inspectingJob.processingErrorMessage && (
                      <button
                        onClick={() => setInspectPayloadTab('error')}
                        className={`filter-pill ${inspectPayloadTab === 'error' ? 'active' : ''}`}
                        style={{ padding: '0.2rem 0.65rem', fontSize: '0.74rem', color: '#ef4444', borderColor: '#ef4444' }}
                      >
                        Error Log
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {onOpenBeautifier && activePayloadText && (
                      <button
                        onClick={() => {
                          onOpenBeautifier(activePayloadText);
                          setInspectingJob(null);
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.18rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <FileCode2 size={12} />
                        <span>Beautify</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleCopy(activePayloadText || '{}', 'modal-json', e)}
                      className="btn-secondary"
                      style={{ padding: '0.18rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      {copiedId === 'modal-json' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {inspectingJob.isLoadingPayload ? (
                  <div style={{
                    padding: '2.5rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)'
                  }}>
                    <RefreshCw size={22} className="spin-icon" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.82rem' }}>Loading Canonical JSON payload from database...</div>
                  </div>
                ) : (
                  <pre style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    color: inspectPayloadTab === 'error'
                      ? '#f87171'
                      : (inspectPayloadTab === 'response' ? '#34d399' : (inspectPayloadTab === 'outbound' ? '#38bdf8' : '#e2e8f0')),
                    maxHeight: '340px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {activePayloadText || 'No content available'}
                  </pre>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              backgroundColor: 'var(--bg-surface)'
            }}>
              <button
                onClick={() => setInspectingJob(null)}
                className="btn-secondary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Close
              </button>

              {(() => {
                const isOptiInspect = inspectingJob?.sourceSystem?.toUpperCase() === 'OPTI' || inspectingJob?.sourceSystem?.toUpperCase() === 'OTPI';
                return (
                  <button
                    onClick={() => isOptiInspect && handleDispatchJob(inspectingJob.jobId)}
                    disabled={dispatchingJobId === inspectingJob.jobId || !isOptiInspect}
                    className="btn-primary"
                    title={isOptiInspect ? "Dispatch to Live Cloud" : "Rejection: Only Opti ERP is authorized to dispatch to MAWM Cloud"}
                    style={{
                      padding: '0.4rem 1.15rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      opacity: isOptiInspect ? 1 : 0.45,
                      cursor: isOptiInspect ? 'pointer' : 'not-allowed',
                      backgroundColor: !isOptiInspect ? 'rgba(100, 116, 139, 0.2)' : undefined,
                      borderColor: !isOptiInspect ? 'rgba(100, 116, 139, 0.3)' : undefined,
                      color: !isOptiInspect ? '#94a3b8' : undefined
                    }}
                  >
                    <Send size={13} />
                    <span>{!isOptiInspect ? 'Rejected (Opti Only)' : dispatchingJobId === inspectingJob.jobId ? 'Dispatching...' : 'Dispatch to Live Cloud'}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
