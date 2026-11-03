import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Layers,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  FileText,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  FileCode,
  SlidersHorizontal,
  ChevronDown,
  Download,
  Cloud,
  RefreshCw,
  Trash2,
  UploadCloud,
  Server,
  Send,
  ExternalLink,
  X,
  Code
} from 'lucide-react';
import JobDetailsPage from './JobDetailsPage';
import ConfirmDialogModal from '../common/ConfirmDialogModal';
import { integrationApi } from '../../services/integrationApi';

const mapTrackerRow = (r) => ({
  jobId: r.jobId,
  sourceSystem: r.sourceSystem || 'UNKNOWN_SOURCE',
  transactionType: r.transactionType || 'PO',
  mappingProfile: r.mappingProfile,
  inputFormat: r.inputFormat || 'CSV',
  originalFilename: r.originalFilename,
  facilityId: r.facilityId,
  fileSizeBytes: r.fileSizeBytes,
  fileChecksum: r.fileChecksum,
  storagePath: r.storagePath,
  rawContent: r.rawContent,
  createdAt: r.receivedAt || r.updatedAt,
  status: r.intakeStatus === 'CONVERTED' ? 'COMPLETED' : (r.intakeStatus || 'RECEIVED'),
  dispatchStatus: r.dispatchStatus,
  mawmResponse: r.mawmResponse,
  dispatchedRecords: r.dispatchedRecords,
  dispatchFailedRecords: r.dispatchFailedRecords,
  dispatchCompletedAt: r.dispatchCompletedAt,
  totalRecords: r.totalRecords || 1,
  convertedRecords: r.convertedRecords || (r.intakeStatus === 'CONVERTED' ? 1 : 0),
  errorRecords: r.errorRecords || 0,
  isClaimCheck: (r.storagePath && r.storagePath.startsWith('s3://')) || (r.rawContent && r.rawContent.includes('CLAIM_CHECK')) || Boolean(r.isClaimCheck)
});

