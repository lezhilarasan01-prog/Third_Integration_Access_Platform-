import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  FileText,
  FileCode,
  SplitSquareVertical,
  ShieldAlert,
  Server,
  Database,
  Radio,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Eye,
  Download,
  Cloud,
  Trash2
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';
import ConfirmDialogModal from '../common/ConfirmDialogModal';

function formatSourceName(code) {
  return code || 'Unknown Source';
}

function resolveCustomerRawFilename(job) {
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
}

/**
 * Badge class for ERP sources
 */
function sourceBadgeClass(code) {
  const map = {
    CUSTOMER_A_ERP: 'badge-blue',
    CUSTOMER_B_ERP: 'badge-orange',
    LOGISTICS_PARTNER: 'badge-purple',
    SAP_ERP: 'badge-teal',
    SAP_S4HANA: 'badge-teal',
    ORACLE_NETSUITE: 'badge-blue'
  };
  return map[code] || 'badge-blue';
}

/**
 * Format payload nicely whether it is an object, a stringified JSON, or a raw claim-check string
 */
function formatPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'object') {
    try {
      return JSON.stringify(payload, null, 2);
    } catch (e) {
      return String(payload);
    }
  }
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch (e) {
        return payload;
      }
    }
    return payload;
  }
  return String(payload);
}

/**
 * Format MAWM Canonical Output strictly into the universal Manhattan Active WMS structure:
 * { "Data": [ ... ] }
 * Strips away internal platform tracking fields (trackingId, erpSource, records, etc.)
 */
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

  // 1. If it's an object with Data or internal records
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

  // 2. If it's a bare Array of records
  if (Array.isArray(parsed)) {
    return JSON.stringify({ Data: parsed }, null, 2);
  }

  // 3. Fallback: single record
  if (parsed && typeof parsed === 'object') {
    const { trackingId, erpSource, facilityId, documentType, originalFilename, totalRecords, convertedAt, sourceFormat, records, data, ...rest } = parsed;
    const clean = Object.keys(rest).length > 0 ? rest : parsed;
    return JSON.stringify({ Data: [clean] }, null, 2);
  }

  return JSON.stringify({ Data: [] }, null, 2);
}

function calculateDuration(start, end) {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return null;
  const diff = e - s;
  if (diff < 1000) return `${diff} ms`;
  return `${(diff / 1000).toFixed(2)} s`;
}

function getJobTimeline(job) {
  if (!job) return [];
  const isFailed = job.status === 'FAILED';
  const hasErrors = (job.errorRecords || 0) > 0 || (job.sampleErrors && job.sampleErrors.length > 0);
  const createdAt = job.createdAt || job.receivedAt;
  const updatedAt = job.updatedAt || job.processedAt || createdAt;

  return [
    {
      id: 'stage-1-intake',
      stageNumber: 1,
      name: 'Intake & Buffer',
      summary: `File received from ${job.erpSource || 'ERP'} and staged for Kafka ingestion`,
      status: 'completed',
      timestamp: createdAt
    },
    {
      id: 'stage-2-queue',
      stageNumber: 2,
      name: 'Kafka Event Queuing',
      summary: `Message published to topic ${job.targetTopic || 'erp_file_raw'} with partition key`,
      status: 'completed',
      timestamp: createdAt
    },
    {
      id: 'stage-3-transformation',
      stageNumber: 3,
      name: 'Canonical Mapping',
      summary: isFailed
        ? 'Transformation pipeline encountered errors processing records'
        : `Transformed to MAWM Canonical JSON (${job.mappingProfile || 'Universal Profile'})`,
      status: isFailed ? 'failed' : 'completed',
      timestamp: updatedAt
    },
    {
      id: 'stage-4-validation',
      stageNumber: 4,
      name: 'Schema Validation',
      summary: hasErrors
        ? `${job.errorRecords || 1} validation anomalies detected`
        : 'All records passed strict LPN & line validation rules',
      status: isFailed ? 'failed' : hasErrors ? 'warning' : 'completed',
      timestamp: updatedAt
    },
    {
      id: 'stage-5-audit',
      stageNumber: 5,
      name: 'Database Tracker',
      summary: 'Transaction state and audit metadata persisted in PostgreSQL',
      status: 'completed',
      timestamp: updatedAt
    },
    {
      id: 'stage-6-outbound',
      stageNumber: 6,
      name: 'MAWM Cloud Dispatch',
      summary: 'Outbound dispatch adapter to Manhattan Active WMS sandbox',
      status: 'not_connected',
      timestamp: null
    }
  ];
}

