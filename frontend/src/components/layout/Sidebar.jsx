import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Layers,
  Server,
  FileCode2,
  AlertTriangle,
  Radio,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  Layers3,
  Terminal
} from 'lucide-react';
import { integrationApi } from '../../services/integrationApi';

export default function Sidebar({
  activeView,
  onSelectView,
  isCollapsed = false,
  onToggleCollapse
}) {
  const [liveJobCount, setLiveJobCount] = useState(() => {
    const cached = integrationApi.getCachedTrackers();
    return Array.isArray(cached) ? cached.length : null;
  });

  const [isKafkaOpen, setIsKafkaOpen] = useState(true);

  // Auto-expand Kafka section if any child view is active
  const isKafkaChildActive = activeView === 'kafka-studio' || activeView === 'kafka-cli' || activeView === 'errors';
  useEffect(() => {
    if (isKafkaChildActive) {
      setIsKafkaOpen(true);
    }
  }, [isKafkaChildActive]);

  useEffect(() => {
    let mounted = true;
    async function loadCount() {
      try {
        const stats = await integrationApi.getStats();
        if (mounted && stats && stats.total != null) {
          setLiveJobCount(stats.total);
          return;
        }
        const rows = await integrationApi.getAllTrackers();
        if (mounted && Array.isArray(rows)) {
          setLiveJobCount(rows.length);
        }
      } catch (e) {}
    }
    loadCount();
    const timer = setInterval(loadCount, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const navSections = useMemo(() => [
    {
      category: 'Core Gateway',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: LayoutDashboard,
          isUpcoming: false
        },
        {
          id: 'jobs',
          label: 'File Tracker & API Audit',
          icon: Layers,
          badge: liveJobCount !== null ? `${liveJobCount}` : undefined,
          badgeType: 'count',
          isUpcoming: false
        }
      ]
    },
    {
      category: 'Cloud & Messaging Engine',
      items: [
        {
          id: 'kafka-studio',
          label: 'Kafka API Studio',
          icon: Activity,
          badge: 'Studio',
          badgeType: 'roadmap',
          isUpcoming: false,
          desc: 'Unified Visual Studio, CLI Platform & DLQ Center'
        },
        {
          id: 's3-activity',
          label: 'Amazon S3 Activity',
          icon: Server,
          badge: 'Pure S3',
          badgeType: 'roadmap',
          isUpcoming: false,
          desc: 'Zero disk storage & Pre-Signed URLs'
        }
      ]
    },
    {
      category: 'Operations & Audit',
      items: [
        {
          id: 'delivery',
          label: 'MAWM Dispatch',
          icon: Radio,
          badge: 'Staged',
          badgeType: 'staged',
          isUpcoming: true,
          desc: 'Manhattan Active WM REST API telemetry'
        }
      ]
    },
    {
      category: 'Administration',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          badge: 'RBAC',
          badgeType: 'count',
          isUpcoming: false,
          desc: 'User Management & Role-Based Access Control'
        }
      ]
    }
  ], [liveJobCount]);

  return (
    <aside className={`app-sidebar ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
      {/* 1. ERB Corporate Brand & Gateway Title */}
      <div
        className="sidebar-brand-wrapper"
        onClick={() => onSelectView('overview')}
        role="button"
        tabIndex={0}
        title="ERB — MAWM Integration Gateway"
      >
        <div className="ncsp-emblem-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(16, 185, 129, 0.55)" />
            <path d="M12 22V12" stroke="#ffffff" strokeWidth="1.8" />
            <path d="M21 7L12 12L3 7" stroke="#ffffff" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="2.5" fill="#f59e0b" />
          </svg>
        </div>

        {!isCollapsed && (
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">
              <span>ERB</span>
              <span className="ncsp-india-pill" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>GATEWAY</span>
            </div>
            <div className="sidebar-brand-subtitle" title="ERP to MAWM Logistics Gateway">
              MAWM Logistics Gateway
            </div>
          </div>
        )}
      </div>

      {/* 2. Scrollable Navigation Rail */}
      <div className="sidebar-nav-scroll">
        {navSections.map((section, sIdx) => (
          <div key={section.category} className="sidebar-nav-group">
            {!isCollapsed ? (
              <div className="sidebar-group-heading">
                {section.category}
              </div>
            ) : (
              sIdx > 0 && <div className="sidebar-rail-divider" />
            )}

            <div className="sidebar-group-items">
              {section.items.map((item) => {
                if (item.isGroup) {
                  const isAnyChildActive = item.children.some((child) => child.id === activeView);
                  const Icon = item.icon;

                  return (
                    <div key={item.id} className="sidebar-group-menu-wrap" style={{ display: 'flex', flexDirection: 'column' }}>
                      <button
                        type="button"
                        className={`sidebar-link-btn ${isAnyChildActive ? 'is-active-parent' : ''}`}
                        onClick={() => {
                          if (isCollapsed) {
                            if (onToggleCollapse) onToggleCollapse();
                            setIsKafkaOpen(true);
                          } else {
                            setIsKafkaOpen(!isKafkaOpen);
                          }
                        }}
                        style={isAnyChildActive ? {
                          backgroundColor: 'rgba(16, 185, 129, 0.08)',
                          borderColor: 'rgba(16, 185, 129, 0.25)',
                          color: '#10b981'
                        } : {}}
                        title={item.label}
                      >
                        <div className="sidebar-link-icon-wrap">
                          <Icon size={18} strokeWidth={isAnyChildActive ? 2.2 : 1.8} />
                        </div>

                        {!isCollapsed && (
                          <>
                            <div className="sidebar-link-body">
                              <span className="sidebar-link-label" style={{ fontWeight: isAnyChildActive ? 700 : 600 }}>
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className={`sidebar-link-badge badge-${item.badgeType || 'default'}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div style={{ marginLeft: 6, display: 'flex', alignItems: 'center', color: 'var(--text-dim)' }}>
                              {isKafkaOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                          </>
                        )}

                        {isAnyChildActive && <div className="sidebar-link-active-bar" />}
                      </button>

                      {/* Sub-menu items under Apache Kafka Engine */}
                      {(!isCollapsed && isKafkaOpen) && (
                        <div className="sidebar-submenu" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          marginLeft: '1.15rem',
                          paddingLeft: '0.65rem',
                          borderLeft: '1.5px solid rgba(16, 185, 129, 0.25)',
                          marginTop: '3px',
                          marginBottom: '4px'
                        }}>
                          {item.children.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = activeView === subItem.id;

                            return (
                              <button
                                key={subItem.id}
                                type="button"
                                className={`sidebar-sublink-btn ${isSubActive ? 'is-active' : ''}`}
                                onClick={() => onSelectView(subItem.id)}
                                title={subItem.desc || subItem.label}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  padding: '0.42rem 0.65rem',
                                  borderRadius: '6px',
                                  background: isSubActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                                  border: isSubActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                                  color: isSubActive ? '#10b981' : 'var(--text-muted)',
                                  fontWeight: isSubActive ? 600 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out',
                                  textAlign: 'left',
                                  fontSize: '0.78rem',
                                  outline: 'none'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                  <SubIcon size={14} strokeWidth={isSubActive ? 2.2 : 1.7} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {subItem.label}
                                  </span>
                                </div>
                                {subItem.badge && (
                                  <span className={`sidebar-link-badge badge-${subItem.badgeType || 'default'}`} style={{ fontSize: '0.58rem', padding: '0.05rem 0.35rem' }}>
                                    {subItem.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link-btn ${isActive ? 'is-active' : ''} ${item.isUpcoming ? 'is-upcoming' : ''}`}
                    onClick={() => onSelectView(item.id)}
                    title={isCollapsed ? `${item.label} ${item.badge ? `(${item.badge})` : ''}` : item.desc || item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className="sidebar-link-icon-wrap">
                      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                    </div>

                    {!isCollapsed && (
                      <div className="sidebar-link-body">
                        <span className="sidebar-link-label">{item.label}</span>
                        {item.badge && (
                          <span className={`sidebar-link-badge badge-${item.badgeType || 'default'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Active Indicator Accent */}
                    {isActive && <div className="sidebar-link-active-bar" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Footer: Collapse Toggle */}
      <div className="sidebar-footer-wrapper">
        <button
          type="button"
          className="sidebar-collapse-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Sidebar (Expand Canvas)'}
          aria-label={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
        >
          {isCollapsed ? <ChevronRight size={17} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