export default function IntegrationJobsPage({ 
  onNavigateToOverview, 
  activeJobId, 
  onActiveJobChange,
  initialSourceFilter = 'ALL',
  onClearSourceFilter,
  onOpenTestUpload
}) {
  const [liveJobs, setLiveJobs] = useState(() => {
    const cached = integrationApi.getCachedTrackers();
    return Array.isArray(cached) && cached.length > 0 ? cached.map(mapTrackerRow) : [];
  });
  const [isLoading, setIsLoading] = useState(() => !integrationApi.getCachedTrackers());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState(() => (
    typeof initialSourceFilter === 'string' && initialSourceFilter.trim() ? initialSourceFilter.trim() : 'ALL'
  ));

  useEffect(() => {
    const safe = typeof initialSourceFilter === 'string' && initialSourceFilter.trim() ? initialSourceFilter.trim() : 'ALL';
    setSourceFilter(safe);
    setCurrentPage(1);
  }, [initialSourceFilter]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [internalJobId, setInternalJobId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const [customStartDateTime, setCustomStartDateTime] = useState('');
  const [customEndDateTime, setCustomEndDateTime] = useState('');
  const [quickMawmJob, setQuickMawmJob] = useState(null);
  const [quickMawmTab, setQuickMawmTab] = useState('response');
  const [copiedQuickMawm, setCopiedQuickMawm] = useState(false);
  const [isRedispatching, setIsRedispatching] = useState(false);

  const handleRedispatchMawm = async (jobId) => {
    if (!jobId) return;
    setIsRedispatching(true);
    try {
      const res = await integrationApi.dispatchMawmJob(jobId);
      await fetchTrackers(false);
      if (quickMawmJob && quickMawmJob.jobId === jobId) {
        setQuickMawmJob((prev) => ({
          ...prev,
          dispatchStatus: 'DELIVERED_TO_MAWM (200 OK)',
          mawmResponse: res.response || prev.mawmResponse,
        }));
      }
    } catch (err) {
      console.error('Failed to dispatch job to MAWM:', err);
    } finally {
      setIsRedispatching(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const jobId = deleteTarget.jobId;
    setDeletingId(jobId);
    try {
      await integrationApi.deleteTracker(jobId);
      setLiveJobs((prev) => prev.filter((j) => j.jobId !== jobId));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const resolveCustomerRawFilename = (job) => {
    if (!job) return 'customer_upload.csv';
    const fmt = (job.inputFormat || '').toUpperCase();
    const ext = fmt.includes('JSON') ? '.json' : fmt.includes('XML') ? '.xml' : fmt.includes('EDI') ? '.edi' : '.csv';
    if (job.originalFilename && job.originalFilename.trim().length > 0) {
      const fn = job.originalFilename.trim();
      if (fn.toLowerCase().endsWith(ext)) return fn;
      if (fn.includes('.')) return `${fn.substring(0, fn.lastIndexOf('.'))}${ext}`;
      return `${fn}${ext}`;
    }
    return `raw_${(job.jobId || 'file').slice(0, 8)}${ext}`;
  };

  const fetchTrackers = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const rows = await integrationApi.getTrackers(showLoading);
      if (Array.isArray(rows)) {
        setLiveJobs(rows.map(mapTrackerRow));
      }
    } catch (e) {
      console.warn('Could not load live PostgreSQL tracker data:', e);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasData = liveJobs.length > 0 || !!integrationApi.getCachedTrackers();
    fetchTrackers(!hasData);
    // Realtime polling every 6 seconds to capture new ERP transmissions automatically
    const interval = setInterval(() => {
      fetchTrackers(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchTrackers]);

  const effectiveJobs = liveJobs;

  // Dynamic Real-time Source Systems extracted from live database rows
  const availableSources = useMemo(() => {
    const counts = {};
    effectiveJobs.forEach((j) => {
      if (j.sourceSystem && j.sourceSystem.trim()) {
        const src = j.sourceSystem.trim();
        counts[src] = (counts[src] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
  }, [effectiveJobs]);

  // Dynamic Real-time Transaction Types extracted from live database rows
  const availableTypes = useMemo(() => {
    const counts = {};
    effectiveJobs.forEach((j) => {
      if (j.transactionType && j.transactionType.trim()) {
        const type = j.transactionType.trim();
        counts[type] = (counts[type] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }, [effectiveJobs]);

  // Synchronize with external activeJobId if controlled, or fallback to internalJobId
  const inspectedJobId = activeJobId !== undefined && activeJobId !== null ? activeJobId : internalJobId;

  const handleOpenJob = (jobId) => {
    setInternalJobId(jobId);
    if (onActiveJobChange) onActiveJobChange(jobId);
  };

  const handleBackFromDetails = () => {
    setInternalJobId(null);
    if (onActiveJobChange) onActiveJobChange(null);
  };

  // Compute live counts derived from existing data model
  const jobCounts = useMemo(() => {
    const all = effectiveJobs.length;
    const completed = effectiveJobs.filter((j) => j.status === 'COMPLETED').length;
    const mawmDelivered = effectiveJobs.filter(
      (j) => j.dispatchStatus && (j.dispatchStatus.includes('DELIVERED') || j.dispatchStatus.includes('200'))
    ).length;
    const mawmAwaiting = effectiveJobs.filter(
      (j) => !j.dispatchStatus || j.dispatchStatus === 'PENDING' || j.dispatchStatus === 'SAVED' || j.dispatchStatus === 'AWAITING' || j.dispatchStatus.includes('SAVED')
    ).length;
    const withErrors = effectiveJobs.filter(
      (j) => j.status === 'COMPLETED_WITH_ERRORS' || (j.errorRecords > 0 && j.status !== 'FAILED')
    ).length;
    const failed = effectiveJobs.filter((j) => j.status === 'FAILED' || (j.dispatchStatus && j.dispatchStatus.includes('FAIL'))).length;
    return { all, completed, mawmDelivered, mawmAwaiting, withErrors, failed };
  }, [effectiveJobs]);

  // Filter jobs based on status, source, type, date range, and search query
  const filteredJobs = useMemo(() => {
    return effectiveJobs.filter((job) => {
      // 1. Status Filter
      if (statusFilter === 'COMPLETED' && job.status !== 'COMPLETED') return false;
      if (
        statusFilter === 'MAWM_DELIVERED' &&
        (!job.dispatchStatus || (!job.dispatchStatus.includes('DELIVERED') && !job.dispatchStatus.includes('200')))
      ) {
        return false;
      }
      if (
        statusFilter === 'MAWM_AWAITING' &&
        (job.dispatchStatus && (job.dispatchStatus.includes('DELIVERED') || job.dispatchStatus.includes('200') || job.dispatchStatus.includes('FAIL')))
      ) {
        return false;
      }
      if (
        statusFilter === 'ERRORS' &&
        !(job.status === 'COMPLETED_WITH_ERRORS' || (job.errorRecords > 0 && job.status !== 'FAILED'))
      ) {
        return false;
      }
      if (statusFilter === 'FAILED' && job.status !== 'FAILED' && (!job.dispatchStatus || !job.dispatchStatus.includes('FAIL'))) {
        return false;
      }

      // 2. Source ERP Filter
      if (sourceFilter !== 'ALL' && job.sourceSystem !== sourceFilter) return false;

      // 3. Transaction Type Filter
      if (typeFilter !== 'ALL' && job.transactionType !== typeFilter) return false;

      // 4. Date & Time Range Filter
      const timeStr = job.dispatchCompletedAt || job.updatedAt || job.createdAt;
      if (timeStr) {
        const rowTime = new Date(timeStr).getTime();
        const now = Date.now();
        if (dateRange === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (rowTime < startOfToday.getTime()) return false;
        } else if (dateRange === '24h') {
          if (now - rowTime > 24 * 60 * 60 * 1000) return false;
        } else if (dateRange === '7d') {
          if (now - rowTime > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateRange === '30d') {
          if (now - rowTime > 30 * 24 * 60 * 60 * 1000) return false;
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

      // 5. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = (job.jobId || '').toLowerCase().includes(query);
        const matchesFilename = (job.originalFilename || '').toLowerCase().includes(query);
        const matchesSource = (job.sourceSystem || '').toLowerCase().includes(query);
        const matchesType = (job.transactionType || '').toLowerCase().includes(query);
        const matchesProfile = (job.mappingProfile || '').toLowerCase().includes(query);
        const matchesFormat = (job.inputFormat || '').toLowerCase().includes(query);
        const matchesDispatch = (job.dispatchStatus || '').toLowerCase().includes(query);

        if (!matchesId && !matchesFilename && !matchesSource && !matchesType && !matchesProfile && !matchesFormat && !matchesDispatch) {
          return false;
        }
      }

      return true;
    });
  }, [effectiveJobs, statusFilter, sourceFilter, typeFilter, dateRange, customStartDateTime, customEndDateTime, searchQuery]);

  // Pagination calculations
  const totalRecords = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, currentPage, pageSize]);

  const handleStatusFilterChange = (filter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setSourceFilter('ALL');
    setTypeFilter('ALL');
    setDateRange('7d');
    setCustomStartDateTime('');
    setCustomEndDateTime('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleCopyJobId = (id, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sourceBadgeClass = (source) => {
    const s = (source || '').toUpperCase();
    switch (s) {
      case 'OPTI':
      case 'OTPI':
        return 'badge-orange';
      case 'SAP':
      case 'SAP_ERP':
        return 'badge-blue';
      case 'LOGISTICS_PARTNER':
        return 'badge-purple';
      case 'CUSTOMER_A_ERP':
        return 'badge-teal';
      default:
        return 'badge-orange';
    }
  };

  const formatSourceName = (source) => {
    if (!source) return 'Unknown';
    if (source.toUpperCase() === 'OTPI' || source.toUpperCase() === 'OPTI') {
      return 'Opti';
    }
    return source;
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    dateRange !== '7d' ||
    customStartDateTime !== '' ||
    customEndDateTime !== '' ||
    searchQuery.trim() !== '';

  if (inspectedJobId) {
    return (
      <JobDetailsPage
        jobId={inspectedJobId}
        onBack={handleBackFromDetails}
      />
    );
  }

  return (
    <div className="page-container">
      {/* 1. Header / Breadcrumb & Navigation */}
      <section className="overview-hero" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div className="overview-hero-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <button
              onClick={onNavigateToOverview}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: 'var(--primary-500)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Overview</span>
            </button>
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>ERB Jobs Registry</span>
          </div>
          <h2 style={{ fontSize: '1.4rem' }}>ERB — Integration Jobs Registry</h2>
          <p style={{ maxWidth: 840, fontSize: '0.82rem' }}>
            Comprehensive audit registry of enterprise inbound payload runs, schema transformations, and canonical
            envelopes dispatched toward Manhattan Active Warehouse Management (MAWM).
          </p>
        </div>

        <div className="overview-hero-actions">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              padding: '0.45rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            <Clock size={14} color="var(--text-dim)" />
            <span>Dataset: {effectiveJobs.length} Processed Batches</span>
          </div>
        </div>
      </section>

      {/* Active ERP Source Filter Notification Banner */}
      {typeof sourceFilter === 'string' && sourceFilter !== 'ALL' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: 8,
          backgroundColor: 'rgba(2, 132, 199, 0.12)',
          border: '1px solid rgba(2, 132, 199, 0.35)',
          color: 'var(--text-main)',
          fontSize: '0.85rem',
          boxShadow: '0 2px 10px rgba(2, 132, 199, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#0284c7',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              ✓
            </span>
            <span>
              Auditing File Tracker & API Logs for Source ERP: <strong style={{ color: '#0284c7', fontSize: '0.95rem' }}>{String(sourceFilter)}</strong>
            </span>
            <span style={{
              fontSize: '0.75rem',
              backgroundColor: 'rgba(2, 132, 199, 0.2)',
              color: '#38bdf8',
              padding: '0.15rem 0.5rem',
              borderRadius: 4,
              fontWeight: 600
            }}>
              {filteredJobs.length} batches
            </span>
          </div>
          <button
            onClick={() => {
              setSourceFilter('ALL');
              if (onClearSourceFilter) onClearSourceFilter();
            }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              borderRadius: 6,
              color: 'var(--text-main)',
              padding: '0.35rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            ✕ Clear Filter (Show All ERPs)
          </button>
        </div>
      )}

      {/* 4. Main Table Panel */}
      <section className="table-panel">
        {/* Toolbar Header & Search/Filters */}
        <div className="table-toolbar">
          <div className="table-title-group">
            <h3>
              Integration Jobs ({filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'})
            </h3>
            <p>
              Showing page {currentPage} of {totalPages} • Querying across source ERP networks and canonical converters
            </p>
          </div>

          {/* Controls: Search, Selects, and Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Global Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search UUID, File, ERP, Profile..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-input-theme"
              />
            </div>

            {/* Source ERP Dropdown (Dynamic from real-time database) */}
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-select-theme"
              title="Filter by live ERP source systems"
            >
              <option value="ALL">All Source Systems</option>
              {availableSources
                .filter(({ source }) => source && !['files', 'ingest', 'raw'].includes(source.toLowerCase()))
                .map(({ source }) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
              ))}
            </select>

            {/* Transaction Type Dropdown (Dynamic from real-time database) */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-select-theme"
              title="Filter by live document transaction types"
            >
              <option value="ALL">All Transaction Types</option>
              {availableTypes.map(({ type }) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Date & Time Range Filter */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select-theme"
                style={{ minWidth: 125 }}
                title="Filter by ingestion time range"
              >
                <option value="today">Today</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="custom">Custom Range...</option>
              </select>

              {dateRange === 'custom' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="datetime-local"
                    value={customStartDateTime}
                    onChange={(e) => {
                      setCustomStartDateTime(e.target.value);
                      setDateRange('custom');
                      setCurrentPage(1);
                    }}
                    className="form-input-theme"
                    style={{ padding: '0.3rem 0.45rem', fontSize: '0.74rem' }}
                    title="Start Date & Time"
                  />
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>to</span>
                  <input
                    type="datetime-local"
                    value={customEndDateTime}
                    onChange={(e) => {
                      setCustomEndDateTime(e.target.value);
                      setDateRange('custom');
                      setCurrentPage(1);
                    }}
                    className="form-input-theme"
                    style={{ padding: '0.3rem 0.45rem', fontSize: '0.74rem' }}
                    title="End Date & Time"
                  />
                </div>
              )}
            </div>

            {/* Test Upload Action Button */}
            {onOpenTestUpload && (
              <button
                type="button"
                onClick={onOpenTestUpload}
                className="btn-secondary"
                style={{
                  padding: '0.42rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)'
                }}
                title="Test File Upload & Ingestion (CSV, XML, JSON, Excel, EDI)"
              >
                <UploadCloud size={13} />
                <span>Test Upload</span>
              </button>
            )}

            {/* Manual Live Sync Button */}
            <button
              onClick={() => fetchTrackers(true)}
              className="btn-secondary"
              style={{ padding: '0.42rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              title="Sync live records from database"
            >
              <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Live Sync'}</span>
            </button>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.25rem' }}
                title="Clear all active filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs Bar */}
        <div
          style={{
            padding: '0.65rem 1.5rem',
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div className="table-filters">
            <button
              className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('ALL')}
            >
              All ({jobCounts.all})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('COMPLETED')}
            >
              Completed ({jobCounts.completed})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'MAWM_DELIVERED' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('MAWM_DELIVERED')}
              style={statusFilter === 'MAWM_DELIVERED' ? { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: '#10b981' } : {}}
            >
              MAWM Delivered ({jobCounts.mawmDelivered})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'MAWM_AWAITING' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('MAWM_AWAITING')}
              style={statusFilter === 'MAWM_AWAITING' ? { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', borderColor: '#f59e0b' } : {}}
            >
              MAWM Awaiting ({jobCounts.mawmAwaiting})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'ERRORS' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('ERRORS')}
            >
              With Errors ({jobCounts.withErrors})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'FAILED' ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange('FAILED')}
            >
              Failed ({jobCounts.failed})
            </button>
          </div>

          {/* Page Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="form-select-theme"
              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Job ID</th>
                <th>Source ERP</th>
                <th>Transaction</th>
                <th>File Name & Format</th>
                <th>Valid Records</th>
                <th>Error Count</th>
                <th>Status</th>
                <th>MAWM Dispatch</th>
                <th>Ingestion Timestamp</th>
                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.length > 0 ? (
                paginatedJobs.map((job) => {
                  const total = job.totalRecords || 1;
                  const validPct = Math.round((job.convertedRecords / total) * 100);
                  const errorPct = Math.round((job.errorRecords / total) * 100);

                  return (
                    <tr key={job.jobId} style={{ cursor: 'pointer' }} onClick={() => handleOpenJob(job.jobId)}>
                      {/* 1. Job ID */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span
                            className="mono-job-id"
                            title={`Inspect details for ${job.jobId}`}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenJob(job.jobId);
                            }}
                          >
                            {job.jobId.slice(0, 8)}...
                          </span>
                          <button
                            onClick={(e) => handleCopyJobId(job.jobId, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: copiedId === job.jobId ? 'var(--success-text)' : 'var(--text-muted)',
                              padding: '0.15rem',
                              display: 'inline-flex',
                            }}
                            title="Copy full Job UUID"
                          >
                            {copiedId === job.jobId ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* 2. Source ERP */}
                      <td>
                        <span className={`badge ${sourceBadgeClass(job.sourceSystem)}`}>
                          {formatSourceName(job.sourceSystem)}
                        </span>
                      </td>

                      {/* 3. Transaction Type */}
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            backgroundColor: 'var(--bg-subtle)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 4,
                            fontSize: '0.74rem',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          {job.transactionType}
                        </span>
                      </td>

                      {/* 4. File Name and Input Format */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <a
                            href={integrationApi.getRawDownloadUrl(job.jobId)}
                            download={resolveCustomerRawFilename(job)}
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                            title={`Click to download customer uploaded ${resolveCustomerRawFilename(job)}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                              {job.originalFilename || resolveCustomerRawFilename(job)}
                            </span>
                            <Download size={12} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                          </a>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <strong style={{ color: 'var(--primary-500)' }}>{job.inputFormat}</strong> • {job.mappingProfile}
                          </span>
                        </div>
                      </td>

                      {/* 5. Valid Record Count */}
                      <td>
                        <div className="table-throughput">
                          <div className="table-throughput-labels">
                            <span style={{ color: 'var(--success-text)' }}>
                              {job.convertedRecords} valid
                            </span>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>
                              /{job.totalRecords}
                            </span>
                          </div>
                          <div className="table-throughput-track">
                            <div className="track-valid" style={{ width: `${validPct}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* 6. Error Count */}
                      <td>
                        {job.errorRecords > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: 'var(--error-text)',
                              fontWeight: 700,
                              fontSize: '0.76rem',
                              backgroundColor: 'var(--error-bg)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: 4,
                              border: '1px solid var(--error-border)',
                            }}
                          >
                            <AlertTriangle size={12} />
                            <span>{job.errorRecords}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>0</span>
                        )}
                      </td>

                      {/* 7. Job Status */}
                      <td>
                        {job.status === 'COMPLETED' ? (
                          <span className="status-badge status-completed">
                            <CheckCircle2 size={12} />
                            COMPLETED
                          </span>
                        ) : job.status === 'COMPLETED_WITH_ERRORS' ? (
                          <span className="status-badge status-errors">
                            <AlertTriangle size={12} />
                            ERRORS ({job.errorRecords})
                          </span>
                        ) : (
                          <span className="status-badge status-failed">
                            <XCircle size={12} />
                            FAILED
                          </span>
                        )}
                      </td>

                      {/* 7b. MAWM Dispatch Status */}
                      <td onClick={(e) => {
                        e.stopPropagation();
                        if (job.mawmResponse) {
                          setQuickMawmJob(job);
                        } else {
                          handleOpenJob(job.jobId);
                        }
                      }}>
                        {(() => {
                          const dStatus = job.dispatchStatus || '';
                          if (dStatus.includes('DELIVERED') || dStatus.includes('200')) {
                            return (
                              <span
                                className="badge"
                                title="Click to view live MAWM Cloud 200 OK response"
                                style={{
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  fontSize: '0.73rem',
                                }}
                              >
                                <CheckCircle2 size={12} />
                                DELIVERED (200 OK)
                              </span>
                            );
                          }
                          if (dStatus.includes('FAIL') || dStatus.includes('ERROR')) {
                            return (
                              <span
                                className="badge"
                                title="MAWM Cloud delivery failed - Click to view diagnostics"
                                style={{
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: 6,
                                  fontWeight: 700,
                                  fontSize: '0.73rem',
                                }}
                              >
                                <AlertTriangle size={12} />
                                FAILED
                              </span>
                            );
                          }
                          return (
                            <span
                              className="badge"
                              title="Awaiting MAWM Cloud delivery"
                              style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: '0.73rem',
                              }}
                            >
                              <Clock size={12} />
                              AWAITING
                            </span>
                          );
                        })()}
                      </td>

                      {/* 8. Ingestion Timestamp */}
                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} color="var(--text-dim)" />
                          {job.createdAt
                            ? new Date(job.createdAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </span>
                      </td>

                      {/* 9. Inspect & Direct S3 Download Actions */}
                      <td style={{ textAlign: 'right', paddingRight: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            className="btn-secondary"
                            style={{
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.72rem',
                              color: '#10b981',
                              borderColor: 'rgba(16, 185, 129, 0.35)',
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickMawmJob(job);
                            }}
                            title="Inspect MAWM Cloud delivery telemetry and live 200 OK response"
                          >
                            <Server size={12} />
                            <span>MAWM</span>
                          </button>
                          <a
                            href={integrationApi.getRawDownloadUrl(job.jobId)}
                            download={resolveCustomerRawFilename(job)}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                            title={`Download customer uploaded ${job.inputFormat || 'raw'} file (${resolveCustomerRawFilename(job)})`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={12} />
                            <span>Download {job.inputFormat || 'Raw'}</span>
                          </a>
                          <a
                            href={integrationApi.getJsonDownloadUrl(job.jobId)}
                            download={`${job.jobId}_canonical_mawm.json`}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                            title="Download canonical JSON directly from Amazon S3 via Pre-Signed URL"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileCode size={12} />
                            <span>MAWM JSON</span>
                          </a>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenJob(job.jobId);
                            }}
                            title="Inspect Job Artifacts & Diagnostics"
                          >
                            <Eye size={13} />
                            <span>Inspect</span>
                          </button>
                          <button
                            className="btn-secondary"
                            style={{
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.72rem',
                              color: '#ef4444',
                              borderColor: 'rgba(239, 68, 68, 0.35)',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(job);
                            }}
                            disabled={deletingId === job.jobId}
                            title={`Permanently delete transaction ${job.jobId} from database`}
                          >
                            <Trash2 size={12} />
                            <span>{deletingId === job.jobId ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={28} color="var(--text-dim)" />
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        No integration jobs match your filter criteria
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0, maxWidth: 360 }}>
                        Try adjusting your search query, status tab, or source ERP selector to display available job runs.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="btn-primary"
                          style={{ marginTop: '0.75rem', fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
                        >
                          <RotateCcw size={12} />
                          <span>Reset All Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            Showing {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} jobs
            {hasActiveFilters && ` (filtered from ${effectiveJobs.length} total)`}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span style={{ fontWeight: 600, color: 'var(--text-main)', padding: '0 0.25rem' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              className="btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Quick MAWM Inspection Modal */}
      {quickMawmJob && (
        <div
          className="modal-overlay"
          onClick={() => setQuickMawmJob(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #30363d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#161b22',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Server size={18} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>MAWM Dispatch Telemetry Inspector</span>
                    <span style={{ fontSize: '0.72rem', color: '#58a6ff', fontFamily: 'monospace', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                      {quickMawmJob.jobId}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#8b949e', marginTop: 2 }}>
                    File: <strong>{quickMawmJob.originalFilename}</strong> • Source: <strong>{quickMawmJob.sourceSystem}</strong> • Facility: <strong>{quickMawmJob.facilityId || 'Food_Cbe'}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setQuickMawmJob(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b949e',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {/* Outbound Dispatch Specification */}
              <div
                style={{
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.45rem', color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Server size={13} color="#10b981" />
                  <span>Outbound HTTP Dispatch Specification</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.4rem', color: '#8b949e' }}>
                  <div><strong>HTTP Method:</strong> <code style={{ color: '#10b981' }}>POST</code></div>
                  <div><strong>Target Host:</strong> <code style={{ color: '#38bdf8' }}>https://ncsps.sce.manh.com</code></div>
                  <div><strong>selectedLocation:</strong> <code style={{ color: '#f59e0b' }}>{quickMawmJob.facilityId || 'Food_Cbe'}</code></div>
                  <div><strong>selectedOrganization:</strong> <code style={{ color: '#f59e0b' }}>{quickMawmJob.facilityId || 'Food_Cbe'}</code></div>
                  <div><strong>selectedBusinessUnit:</strong> <code style={{ color: '#f59e0b' }}>{quickMawmJob.facilityId || 'Food_Cbe'}</code></div>
                  <div><strong>Authorization:</strong> <code>Bearer &lt;OAuth2 Cached Token&gt;</code></div>
                  <div>
                    <strong>Dispatch Status:</strong>{' '}
                    <strong style={{ color: quickMawmJob.dispatchStatus?.includes('200') || quickMawmJob.dispatchStatus?.includes('DELIVERED') ? '#10b981' : (quickMawmJob.dispatchStatus?.includes('FAIL') ? '#ef4444' : '#f59e0b') }}>
                      {quickMawmJob.dispatchStatus || 'PENDING'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Payload Tabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    onClick={() => setQuickMawmTab('response')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: quickMawmTab === 'response' ? '#10b981' : '#30363d',
                      backgroundColor: quickMawmTab === 'response' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      color: quickMawmTab === 'response' ? '#10b981' : '#8b949e',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>MAWM Cloud Response</span>
                  </button>
                  <button
                    onClick={() => setQuickMawmTab('payload')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: quickMawmTab === 'payload' ? '#38bdf8' : '#30363d',
                      backgroundColor: quickMawmTab === 'payload' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      color: quickMawmTab === 'payload' ? '#38bdf8' : '#8b949e',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Code size={13} />
                    <span>Converted Request Payload</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const text = quickMawmTab === 'response'
                      ? (typeof quickMawmJob.mawmResponse === 'string' ? quickMawmJob.mawmResponse : JSON.stringify(quickMawmJob.mawmResponse, null, 2))
                      : (quickMawmJob.rawContent || '// No payload available');
                    navigator.clipboard?.writeText(text);
                    setCopiedQuickMawm(true);
                    setTimeout(() => setCopiedQuickMawm(false), 2000);
                  }}
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.74rem',
                    color: copiedQuickMawm ? '#10b981' : '#8b949e',
                    border: '1px solid #30363d',
                    backgroundColor: '#161b22',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  {copiedQuickMawm ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedQuickMawm ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Code Pre Block */}
              <div
                style={{
                  backgroundColor: '#090d13',
                  border: '1px solid #21262d',
                  borderRadius: '8px',
                  padding: '1rem',
                  maxHeight: '360px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: quickMawmTab === 'response' ? '#34d399' : '#e6edf3',
                  lineHeight: 1.5,
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {(() => {
                    if (quickMawmTab === 'response') {
                      if (!quickMawmJob.mawmResponse) {
                        return JSON.stringify({
                          status: quickMawmJob.dispatchStatus || 'PENDING',
                          trackingId: quickMawmJob.jobId,
                          message: quickMawmJob.dispatchStatus?.includes('DELIVERED')
                            ? 'Acknowledged receipt by Manhattan Active WMS Cloud'
                            : 'Waiting for MAWM Cloud response acknowledgment...',
                        }, null, 2);
                      }
                      try {
                        const parsed = typeof quickMawmJob.mawmResponse === 'string'
                          ? JSON.parse(quickMawmJob.mawmResponse)
                          : quickMawmJob.mawmResponse;
                        return JSON.stringify(parsed, null, 2);
                      } catch (e) {
                        return String(quickMawmJob.mawmResponse);
                      }
                    } else {
                      return quickMawmJob.rawContent || '// No payload available';
                    }
                  })()}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid #30363d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#161b22',
              }}
            >
              <button
                onClick={() => setQuickMawmJob(null)}
                style={{
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.78rem',
                  backgroundColor: '#21262d',
                  border: '1px solid #30363d',
                  color: '#c9d1d9',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    const id = quickMawmJob.jobId;
                    setQuickMawmJob(null);
                    handleOpenJob(id);
                  }}
                  style={{
                    padding: '0.4rem 0.9rem',
                    fontSize: '0.78rem',
                    backgroundColor: 'transparent',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Eye size={13} />
                  <span>Full Job Details</span>
                </button>
                {(() => {
                  const isOpti = quickMawmJob?.sourceSystem?.toUpperCase() === 'OPTI' || quickMawmJob?.sourceSystem?.toUpperCase() === 'OTPI';
                  return (
                    <button
                      onClick={() => isOpti && handleRedispatchMawm(quickMawmJob.jobId)}
                      disabled={isRedispatching || !isOpti}
                      title={isOpti ? "Dispatch to Live Cloud" : "Rejection: Only Opti ERP is authorized for MAWM Cloud dispatch"}
                      style={{
                        padding: '0.4rem 0.9rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        backgroundColor: isOpti ? '#10b981' : 'rgba(100, 116, 139, 0.2)',
                        border: isOpti ? 'none' : '1px solid rgba(100, 116, 139, 0.3)',
                        color: isOpti ? '#ffffff' : '#94a3b8',
                        borderRadius: '6px',
                        cursor: (isRedispatching || !isOpti) ? 'not-allowed' : 'pointer',
                        opacity: isOpti ? 1 : 0.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Send size={13} />
                      <span>{!isOpti ? 'Opti Only' : isRedispatching ? 'Dispatching...' : 'Dispatch to Live Cloud'}</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (Bootbox replacement) */}
      <ConfirmDialogModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Transaction Record"
        recordName={deleteTarget?.originalFilename || deleteTarget?.jobId}
        recordId={deleteTarget?.jobId}
        details={deleteTarget ? [
          { label: 'ERP Source', value: deleteTarget.sourceSystem || '—' },
          { label: 'Document Type', value: deleteTarget.transactionType || '—' },
          { label: 'Status', value: deleteTarget.status || '—' },
          { label: 'Format', value: deleteTarget.inputFormat || '—' }
        ] : []}
        warningText="This will permanently delete this transaction from PostgreSQL database and purge all converted MAWM outputs. This action cannot be undone."
        confirmText="Delete Record"
        isLoading={Boolean(deletingId)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
