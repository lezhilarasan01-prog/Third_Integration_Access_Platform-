import React from 'react';
import {
  PanelLeft,
  RefreshCw,
  Sun,
  Moon,
  ChevronRight,
  LayoutDashboard,
  Layers,
  Server,
  FileCode2,
  AlertTriangle,
  Radio,
  Settings,
  LogOut,
  Terminal,
  UploadCloud,
  Sparkles
} from 'lucide-react';

export const BG_PRESETS = [
  {
    id: 'ncs-cyber-mesh',
    label: 'NCS Cyber Mesh',
    desc: 'High-Speed NCS Digital Fiber & Cyan Data Node Mesh',
    mode: 'dark',
    swatch: 'radial-gradient(circle, #10b981 30%, #0284c7 70%, #06080d 100%)'
  },
  {
    id: 'ncs-operations-hub',
    label: 'NCS Operations Hub',
    desc: 'NCS Singapore Digital Twin Command Center',
    mode: 'dark',
    swatch: 'linear-gradient(135deg, #064e3b 0%, #0284c7 50%, #0b0f19 100%)'
  },
  {
    id: 'obsidian-emerald',
    label: 'Obsidian Emerald',
    desc: 'Deep Carbon Charcoal with Mint & Saffron Glow',
    mode: 'dark',
    swatch: 'linear-gradient(135deg, #090a0d 0%, #10b981 50%, #f59e0b 100%)'
  },
  {
    id: 'titanium-grid',
    label: 'Titanium Cyber Grid',
    desc: 'Neutral Graphite Vector Grid & Scanner Pulse',
    mode: 'dark',
    swatch: 'radial-gradient(circle, #10b981 20%, #0c0e12 80%)'
  },
  {
    id: 'cosmic-violet',
    label: 'Cosmic Amethyst',
    desc: 'Deep Onyx with Amethyst Violet & Amber Glow',
    mode: 'dark',
    swatch: 'linear-gradient(135deg, #090a0f 0%, #7c3aed 50%, #f59e0b 100%)'
  },
  {
    id: 'studio-quartz',
    label: 'Studio Quartz Light',
    desc: 'Crisp Modern Neutral Executive Canvas',
    mode: 'light',
    swatch: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #d1fae5 100%)'
  }
];

const VIEW_TITLES = {
  overview: { label: 'Overview Dashboard', icon: LayoutDashboard },
  jobs: { label: 'File Tracker & Jobs', icon: Layers },
  'kafka-studio': { label: 'Kafka API & Retention Studio', icon: Radio },
  'kafka-cli': { label: 'Kafka CLI & Commands Platform', icon: Terminal },
  's3-activity': { label: 'Amazon S3 Activity Explorer', icon: Server },
  sources: { label: 'Source Systems Integration', icon: Server },
  profiles: { label: 'Mapping Profiles Management', icon: FileCode2 },
  errors: { label: 'Error Quarantine & DLQ', icon: AlertTriangle },
  delivery: { label: 'MAWM Delivery Monitoring', icon: Radio },
  settings: { label: 'Platform Settings', icon: Settings },
};

export default function Header({
  activeView = 'overview',
  activeJobId,
  onClearActiveJob,
  onSelectView,
  sidebarCollapsed = false,
  onToggleSidebar,
  theme = 'dark',
  onToggleTheme,
  onRefresh,
  currentUser,
  onLogout,
  onOpenTestUpload,
  onOpenBeautifier
}) {
  const currentViewInfo = VIEW_TITLES[activeView] || { label: 'Platform Module', icon: LayoutDashboard };
  const CurrentIcon = currentViewInfo.icon;

  return (
    <header className="ncsp-app-header">
      {/* 1. Left: Sidebar Toggle + Contextual Breadcrumbs */}
      <div className="header-left-cluster">
        <button
          type="button"
          className="header-sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          aria-label="Toggle Sidebar"
        >
          <PanelLeft size={18} />
        </button>

        {/* Dynamic Breadcrumbs */}
        <div className="header-breadcrumbs">
          <button
            type="button"
            className="breadcrumb-root"
            onClick={() => onSelectView('overview')}
            title="Go to Overview"
          >
            <span>ERB</span>
          </button>

          <ChevronRight size={13} className="breadcrumb-separator" />

          {activeView === 'jobs' && activeJobId ? (
            <>
              <button
                type="button"
                className="breadcrumb-link"
                onClick={onClearActiveJob}
                title="Back to All Jobs"
              >
                <span>Integration Jobs</span>
              </button>
              <ChevronRight size={13} className="breadcrumb-separator" />
              <span className="breadcrumb-current-highlight" title={`Inspecting Job ${activeJobId}`}>
                {activeJobId}
              </span>
            </>
          ) : (
            <div className="breadcrumb-current">
              <CurrentIcon size={14} className="breadcrumb-icon" />
              <span>{currentViewInfo.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Right: JSON Beautifier, Test Upload, Theme Toggle, Refresh, Profile */}
      <div className="header-right-cluster">

        {/* JSON Beautifier Tool Button */}
        {onOpenBeautifier && (
          <button
            type="button"
            onClick={onOpenBeautifier}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Open JSON Beautifier & Syntax Formatter"
          >
            <Sparkles size={14} />
            <span>JSON Beautifier</span>
          </button>
        )}

        {/* Test Upload Button */}
        {onOpenTestUpload && (
          <button
            type="button"
            onClick={onOpenTestUpload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Open Test Upload Hub - Test CSV, XML, JSON, Excel, EDI"
          >
            <UploadCloud size={14} />
            <span>Test Upload</span>
          </button>
        )}

        {/* Theme Toggle (Dark / Light) */}
        <button
          type="button"
          className="header-icon-button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Refresh */}
        <button
          type="button"
          className="header-icon-button"
          onClick={onRefresh}
          title="Reload Integration Job Artifacts"
          aria-label="Refresh Data"
        >
          <RefreshCw size={15} />
        </button>

        {/* Sign Out */}
        {onLogout && (
          <button
            type="button"
            className="header-icon-button"
            onClick={onLogout}
            title="Sign Out"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
