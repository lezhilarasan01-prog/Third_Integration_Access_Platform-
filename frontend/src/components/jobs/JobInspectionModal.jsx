import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Layers,
  ShieldAlert,
  ArrowRight,
  FileText,
  SplitSquareVertical,
  ExternalLink
} from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

function formatMawmOutput(payload) {
  if (!payload) return '// No output produced';

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

export default function JobInspectionModal({ job, onClose }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  // Default to 'input' tab so user immediately sees the ERP input before conversion!
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'canonical' | 'comparison' | 'diagnostics' | 'raw'

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  const handleCopyId = async () => {
    if (job?.jobId) {
      const ok = await copyToClipboard(job.jobId);
      if (ok) {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }
    }
  };

  const handleCopyInput = async () => {
    if (job?.sampleInput) {
      const ok = await copyToClipboard(job.sampleInput);
      if (ok) {
        setCopiedInput(true);
        setTimeout(() => setCopiedInput(false), 2000);
      }
    }
  };

  const handleCopyOutput = async () => {
    if (job?.sampleOutput) {
      const ok = await copyToClipboard(formatMawmOutput(job.sampleOutput));
      if (ok) {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
      }
    }
  };

  const sourceName = job.sourceSystem || 'Unknown Source';

  return (
    <div className="job-modal-backdrop" onClick={onClose}>
      <div className="job-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="job-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Job Inspection: {job.originalFilename || 'Batch Ingestion'}
              </h3>
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
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--info-text)',
                  backgroundColor: 'var(--info-bg)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 4,
                  border: '1px solid var(--info-border)',
                }}
              >
                UUID: {job.jobId}
              </span>
              <button
                onClick={handleCopyId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  background: 'none',
                  border: 'none',
                  color: copiedId ? 'var(--success-text)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.15rem 0.35rem',
                }}
                title="Copy full Job UUID"
              >
                {copiedId ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <button
            className="header-icon-button"
            onClick={onClose}
            title="Close dialog (Esc)"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              fontSize: '0.8rem',
            }}
          >
            <div className="job-meta-card">
              <span className="job-meta-card-label">Source ERP</span>
              <strong className="job-meta-card-value">{sourceName}</strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block' }}>({job.sourceSystem})</span>
            </div>

            <div className="job-meta-card">
              <span className="job-meta-card-label">Transaction / Profile</span>
              <strong className="job-meta-card-value">{job.transactionType}</strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block' }}>{job.mappingProfile}</span>
            </div>

            <div className="job-meta-card">
              <span className="job-meta-card-label">Inbound ERP File</span>
              <strong className="job-meta-card-value">{job.originalFilename}</strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--primary-500)', display: 'block', fontWeight: 600 }}>Format: {job.inputFormat}</span>
            </div>

            <div className="job-meta-card">
              <span className="job-meta-card-label">Ingested Timestamp</span>
              <strong className="job-meta-card-value">
                {job.createdAt
                  ? new Date(job.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </strong>
            </div>

            <div
              style={{
                background: 'var(--success-bg)',
                padding: '0.75rem',
                borderRadius: 8,
                border: '1px solid var(--success-border)',
                boxShadow: '0 0 10px var(--success-glow)',
              }}
            >
              <span style={{ color: 'var(--success-text)', display: 'block', fontSize: '0.72rem', marginBottom: 2 }}>Valid / Converted Records</span>
              <strong style={{ color: 'var(--success-text)', fontSize: '1.05rem' }}>{job.convertedRecords}</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--success-text)', opacity: 0.9, display: 'block' }}>of {job.totalRecords} total rows</span>
            </div>

            <div
              style={{
                background: job.errorRecords > 0 ? 'var(--error-bg)' : 'var(--bg-subtle)',
                padding: '0.75rem',
                borderRadius: 8,
                border: job.errorRecords > 0 ? '1px solid var(--error-border)' : '1px solid var(--border-default)',
                boxShadow: job.errorRecords > 0 ? '0 0 10px var(--error-glow)' : 'none',
              }}
            >
              <span style={{ color: job.errorRecords > 0 ? 'var(--error-text)' : 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: 2 }}>
                Validation Exceptions
              </span>
              <strong style={{ color: job.errorRecords > 0 ? 'var(--error-text)' : 'var(--text-main)', fontSize: '1.05rem' }}>
                {job.errorRecords}
              </strong>
              <span style={{ fontSize: '0.7rem', color: job.errorRecords > 0 ? 'var(--error-text)' : 'var(--text-dim)', opacity: 0.9, display: 'block' }}>
                {job.errorRecords > 0 ? 'Quarantined in dead-letter' : '0 errors'}
              </span>
            </div>
          </div>

          {/* Section Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-default)',
              marginBottom: '1rem',
              overflowX: 'auto',
            }}
          >
            {/* TAB 1: ERP INPUT (BEFORE CONVERSION) */}
            <button
              onClick={() => setActiveTab('input')}
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'input' ? 'var(--primary-500)' : 'var(--text-muted)',
                borderBottom: activeTab === 'input' ? '2px solid var(--primary-500)' : '2px solid transparent',
                marginBottom: -1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
            >
              <FileText size={15} />
              <span>ERP Input (Before Conversion)</span>
            </button>

            {/* TAB 2: MAWM CANONICAL OUTPUT (AFTER CONVERSION) */}
            <button
              onClick={() => setActiveTab('canonical')}
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'canonical' ? 'var(--primary-500)' : 'var(--text-muted)',
                borderBottom: activeTab === 'canonical' ? '2px solid var(--primary-500)' : '2px solid transparent',
                marginBottom: -1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
            >
              <Layers size={15} />
              <span>MAWM Canonical Output (After Conversion)</span>
            </button>

            {/* TAB 3: SIDE-BY-SIDE BEFORE VS AFTER */}
            <button
              onClick={() => setActiveTab('comparison')}
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'comparison' ? 'var(--primary-500)' : 'var(--text-muted)',
                borderBottom: activeTab === 'comparison' ? '2px solid var(--primary-500)' : '2px solid transparent',
                marginBottom: -1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
            >
              <SplitSquareVertical size={15} />
              <span>Before vs. After Transformation</span>
            </button>

            {/* TAB 4: VALIDATION DIAGNOSTICS */}
            <button
              onClick={() => setActiveTab('diagnostics')}
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'diagnostics' ? 'var(--primary-500)' : 'var(--text-muted)',
                borderBottom: activeTab === 'diagnostics' ? '2px solid var(--primary-500)' : '2px solid transparent',
                marginBottom: -1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
            >
              <ShieldAlert size={15} />
              <span>Validation Errors ({job.sampleErrors?.length || job.errorRecords || 0})</span>
            </button>

            {/* TAB 5: RAW METADATA */}
            <button
              onClick={() => setActiveTab('raw')}
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'raw' ? 'var(--primary-500)' : 'var(--text-muted)',
                borderBottom: activeTab === 'raw' ? '2px solid var(--primary-500)' : '2px solid transparent',
                marginBottom: -1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
              }}
            >
              <FileCode size={15} />
              <span>Job Metadata</span>
            </button>
          </div>

          {/* TAB 1 CONTENT: ERP INPUT (BEFORE CONVERSION) */}
          {activeTab === 'input' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.65rem',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 8,
                  border: '1px solid var(--border-default)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Raw Inbound ERP Payload: <code style={{ color: 'var(--primary-500)' }}>{job.originalFilename}</code>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Original file as received from {sourceName} ({job.inputFormat} format) prior to mapping or schema transformation
                  </div>
                </div>

                <button
                  onClick={handleCopyInput}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.74rem',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: copiedInput ? 'var(--success-text)' : 'var(--text-main)',
                    fontWeight: 600,
                  }}
                >
                  {copiedInput ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedInput ? 'Copied' : 'Copy ERP Input'}</span>
                </button>
              </div>

              {job.sampleInput ? (
                <div>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      padding: '1rem',
                      borderRadius: 8,
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-mono)',
                      overflowX: 'auto',
                      maxHeight: 340,
                      lineHeight: 1.6,
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    {job.sampleInput}
                  </pre>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Source Artifact: <code>data/input/{job.jobId}_{job.originalFilename}</code></span>
                    <span>Format: {job.inputFormat} • Status: Ingested</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                  <FileText size={28} color="var(--text-dim)" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                    Input Payload Not Cached
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    File reference: <code>{job.inputFileRef || 'data/input/' + job.originalFilename}</code>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 CONTENT: MAWM CANONICAL OUTPUT (AFTER CONVERSION) */}
          {activeTab === 'canonical' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.65rem',
                  backgroundColor: 'var(--success-bg)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 8,
                  border: '1px solid var(--success-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success-text)' }}>
                    MAWM Canonical Inbound Payload (Normalized JSON)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--success-text)', opacity: 0.85 }}>
                    Standardized envelope produced by the mapping profile: <code style={{ fontWeight: 600 }}>{job.mappingProfile}</code>
                  </div>
                </div>

                <button
                  onClick={handleCopyOutput}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.74rem',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: copiedJson ? 'var(--success-text)' : 'var(--text-main)',
                    fontWeight: 600,
                  }}
                >
                  {copiedJson ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedJson ? 'Copied' : 'Copy Output JSON'}</span>
                </button>
              </div>

              {job.sampleOutput ? (
                <div>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      color: '#34d399',
                      padding: '1rem',
                      borderRadius: 8,
                      fontSize: '0.76rem',
                      fontFamily: 'var(--font-mono)',
                      overflowX: 'auto',
                      maxHeight: 340,
                      lineHeight: 1.5,
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    {formatMawmOutput(job.sampleOutput)}
                  </pre>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Target Endpoint: <code>/api/v1/mawm/{job.transactionType === 'PO' ? 'purchase-orders' : 'shipment-notices'}</code></span>
                    <span>Schema Version: <code>{job.mappingProfile}</code></span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                  <Layers size={28} color="var(--text-dim)" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                    No Canonical Output Generated
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    This batch produced 0 valid canonical records due to payload validation errors or schema mismatch.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3 CONTENT: SIDE-BY-SIDE BEFORE VS AFTER TRANSFORMATION */}
          {activeTab === 'comparison' && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                }}
              >
                {/* Left: Input Before Conversion */}
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid var(--border-default)',
                      borderBottom: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>1. ERP Inbound Input (Before)</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--primary-500)', fontWeight: 600 }}>{job.inputFormat}</span>
                  </div>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      padding: '0.85rem',
                      borderRadius: '0 0 6px 6px',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      overflowX: 'auto',
                      height: 280,
                      lineHeight: 1.5,
                      margin: 0,
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    {job.sampleInput || '// No input cached'}
                  </pre>
                </div>

                {/* Right: Output After Conversion */}
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--success-text)',
                      backgroundColor: 'var(--success-bg)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid var(--success-border)',
                      borderBottom: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>2. MAWM Canonical Output (After)</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--success-text)', fontWeight: 600 }}>JSON Envelope</span>
                  </div>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      color: '#34d399',
                      padding: '0.85rem',
                      borderRadius: '0 0 6px 6px',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      overflowX: 'auto',
                      height: 280,
                      lineHeight: 1.5,
                      margin: 0,
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    {job.sampleOutput ? formatMawmOutput(job.sampleOutput) : '// No output produced due to errors'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4 CONTENT: VALIDATION DIAGNOSTICS & ERRORS */}
          {activeTab === 'diagnostics' && (
            <div>
              {job.sampleErrors && job.sampleErrors.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--error-text)',
                      background: 'var(--error-bg)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 6,
                      border: '1px solid var(--error-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 0 10px var(--error-glow)',
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>
                      {job.sampleErrors.length} validation exception{job.sampleErrors.length > 1 ? 's' : ''} isolated during pipeline execution.
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <tr>
                          <th style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>Record #</th>
                          <th style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>Error Code</th>
                          <th style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>Target Field</th>
                          <th style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>Diagnostic Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.sampleErrors.map((err, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < job.sampleErrors.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                            <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                              {err.recordNumber ?? (idx + 1)}
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem' }}>
                              <span
                                style={{
                                  backgroundColor: 'var(--error-bg)',
                                  color: 'var(--error-text)',
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: 4,
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  border: '1px solid var(--error-border)',
                                }}
                              >
                                {err.errorCode || 'VALIDATION_ERROR'}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-500)' }}>
                              <code>{err.field || 'payload'}</code>
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>
                              {err.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <details style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600 }}>
                      View Raw Diagnostic JSON
                    </summary>
                    <pre
                      style={{
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--error-border)',
                        color: 'var(--error-text)',
                        padding: '0.75rem',
                        borderRadius: 6,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                        marginTop: '0.35rem',
                        maxHeight: 180,
                        overflowX: 'auto',
                      }}
                    >
                      {JSON.stringify(job.sampleErrors, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : job.errorRecords > 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--warning-bg)', borderRadius: 8, border: '1px solid var(--warning-border)' }}>
                  <AlertTriangle size={24} color="var(--warning-text)" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--warning-text)', marginBottom: 4 }}>
                    {job.errorRecords} Error Record{job.errorRecords > 1 ? 's' : ''} Isolated
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--warning-text)', opacity: 0.9, margin: 0 }}>
                    Error payload was archived to the dead-letter error store.
                  </p>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--success-bg)', borderRadius: 8, border: '1px solid var(--success-border)' }}>
                  <CheckCircle2 size={26} color="var(--success-text)" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--success-text)', marginBottom: 4 }}>
                    Validation Passed Without Errors
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--success-text)', opacity: 0.9, margin: 0 }}>
                    All {job.totalRecords} record(s) parsed and validated successfully against the {job.mappingProfile} schema profile.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5 CONTENT: RAW JOB METADATA */}
          {activeTab === 'raw' && (
            <div>
              <pre
                style={{
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  padding: '1rem',
                  borderRadius: 8,
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  overflowX: 'auto',
                  maxHeight: 300,
                  border: '1px solid var(--border-default)',
                }}
              >
                {JSON.stringify(
                  {
                    jobId: job.jobId,
                    sourceSystem: job.sourceSystem,
                    transactionType: job.transactionType,
                    inputFormat: job.inputFormat,
                    mappingProfile: job.mappingProfile,
                    originalFilename: job.originalFilename,
                    status: job.status,
                    totalRecords: job.totalRecords,
                    convertedRecords: job.convertedRecords,
                    errorRecords: job.errorRecords,
                    createdAt: job.createdAt,
                    updatedAt: job.updatedAt,
                    inputFileRef: job.inputFileRef,
                    outputFiles: job.outputFiles,
                    errorFile: job.errorFile,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button className="btn-primary" onClick={onClose} style={{ padding: '0.45rem 1.25rem' }}>
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
