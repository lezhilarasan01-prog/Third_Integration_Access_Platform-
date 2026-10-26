import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Check,
  Copy,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {
  getAllTransactions,
  getTransactionSummary,
  formatSourceName,
  sourceBadgeClass
} from '../../services/transactionService';
import TransactionDetailsPage from './TransactionDetailsPage';

/**
 * Focused Business Transactions Page
 *
 * Streamlined to eliminate confusing synthetic ID clutter and redundant status columns.
 * Focuses on business documents (Purchase Orders and Advance Shipment Notices),
 * their source ERP, unified status, and quick inspection.
 *
 * @param {Function} onNavigateToJob - Callback to jump to parent Integration Job
 * @param {Function} onNavigateToOverview - Callback to return to Platform Overview
 */
export default function TransactionsPage({ onNavigateToJob, onNavigateToOverview }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [inspectedTxnId, setInspectedTxnId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const allTransactions = useMemo(() => getAllTransactions(), []);
  const summary = useMemo(() => getTransactionSummary(), []);

  // Filter transactions by business attributes
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((txn) => {
      // 1. Transaction Type (PO vs ASN)
      if (typeFilter !== 'ALL' && txn.transactionType !== typeFilter) return false;

      // 2. Source ERP System
      if (sourceFilter !== 'ALL' && txn.sourceSystem !== sourceFilter) return false;

      // 3. Unified Status (Ready for MAWM vs Quarantined)
      if (statusFilter === 'READY') {
        if (txn.validationStatus !== 'VALID') return false;
      } else if (statusFilter === 'QUARANTINED') {
        if (txn.validationStatus !== 'INVALID') return false;
      } else if (statusFilter === 'PENDING') {
        if (txn.validationStatus !== 'PENDING') return false;
      }

      // 4. Search Query (matches Order #, Trace ID, Batch ID, or Source)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRef = (txn.externalReference || '').toLowerCase().includes(query);
        const matchesTxnId = (txn.transactionId || '').toLowerCase().includes(query);
        const matchesJobId = (txn.parentJobId || '').toLowerCase().includes(query);
        const matchesSource = (txn.sourceSystem || '').toLowerCase().includes(query);

        if (!matchesRef && !matchesTxnId && !matchesJobId && !matchesSource) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions, typeFilter, statusFilter, sourceFilter, searchQuery]);

  // Pagination calculations
  const totalRecords = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const hasActiveFilters =
    typeFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setSourceFilter('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleCopy = (text, id, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // If a transaction is being inspected, render details view
  if (inspectedTxnId) {
    return (
      <TransactionDetailsPage
        transactionId={inspectedTxnId}
        onBack={() => setInspectedTxnId(null)}
        onNavigateToJob={onNavigateToJob}
      />
    );
  }

  return (
    <div className="page-container">
      {/* 1. Header & Navigation */}
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
                color: '#0284c7',
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
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Transactions</span>
          </div>

          <h2 style={{ fontSize: '1.4rem' }}>Orders & Shipments</h2>
          <p style={{ maxWidth: 840, fontSize: '0.82rem' }}>
            Individual Purchase Orders (PO) and Advance Shipment Notices (ASN) received from ERP systems,
            validated, and transformed for Manhattan Active Warehouse Management (MAWM).
          </p>
        </div>

        <div className="overview-hero-actions">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '0.45rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#334155',
            }}
          >
            <Clock size={14} color="#64748b" />
            <span>Dataset: {allTransactions.length} Total Records</span>
          </div>
        </div>
      </section>

      {/* 3. High-Focus KPI Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        {/* Total Documents */}
        <div className="job-meta-card" style={{ padding: '1rem 1.25rem' }}>
          <span className="job-meta-card-label">Total Documents</span>
          <div className="job-meta-card-value" style={{ fontSize: '1.4rem' }}>{summary.total}</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Purchase orders & shipments</span>
        </div>

        {/* Ready for MAWM */}
        <div
          style={{
            background: 'var(--success-bg)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--success-border)',
          }}
        >
          <span style={{ color: 'var(--success-text)', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 2 }}>
            Ready for MAWM
          </span>
          <div style={{ color: 'var(--success-text)', fontSize: '1.4rem', fontWeight: 700 }}>
            {summary.valid}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--success-text)', opacity: 0.9 }}>
            {Math.round((summary.valid / summary.total) * 100)}% valid & transformed to canonical JSON
          </span>
        </div>

        {/* Quarantined / Errors */}
        <div
          style={{
            background: 'var(--error-bg)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--error-border)',
          }}
        >
          <span style={{ color: 'var(--error-text)', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 2 }}>
            Quarantined (Exceptions)
          </span>
          <div style={{ color: 'var(--error-text)', fontSize: '1.4rem', fontWeight: 700 }}>
            {summary.invalid}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--error-text)', opacity: 0.9 }}>
            Validation errors needing operator review
          </span>
        </div>
      </section>

      {/* 4. Streamlined Filter & Search Controls */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by Order #, ASN #, Batch ID, or Source ERP..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.3rem',
                fontSize: '0.82rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter by Document Type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
            >
              <option value="ALL">All Documents</option>
              <option value="PO">Purchase Orders (PO)</option>
              <option value="ASN">Shipment Notices (ASN)</option>
            </select>
          </div>

          {/* Filter by Unified Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">Ready for MAWM</option>
              <option value="QUARANTINED">Quarantined (Errors)</option>
            </select>
          </div>

          {/* Filter by Source ERP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
              <option value="ALL">All Sources</option>
              <option value="CUSTOMER_A_ERP">CUSTOMER_A_ERP</option>
              <option value="CUSTOMER_B_ERP">CUSTOMER_B_ERP</option>
              <option value="LOGISTICS_PARTNER">LOGISTICS_PARTNER</option>
              <option value="SAP_ERP">SAP_ERP</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              title="Reset all search queries and filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* 5. Clean, Business-Focused Table (6 Focused Columns) */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="jobs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: '1.25rem', width: 220 }}>Document / Order #</th>
                <th style={{ width: 100 }}>Type</th>
                <th style={{ width: 180 }}>Source ERP</th>
                <th style={{ width: 170 }}>Status</th>
                <th style={{ width: 170 }}>Parent Batch</th>
                <th style={{ width: 150 }}>Processed</th>
                <th style={{ textAlign: 'right', paddingRight: '1.25rem', width: 90 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((txn) => {
                  const isReady = txn.validationStatus === 'VALID';
                  const isQuarantined = txn.validationStatus === 'INVALID';

                  return (
                    <tr
                      key={txn.transactionId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setInspectedTxnId(txn.transactionId)}
                    >
                      {/* 1. Document / Order # (Primary Business Key + Trace ID underneath) */}
                      <td style={{ paddingLeft: '1.25rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: 'var(--primary-500)',
                              }}
                            >
                              {txn.externalReference}
                            </span>
                            <button
                              onClick={(e) => handleCopy(txn.externalReference, txn.externalReference, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: copiedId === txn.externalReference ? 'var(--success-text)' : 'var(--text-muted)',
                                padding: '0.15rem',
                                display: 'inline-flex',
                              }}
                              title="Copy Document Reference"
                            >
                              {copiedId === txn.externalReference ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--text-dim)',
                              fontFamily: 'var(--font-mono)',
                              marginTop: '0.1rem',
                            }}
                          >
                            {txn.transactionId}
                          </div>
                        </div>
                      </td>

                      {/* 2. Type */}
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
                            display: 'inline-block',
                          }}
                        >
                          {txn.transactionType}
                        </span>
                      </td>

                      {/* 3. Source ERP */}
                      <td>
                        <span className={`badge ${sourceBadgeClass(txn.sourceSystem)}`} style={{ fontSize: '0.72rem' }}>
                          {formatSourceName(txn.sourceSystem)}
                        </span>
                      </td>

                      {/* 4. Unified Status Badge */}
                      <td>
                        {isReady ? (
                          <span className="status-badge status-completed" style={{ fontSize: '0.72rem' }}>
                            <CheckCircle2 size={12} />
                            Ready for MAWM
                          </span>
                        ) : isQuarantined ? (
                          <span className="status-badge status-failed" style={{ fontSize: '0.72rem' }}>
                            <XCircle size={12} />
                            Quarantined (Error)
                          </span>
                        ) : (
                          <span className="status-badge status-processing" style={{ fontSize: '0.72rem' }}>
                            <Clock size={12} />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* 5. Parent Batch */}
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateToJob) onNavigateToJob(txn.parentJobId);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--primary-500)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            textDecoration: 'underline',
                          }}
                          title={`Navigate to parent job ${txn.parentJobId}`}
                        >
                          <span>Batch #{txn.parentJobId.slice(0, 8)}</span>
                          <ExternalLink size={11} />
                        </button>
                      </td>

                      {/* 6. Processed Timestamp */}
                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} color="var(--text-dim)" />
                          {txn.processedAt
                            ? new Date(txn.processedAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Pending'}
                        </span>
                      </td>

                      {/* 7. Action */}
                      <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedTxnId(txn.transactionId);
                          }}
                          title="Inspect Document Payload & Details"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={28} color="var(--text-dim)" />
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        No business documents match your filter criteria
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0, maxWidth: 380 }}>
                        Try adjusting your search terms or filters to find specific Purchase Orders or ASNs.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="btn-secondary"
                          style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                        >
                          Clear Active Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>
              Showing{' '}
              <strong>
                {totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
                {Math.min(currentPage * pageSize, totalRecords)}
              </strong>{' '}
              of <strong>{totalRecords}</strong> records
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="filter-select"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              className="btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>

            <span style={{ padding: '0 0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
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
