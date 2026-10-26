import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Folder,
  FileText,
  Download,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';

export default function S3ActivityPage() {
  const [s3Data, setS3Data] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('raw'); // 'raw' or 'converted'
  const [errorMsg, setErrorMsg] = useState('');

  const fetchS3Summary = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await integrationApi.getS3Summary();
      setS3Data(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch Amazon S3 summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchS3Summary();
  }, []);

  const rawObjects = s3Data?.rawObjects || [];
  const convertedObjects = s3Data?.convertedObjects || [];
  const displayObjects = activeTab === 'raw' ? rawObjects : convertedObjects;

  return (
    <div className="s3-activity-view">
      {/* S3 Header */}
      <div className="s3-header-card">
        <div className="s3-title-group">
          <div className="s3-badge-icon">
            <Cloud size={24} />
          </div>
          <div>
            <div className="badge-row">
              <span className="live-status-pill online">
                <span className="pulsing-dot" /> S3 CONNECTED
              </span>
              <span className="bucket-pill">Bucket: {s3Data?.bucket || 'erp-integration-blobs'}</span>
              <span className="region-pill">Region: ap-south-1 (Mumbai)</span>
            </div>
            <h2>Amazon S3 Cloud Activity Explorer</h2>
            <p>Live inventory of raw customer payloads and transformed canonical JSON blobs stored in Amazon S3.</p>
          </div>
        </div>

        <button
          className="refresh-s3-btn"
          onClick={fetchS3Summary}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          <span>Refresh S3 Inventory</span>
        </button>
      </div>

      {errorMsg && (
        <div className="s3-error-banner">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* S3 Metrics Cards */}
      <div className="s3-metrics-grid">
        <div className="s3-metric-card green">
          <div className="metric-header">
            <span className="metric-title">Raw Ingested Blobs</span>
            <Folder size={18} />
          </div>
          <div className="metric-value">{s3Data?.rawCount ?? 0} files</div>
          <div className="metric-sub">
            {((s3Data?.rawTotalBytes || 0) / 1024 / 1024).toFixed(2)} MB total raw payload stored
          </div>
        </div>

        <div className="s3-metric-card purple">
          <div className="metric-header">
            <span className="metric-title">Converted Canonical JSON</span>
            <FileText size={18} />
          </div>
          <div className="metric-value">{s3Data?.convertedCount ?? 0} files</div>
          <div className="metric-sub">
            {((s3Data?.convertedTotalBytes || 0) / 1024 / 1024).toFixed(2)} MB canonical documents
          </div>
        </div>

        <div className="s3-metric-card blue">
          <div className="metric-header">
            <span className="metric-title">Security &amp; Downloads</span>
            <ShieldCheck size={18} />
          </div>
          <div className="metric-value">Pre-Signed URLs</div>
          <div className="metric-sub">
            15-minute temporary cryptographic links (HTTP 302 Redirect)
          </div>
        </div>
      </div>

      {/* S3 Folders & Table */}
      <div className="s3-table-card">
        <div className="table-header-tabs">
          <div className="tabs-list">
            <button
              className={`folder-tab ${activeTab === 'raw' ? 'active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              <Folder size={16} />
              <span>📁 raw/ ({rawObjects.length} files)</span>
            </button>
            <button
              className={`folder-tab ${activeTab === 'converted' ? 'active' : ''}`}
              onClick={() => setActiveTab('converted')}
            >
              <FileText size={16} />
              <span>📁 converted/ ({convertedObjects.length} files)</span>
            </button>
          </div>
        </div>

        <div className="s3-objects-table-wrapper">
          <table className="s3-objects-table">
            <thead>
              <tr>
                <th>Object Key</th>
                <th>S3 URI</th>
                <th>Size</th>
                <th>Last Modified (UTC)</th>
                <th>Direct Cloud Download</th>
              </tr>
            </thead>
            <tbody>
              {displayObjects.length > 0 ? (
                displayObjects.map((obj, idx) => {
                  // Extract jobId if formatted like raw/<jobId>_<name>
                  const parts = obj.key.replace('raw/', '').replace('converted/', '').split('_');
                  const jobId = parts[0];
                  const downloadUrl = activeTab === 'raw'
                    ? integrationApi.getRawDownloadUrl(jobId)
                    : integrationApi.getJsonDownloadUrl(jobId);

                  return (
                    <tr key={idx}>
                      <td className="key-cell">
                        <FileText size={14} className="key-icon" />
                        <span className="key-name">{obj.key}</span>
                      </td>
                      <td className="uri-cell">
                        <code>{obj.s3Uri}</code>
                      </td>
                      <td className="size-cell">
                        {((obj.sizeBytes || 0) / 1024 / 1024).toFixed(2)} MB ({obj.sizeBytes?.toLocaleString()} bytes)
                      </td>
                      <td className="date-cell">
                        <Clock size={12} />
                        <span>{obj.lastModified}</span>
                      </td>
                      <td className="action-cell">
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="s3-download-link"
                        >
                          <Download size={14} />
                          <span>Pre-Signed URL</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="no-data-cell">
                    No files found in <code>s3://{s3Data?.bucket || 'erp-integration-blobs'}/{activeTab}/</code>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
