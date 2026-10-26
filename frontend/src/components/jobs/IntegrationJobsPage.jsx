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
  UploadCloud
} from 'lucide-react';
import JobDetailsPage from './JobDetailsPage';
import { integrationApi } from '../../services/integrationApi';

const mapTrackerRow = (r) => ({
  jobId: r.jobId,
  sourceSystem: r.sourceSystem || 'UNKNOWN_SOURCE',
  transactionType: r.transactionType || 'PO',
  mappingProfile: r.mappingProfile,
  inputFormat: r.inputFormat || 'CSV',
  originalFilename: r.originalFilename,
  fileSizeBytes: r.fileSizeBytes,
  fileChecksum: r.fileChecksum,
  storagePath: r.storagePath,
  rawContent: r.rawContent,
  createdAt: r.receivedAt || r.updatedAt,
  status: r.intakeStatus === 'CONVERTED' ? 'COMPLETED' : (r.intakeStatus || 'RECEIVED'),
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

  const handleDeleteJob = async (jobId, originalFilename, e) => {
    e.stopPropagation();
    const displayName = originalFilename || (jobId ? jobId.slice(0, 12) : 'Record');
    if (!window.confirm(`Are you sure you want to permanently delete transaction record "${displayName}" (${jobId}) from the database?`)) {
      return;
    }
    setDeletingId(jobId);
    try {
      await integrationApi.deleteTracker(jobId);
      setLiveJobs((prev) => prev.filter((j) => j.jobId !== jobId));
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      alert('Failed to delete transaction: ' + (err.message || 'Server error'));
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
    const withErrors = effectiveJobs.filter(
      (j) => j.status === 'COMPLETED_WITH_ERRORS' || (j.errorRecords > 0 && j.status !== 'FAILED')
    ).length;
    const failed = effectiveJobs.filter((j) => j.status === 'FAILED').length;
    return { all, completed, withErrors, failed };
  }, [effectiveJobs]);

  // Filter jobs based on status, source, type, and search query
  const filteredJobs = useMemo(() => {
    return effectiveJobs.filter((job) => {
      // 1. Status Filter
      if (statusFilter === 'COMPLETED' && job.status !== 'COMPLETED') return false;
      if (
        statusFilter === 'ERRORS' &&
        !(job.status === 'COMPLETED_WITH_ERRORS' || (job.errorRecords > 0 && job.status !== 'FAILED'))
      ) {
        return false;
      }
      if (statusFilter === 'FAILED' && job.status !== 'FAILED') return false;

      // 2. Source ERP Filter
      if (sourceFilter !== 'ALL' && job.sourceSystem !== sourceFilter) return false;

      // 3. Transaction Type Filter
      if (typeFilter !== 'ALL' && job.transactionType !== typeFilter) return false;

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = (job.jobId || '').toLowerCase().includes(query);
        const matchesFilename = (job.originalFilename || '').toLowerCase().includes(query);
        const matchesSource = (job.sourceSystem || '').toLowerCase().includes(query);
        const matchesType = (job.transactionType || '').toLowerCase().includes(query);
        const matchesProfile = (job.mappingProfile || '').toLowerCase().includes(query);
        const matchesFormat = (job.inputFormat || '').toLowerCase().includes(query);

        if (!matchesId && !matchesFilename && !matchesSource && !matchesType && !matchesProfile && !matchesFormat) {
          return false;
        }
      }

      return true;
    });
  }, [effectiveJobs, statusFilter, sourceFilter, typeFilter, searchQuery]);

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
    switch (source) {
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
    return source || 'Unknown';
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' || sourceFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery.trim() !== '';

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
              <option value="ALL">All Source Systems ({effectiveJobs.length})</option>
              {availableSources.map(({ source, count }) => (
                <option key={source} value={source}>
                  {source} ({count})
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
              <option value="ALL">All Transaction Types ({effectiveJobs.length})</option>
              {availableTypes.map(({ type, count }) => (
                <option key={type} value={type}>
                  {type} ({count})
                </option>
              ))}
            </select>

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
                            onClick={(e) => handleDeleteJob(job.jobId, job.originalFilename, e)}
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
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
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
    </div>
  );
}
