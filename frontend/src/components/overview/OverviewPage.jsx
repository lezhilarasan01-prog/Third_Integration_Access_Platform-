import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  TrendingUp,
  BarChart3,
  Info,
  ChevronRight,
  Activity,
  Server,
  Radio,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  FileText,
  CheckCircle2
} from 'lucide-react';
import KpiCard from './KpiCard';
import ThroughputVelocityChart from './ThroughputVelocityChart';
import { integrationApi } from '../../services/integrationApi';

export default function OverviewPage({ onNavigateToJobs, onNavigateToKafkaStudio, onNavigateToS3, onNavigateToDlq, onOpenTestUpload }) {
  const [trackers, setTrackers] = useState(() => integrationApi.getCachedTrackers() || []);
  const [stats, setStats] = useState(null);
  const [s3Summary, setS3Summary] = useState(() => integrationApi.getCachedS3Summary() || null);
  const [isLoading, setIsLoading] = useState(() => !integrationApi.getCachedTrackers());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRealtimeData = async (force = false) => {
    try {
      const [trackerRes, s3Res, statsRes] = await Promise.allSettled([
        integrationApi.getAllTrackers(force),
        integrationApi.getS3Summary(force),
        integrationApi.getStats(force)
      ]);

      if (trackerRes.status === 'fulfilled' && Array.isArray(trackerRes.value)) {
        setTrackers(trackerRes.value);
      }
      if (s3Res.status === 'fulfilled' && s3Res.value) {
        setS3Summary(s3Res.value);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
    } catch (e) {
      console.warn('Realtime telemetry fetch error:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData(false);
    const timer = setInterval(() => fetchRealtimeData(false), 10000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchRealtimeData(true);
  };

  // 1. Dynamic KPI Metrics derived 100% from PostgreSQL erp_file_intake_tracker
  const totalJobs = stats && stats.total != null ? stats.total : trackers.length;
  const processingJobs = stats && stats.processing != null
    ? stats.processing
    : trackers.filter(
        (t) => t.intakeStatus === 'PROCESSING' || t.intakeStatus === 'RECEIVED' || t.intakeStatus === 'IN_PROGRESS' || t.intakeStatus === 'QUEUED'
      ).length;
  const completedJobs = stats && stats.completed != null
    ? stats.completed
    : trackers.filter(
        (t) => t.intakeStatus === 'CONVERTED' || t.intakeStatus === 'COMPLETED'
      ).length;
  const failedJobs = stats && stats.failed != null
    ? stats.failed
    : trackers.filter(
        (t) => t.intakeStatus === 'FAILED' || (t.errorRecords > 0 && (!t.convertedRecords || t.convertedRecords === 0))
      ).length;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 100;

  const realKpiCards = [
    {
      id: 'total-jobs',
      label: 'TOTAL INTEGRATION JOBS',
      value: totalJobs,
      subtext: `${totalJobs} submitted integration jobs`,
      iconName: 'Layers',
      variant: 'blue',
      badgeText: `${totalJobs} Submitted`,
      badgeType: 'neutral',
      pulse: false,
      onClick: () => onNavigateToJobs && onNavigateToJobs('ALL'),
    },
    {
      id: 'processing-jobs',
      label: 'PROCESSING',
      value: processingJobs,
      subtext: processingJobs > 0 ? `${processingJobs} jobs currently in flight` : 'Jobs currently being processed',
      iconName: 'Loader2',
      variant: 'amber',
      badgeText: processingJobs > 0 ? 'In Progress' : 'Idle',
      badgeType: processingJobs > 0 ? 'warning' : 'neutral',
      pulse: processingJobs > 0,
      onClick: () => onNavigateToJobs && onNavigateToJobs('ALL'),
    },
    {
      id: 'completed-jobs',
      label: 'COMPLETED',
      value: completedJobs,
      subtext: 'Jobs completed successfully',
      iconName: 'CheckCircle2',
      variant: 'emerald',
      badgeText: `${completionRate}% Completed`,
      badgeType: 'positive',
      pulse: false,
      onClick: () => onNavigateToJobs && onNavigateToJobs('ALL'),
    },
    {
      id: 'failed-jobs',
      label: 'FAILED',
      value: failedJobs,
      subtext: failedJobs > 0 ? `${failedJobs} jobs that failed execution` : 'Jobs that failed execution',
      iconName: 'AlertCircle',
      variant: 'red',
      badgeText: `${failedJobs} Exceptions`,
      badgeType: failedJobs > 0 ? 'danger' : 'neutral',
      pulse: failedJobs > 0,
      onClick: () => {
        if (onNavigateToDlq) onNavigateToDlq();
        else if (onNavigateToJobs) onNavigateToJobs('ALL');
      },
    },
  ];

  // 2. Dynamic Host Systems & Audit Hub data grouped from live trackers
  const realSourceStats = useMemo(() => {
    if (!trackers.length) return [];
    const counts = {};
    const formats = {};
    const successCounts = {};
    const errorCounts = {};
    const lastTimestamps = {};
    const lastTimeObjs = {};

    trackers.forEach((t) => {
      const src = t.sourceSystem || 'UNKNOWN_SOURCE';
      counts[src] = (counts[src] || 0) + 1;
      if (t.inputFormat) formats[src] = t.inputFormat;

      const isSuccess = t.intakeStatus === 'CONVERTED' || t.intakeStatus === 'COMPLETED';
      if (isSuccess) {
        successCounts[src] = (successCounts[src] || 0) + 1;
      }
      const isFailed = (t.errorRecords && t.errorRecords > 0) || t.intakeStatus === 'FAILED' || t.intakeStatus === 'DLQ_FAILED';
      if (isFailed) {
        errorCounts[src] = (errorCounts[src] || 0) + 1;
      }

      const ts = t.receivedAt || t.updatedAt;
      if (ts) {
        const timeVal = new Date(ts).getTime();
        if (!isNaN(timeVal) && (!lastTimestamps[src] || timeVal > (lastTimeObjs[src] || 0))) {
          lastTimestamps[src] = ts;
          lastTimeObjs[src] = timeVal;
        }
      }
    });

    const colorMap = {
      CUSTOMER_D_ERP: '#0284c7',
      CUSTOMER_A_ERP: '#10b981',
      CUSTOMER_B_ERP: '#ea580c',
      CUSTOMER_C_ERP: '#8b5cf6',
      SAP_ERP: '#0d9488',
      LOGISTICS_PARTNER: '#7c3aed',
    };

    return Object.entries(counts)
      .map(([code, count]) => {
        const share = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
        const successes = successCounts[code] || 0;
        const errors = errorCounts[code] || 0;
        const rate = count > 0 ? Math.round((successes / count) * 100) : 100;
        const lastTimestamp = lastTimestamps[code] || null;
        const lastTimeMs = lastTimeObjs[code] || 0;

        let timeLabel = 'Active';
        if (lastTimestamp) {
          try {
            const d = new Date(lastTimestamp);
            timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            timeLabel = 'Recent';
          }
        }

        return {
          id: code,
          name: code,
          share,
          jobCount: count,
          successCount: successes,
          errorCount: errors,
          successRate: rate,
          lastActive: timeLabel,
          lastTimeMs: lastTimeMs,
          defaultFormat: formats[code] ? `${formats[code]} Live Feed` : 'CSV Live Feed',
          color: colorMap[code] || '#0284c7',
        };
      })
      .sort((a, b) => b.lastTimeMs - a.lastTimeMs || b.jobCount - a.jobCount);
  }, [trackers, totalJobs]);

  // 3. Dynamic Realtime Ingestion Batches (Every individual trigger)
  const realThroughputBatches = useMemo(() => {
    if (!trackers.length) return [];
    return trackers.map((t) => {
      const ts = t.receivedAt || t.updatedAt || new Date().toISOString();
      const valid = t.convertedRecords || 0;
      const errors = t.errorRecords || 0;
      const isDuplicate = t.intakeStatus === 'DUPLICATE_SKIPPED';
      return {
        jobId: t.jobId,
        time: ts,
        filename: t.originalFilename || 'unnamed.dat',
        valid: valid,
        errors: errors,
        isDuplicate: isDuplicate,
        total: t.totalRecords || (valid + errors) || (isDuplicate ? 4 : 1),
        source: t.sourceSystem,
        facility: t.facilityId || 'GLOBAL',
        status: t.intakeStatus,
        dateObj: new Date(ts),
      };
    }).sort((a, b) => a.dateObj - b.dateObj);
  }, [trackers]);

  // 3.1 Dynamic Hourly Ingestion Throughput Velocity grouped by timestamp from live trackers
  const realThroughputData = useMemo(() => {
    if (!trackers.length) return [];
    const slots = {};
    trackers.forEach((t) => {
      const ts = t.receivedAt || t.updatedAt || new Date().toISOString();
      const d = new Date(ts);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const key = `${month}/${day} ${hour}:00`;

      if (!slots[key]) {
        slots[key] = {
          time: key,
          valid: 0,
          errors: 0,
          total: 0,
          dateObj: d,
        };
      }
      const valid = t.convertedRecords || 0;
      const errors = t.errorRecords || 0;
      slots[key].valid += valid;
      slots[key].errors += errors;
      slots[key].total += (t.totalRecords || (valid + errors));
    });

    return Object.values(slots).sort((a, b) => a.dateObj - b.dateObj);
  }, [trackers]);

  return (
    <div className="page-container">
      {/* 1. Welcome & Platform Hero */}
      <section className="overview-hero">
        <div className="overview-hero-text">
          <h1 className="overview-hero-title">
            <span className="title-gradient">ERB</span>
          </h1>
          <p className="overview-hero-subtitle">
            ERP to MAWM Logistics Gateway • Inbound PO &amp; ASN Realtime Data Feed
          </p>
        </div>

        <div className="overview-hero-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="hero-btn hero-btn-secondary"
            onClick={handleManualRefresh}
            title="Refresh realtime telemetry from database and Amazon S3"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Live Sync'}</span>
          </button>
        </div>
      </section>

      {/* 2. Realtime KPI Grid */}
      <section className="kpi-grid" aria-label="Key Performance Indicators">
        {realKpiCards.map((card) => (
          <KpiCard
            key={card.id}
            label={card.label}
            value={card.value}
            subtext={card.subtext}
            iconName={card.iconName}
            variant={card.variant}
            badgeText={card.badgeText}
            badgeType={card.badgeType}
            pulse={card.pulse}
            onClick={card.onClick}
          />
        ))}
      </section>

      {/* 3. ERP Systems & Audit Hub (Full View Primary Grid) */}
      <section style={{ marginBottom: '1.75rem' }}>
        <div className="dashboard-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h3>
                <Server size={18} color="#0284c7" />
                Host Systems &amp; Audit Hub
              </h3>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(2, 132, 199, 0.3)'
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
              {realSourceStats.length} Live Connected Hosts
            </span>
          </div>

          <div className="erp-audit-list">
            {realSourceStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active source systems recorded yet.
              </div>
            ) : (
              realSourceStats.map((src) => (
                <div
                  key={src.id}
                  className="erp-audit-card"
                  onClick={() => onNavigateToJobs && onNavigateToJobs(src.name)}
                  title={`Click to open File Tracker & Audit for ${src.name}`}
                >
                  {/* Card Header: Avatar, Name, Format, Action Button */}
                  <div className="erp-audit-card-header">
                    <div className="erp-audit-card-title">
                      <div className="erp-avatar" style={{ backgroundColor: src.color }}>
                        {src.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="erp-name">{src.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                          {src.defaultFormat}
                        </div>
                      </div>
                    </div>

                    <div className="erp-audit-action-btn">
                      <span>Audit Files</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>

                  {/* Card Micro Stats Grid */}
                  <div className="erp-stats-row">
                    <div className="erp-stat-cell">
                      <span className="erp-stat-label">Tracked Files</span>
                      <span className="erp-stat-value" style={{ color: 'var(--text-main)' }}>
                        <FileText size={12} color="var(--text-dim)" />
                        {src.jobCount} {src.jobCount === 1 ? 'batch' : 'batches'}
                      </span>
                    </div>

                    <div className="erp-stat-cell">
                      <span className="erp-stat-label">Conversion</span>
                      <span className="erp-stat-value" style={{ color: src.successRate === 100 ? '#10b981' : '#f59e0b' }}>
                        <CheckCircle2 size={12} color={src.successRate === 100 ? '#10b981' : '#f59e0b'} />
                        {src.successRate}%
                      </span>
                    </div>

                    <div className="erp-stat-cell">
                      <span className="erp-stat-label">Exceptions</span>
                      <span className="erp-stat-value" style={{ color: src.errorCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {src.errorCount > 0 ? (
                          <>
                            <AlertTriangle size={12} color="#ef4444" />
                            {src.errorCount} DLQ
                          </>
                        ) : (
                          '0 DLQ'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Clean Last Active Timestamp (Scales cleanly for 100+ ERPs) */}
                  <div className="erp-footer-meta" style={{ marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Last active: {src.lastActive}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 4. Ingestion Throughput Velocity Chart (Secondary View Below) */}
      <section style={{ marginBottom: '1.75rem' }}>
        <ThroughputVelocityChart throughputData={realThroughputData} throughputBatches={realThroughputBatches} />
      </section>
    </div>
  );
}
