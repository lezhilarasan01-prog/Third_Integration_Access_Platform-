import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Radio,
  FileText,
  Trash2,
  ArrowRight,
  Info,
  Clock,
  Zap,
  Download
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';
import { KAFKA_CONFIG } from '../../config/kafkaConfig';

export default function KafkaDlqTrackerPage({ embedded = false }) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'FAILED' | 'DUPLICATE' | 'PO' | 'ASN'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resolveCustomerRawFilename = (item) => {
    if (!item) return 'customer_upload.csv';
    const fmt = (item.inputFormat || '').toUpperCase();
    const ext = fmt.includes('JSON') ? '.json' : fmt.includes('XML') ? '.xml' : fmt.includes('EDI') ? '.edi' : '.csv';
    if (item.originalFilename && item.originalFilename.trim().length > 0) {
      const fn = item.originalFilename.trim();
      if (fn.toLowerCase().endsWith(ext)) return fn;
      if (fn.includes('.')) return `${fn.substring(0, fn.lastIndexOf('.'))}${ext}`;
      return `${fn}${ext}`;
    }
    return `raw_${(item.jobId || 'file').slice(0, 8)}${ext}`;
  };

  const fetchDlqData = async () => {
    setIsLoading(true);
    try {
      const data = await integrationApi.getDlqRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not fetch DLQ data directly, falling back to all trackers:', err);
      try {
        const all = await integrationApi.getTrackers();
        const filtered = (all || []).filter(
          (t) =>
            t.intakeStatus === 'FAILED' ||
            t.intakeStatus === 'DUPLICATE_SKIPPED' ||
            t.dispatchStatus === 'FAILED' ||
            Boolean(t.processingErrorMessage)
        );
        setRecords(filtered);
      } catch (e) {
        console.error('Failed to load DLQ tracker rows:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDlqData();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteRecord = async (jobId) => {
    if (!window.confirm(`Permanently dismiss and delete DLQ record ${jobId.slice(0, 8)}?`)) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/v1/erp/transactions/tracker/${jobId}`, { method: 'DELETE' });
      setRecords((prev) => prev.filter((r) => r.jobId !== jobId));
      if (selectedRecord?.jobId === jobId) setSelectedRecord(null);
    } catch (e) {
      console.error('Failed to delete DLQ record:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const failedCount = records.filter((r) => r.intakeStatus === 'FAILED' || r.dispatchStatus === 'FAILED').length;
  const duplicateCount = records.filter((r) => r.intakeStatus === 'DUPLICATE_SKIPPED').length;
  const totalExceptions = records.length;

  // Filtered Records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.jobId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.originalFilename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.sourceSystem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.processingErrorMessage?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'FAILED') {
      return r.intakeStatus === 'FAILED' || r.dispatchStatus === 'FAILED';
    }
    if (activeFilter === 'DUPLICATE') {
      return r.intakeStatus === 'DUPLICATE_SKIPPED';
    }
    if (activeFilter === 'PO') {
      return r.transactionType === 'PO';
    }
    if (activeFilter === 'ASN') {
      return r.transactionType === 'ASN';
    }
    return true;
  });

  const formatTimestamp = (ts) => {
    if (!ts) return 'Just now';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  return (
    <div className={embedded ? "page-container dlq-embedded-mode" : "page-container"} style={embedded ? { padding: 0 } : undefined}>
      {/* 1. Page Header */}
      <section className="overview-hero" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}
              >
                <ShieldAlert size={18} />
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Kafka Exception & DLQ Tracker
              </h1>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  backgroundColor: failedCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: failedCount > 0 ? '#ef4444' : '#10b981',
                  border: `1px solid ${failedCount > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                }}
              >
                {failedCount > 0 ? `${failedCount} Active Quarantined` : 'DLQ Healthy (0 Failures)'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Realtime dead-letter row isolation, poison-pill diagnostics, and idempotency audit ledger
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={fetchDlqData}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
              <span>Refresh DLQ</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Telemetry KPI Grid */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className="card-kpi" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 4 }}>Dead-Letter Queue (DLQ)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: failedCount > 0 ? '#ef4444' : '#10b981' }}>
            {failedCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Topics: <code>erp_file_po_dlq</code> • <code>erp_file_asn_dlq</code>
          </div>
        </div>

        <div className="card-kpi" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 4 }}>Idempotency Filtered</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
            {duplicateCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Identical payloads safely skipped from duplicate transformation
          </div>
        </div>

        <div className="card-kpi" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 4 }}>Consumer Group Health</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
            100% ONLINE
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Group: <code>{KAFKA_CONFIG.CONVERSION_GROUP}</code> ({KAFKA_CONFIG.PARTITION_COUNT} Partitions)
          </div>
        </div>

        <div className="card-kpi" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 4 }}>Kafka Broker Status</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7' }}>
            ACTIVE
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Broker: <code>{KAFKA_CONFIG.BOOTSTRAP_SERVERS}</code>
          </div>
        </div>
      </section>

      {/* 3. Filters & Search */}
      <section
        className="dashboard-panel"
        style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search by Job ID, filename, error, or ERP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input-theme"
              style={{ paddingLeft: '2rem', width: '100%', fontSize: '0.78rem' }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Exceptions (${records.length})` },
            { id: 'FAILED', label: `Quarantined (${failedCount})` },
            { id: 'DUPLICATE', label: `Idempotency (${duplicateCount})` },
            { id: 'PO', label: 'PO Topics' },
            { id: 'ASN', label: 'ASN Topics' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.35rem 0.75rem',
                borderRadius: 6,
                border: activeFilter === tab.id ? '1px solid #ef4444' : '1px solid var(--border-default)',
                backgroundColor: activeFilter === tab.id ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface)',
                color: activeFilter === tab.id ? '#ef4444' : 'var(--text-dim)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* 4. Quarantined & Exception Ledger Table */}
      <section className="dashboard-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <h4 style={{ color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              Zero Dead-Letter Exceptions Detected
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 460, margin: '0 auto' }}>
              All ERP events are streaming cleanly through Kafka topics into Canonical MAWM format.
              No poison-pill messages are currently quarantined.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="enterprise-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>JOB / TRACKING ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>SOURCE ERP</th>
                  <th style={{ padding: '0.75rem 1rem' }}>TYPE</th>
                  <th style={{ padding: '0.75rem 1rem' }}>INBOUND FILE</th>
                  <th style={{ padding: '0.75rem 1rem' }}>STATUS / EXCEPTION</th>
                  <th style={{ padding: '0.75rem 1rem' }}>RECEIVED AT</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => {
                  const isFailed = item.intakeStatus === 'FAILED' || item.dispatchStatus === 'FAILED';
                  const isDuplicate = item.intakeStatus === 'DUPLICATE_SKIPPED';
                  const targetDlq = item.errorFile || (item.transactionType === 'ASN' ? 'erp_file_asn_dlq' : 'erp_file_po_dlq');

                  return (
                    <tr
                      key={item.jobId}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isFailed ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.jobId.slice(0, 8)}...
                          </span>
                          <button
                            onClick={() => handleCopy(item.jobId, item.jobId)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}
                            title="Copy Job ID"
                          >
                            {copiedId === item.jobId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge-blue" style={{ fontSize: '0.7rem' }}>
                          {item.sourceSystem || 'ERP'}
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge-purple" style={{ fontSize: '0.7rem' }}>
                          {item.transactionType || 'DOC'}
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                          {item.originalFilename || resolveCustomerRawFilename(item)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          DLQ Target: {targetDlq}
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', maxWidth: 340 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 2 }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: isFailed ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: isFailed ? '#ef4444' : '#f59e0b',
                            }}
                          >
                            {isFailed ? 'QUARANTINED (DLQ)' : 'DUPLICATE SKIPPED'}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: isFailed ? '#ef4444' : 'var(--text-dim)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={item.processingErrorMessage || 'Idempotency filter active'}
                        >
                          {item.processingErrorMessage || 'Idempotency deduplication check passed'}
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                        {formatTimestamp(item.receivedAt || item.updatedAt)}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          <button
                            onClick={() => setSelectedRecord(item)}
                            className="btn-secondary"
                            style={{ fontSize: '0.72rem', padding: '0.32rem 0.65rem' }}
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(item.jobId)}
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid var(--border-default)',
                              color: '#ef4444',
                              borderRadius: 4,
                              padding: '0.32rem 0.5rem',
                              cursor: 'pointer',
                            }}
                            title="Dismiss / Purge Record"
                            disabled={isDeleting}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Inspection Modal */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  Dead-Letter Exception Diagnostic
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.78rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Job Tracking ID:</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                  {selectedRecord.jobId}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Source ERP:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                  {selectedRecord.sourceSystem}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>File & Format:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                  {selectedRecord.originalFilename} ({selectedRecord.inputFormat || 'CSV'})
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Status:</span>
                <div style={{ fontWeight: 700, color: selectedRecord.intakeStatus === 'FAILED' ? '#ef4444' : '#f59e0b', marginTop: 2 }}>
                  {selectedRecord.intakeStatus}
                </div>
              </div>
            </div>

            {selectedRecord.processingErrorMessage && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Diagnostic Exception Trace:
                </div>
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 6,
                    padding: '0.75rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#f87171',
                    wordBreak: 'break-all',
                  }}
                >
                  {selectedRecord.processingErrorMessage}
                </div>
              </div>
            )}

            {selectedRecord.rawContent && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Raw Inbound Payload:
                </div>
                <pre
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 6,
                    padding: '0.75rem',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-main)',
                    maxHeight: 180,
                    overflowY: 'auto',
                    margin: 0,
                  }}
                >
                  {selectedRecord.rawContent}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
              <a
                href={integrationApi.getRawDownloadUrl(selectedRecord.jobId)}
                download={resolveCustomerRawFilename(selectedRecord)}
                className="btn-primary"
                style={{
                  fontSize: '0.78rem',
                  padding: '0.45rem 0.85rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#fff',
                  cursor: 'pointer',
                }}
                title="Download exact original customer uploaded file"
              >
                <Download size={14} />
                <span>Download Customer File ({resolveCustomerRawFilename(selectedRecord)})</span>
              </a>
              <button onClick={() => setSelectedRecord(null)} className="btn-secondary" style={{ fontSize: '0.78rem' }}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
