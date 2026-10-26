import React, { useState, useMemo } from 'react';
import { BarChart3, Info, CheckCircle2, AlertTriangle, Layers, Clock, Zap, Calendar } from 'lucide-react';

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  const val = Number(num);
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 10000) return (val / 1000).toFixed(0) + 'k';
  return val.toLocaleString();
}

export default function ThroughputVelocityChart({ throughputData = [], throughputBatches = [] }) {
  // timeRange: '24h' (Last 24 Hours) | 'date' (Specific Date Selection) | 'all' (All time history)
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  // viewType: 'batches' (Every individual trigger) | 'hourly' (Hourly pickup rollup)
  const [viewType, setViewType] = useState('batches');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // 1. Filter individual triggers by timeRange (24h rolling, specific date, or all time)
  const activeBatches = useMemo(() => {
    if (timeRange === 'all') return throughputBatches;
    if (timeRange === 'date' && selectedDate) {
      return throughputBatches.filter((b) => {
        const d = b.dateObj || new Date(b.time);
        if (!d || isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const itemDateStr = `${y}-${m}-${day}`;
        return itemDateStr === selectedDate;
      });
    }
    // Default: '24h' (Last 24 hours rolling from current time)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return throughputBatches.filter((b) => {
      const t = b.dateObj ? b.dateObj.getTime() : new Date(b.time).getTime();
      return !isNaN(t) && t >= cutoff;
    });
  }, [throughputBatches, timeRange, selectedDate]);

  // 2. Compute dynamic Hourly Pickup Rollup for the selected time window
  const activeHourly = useMemo(() => {
    if (timeRange === 'all') return throughputData;
    const slots = {};
    activeBatches.forEach((t) => {
      const d = t.dateObj || new Date(t.time);
      if (!d || isNaN(d.getTime())) return;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const key = `${month}/${day} ${hour}:00`;

      if (!slots[key]) {
        slots[key] = {
          time: key,
          valid: 0,
          errors: 0,
          skipped: 0,
          total: 0,
          dateObj: d,
          batchCount: 0,
        };
      }
      const valid = t.valid || 0;
      const errors = t.errors || 0;
      const skipped = t.isDuplicate ? (t.total || 4) : (t.skipped || 0);
      slots[key].valid += valid;
      slots[key].errors += errors;
      slots[key].skipped += skipped;
      slots[key].total += (t.total || (valid + errors));
      slots[key].batchCount += 1;
    });
    return Object.values(slots).sort((a, b) => a.dateObj - b.dateObj);
  }, [activeBatches, throughputData, timeRange]);

  // Pick dataset based on viewType
  const isBatchMode = viewType === 'batches';
  const rawData = isBatchMode ? activeBatches : activeHourly;
  const data = Array.isArray(rawData) ? rawData : [];

  // Totals
  const totalValid = data.reduce((sum, item) => sum + (item.valid || 0), 0);
  const totalErrors = data.reduce((sum, item) => sum + (item.errors || 0), 0);
  const totalSkipped = data.reduce((sum, item) => sum + (item.skipped || (item.isDuplicate ? item.total : 0) || 0), 0);
  const totalRecords = totalValid + totalErrors + totalSkipped;

  // Max value calculation
  const maxVal = Math.max(
    ...data.map((d) => (d.valid || 0) + (d.errors || 0) + (d.isDuplicate ? d.total : 0) || 1),
    10
  );

  const chartHeight = 200; // px

  // Calculate adaptive bar height so small batches (e.g. 4 records) are clearly visible alongside 100k batches
  const calculateBarHeight = (value) => {
    if (!value || value <= 0) return 0;
    // Logarithmic scaling ensures 4 records gets ~25% height and 100k gets 100% height
    const minHeight = 26; // px
    const logVal = Math.log10(value + 1);
    const logMax = Math.log10(maxVal + 1);
    const ratio = logMax > 0 ? logVal / logMax : 0.5;
    return Math.max(minHeight, Math.round(ratio * (chartHeight - 40)));
  };

  const formatTimeLabel = (timeStr) => {
    if (!timeStr) return { time: '', date: '' };
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = d.getHours();
        const mins = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 === 0 ? 12 : hours % 12;
        return {
          time: `${displayHour}:${mins} ${ampm}`,
          date: `${month}/${day}`
        };
      }
    } catch (e) {}

    const parts = String(timeStr).split(' ');
    const hourPart = parts[1] || timeStr;
    const datePart = parts[0] || '';
    const [h, m] = hourPart.split(':');
    const hourNum = parseInt(h, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    return {
      time: `${displayHour}:${m || '00'} ${ampm}`,
      date: datePart,
    };
  };

  return (
    <div className="dashboard-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Panel Header */}
      <div className="panel-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3>
            <BarChart3 size={18} color="#10b981" />
            Ingestion Throughput Velocity
          </h3>
          <div className="panel-header-subtitle">
            {timeRange === 'date'
              ? `Selected Date (${selectedDate}): ${isBatchMode ? 'Individual file triggers on this day' : 'Hourly pickup volume on this day'}`
              : (isBatchMode
                  ? 'Last 24 Hours: Individual file triggers from current time with facility & deduplication telemetry'
                  : 'Last 24 Hours: Continuous hourly pickup volume from current time (normalized vs. DLQ errors)')}
          </div>
        </div>

        {/* Controls: Time Range & Date Selection + View Mode (Batches vs Hourly) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* 1. Time Range & Date Selector */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 6,
              padding: 2,
              border: '1px solid var(--border-default)',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setTimeRange('24h')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.35rem 0.65rem',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: timeRange === '24h' ? 'var(--bg-surface)' : 'transparent',
                color: timeRange === '24h' ? '#10b981' : 'var(--text-dim)',
                boxShadow: timeRange === '24h' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title="Filter to last 24 hours from current time"
            >
              <Clock size={13} />
              <span>Last 24 Hours</span>
            </button>

            {/* Date Selection with Calendar Picker */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
                cursor: 'pointer',
                backgroundColor: timeRange === 'date' ? 'var(--bg-surface)' : 'transparent',
                color: timeRange === 'date' ? '#38bdf8' : 'var(--text-dim)',
                boxShadow: timeRange === 'date' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
                borderLeft: '1px solid var(--border-subtle)',
              }}
              title="Select a specific calendar date"
              onClick={() => setTimeRange('date')}
            >
              <Calendar size={13} color={timeRange === 'date' ? '#38bdf8' : 'var(--text-dim)'} />
              <span>Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setTimeRange('date');
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: timeRange === 'date' ? '#38bdf8' : 'var(--text-dim)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'inherit',
                  colorScheme: 'dark',
                  padding: 0,
                  margin: 0,
                }}
              />
            </div>
          </div>

          {/* 2. View Switcher: Per Trigger vs Hourly Pickup */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 6,
              padding: 2,
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              onClick={() => setViewType('batches')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.35rem 0.65rem',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isBatchMode ? 'var(--bg-surface)' : 'transparent',
                color: isBatchMode ? '#10b981' : 'var(--text-dim)',
                boxShadow: isBatchMode ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title="View each file upload trigger individually"
            >
              <Zap size={13} />
              <span>Per Trigger ({activeBatches.length})</span>
            </button>
            <button
              onClick={() => setViewType('hourly')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.35rem 0.65rem',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: !isBatchMode ? 'var(--bg-surface)' : 'transparent',
                color: !isBatchMode ? '#0284c7' : 'var(--text-dim)',
                boxShadow: !isBatchMode ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title="View hourly pickup rollups"
            >
              <Clock size={13} />
              <span>Hourly Pickup ({activeHourly.length})</span>
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              backgroundColor: 'var(--bg-surface)',
              padding: '0.35rem 0.75rem',
              borderRadius: 6,
              border: '1px solid var(--border-default)',
            }}
          >
            <span>
              <strong style={{ color: '#10b981' }}>{formatNumber(totalValid)}</strong> Valid
            </span>
            {totalSkipped > 0 && (
              <span>
                <strong style={{ color: '#f59e0b' }}>{formatNumber(totalSkipped)}</strong> Skipped
              </span>
            )}
            <span>
              <strong style={{ color: totalErrors > 0 ? '#ef4444' : 'var(--text-dim)' }}>
                {formatNumber(totalErrors)}
              </strong> Errors
            </span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <BarChart3 size={32} color="var(--border-strong)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
          <div>No transaction throughput recorded yet.</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Realtime processing pipeline is online and awaiting new inbound ERP files.
          </div>
        </div>
      ) : (
        <>
          {/* Main Chart Area */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              marginTop: '0.75rem',
              marginBottom: '0.5rem',
              userSelect: 'none',
            }}
          >
            {/* Y-Axis Column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: chartHeight,
                paddingRight: '0.75rem',
                textAlign: 'right',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
                width: 44,
                borderRight: '1px solid var(--border-default)',
              }}
            >
              <span style={{ lineHeight: 1 }}>{formatNumber(maxVal)}</span>
              <span style={{ lineHeight: 1 }}>{formatNumber(Math.round(maxVal * 0.5))}</span>
              <span style={{ lineHeight: 1 }}>10k</span>
              <span style={{ lineHeight: 1 }}>100</span>
              <span style={{ lineHeight: 1 }}>0</span>
            </div>

            {/* Chart Body with Horizontal Grid Lines & Bars */}
            <div style={{ position: 'relative', flex: 1, height: chartHeight, marginLeft: '0.5rem' }}>
              {/* Horizontal Gridlines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                }}
              >
                {[1, 2, 3, 4, 5].map((val) => (
                  <div
                    key={val}
                    style={{
                      width: '100%',
                      borderBottom: val === 5 ? '1px solid var(--border-default)' : '1px dashed var(--border-subtle)',
                    }}
                  />
                ))}
              </div>

              {/* Bar Columns Container */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  paddingLeft: '0.5rem',
                  paddingRight: '0.5rem',
                }}
              >
                {data.map((item, index) => {
                  const isHovered = hoveredIndex === index;
                  const formatted = formatTimeLabel(item.time);

                  const validCount = item.valid || 0;
                  const errorCount = item.errors || 0;
                  const isDuplicate = item.isDuplicate || item.status === 'DUPLICATE_SKIPPED';
                  const displayCount = isDuplicate ? (item.total || 4) : (validCount > 0 ? validCount : errorCount);

                  const barHeight = calculateBarHeight(displayCount);

                  // Colors: Emerald for valid, Amber for duplicate skipped, Red for errors
                  const barColor = errorCount > 0 ? '#ef4444' : isDuplicate ? '#f59e0b' : '#10b981';
                  const barGlow = errorCount > 0 ? 'rgba(239, 68, 68, 0.35)' : isDuplicate ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';

                  return (
                    <div
                      key={index}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        position: 'relative',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        flex: 1,
                        cursor: 'pointer',
                        maxWidth: isBatchMode ? 52 : 72,
                      }}
                    >
                      {/* Floating Badge above Bar */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: barHeight + 6,
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: barColor,
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          backgroundColor: isHovered ? 'var(--bg-surface)' : 'transparent',
                          padding: '1px 4px',
                          borderRadius: 3,
                          border: isHovered ? `1px solid ${barColor}` : 'none',
                          zIndex: 2,
                        }}
                      >
                        {formatNumber(displayCount)}
                      </div>

                      {/* Main Bar with Hover Glow */}
                      <div
                        style={{
                          width: isBatchMode ? 18 : 26,
                          height: barHeight,
                          backgroundColor: barColor,
                          borderRadius: '4px 4px 0 0',
                          boxShadow: isHovered ? `0 0 12px ${barGlow}` : `0 0 4px ${barGlow}`,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                          transformOrigin: 'bottom',
                          opacity: isHovered ? 1 : 0.88,
                        }}
                      />

                      {/* Rich Interactive Tooltip on Hover */}
                      {isHovered && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: barHeight + 30,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'var(--bg-surface)',
                            border: `1px solid ${barColor}`,
                            borderRadius: 8,
                            padding: '0.6rem 0.8rem',
                            minWidth: 190,
                            zIndex: 30,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: barColor,
                                display: 'inline-block',
                              }}
                            />
                            <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                              {isBatchMode ? (item.filename || 'Inbound Batch') : `Hourly Pickup (${formatted.time})`}
                            </strong>
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                            Time: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatted.time} ({formatted.date})</span>
                          </div>

                          {isBatchMode ? (
                            <>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                Status:{' '}
                                <span style={{ color: barColor, fontWeight: 700 }}>
                                  {item.status || (errorCount > 0 ? 'FAILED' : isDuplicate ? 'DUPLICATE_SKIPPED' : 'CONVERTED')}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                Records: <strong style={{ color: 'var(--text-main)' }}>{displayCount.toLocaleString()}</strong>
                              </div>
                              {item.facility && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                  Facility: <span style={{ color: '#0284c7', fontWeight: 600 }}>{item.facility}</span>
                                </div>
                              )}
                              {item.source && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                                  Source: <span style={{ color: 'var(--text-main)' }}>{item.source}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                Files Picked Up: <strong style={{ color: 'var(--text-main)' }}>{item.batchCount || 1} file(s)</strong>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                Valid Records: <strong style={{ color: '#10b981' }}>{(item.valid || 0).toLocaleString()}</strong>
                              </div>
                              {(item.skipped || 0) > 0 && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                  Duplicate Skipped: <strong style={{ color: '#f59e0b' }}>{item.skipped.toLocaleString()}</strong>
                                </div>
                              )}
                              {(item.errors || 0) > 0 && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                  DLQ Exceptions: <strong style={{ color: '#ef4444' }}>{item.errors.toLocaleString()}</strong>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X-Axis Labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginLeft: 48,
              paddingLeft: '0.5rem',
              paddingRight: '0.5rem',
              borderTop: '1px solid var(--border-default)',
              paddingTop: '0.4rem',
            }}
          >
            {data.map((item, index) => {
              const formatted = formatTimeLabel(item.time);
              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.68rem',
                    color: hoveredIndex === index ? '#10b981' : 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)',
                    maxWidth: isBatchMode ? 52 : 72,
                    fontWeight: hoveredIndex === index ? 700 : 500,
                  }}
                >
                  <div>{formatted.time}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.75 }}>{formatted.date}</div>
                </div>
              );
            })}
          </div>

          {/* Chart Footer Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={13} color="#10b981" />
              <span>
                {timeRange === 'date'
                  ? `Selected Date (${selectedDate}): Tracking ${activeBatches.length} file trigger(s) across ${activeHourly.length} hourly pickup bucket(s).`
                  : timeRange === '24h'
                  ? `Last 24 Hours: Telemetry from current time (${activeBatches.length} file triggers across ${activeHourly.length} hourly pickup buckets).`
                  : `All-Time: Telemetry across entire platform history (${throughputBatches.length} file triggers).`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} /> Converted
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} /> Duplicate Skipped
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} /> DLQ Exceptions
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
