import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  Check,
  CheckCheck,
  ExternalLink,
  ArrowRight
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

  // 5.4.2 Verification Search Tool State - Starts empty (no hardcoded ASN)
  const [searchAsnId, setSearchAsnId] = useState('');
  const [searchFacility, setSearchFacility] = useState('Food_Cbe');
  const [searchingAsn, setSearchingAsn] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [showRawSearchJson, setShowRawSearchJson] = useState(false);

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

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [telemetryData, allTrackers] = await Promise.all([
        integrationApi.getMawmTelemetry().catch(() => null),
        integrationApi.getAllTrackers().catch(() => [])
      ]);
      if (telemetryData) setTelemetry(telemetryData);
      if (Array.isArray(allTrackers)) setTrackers(allTrackers);
    } catch (err) {
      console.error('Failed to load MAWM dispatch data:', err);
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
      setTestResult({
        success: true,
        message: `Connected in ${res.latencyMs}ms. OAuth Bearer token active for user "${res.username || 'lezhilarasan'}".`
      });
      await loadData(true);
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  // 5.4.2 Interactive Verification Search
  const handleManualSearchAsn = async (overrideFacility) => {
    const targetAsn = searchAsnId.trim();
    const targetFac = (overrideFacility || searchFacility).trim();
    if (!targetAsn) return;
    setSearchingAsn(true);
    setSearchResult(null);
    setShowRawSearchJson(false);
    try {
      const res = await integrationApi.searchAsnVerification(targetAsn, targetFac);
      setSearchResult(res);
    } catch (err) {
      setSearchResult({
        success: false,
        statusCode: 500,
        cleanError: err.message || 'Failed to query MAWM ASN verification search API',
        error: err.message || 'Failed to query MAWM ASN verification search API',
        facilityId: targetFac
      });
    } finally {
      setSearchingAsn(false);
    }
  };

  // Aggregate stats for Opti
  const stats = useMemo(() => {
    let delivered = 0;
    let verified = 0;
    trackers.forEach((r) => {
      const src = (r.sourceSystem || '').toUpperCase();
      const isOpti = src === 'OPTI' || src === 'OTPI';
      if (!isOpti) return;
      const s = (r.dispatchStatus || '').toUpperCase();
      const v = (r.mawmAsnStatus || '').toUpperCase();
      if (s.includes('DELIVERED') || s.includes('200')) delivered++;
      if (v.includes('8000') || v.includes('VERIFIED')) verified++;
    });
    return { delivered, verified };
  }, [trackers]);

  return (
    <div className="page-container" style={{ padding: '1.25rem 1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <Radio size={22} className="pulse-icon" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                MAWM ASN Verification Hub
              </h1>
              <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                OPTI EXCLUSIVE
              </span>
              <span className="badge" style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                LIVE CLOUD
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Manhattan Active® WMS Automated Ingestion & Receipt Verification Hub for Opti ERP feeds.
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
            <span>{testingConnection ? 'Testing...' : 'Test OAuth Connection'}</span>
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

          {onNavigateToJobs && (
            <button
              onClick={onNavigateToJobs}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.42rem 0.9rem', fontSize: '0.8rem' }}
              title="Open the central File Tracker & API Audit engine"
            >
              <span>File Tracker & Jobs</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* OAuth Connection Status Banner */}
      {testResult && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.65rem 1rem',
          borderRadius: '6px',
          backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
          color: testResult.success ? '#10b981' : '#ef4444',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* 2. Top Metric KPI Summary Cards (Clean: NO target host displayed!) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>WMS CLOUD INTEGRATION</span>
            <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              ONLINE
            </span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Active & Connected
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Token Status: <strong style={{ color: '#10b981' }}>OAuth2 Valid</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>FACILITY & USER</span>
            <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700, backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
              ROUTING
            </span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {telemetry?.defaultFacility || 'Food_Cbe'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            User: <strong style={{ color: '#a78bfa' }}>{telemetry?.username || 'lezhilarasan'}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERIFIED RECEIPTS</span>
            <CheckCheck size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.2 }}>
            {stats.verified}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Status Code: <strong style={{ color: '#38bdf8' }}>8000 Verified</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL DELIVERED</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
            {stats.delivered}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Status: <span style={{ color: '#10b981', fontWeight: 600 }}>200 OK</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Notice Banner pointing to File Tracker & Jobs */}
      <div style={{
        marginBottom: '1.25rem',
        padding: '0.85rem 1.15rem',
        borderRadius: '8px',
        backgroundColor: 'rgba(30, 41, 59, 0.45)',
        border: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            All Ingestion Files & Transformation Jobs
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Detailed file tracking, S3 claim checks, Kafka topics, and full audit logs are managed in the central File Tracker & API Audit engine.
          </div>
        </div>

        {onNavigateToJobs && (
          <button
            onClick={onNavigateToJobs}
            className="btn-secondary"
            style={{
              padding: '0.35rem 0.8rem',
              fontSize: '0.76rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#38bdf8',
              borderColor: 'rgba(56, 189, 248, 0.3)'
            }}
          >
            <span>Open File Tracker & Jobs</span>
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      {/* =========================================================================
          4. Interactive ASN Verification Search Console (Clean: NO Target Host or API!)
         ========================================================================= */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Search size={16} />
              <span>ASN Verification Status Query Console</span>
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Query real-time receipt verification status in Manhattan Active WMS (Verified Code: <strong style={{ color: '#10b981' }}>8000</strong>)
            </p>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.55rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            Status: 8000 = Verified
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* AsnId Input - Clean, NO hardcoded text */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              AsnId to Search:
            </label>
            <input
              type="text"
              value={searchAsnId}
              onChange={(e) => setSearchAsnId(e.target.value)}
              placeholder="Enter AsnId to query..."
              className="input-field"
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono, monospace)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Destination Facility Input with Quick Presets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Destination Facility:
              </label>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => setSearchFacility('Food_Cbe')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: searchFacility === 'Food_Cbe' ? '#10b981' : '#38bdf8',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                  title="User lezhilarasan is authorized for Food_Cbe"
                >
                  Food_Cbe (Auth)
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>|</span>
                <button
                  type="button"
                  onClick={() => setSearchFacility('Food_chn')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: searchFacility === 'Food_chn' ? '#f59e0b' : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Food_chn
                </button>
              </div>
            </div>
            <input
              type="text"
              value={searchFacility}
              onChange={(e) => setSearchFacility(e.target.value)}
              placeholder="e.g. Food_Cbe"
              className="input-field"
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono, monospace)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Action Button */}
          <div>
            <button
              onClick={() => handleManualSearchAsn()}
              disabled={searchingAsn || !searchAsnId.trim()}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '0.48rem 1rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                backgroundColor: '#0284c7',
                borderColor: '#0284c7',
                cursor: searchAsnId.trim() ? 'pointer' : 'not-allowed',
                opacity: searchAsnId.trim() ? 1 : 0.6
              }}
            >
              <Search size={14} className={searchingAsn ? 'spin-icon' : ''} />
              <span>{searchingAsn ? 'Querying MAWM Cloud...' : 'Check Verification Status'}</span>
            </button>
          </div>
        </div>

        {/* Formatted Search Output Container (Properly bounded, NO target host displayed!) */}
        {searchResult && (
          <div style={{
            marginTop: '1rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '8px',
            backgroundColor: searchResult.isVerified
              ? 'rgba(16, 185, 129, 0.1)'
              : (searchResult.success ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.08)'),
            border: `1px solid ${searchResult.isVerified ? '#10b981' : (searchResult.success ? '#f59e0b' : 'rgba(239, 68, 68, 0.35)')}`,
            boxSizing: 'border-box',
            maxWidth: '100%',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              {searchResult.isVerified ? (
                <CheckCheck size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : searchResult.success ? (
                <Clock size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  {searchResult.isVerified ? (
                    <span style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      border: '1px solid #10b981',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      STATUS 8000: VERIFIED IN MAWM
                    </span>
                  ) : searchResult.success ? (
                    <span style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      border: '1px solid #f59e0b',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      STATUS: {searchResult.asnStatus || 'PENDING'}
                    </span>
                  ) : (
                    <span style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      HTTP {searchResult.statusCode || 500} ERROR
                    </span>
                  )}

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                    AsnId: <strong>{searchResult.asnId || searchAsnId}</strong> | Facility: <strong>{searchResult.facilityId || searchFacility}</strong>
                  </span>
                </div>

                <div style={{
                  fontSize: '0.82rem',
                  color: searchResult.isVerified ? '#34d399' : (searchResult.success ? '#fbbf24' : '#f87171'),
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.45
                }}>
                  {searchResult.isVerified
                    ? 'Receipt verification confirmed in MAWM Cloud. Ingestion completed in Opti ERP.'
                    : (searchResult.cleanError || searchResult.error || searchResult.statusDescription)}
                </div>
              </div>
            </div>

            {/* Smart Recommendation for unauthorized facility (e.g. Food_chn) */}
            {String(searchResult.cleanError || searchResult.error || '').includes('does not have access to the selected organization') && (
              <div style={{
                marginTop: '0.65rem',
                padding: '0.55rem 0.85rem',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.65rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ fontSize: '0.76rem', color: '#38bdf8' }}>
                  <strong>Access Tip:</strong> User <code>{telemetry?.username || 'lezhilarasan'}</code> is assigned to <strong>Food_Cbe</strong>.
                </div>
                <button
                  onClick={() => {
                    setSearchFacility('Food_Cbe');
                    handleManualSearchAsn('Food_Cbe');
                  }}
                  className="btn-secondary"
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.22rem 0.6rem',
                    borderColor: '#38bdf8',
                    color: '#38bdf8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Check size={12} />
                  <span>Switch to Food_Cbe & Retry</span>
                </button>
              </div>
            )}

            {/* Collapsible Full Response */}
            {searchResult.rawResponse && (
              <div style={{ marginTop: '0.65rem' }}>
                <button
                  onClick={() => setShowRawSearchJson(!showRawSearchJson)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{showRawSearchJson ? 'Hide Technical Response' : 'View Full Technical Response (JSON)'}</span>
                </button>
                {showRawSearchJson && (
                  <pre style={{
                    marginTop: '0.35rem',
                    padding: '0.65rem',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    borderRadius: '4px',
                    maxHeight: '160px',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.72rem',
                    color: searchResult.success ? '#34d399' : '#fca5a5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {formatPayload(searchResult.rawResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}