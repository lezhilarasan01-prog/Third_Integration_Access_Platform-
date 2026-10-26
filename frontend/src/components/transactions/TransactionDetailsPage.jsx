import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Layers,
  FileText,
  FileCode,
  Sparkles,
  Server,
  Info,
  Radio,
  AlertCircle
} from 'lucide-react';
import {
  getTransactionById,
  formatSourceName,
  sourceBadgeClass
} from '../../services/transactionService';

/**
 * Transaction Details Inspection Component
 *
 * @param {string} transactionId - Transaction identifier to inspect
 * @param {Function} onBack - Callback to return to Transactions registry
 * @param {Function} onNavigateToJob - Callback to navigate directly to parent Integration Job
 */
export default function TransactionDetailsPage({ transactionId, onBack, onNavigateToJob }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);
  const [copiedSourcePayload, setCopiedSourcePayload] = useState(false);
  const [copiedNormalizedPayload, setCopiedNormalizedPayload] = useState(false);
  const [activeTab, setActiveTab] = useState('payloads'); // 'payloads' | 'errors' | 'metadata'

  const transaction = getTransactionById(transactionId);

  // 1. Unknown Transaction Handler
  if (!transaction) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={onBack}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={16} />
            <span>Return to Transactions</span>
          </button>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            maxWidth: 640,
            margin: '2rem auto',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 0 15px var(--error-glow)',
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Transaction Record Not Found
          </h3>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 1.5rem', lineHeight: 1.55 }}>
            No business transaction matched identifier <code style={{ color: 'var(--primary-500)' }}>{transactionId || 'undefined'}</code>.
            The transaction may not exist or the ID is invalid.
          </p>

          <button onClick={onBack} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
            <ArrowLeft size={15} />
            <span>Back to All Transactions</span>
          </button>
        </div>
      </div>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard?.writeText(transaction.transactionId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyJobId = () => {
    navigator.clipboard?.writeText(transaction.parentJobId);
    setCopiedJobId(true);
    setTimeout(() => setCopiedJobId(false), 2000);
  };

  const handleCopySource = () => {
    if (transaction.sourcePayload) {
      navigator.clipboard?.writeText(
        typeof transaction.sourcePayload === 'string'
          ? transaction.sourcePayload
          : JSON.stringify(transaction.sourcePayload, null, 2)
      );
      setCopiedSourcePayload(true);
      setTimeout(() => setCopiedSourcePayload(false), 2000);
    }
  };

  const handleCopyNormalized = () => {
    if (transaction.normalizedPayload) {
      navigator.clipboard?.writeText(JSON.stringify(transaction.normalizedPayload, null, 2));
      setCopiedNormalizedPayload(true);
      setTimeout(() => setCopiedNormalizedPayload(false), 2000);
    }
  };

  const hasErrors = transaction.validationErrors && transaction.validationErrors.length > 0;

  return (
    <div className="page-container">
      {/* 1. Return Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          title="Return to Orders & Shipments registry"
        >
          <ArrowLeft size={15} />
          <span>Back to Orders & Shipments</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Trace ID:</span>
            <span className="mono-job-id" style={{ fontSize: '0.72rem' }}>{transaction.transactionId}</span>
            <button
              onClick={handleCopyId}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId ? 'var(--success-text)' : 'var(--text-muted)', padding: '0.2rem' }}
              title="Copy System Trace ID"
            >
              {copiedId ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </span>

          <span style={{ color: 'var(--border-strong)' }}>|</span>

          {/* Direct Parent Job Jump */}
          <button
            onClick={() => onNavigateToJob && onNavigateToJob(transaction.parentJobId)}
            className="btn-secondary"
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            title={`Inspect Parent Batch ${transaction.parentJobId}`}
          >
            <ExternalLink size={12} />
            <span>Parent Batch #{transaction.parentJobId.slice(0, 8)}</span>
          </button>
        </div>
      </div>

      {/* 2. Demo Sandbox Banner */}
      <div className="demo-notice-alert" role="status" style={{ marginBottom: '1.25rem' }}>
        <div className="demo-notice-content">
          <Info size={18} />
          <div className="demo-notice-text">
            <strong>Sandbox Mode:</strong> Displaying parsed ERP record and canonical MAWM payload.
            Direct REST dispatch to Manhattan Active Warehouse Management is decoupled in this sandbox.
          </div>
        </div>
        <span className="demo-badge-standalone">DEMO DATA</span>
      </div>

      {/* 3. Transaction Hero Header */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {transaction.transactionType === 'PO' ? 'Purchase Order' : 'Shipment Notice'} {transaction.externalReference}
              </h2>

              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  border: '1px solid var(--border-default)',
                }}
              >
                {transaction.transactionType}
              </span>

              <span className={`badge ${sourceBadgeClass(transaction.sourceSystem)}`}>
                <Server size={12} />
                {formatSourceName(transaction.sourceSystem)}
              </span>

              {transaction.validationStatus === 'VALID' ? (
                <span className="status-badge status-completed">
                  <CheckCircle2 size={12} />
                  Ready for MAWM
                </span>
              ) : (
                <span className="status-badge status-failed">
                  <XCircle size={12} />
                  Quarantined (Error)
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>Parent Ingestion Batch:</span>
              <button
                onClick={() => onNavigateToJob && onNavigateToJob(transaction.parentJobId)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--primary-500)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  textDecoration: 'underline',
                }}
                title="Navigate to parent job"
              >
                {transaction.parentJobId}
              </button>
              <button
                onClick={handleCopyJobId}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedJobId ? 'var(--success-text)' : 'var(--text-muted)', padding: '0.15rem' }}
                title="Copy Parent Job UUID"
              >
                {copiedJobId ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => onNavigateToJob && onNavigateToJob(transaction.parentJobId)}
              className="btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
            >
              <ExternalLink size={13} />
              <span>Inspect Parent Batch</span>
            </button>
          </div>
        </div>

        {/* 3 High-Impact Status Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Status Card */}
          <div
            style={{
              background: transaction.validationStatus === 'VALID' ? 'var(--success-bg)' : 'var(--error-bg)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${transaction.validationStatus === 'VALID' ? 'var(--success-border)' : 'var(--error-border)'}`,
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: transaction.validationStatus === 'VALID' ? 'var(--success-text)' : 'var(--error-text)',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              MAWM Readiness
            </span>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: transaction.validationStatus === 'VALID' ? 'var(--success-text)' : 'var(--error-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {transaction.validationStatus === 'VALID' ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Ready for Dispatch</span>
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  <span>Quarantined</span>
                </>
              )}
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                color: transaction.validationStatus === 'VALID' ? 'var(--success-text)' : 'var(--error-text)',
                opacity: 0.9,
                marginTop: '0.2rem',
                display: 'block',
              }}
            >
              {transaction.validationStatus === 'VALID'
                ? 'Valid schema & MAWM JSON generated'
                : `${transaction.validationErrors.length} validation exception(s) found`}
            </span>
          </div>

          {/* Source ERP & Mapping */}
          <div className="job-meta-card" style={{ padding: '0.85rem 1rem' }}>
            <span className="job-meta-card-label">Source & Profile</span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {formatSourceName(transaction.sourceSystem)}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem', display: 'block' }}>
              Envelope Profile: {transaction.normalizedPayload?.profileVersion || 'Standard V1'}
            </span>
          </div>

          {/* Timestamps */}
          <div className="job-meta-card" style={{ padding: '0.85rem 1rem' }}>
            <span className="job-meta-card-label">Processed Timestamp</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={13} color="var(--text-dim)" />
              {transaction.processedAt
                ? new Date(transaction.processedAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Pending'}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem', display: 'block' }}>
              Batch Ingested: {transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </span>
          </div>
        </div>
      </section>

      {/* 4. Tab Navigation Strip */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-default)',
            overflowX: 'auto',
          }}
        >
          {/* TAB 1: PAYLOAD INSPECTION */}
          <button
            onClick={() => setActiveTab('payloads')}
            style={{
              padding: '0.85rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'payloads' ? 'var(--primary-500)' : 'var(--text-muted)',
              borderBottom: activeTab === 'payloads' ? '2px solid var(--primary-500)' : '2px solid transparent',
              marginBottom: -1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <FileCode size={15} />
            <span>Source vs. Canonical Payloads</span>
          </button>

          {/* TAB 2: VALIDATION ERRORS */}
          <button
            onClick={() => setActiveTab('errors')}
            style={{
              padding: '0.85rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'errors' ? 'var(--primary-500)' : 'var(--text-muted)',
              borderBottom: activeTab === 'errors' ? '2px solid var(--primary-500)' : '2px solid transparent',
              marginBottom: -1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <ShieldAlert size={15} />
            <span>
              Validation Errors {hasErrors ? `(${transaction.validationErrors.length})` : '(0)'}
            </span>
          </button>

          {/* TAB 3: TRACE METADATA */}
          <button
            onClick={() => setActiveTab('metadata')}
            style={{
              padding: '0.85rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'metadata' ? 'var(--primary-500)' : 'var(--text-muted)',
              borderBottom: activeTab === 'metadata' ? '2px solid var(--primary-500)' : '2px solid transparent',
              marginBottom: -1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Layers size={15} />
            <span>Audit & Trace Identifiers</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* ============================================================== */}
          {/* TAB 1: SOURCE VS CANONICAL PAYLOADS                            */}
          {/* ============================================================== */}
          {activeTab === 'payloads' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
              {/* Left: Source Payload */}
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-hover)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <FileText size={15} color="var(--primary-500)" />
                    <span>Inbound Source ERP Record</span>
                  </div>
                  {transaction.sourcePayload && (
                    <button
                      onClick={handleCopySource}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                      title="Copy raw payload"
                    >
                      {copiedSourcePayload ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedSourcePayload ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div style={{ padding: '1rem', maxHeight: 420, overflowY: 'auto' }}>
                  {transaction.sourcePayload ? (
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        color: 'var(--text-main)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        lineHeight: 1.5,
                      }}
                    >
                      {typeof transaction.sourcePayload === 'string'
                        ? transaction.sourcePayload
                        : JSON.stringify(transaction.sourcePayload, null, 2)}
                    </pre>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      <AlertCircle size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                      <div>Source payload not available for this record.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Normalized Canonical JSON */}
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-hover)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <Layers size={15} color="var(--success-text)" />
                    <span>Normalized Canonical MAWM JSON</span>
                  </div>
                  {transaction.normalizedPayload && (
                    <button
                      onClick={handleCopyNormalized}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                      title="Copy canonical JSON"
                    >
                      {copiedNormalizedPayload ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedNormalizedPayload ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div style={{ padding: '1rem', maxHeight: 420, overflowY: 'auto' }}>
                  {transaction.normalizedPayload ? (
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        color: 'var(--text-main)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        lineHeight: 1.5,
                      }}
                    >
                      {JSON.stringify(transaction.normalizedPayload, null, 2)}
                    </pre>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      <AlertCircle size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                      <div>Normalized payload not available.</div>
                      <div style={{ fontSize: '0.74rem', marginTop: 4, color: 'var(--text-muted)' }}>
                        {transaction.validationStatus === 'INVALID'
                          ? 'Payload was quarantined prior to transformation due to validation errors.'
                          : 'Transformation has not completed for this transaction.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: VALIDATION ERRORS                                       */}
          {/* ============================================================== */}
          {activeTab === 'errors' && (
            <div>
              {hasErrors ? (
                <div>
                  <div
                    style={{
                      backgroundColor: 'var(--error-bg)',
                      border: '1px solid var(--error-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <AlertTriangle size={20} color="var(--error-text)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--error-text)', marginBottom: 2 }}>
                        {transaction.validationErrors.length} Validation Error(s) on Transaction
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--error-text)', opacity: 0.95, margin: 0, lineHeight: 1.5 }}>
                        This record was flagged by the enterprise business validator. Refer to the suggested corrections below.
                      </p>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <tr>
                          <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', width: 80 }}>
                            Row #
                          </th>
                          <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', width: 170 }}>
                            Error Code
                          </th>
                          <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', width: 130 }}>
                            Field Name
                          </th>
                          <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                            Error Message
                          </th>
                          <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', width: 320 }}>
                            Suggested Correction
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {transaction.validationErrors.map((err, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
                            }}
                          >
                            <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                              #{err.recordNumber != null ? err.recordNumber : idx + 1}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span
                                style={{
                                  backgroundColor: 'var(--error-bg)',
                                  color: 'var(--error-text)',
                                  border: '1px solid var(--error-border)',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: 4,
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                }}
                              >
                                {err.errorCode}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-500)', fontWeight: 600 }}>
                              <code>{err.field}</code>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                              {err.message}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', lineHeight: 1.45 }}>
                              {err.suggestedCorrection ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.35rem',
                                    color: 'var(--warning-text)',
                                    backgroundColor: 'var(--warning-bg)',
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: 4,
                                    border: '1px solid var(--warning-border)',
                                    fontSize: '0.74rem',
                                  }}
                                >
                                  <Sparkles size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                                  <span>{err.suggestedCorrection}</span>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem', fontStyle: 'italic' }}>
                                  Review schema specification
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'var(--success-bg)',
                    border: '1px solid var(--success-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    boxShadow: '0 0 15px var(--success-glow)',
                  }}
                >
                  <CheckCircle2 size={36} color="var(--success-text)" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success-text)', marginBottom: '0.35rem' }}>
                    No validation errors.
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--success-text)', opacity: 0.9, maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
                    This transaction record satisfied all business validation rules. No errors or quarantine flags detected.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: TRACE METADATA                                          */}
          {/* ============================================================== */}
          {activeTab === 'metadata' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Transaction Identifier
                </span>
                <code style={{ fontSize: '0.85rem', color: 'var(--primary-500)', fontWeight: 600 }}>
                  {transaction.transactionId}
                </code>
              </div>

              <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  External Business Reference
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {transaction.externalReference}
                </span>
              </div>

              <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Parent Integration Job UUID
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <code style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                    {transaction.parentJobId}
                  </code>
                  <button
                    onClick={() => onNavigateToJob && onNavigateToJob(transaction.parentJobId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-500)', padding: 0 }}
                    title="Jump to Job"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Source ERP Network
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                  {formatSourceName(transaction.sourceSystem)} ({transaction.sourceSystem})
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