/**
 * Dedicated Integration Job Details & Error Inspection Page
 *
 * @param {string} jobId - UUID of the integration job to inspect
 * @param {Function} onBack - Callback to return to Integration Jobs list
 */
export default function JobDetailsPage({ jobId, onBack }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [liveJob, setLiveJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function fetchTrackerDetails() {
      try {
        const tracker = await integrationApi.getTrackerById(jobId);
        if (tracker && isMounted) {
          const isClaim = (tracker.storagePath && tracker.storagePath.startsWith('s3://')) ||
                          (tracker.rawContent && tracker.rawContent.includes('CLAIM_CHECK'));

          const mapped = {
            jobId: tracker.jobId,
            sourceSystem: tracker.sourceSystem,
            transactionType: tracker.transactionType,
            originalFilename: tracker.originalFilename,
            fileSizeBytes: tracker.fileSizeBytes,
            fileChecksum: tracker.fileChecksum,
            inputFormat: tracker.inputFormat || 'CSV',
            mappingProfile: tracker.mappingProfile,
            status: tracker.intakeStatus === 'CONVERTED' ? 'COMPLETED' : (tracker.intakeStatus || 'RECEIVED'),
            totalRecords: tracker.totalRecords || 1,
            convertedRecords: tracker.convertedRecords || (tracker.intakeStatus === 'CONVERTED' ? 1 : 0),
            errorRecords: tracker.errorRecords || 0,
            createdAt: tracker.receivedAt || tracker.updatedAt,
            updatedAt: tracker.processingCompletedAt || tracker.updatedAt,
            storagePath: tracker.storagePath,
            rawContent: tracker.rawContent,
            outputFiles: tracker.outputFiles,
            sampleInput: tracker.rawContent,
            sampleOutput: tracker.outputFiles,
            sampleErrors: tracker.processingErrorMessage
              ? [{ code: 'PROCESSING_ERROR', message: tracker.processingErrorMessage }]
              : [],
            isClaimCheck: isClaim,
            dispatchStatus: tracker.dispatchStatus,
            kafkaTopic: tracker.kafkaTopic,
            kafkaPartition: tracker.kafkaPartition,
            kafkaOffset: tracker.kafkaOffset
          };
          setLiveJob(mapped);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Could not load from live tracker API:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTrackerDetails();
    return () => { isMounted = false; };
  }, [jobId]);

  const job = liveJob;

  // Retrieve child documents linked to this job
  const jobTransactions = job?.transactions || [];
  const documents = (jobTransactions && jobTransactions.length > 0)
    ? jobTransactions
    : job
    ? [
        {
          transactionId: `TXN-${job.jobId.slice(0, 8)}-01`,
          externalReference: job.originalFilename ? job.originalFilename.replace(/\.[^/.]+$/, '').toUpperCase() : `BATCH-${job.jobId.slice(0, 6)}`,
          transactionType: job.transactionType || 'PO',
          validationStatus: job.errorRecords > 0 ? 'INVALID' : 'VALID',
          transformationStatus: job.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          sourcePayload: job.sampleInput,
          normalizedPayload: job.sampleOutput,
          validationErrors: job.sampleErrors || []
        }
      ]
    : [];

  const hasErrors = (job?.errorRecords || 0) > 0 || (job?.sampleErrors && job?.sampleErrors.length > 0);

  if (isLoading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div className="btn-spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem', borderColor: 'rgba(16, 185, 129, 0.3)', borderTopColor: '#10b981' }} />
        <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>Loading File Tracker record {jobId}...</div>
      </div>
    );
  }

  // 1. Unknown Job ID Not-Found Handler
  if (!job) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={onBack}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={16} />
            <span>Return to Integration Jobs</span>
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
            Integration Job Not Found
          </h3>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 1.5rem', lineHeight: 1.55 }}>
            No integration job matched the requested identifier <code style={{ color: 'var(--primary-500)' }}>{jobId || 'undefined'}</code>. The record may have expired or the UUID is invalid.
          </p>

          <button onClick={onBack} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
            <ArrowLeft size={15} />
            <span>Back to All Integration Jobs</span>
          </button>
        </div>
      </div>
    );
  }

  // Derive timeline and processing duration
  const timeline = getJobTimeline(job);
  const duration = calculateDuration(job.createdAt, job.updatedAt);
  const profileVersion =
    job.profileVersion ||
    job.sampleOutput?.profileVersion ||
    (job.mappingProfile && job.mappingProfile.includes('-v') ? 'v' + job.mappingProfile.split('-v').pop() : 'v1.0');
  const totalRecs = job.totalRecords || 1;
  const validPct = Math.round(((job.convertedRecords || 0) / totalRecs) * 100);

  const handleCopyId = () => {
    if (job.jobId) {
      navigator.clipboard.writeText(job.jobId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyInput = () => {
    if (job.sampleInput) {
      navigator.clipboard.writeText(formatPayload(job.sampleInput));
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 2000);
    }
  };

  const handleCopyOutput = () => {
    if (job.sampleOutput) {
      navigator.clipboard.writeText(formatMawmOutput(job.sampleOutput));
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await integrationApi.deleteTracker(job.jobId);
      setShowDeleteConfirm(false);
      onBack();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container">
      {/* 1. Return Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={onBack}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          title="Return to the Integration Jobs table (preserves your search & filters)"
        >
          <ArrowLeft size={15} />
          <span>Back to Integration Jobs</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <a
            href={integrationApi.getRawDownloadUrl(job.jobId)}
            download={resolveCustomerRawFilename(job)}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', textDecoration: 'none', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)', background: 'rgba(16, 185, 129, 0.1)', cursor: 'pointer' }}
            title={`Download original customer ${job.inputFormat || 'raw'} file (${resolveCustomerRawFilename(job)})`}
          >
            <Download size={13} />
            <span>Download Raw ({job.inputFormat || 'CSV'})</span>
          </a>

          <a
            href={integrationApi.getJsonDownloadUrl(job.jobId)}
            download={`${job.jobId}_canonical_mawm.json`}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', textDecoration: 'none', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.35)', background: 'rgba(59, 130, 246, 0.1)', cursor: 'pointer' }}
            title="Download converted Canonical MAWM JSON"
          >
            <FileCode size={13} />
            <span>Download Canonical JSON</span>
          </a>

          <button
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.1)',
              cursor: 'pointer'
            }}
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            title="Permanently delete this transaction record from PostgreSQL database"
          >
            <Trash2 size={13} />
            <span>{isDeleting ? 'Deleting...' : 'Delete Record'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>
            <span>Job UUID:</span>
            <span className="mono-job-id">{job.jobId}</span>
            <button
              onClick={handleCopyId}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copiedId ? 'var(--success-text)' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.2rem',
              }}
              title="Copy full Job UUID"
            >
              {copiedId ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Job Hero Banner & Identification */}
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {job.originalFilename || 'Batch Ingestion'}
              </h2>

              {/* Status Badge */}
              {job.status === 'COMPLETED' ? (
                <span className="status-badge status-completed">
                  <CheckCircle2 size={13} />
                  COMPLETED
                </span>
              ) : job.status === 'COMPLETED_WITH_ERRORS' ? (
                <span className="status-badge status-errors">
                  <AlertTriangle size={13} />
                  ERRORS ({job.errorRecords})
                </span>
              ) : (
                <span className="status-badge status-failed">
                  <XCircle size={13} />
                  FAILED
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Ingested across {formatSourceName(job.sourceSystem)} with profile{' '}
              <strong style={{ color: 'var(--primary-500)' }}>{job.mappingProfile}</strong>
            </p>
          </div>

          {/* Quick Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`badge ${sourceBadgeClass(job.sourceSystem)}`}>
              <Server size={12} />
              {formatSourceName(job.sourceSystem)}
            </span>

            <span
              style={{
                fontWeight: 700,
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.25rem 0.65rem',
                borderRadius: 4,
                fontSize: '0.74rem',
                border: '1px solid var(--border-default)',
              }}
            >
              {job.transactionType} (
              {job.transactionType === 'PO' ? 'Purchase Order' : 'Shipment Notice'})
            </span>

            <span
              style={{
                fontSize: '0.74rem',
                color: 'var(--primary-500)',
                backgroundColor: 'var(--primary-50)',
                padding: '0.25rem 0.65rem',
                borderRadius: 4,
                border: '1px solid var(--primary-100)',
                fontWeight: 600,
              }}
            >
              Format: {job.inputFormat}
            </span>

            {job.kafkaTopic && (
              <span
                style={{
                  fontSize: '0.74rem',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 4,
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title={`Broker Coordinates: Topic ${job.kafkaTopic}, Partition ${job.kafkaPartition ?? 0}, Offset ${job.kafkaOffset ?? 0}`}
              >
                <Radio size={12} />
                {job.kafkaTopic} : P#{job.kafkaPartition ?? 0} @{job.kafkaOffset ?? 0}
              </span>
            )}
          </div>
        </div>

        {/* 3. Job Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div className="job-meta-card">
            <span className="job-meta-card-label">Total Records</span>
            <div className="job-meta-card-value" style={{ fontSize: '1.15rem' }}>{job.totalRecords}</div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Parsed from {job.inputFormat}</span>
          </div>

          <div
            style={{
              background: 'var(--success-bg)',
              padding: '0.75rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--success-border)',
            }}
          >
            <span style={{ color: 'var(--success-text)', fontSize: '0.72rem', display: 'block', marginBottom: 2 }}>
              Valid / Converted
            </span>
            <div style={{ color: 'var(--success-text)', fontSize: '1.15rem', fontWeight: 700 }}>
              {job.convertedRecords}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--success-text)', opacity: 0.9 }}>
              {validPct}% canonical rate
            </span>
          </div>

          <div
            style={{
              background: job.errorRecords > 0 ? 'var(--error-bg)' : 'var(--bg-subtle)',
              padding: '0.75rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: job.errorRecords > 0 ? '1px solid var(--error-border)' : '1px solid var(--border-default)',
            }}
          >
            <span
              style={{
                color: job.errorRecords > 0 ? 'var(--error-text)' : 'var(--text-muted)',
                fontSize: '0.72rem',
                display: 'block',
                marginBottom: 2,
              }}
            >
              Validation Exceptions
            </span>
            <div
              style={{
                color: job.errorRecords > 0 ? 'var(--error-text)' : 'var(--text-main)',
                fontSize: '1.15rem',
                fontWeight: 700,
              }}
            >
              {job.errorRecords}
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                color: job.errorRecords > 0 ? 'var(--error-text)' : 'var(--text-dim)',
                opacity: 0.9,
              }}
            >
              {job.errorRecords > 0 ? 'Isolated in dead-letter' : '0 errors'}
            </span>
          </div>

          {duration && (
            <div className="job-meta-card">
              <span className="job-meta-card-label">Processing Duration</span>
              <div className="job-meta-card-value" style={{ fontSize: '1.15rem' }}>
                {duration}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                End-to-end execution
              </span>
            </div>
          )}

          <div className="job-meta-card">
            <span className="job-meta-card-label">Mapping Profile & Version</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-500)', wordBreak: 'break-all' }}>
              {job.mappingProfile || 'Standard Profile'}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              Version: <strong style={{ color: 'var(--text-main)' }}>{profileVersion || 'N/A'}</strong>
            </span>
          </div>

          <div className="job-meta-card">
            <span className="job-meta-card-label">Ingested Timestamp</span>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {job.createdAt
                ? new Date(job.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Not Available'}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {job.createdAt ? `${job.createdAt.slice(11, 23)} UTC` : 'N/A'}
            </span>
          </div>
        </div>
      </section>

      {/* 4. Processing Timeline Section (Requirement 2) */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--primary-500)" />
              End-to-End Processing Timeline
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              Lifecycle stages mapped from intake buffer through canonical conversion and outbound delivery
            </span>
          </div>

          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            <span>Operational Stages</span>
            <span style={{ margin: '0 0.25rem' }}>•</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1px dashed #94a3b8', display: 'inline-block' }} />
            <span>Not Connected in Sandbox</span>
          </div>
        </div>

        {/* Timeline Grid (6 Stages) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            position: 'relative',
          }}
        >
          {timeline.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isWarning = stage.status === 'warning';
            const isFailed = stage.status === 'failed';
            const isNotConnected = stage.status === 'not_connected';
            const isHalted = stage.status === 'halted' || stage.status === 'skipped';

            return (
              <div
                key={stage.id}
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: isNotConnected
                    ? '1px dashed var(--border-strong)'
                    : isFailed
                    ? '1px solid var(--error-border)'
                    : isWarning
                    ? '1px solid var(--warning-border)'
                    : '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isCompleted ? 'var(--shadow-xs)' : 'none',
                }}
              >
                <div>
                  {/* Stage Number & Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: isCompleted
                          ? 'var(--success-bg)'
                          : isFailed
                          ? 'var(--error-bg)'
                          : isWarning
                          ? 'var(--warning-bg)'
                          : isNotConnected
                          ? 'var(--bg-hover)'
                          : 'var(--bg-hover)',
                        color: isCompleted
                          ? 'var(--success-text)'
                          : isFailed
                          ? 'var(--error-text)'
                          : isWarning
                          ? 'var(--warning-text)'
                          : isNotConnected
                          ? 'var(--text-dim)'
                          : 'var(--text-dim)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {stage.stageNumber}
                    </span>

                    {/* Stage Status Indicator */}
                    {isCompleted ? (
                      <span style={{ color: 'var(--success-text)', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle2 size={13} />
                        Completed
                      </span>
                    ) : isWarning ? (
                      <span style={{ color: 'var(--warning-text)', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <AlertTriangle size={13} />
                        Exceptions
                      </span>
                    ) : isFailed ? (
                      <span style={{ color: 'var(--error-text)', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <XCircle size={13} />
                        Failed
                      </span>
                    ) : isNotConnected ? (
                      <span
                        style={{
                          color: 'var(--text-dim)',
                          backgroundColor: 'var(--bg-hover)',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 4,
                          border: '1px dashed var(--border-strong)',
                        }}
                      >
                        Not Connected
                      </span>
                    ) : isHalted ? (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 500 }}>
                        Halted
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 500 }}>
                        Not Available
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    {stage.name}
                  </h4>

                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '0.5rem' }}>
                    {stage.summary}
                  </p>
                </div>

                {/* Stage Timestamp or Status Note */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.45rem', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  {stage.timestamp ? (
                    <span>
                      {new Date(stage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  ) : isNotConnected ? (
                    <span style={{ fontStyle: 'italic' }}>Pending Cloud Adapter</span>
                  ) : (
                    <span>Bypassed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Deep Inspection Tabs */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Tab Navigation Strip */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-default)',
            overflowX: 'auto',
          }}
        >
          {/* TAB 1: PROCESSED DOCUMENTS */}
          <button
            onClick={() => setActiveTab('documents')}
            style={{
              padding: '0.85rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'documents' ? 'var(--primary-500)' : 'var(--text-muted)',
              borderBottom: activeTab === 'documents' ? '2px solid var(--primary-500)' : '2px solid transparent',
              marginBottom: -1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <FileText size={15} />
            <span>Processed Documents ({documents.length})</span>
          </button>

          {/* TAB 2: VALIDATION & ERRORS */}
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
              Validation & Errors {hasErrors ? `(${job.sampleErrors?.length || job.errorRecords})` : '(0)'}
            </span>
          </button>

          {/* TAB 3: PAYLOAD TRANSFORMATION (BEFORE VS AFTER) */}
          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              padding: '0.85rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'comparison' ? 'var(--primary-500)' : 'var(--text-muted)',
              borderBottom: activeTab === 'comparison' ? '2px solid var(--primary-500)' : '2px solid transparent',
              marginBottom: -1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <SplitSquareVertical size={15} />
            <span>Payload Transformation (Before vs. After)</span>
          </button>

          {/* TAB 4: PIPELINE FILES & ARTIFACTS */}
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
            <FileCode size={15} />
            <span>File Paths & Raw Artifacts</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* ============================================================== */}
          {/* TAB 1: PROCESSED DOCUMENTS IN THIS BATCH                       */}
          {/* ============================================================== */}
          {activeTab === 'documents' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                    Extracted Business Documents ({documents.length})
                  </h4>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                    Discrete Purchase Orders and Shipment Notices parsed from source file <strong>{job.originalFilename || 'inbound batch'}</strong>.
                  </p>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  Click any document row to inspect its discrete payload & validation status.
                </div>
              </div>

              {/* Documents Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginBottom: selectedDoc ? '1.5rem' : 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', width: 220 }}>
                        Document / Order Ref
                      </th>
                      <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', width: 100 }}>
                        Type
                      </th>
                      <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', width: 170 }}>
                        Status
                      </th>
                      <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                        Validation Diagnostic
                      </th>
                      <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', textAlign: 'right', width: 130 }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc, idx) => {
                      const isSelected = selectedDoc?.transactionId === doc.transactionId || selectedDoc?.externalReference === doc.externalReference;
                      const isReady = doc.validationStatus === 'VALID';
                      const hasDocErrors = doc.validationErrors && doc.validationErrors.length > 0;

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedDoc(isSelected ? null : doc)}
                        >
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary-500)', fontSize: '0.85rem' }}>
                              {doc.externalReference}
                            </div>
                            {doc.transactionId && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                {doc.transactionId}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ fontWeight: 700, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.72rem' }}>
                              {doc.transactionType}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {isReady ? (
                              <span className="status-badge status-completed" style={{ fontSize: '0.72rem' }}>
                                <CheckCircle2 size={12} />
                                Ready for MAWM
                              </span>
                            ) : (
                              <span className="status-badge status-failed" style={{ fontSize: '0.72rem' }}>
                                <XCircle size={12} />
                                Quarantined (Error)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: isReady ? 'var(--text-muted)' : 'var(--error-text)' }}>
                            {hasDocErrors ? (
                              <span>{doc.validationErrors[0]?.message || 'Validation rule exception detected'}</span>
                            ) : isReady ? (
                              <span style={{ color: 'var(--success-text)' }}>Canonical JSON envelope generated successfully</span>
                            ) : (
                              <span>Pending processing</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(isSelected ? null : doc);
                              }}
                            >
                              <Eye size={12} />
                              <span>{isSelected ? 'Hide Payload' : 'View Payload'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected Document Payloads Inspector */}
              {selectedDoc && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--primary-500)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    boxShadow: '0 0 12px rgba(2, 132, 199, 0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileCode size={18} color="var(--primary-500)" />
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Document Payload: {selectedDoc.externalReference}
                      </h5>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        ({selectedDoc.transactionId})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                    >
                      Close Inspector
                    </button>
                  </div>

                  {/* Side by side payload inspection */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
                    {/* Inbound Record */}
                    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                      <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          ERP Inbound Record (Before Conversion)
                        </span>
                        {selectedDoc.sourcePayload && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(formatPayload(selectedDoc.sourcePayload));
                            }}
                            className="btn-secondary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem' }}
                          >
                            <Copy size={11} />
                            <span>Copy</span>
                          </button>
                        )}
                      </div>
                      <pre style={{ margin: 0, padding: '0.85rem', fontSize: '0.75rem', maxHeight: 280, overflowY: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                        {selectedDoc.sourcePayload
                          ? formatPayload(selectedDoc.sourcePayload)
                          : 'No discrete payload recorded'}
                      </pre>
                    </div>

                    {/* Canonical MAWM Envelope */}
                    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                      <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          Canonical MAWM Envelope (After Normalization)
                        </span>
                        {selectedDoc.normalizedPayload && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(formatPayload(selectedDoc.normalizedPayload));
                            }}
                            className="btn-secondary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem' }}
                          >
                            <Copy size={11} />
                            <span>Copy</span>
                          </button>
                        )}
                      </div>
                      <pre style={{ margin: 0, padding: '0.85rem', fontSize: '0.75rem', maxHeight: 280, overflowY: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                        {selectedDoc.normalizedPayload
                          ? formatMawmOutput(selectedDoc.normalizedPayload)
                          : 'Canonical transformation was halted due to validation exception'}
                      </pre>
                    </div>
                  </div>

                  {/* If document has error, show specific error details and suggestions */}
                  {selectedDoc.validationErrors && selectedDoc.validationErrors.length > 0 && (
                    <div style={{ marginTop: '1rem', backgroundColor: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--error-text)', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <AlertTriangle size={15} />
                        <span>Validation Exception on {selectedDoc.externalReference}:</span>
                      </div>
                      {selectedDoc.validationErrors.map((err, errIdx) => (
                        <div key={errIdx} style={{ fontSize: '0.75rem', color: 'var(--error-text)', lineHeight: 1.45 }}>
                          • <strong>{err.field ? `Field '${err.field}': ` : ''}</strong>{err.message}
                          {err.correction && <span style={{ opacity: 0.9, marginLeft: 8 }}>({err.correction})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ERROR INSPECTION & SUGGESTED CORRECTIONS                */}
          {/* ============================================================== */}
          {activeTab === 'errors' && (
            <div>
              {hasErrors ? (
                <div>
                  {/* Error Overview Banner */}
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
                      boxShadow: '0 0 12px var(--error-glow)',
                    }}
                  >
                    <AlertTriangle size={20} color="var(--error-text)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--error-text)', marginBottom: 2 }}>
                        {job.sampleErrors?.length || job.errorRecords} Validation Exception(s) Isolated
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--error-text)', opacity: 0.95, margin: 0, lineHeight: 1.5 }}>
                        The integration engine quarantined these records into the dead-letter error repository.
                        Refer to the rule-supported suggested corrections below to update the ERP source file.
                      </p>
                    </div>
                  </div>

                  {/* Errors Table with Row #, Field, Code, Message, and Suggested Correction */}
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
                          <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', width: 340 }}>
                            Suggested Correction (Validation Rule)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(job.sampleErrors && job.sampleErrors.length > 0
                          ? job.sampleErrors
                          : [
                              {
                                recordNumber: 1,
                                errorCode: 'BATCH_VALIDATION_ERROR',
                                field: 'payload',
                                message: `${job.errorRecords} record(s) failed business constraints during conversion.`,
                              },
                            ]
                        ).map((err, idx) => {
                          const suggestion = getSuggestedCorrection(err);

                          return (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: '1px solid var(--border-subtle)',
                                backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
                              }}
                            >
                              {/* 1. Record / Row Number */}
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                                {err.recordNumber != null ? `#${err.recordNumber}` : `Row ${idx + 1}`}
                              </td>

                              {/* 2. Error Code */}
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
                                  {err.errorCode || 'VALIDATION_ERROR'}
                                </span>
                              </td>

                              {/* 3. Field Name */}
                              <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-500)', fontWeight: 600 }}>
                                <code>{err.field || 'N/A'}</code>
                              </td>

                              {/* 4. Error Message */}
                              <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                                {err.message}
                              </td>

                              {/* 5. Suggested Correction */}
                              <td style={{ padding: '0.85rem 1rem', lineHeight: 1.45 }}>
                                {suggestion ? (
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
                                    <span>{suggestion}</span>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem', fontStyle: 'italic' }}>
                                    Refer to mapping profile specification
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Dead-letter error file reference */}
                  <div style={{ marginTop: '1rem', fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={14} color="var(--primary-500)" />
                    <span>
                      Dead-Letter Error File Ref:{' '}
                      <code style={{ color: 'var(--text-main)' }}>
                        {job.errorFile || `data/errors/${job.jobId}-errors.jsonl`}
                      </code>
                    </span>
                  </div>
                </div>
              ) : job.status === 'FAILED' ? (
                <div
                  style={{
                    backgroundColor: 'var(--error-bg)',
                    border: '1px solid var(--error-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem',
                    textAlign: 'center',
                  }}
                >
                  <XCircle size={32} color="var(--error-text)" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--error-text)', marginBottom: 4 }}>
                    Job Execution Failed
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--error-text)', opacity: 0.9, maxWidth: 480, margin: '0 auto', lineHeight: 1.5 }}>
                    The integration engine failed during the input intake phase. Inspect the raw inbound ERP payload to review file formatting.
                  </p>
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
                  <p style={{ fontSize: '0.82rem', color: 'var(--success-text)', opacity: 0.9, maxWidth: 500, margin: '0 auto', lineHeight: 1.5 }}>
                    All {job.totalRecords} record(s) parsed cleanly and satisfied all business validation rules (valid warehouse, recognized SKU, and positive quantity values).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: PAYLOAD TRANSFORMATION (BEFORE VS AFTER)                */}
          {/* ============================================================== */}
          {activeTab === 'comparison' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Left: Input Before Conversion */}
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid var(--border-default)',
                      borderBottom: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>1. Inbound ERP Input (Before)</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--primary-500)', fontWeight: 600 }}>{job.inputFormat}</span>
                  </div>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-main)',
                      padding: '1rem',
                      borderRadius: '0 0 6px 6px',
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      overflowX: 'auto',
                      height: 320,
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
                      padding: '0.55rem 0.85rem',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid var(--success-border)',
                      borderBottom: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>2. MAWM Canonical Output (After)</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--success-text)', fontWeight: 600 }}>Normalized JSON</span>
                  </div>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      color: '#34d399',
                      padding: '1rem',
                      borderRadius: '0 0 6px 6px',
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      overflowX: 'auto',
                      height: 320,
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

          {/* ============================================================== */}
          {/* TAB 5: FILE PATHS & RAW ARTIFACT REFS                         */}
          {/* ============================================================== */}
          {activeTab === 'metadata' && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Ingestion Artifact File References
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="job-meta-card">
                    <span className="job-meta-card-label">Input File Reference</span>
                    <code style={{ fontSize: '0.74rem', color: 'var(--primary-500)', wordBreak: 'break-all' }}>
                      {job.inputFileRef || `data/input/${job.jobId}_${job.originalFilename}`}
                    </code>
                  </div>

                  <div className="job-meta-card">
                    <span className="job-meta-card-label">Canonical Output Artifacts</span>
                    <code style={{ fontSize: '0.74rem', color: 'var(--success-text)', wordBreak: 'break-all' }}>
                      {Array.isArray(job.outputFiles)
                        ? job.outputFiles.join(', ')
                        : (job.outputFiles || 'None (0 valid records)')}
                    </code>
                  </div>

                  <div className="job-meta-card">
                    <span className="job-meta-card-label">Dead-Letter Error File</span>
                    <code style={{ fontSize: '0.74rem', color: job.errorFile ? 'var(--error-text)' : 'var(--text-dim)', wordBreak: 'break-all' }}>
                      {job.errorFile || 'None (no errors isolated)'}
                    </code>
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Complete Raw Job Descriptor (JSON)
              </h4>
              <pre
                style={{
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  overflowX: 'auto',
                  maxHeight: 320,
                  border: '1px solid var(--border-default)',
                }}
              >
                {JSON.stringify(job, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Modal (Bootbox replacement) */}
      <ConfirmDialogModal
        isOpen={showDeleteConfirm}
        title="Delete Transaction Record"
        recordName={job.originalFilename || job.jobId}
        recordId={job.jobId}
        details={[
          { label: 'ERP Source', value: job.sourceSystem || '—' },
          { label: 'Document Type', value: job.transactionType || '—' },
          { label: 'Status', value: job.status || '—' },
          { label: 'Input Format', value: job.inputFormat || '—' }
        ]}
        warningText="This will permanently purge this transaction and all associated Kafka coordinates, payload history, and converted MAWM data from PostgreSQL table erp_file_intake_tracker. This action cannot be undone."
        confirmText="Delete Transaction"
        isLoading={isDeleting}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
