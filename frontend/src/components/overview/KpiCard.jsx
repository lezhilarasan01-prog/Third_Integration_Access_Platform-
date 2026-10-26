import React from 'react';
import {
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock
} from 'lucide-react';

const ICON_MAP = {
  Layers: Layers,
  Loader2: Loader2,
  CheckCircle2: CheckCircle2,
  AlertCircle: AlertCircle,
  XCircle: XCircle,
  Clock: Clock,
};

/**
 * Reusable KPI Card Component for enterprise integration metrics.
 * Designed to cleanly accept props from either mock data or Spring Boot REST APIs.
 *
 * @param {string} label - The descriptive title of the metric
 * @param {string|number} value - The prominent display number
 * @param {string} subtext - Supporting contextual information
 * @param {string} iconName - Name of icon from Lucide icon map
 * @param {string} variant - Accent color scheme: 'blue' | 'amber' | 'emerald' | 'red'
 * @param {string} badgeText - Optional status or trend badge
 * @param {string} badgeType - 'positive' | 'warning' | 'danger' | 'neutral'
 * @param {boolean} pulse - Optional animated pulse for active/processing states
 */
export default function KpiCard({
  label,
  value,
  subtext,
  iconName = 'Layers',
  variant = 'blue',
  badgeText,
  badgeType = 'neutral',
  pulse = false,
  onClick,
}) {
  const IconComponent = ICON_MAP[iconName] || Layers;

  const iconWrapClasses = {
    blue: 'kpi-icon-blue',
    amber: 'kpi-icon-amber',
    emerald: 'kpi-icon-emerald',
    red: 'kpi-icon-red',
  };

  const badgeTypeClasses = {
    positive: 'kpi-change-pill positive',
    warning: 'kpi-change-pill warning',
    danger: 'kpi-change-pill danger',
    neutral: 'kpi-change-pill neutral',
  };

  return (
    <div
      className={`kpi-card kpi-card-${variant} ${onClick ? 'kpi-card-clickable' : ''}`}
      role={onClick ? 'button' : 'region'}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer', transition: 'all 0.2s ease' } : undefined}
      aria-label={label}
    >
      <div className="kpi-header">
        <span className="kpi-title">{label}</span>
        <div className={`kpi-icon-wrap ${iconWrapClasses[variant] || 'kpi-icon-blue'}`}>
          <IconComponent
            size={18}
            strokeWidth={2.2}
            className={pulse ? 'kpi-spinner-slow' : ''}
          />
        </div>
      </div>

      <div className="kpi-body">
        <span className="kpi-value">{value}</span>
        {badgeText && (
          <span className={badgeTypeClasses[badgeType] || badgeTypeClasses.neutral}>
            {pulse && <span className="pulse-indicator" style={{ marginRight: 4 }} />}
            {badgeText}
          </span>
        )}
      </div>

      {subtext && <div className="kpi-footer">{subtext}</div>}
    </div>
  );
}
