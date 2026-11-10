import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart3, Info, Clock, Calendar } from 'lucide-react';

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
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const scrollContainerRef = useRef(null);

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

  // 2. Compute dynamic Hourly Pickup Rollup for the selected time window (Continuous throughput velocity)
  const activeHourly = useMemo(() => {
    if (timeRange === 'all' && throughputData.length > 0) return throughputData;
    const slots = {};
    let minDate = null;
    let maxDate = null;

    activeBatches.forEach((t) => {
      const d = t.dateObj || new Date(t.time);
      if (!d || isNaN(d.getTime())) return;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;

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

    // Generate a continuous hourly timeline for the day to avoid awkward gaps
    if (minDate && maxDate && minDate < maxDate) {
      const curr = new Date(minDate);
      curr.setMinutes(0, 0, 0);
      const end = new Date(maxDate);
      end.setMinutes(0, 0, 0);

      let safety = 0;
      while (curr <= end && safety < 48) {
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        const hour = String(curr.getHours()).padStart(2, '0');
        const key = `${month}/${day} ${hour}:00`;

        if (!slots[key]) {
          slots[key] = {
            time: key,
            valid: 0,
            errors: 0,
            skipped: 0,
            total: 0,
            dateObj: new Date(curr),
            batchCount: 0,
            isEmptyHour: true,
          };
        }
        curr.setHours(curr.getHours() + 1);
        safety++;
      }
    }

    return Object.values(slots).sort((a, b) => a.dateObj - b.dateObj);
  }, [activeBatches, throughputData, timeRange]);

  // Exclusively focus on continuous Hourly Pickup data
  const data = Array.isArray(activeHourly) ? activeHourly : [];

  // Totals
  const totalValid = data.reduce((sum, item) => sum + (item.valid || 0), 0);
  const totalErrors = data.reduce((sum, item) => sum + (item.errors || 0), 0);
  const totalSkipped = data.reduce((sum, item) => sum + (item.skipped || (item.isDuplicate ? item.total : 0) || 0), 0);

  // Max value calculation
  const maxVal = Math.max(
    ...data.map((d) => (d.valid || 0) + (d.errors || 0) + (d.isDuplicate ? d.total : 0) || 1),
    10
  );

  const chartHeight = 220; // px
  const maxBarHeight = chartHeight - 65; // 155px max height leaves 65px headroom for badges and tooltips
  const isScrollMode = data.length > 9;

  // Auto-scroll to the right (latest hour) when data changes in scroll mode
  useEffect(() => {
    if (scrollContainerRef.current && isScrollMode) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [data.length, timeRange, selectedDate, isScrollMode]);

  // Calculate adaptive bar height with guaranteed headroom to prevent cutting off badges
  const calculateBarHeight = (value, isEmpty) => {
    if (isEmpty || !value || value <= 0) return 3; // 3px subtle baseline for 0-record hours
    const minHeight = 24; // px
    const logVal = Math.log10(value + 1);
    const logMax = Math.log10(maxVal + 1);
    const ratio = logMax > 0 ? logVal / logMax : 0.5;
    return Math.max(minHeight, Math.round(ratio * maxBarHeight));
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

  const hoveredItem = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;

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
              ? `Selected Date (${selectedDate}): Continuous hourly pickup volume (normalized vs. DLQ errors)`
              : 'Last 24 Hours: Continuous hourly pickup volume from current time (normalized vs. DLQ errors)'}
          </div>
        </div>

        {/* Controls: Time Range & Date Selection + Quick Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Time Range & Date Selector */}
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

      {/* Interactive Telemetry HUD Banner (NEVER gets clipped by chart bounds) */}
      {hoveredItem ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
            padding: '0.5rem 0.9rem',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 6,
            fontSize: '0.75rem',
            color: 'var(--text-main)',
            marginTop: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#38bdf8' }}>
            <Clock size={14} />
            <span>Hourly Pickup: {formatTimeLabel(hoveredItem.time).time} ({formatTimeLabel(hoveredItem.time).date})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span>Valid Records: <strong style={{ color: '#10b981' }}>{formatNumber(hoveredItem.valid || 0)}</strong></span>
            {hoveredItem.skipped > 0 && <span>Skipped: <strong style={{ color: '#f59e0b' }}>{formatNumber(hoveredItem.skipped)}</strong></span>}
            {hoveredItem.errors > 0 && <span>Errors: <strong style={{ color: '#ef4444' }}>{formatNumber(hoveredItem.errors)}</strong></span>}
            <span>Files Ingested: <strong style={{ color: 'var(--text-main)' }}>{hoveredItem.batchCount || (hoveredItem.isEmptyHour ? 0 : 1)} file(s)</strong></span>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            fontSize: '0.73rem',
            color: 'var(--text-dim)',
            marginTop: '0.5rem',
          }}
        >
          <Info size={13} color="#10b981" />
          <span>
            Hover over any hour column to inspect detailed intake volume, file count, and DLQ errors.
          </span>
        </div>
      )}

      {data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <BarChart3 size={32} color="var(--border-strong)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
          <div>No transaction throughput recorded in this period.</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Realtime processing pipeline is online and awaiting new inbound ERP files.
          </div>
        </div>
      ) : (
        <>
          {/* Main Responsive Chart Canvas */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              marginTop: '0.65rem',
              marginBottom: '0.5rem',
              userSelect: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.16)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            {/* Fixed Y-Axis Column (permanently pinned on the left) */}
            <div
              style={{
                flexShrink: 0,
                width: 48,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: chartHeight,
                padding: '0.75rem 0.5rem 0.65rem 0.2rem',
                textAlign: 'right',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
                borderRight: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                zIndex: 10,
              }}
            >
              <span style={{ lineHeight: 1 }}>{formatNumber(maxVal)}</span>
              <span style={{ lineHeight: 1 }}>{formatNumber(Math.round(maxVal * 0.75))}</span>
              <span style={{ lineHeight: 1 }}>{formatNumber(Math.round(maxVal * 0.5))}</span>
              <span style={{ lineHeight: 1 }}>{formatNumber(Math.round(maxVal * 0.25))}</span>
              <span style={{ lineHeight: 1 }}>0</span>
            </div>

            {/* Responsive Scrollable Canvas Container */}
            <div
              ref={scrollContainerRef}
              className="custom-chart-scrollbar"
              style={{
                flex: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                position: 'relative',
                width: '100%',
              }}
            >
              <div
                style={{
                  minWidth: '100%',
                  width: isScrollMode ? `${data.length * 74}px` : '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* 1. Bars Canvas Area */}
                <div style={{ position: 'relative', height: chartHeight, width: '100%' }}>
                  {/* Horizontal Gridlines spanning full width */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      pointerEvents: 'none',
                      paddingTop: '0.75rem',
                      paddingBottom: '0.65rem',
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

                  {/* Bars Container: evenly spaced when few items, horizontally scrollable when many */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: isScrollMode ? 'flex-start' : 'space-evenly',
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
                      const isEmpty = item.isEmptyHour || displayCount <= 0;

                      const barHeight = calculateBarHeight(displayCount, isEmpty);

                      // Colors: Emerald for valid, Amber for duplicate skipped, Red for errors, subtle for empty
                      const barColor = isEmpty ? 'rgba(255,255,255,0.1)' : errorCount > 0 ? '#ef4444' : isDuplicate ? '#f59e0b' : '#10b981';
                      const barGlow = isEmpty ? 'none' : errorCount > 0 ? 'rgba(239, 68, 68, 0.4)' : isDuplicate ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)';

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
                            flexShrink: 0,
                            width: isScrollMode ? 74 : 'auto',
                            minWidth: isScrollMode ? 74 : 64,
                            maxWidth: isScrollMode ? 74 : 110,
                            flex: isScrollMode ? 'none' : 1,
                            cursor: 'pointer',
                          }}
                        >
                          {/* Floating Count Badge above Bar (with safe ceiling headroom) */}
                          {!isEmpty && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: barHeight + 6,
                                fontSize: '0.7rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                color: barColor,
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                backgroundColor: isHovered ? 'var(--bg-surface)' : 'transparent',
                                padding: '1px 5px',
                                borderRadius: 3,
                                border: isHovered ? `1px solid ${barColor}` : 'none',
                                zIndex: 2,
                              }}
                            >
                              {formatNumber(displayCount)}
                            </div>
                          )}

                          {/* Main Bar with Hover Glow */}
                          <div
                            style={{
                              width: isEmpty ? 8 : 28,
                              height: barHeight,
                              backgroundColor: barColor,
                              borderRadius: isEmpty ? '2px' : '4px 4px 0 0',
                              boxShadow: isHovered && !isEmpty ? `0 0 12px ${barGlow}` : `0 0 3px ${barGlow}`,
                              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: isHovered && !isEmpty ? 'scaleY(1.03)' : 'scaleY(1)',
                              transformOrigin: 'bottom',
                              opacity: isEmpty ? 0.4 : isHovered ? 1 : 0.9,
                            }}
                          />

                          {/* Smart In-Bounds Tooltip (Adapts vertically & horizontally to guarantee ZERO clipped text) */}
                          {isHovered && !isEmpty && (() => {
                            const isFirst = index === 0;
                            const isLast = index === data.length - 1;
                            const isTallBar = barHeight > chartHeight * 0.52;
                            return (
                              <div
                                style={{
                                  position: 'absolute',
                                  ...(isTallBar ? { top: 8 } : { bottom: barHeight + 28 }),
                                  ...(isFirst
                                    ? { left: 0, transform: 'none' }
                                    : isLast
                                    ? { right: 0, left: 'auto', transform: 'none' }
                                    : { left: '50%', transform: 'translateX(-50%)' }),
                                  backgroundColor: 'rgba(15, 23, 42, 0.96)',
                                  border: `1px solid ${barColor}`,
                                  borderRadius: 6,
                                  padding: '0.45rem 0.75rem',
                                  fontSize: '0.72rem',
                                  whiteSpace: 'nowrap',
                                  zIndex: 35,
                                  boxShadow: '0 8px 20px rgba(0,0,0,0.7)',
                                  pointerEvents: 'none',
                                }}
                              >
                                <div style={{ color: barColor, fontWeight: 700, fontSize: '0.74rem' }}>
                                  {displayCount.toLocaleString()} {errorCount > 0 ? 'Errors' : 'Valid Records'}
                                </div>
                                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: 2 }}>
                                  {item.batchCount || 1} file(s) ingested
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Synchronized X-Axis Labels row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isScrollMode ? 'flex-start' : 'space-evenly',
                    borderTop: '1px solid var(--border-default)',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    paddingLeft: '0.5rem',
                    paddingRight: '0.5rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {data.map((item, index) => {
                    const formatted = formatTimeLabel(item.time);
                    return (
                      <div
                        key={index}
                        style={{
                          flexShrink: 0,
                          width: isScrollMode ? 74 : 'auto',
                          minWidth: isScrollMode ? 74 : 64,
                          maxWidth: isScrollMode ? 74 : 110,
                          flex: isScrollMode ? 'none' : 1,
                          textAlign: 'center',
                          fontSize: '0.68rem',
                          color: hoveredIndex === index ? '#10b981' : item.isEmptyHour ? 'var(--text-muted)' : 'var(--text-dim)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: hoveredIndex === index ? 700 : 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          opacity: item.isEmptyHour ? 0.6 : 1,
                        }}
                      >
                        <div>{formatted.time}</div>
                        <div style={{ fontSize: '0.6rem', opacity: 0.75 }}>{formatted.date}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
                  ? `Selected Date (${selectedDate}): Tracking ${data.filter(d => !d.isEmptyHour).length} active pickup hour(s).`
                  : timeRange === '24h'
                  ? `Last 24 Hours: Continuous hourly telemetry across ${data.filter(d => !d.isEmptyHour).length} active pickup hour(s).`
                  : `All-Time: Telemetry across entire platform history.`}
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
