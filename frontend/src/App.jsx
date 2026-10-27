import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import OverviewPage from './components/overview/OverviewPage';
import IntegrationJobsPage from './components/jobs/IntegrationJobsPage';
import PlaceholderPage from './components/common/PlaceholderPage';
import LoginPage from './components/auth/LoginPage';
import KafkaStudioPage from './components/studio/KafkaStudioPage';
import S3ActivityPage from './components/s3/S3ActivityPage';
import SettingsPage from './components/settings/SettingsPage';
import TestUploadModal from './components/common/TestUploadModal';
import JsonBeautifierModal from './components/common/JsonBeautifierModal';
import { integrationApi } from './services/integrationApi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ERB Gateway ErrorBoundary Caught]:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem 2rem', maxWidth: 640, margin: '2rem auto', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px' }}>
          <div style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            View Error
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="btn-primary"
            style={{ padding: '0.5rem 1.25rem' }}
          >
            Return to Integration Jobs
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState('overview');
  const [activeJobId, setActiveJobId] = useState(null);
  const [selectedErpFilter, setSelectedErpFilter] = useState('ALL');
  const [isTestUploadOpen, setIsTestUploadOpen] = useState(false);
  const [isBeautifierOpen, setIsBeautifierOpen] = useState(false);
  const [beautifierInitialJson, setBeautifierInitialJson] = useState('');

  const handleOpenBeautifier = (json = '') => {
    setBeautifierInitialJson(typeof json === 'string' ? json : '');
    setIsBeautifierOpen(true);
  };

  // Authenticated User State - Always null by default so user starts on Login screen
  const [currentUser, setCurrentUser] = useState(null);

  // Purge any stored credentials on initial load so opening the app always requires login
  useEffect(() => {
    localStorage.removeItem('erp_user_profile');
    localStorage.removeItem('erp_user_token');
  }, []);

  // Background atmosphere state (NCS Cyber Mesh default)
  const [bgPreset, setBgPreset] = useState(() => {
    const saved = localStorage.getItem('ncsp-bg-preset');
    if (!saved || saved === 'ncsp-aurora' || saved === 'obsidian-emerald') return 'ncs-cyber-mesh';
    if (saved === 'cyber-grid') return 'titanium-grid';
    if (saved === 'deep-slate') return 'cosmic-violet';
    if (saved === 'frost-light') return 'studio-quartz';
    return saved;
  });

  // Dark / Light Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ncsp-theme') || 'dark';
  });

  // Collapsible Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('ncsp-sidebar-collapsed') === 'true';
  });

  // Synchronize data-theme and data-bg on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ncsp-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-bg', bgPreset);
    localStorage.setItem('ncsp-bg-preset', bgPreset);
  }, [bgPreset]);

  useEffect(() => {
    localStorage.setItem('ncsp-sidebar-collapsed', sidebarCollapsed ? 'true' : 'false');
  }, [sidebarCollapsed]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      setBgPreset('studio-quartz');
    } else {
      setBgPreset('ncs-cyber-mesh');
    }
  };

  const handleRefresh = () => {
    console.log('Refreshing Gateway data artifacts...');
  };

  const handleSelectView = (viewId) => {
    setActiveView(viewId);
    setActiveJobId(null);
    if (viewId !== 'jobs') {
      setSelectedErpFilter('ALL');
    }
  };

  const handleNavigateToJobsWithErp = (erpSource = 'ALL') => {
    const safeErp = (typeof erpSource === 'string' && erpSource.trim()) ? erpSource.trim() : 'ALL';
    setSelectedErpFilter(safeErp);
    setActiveView('jobs');
    setActiveJobId(null);
  };

  const handleClearActiveJob = () => {
    setActiveJobId(null);
  };

  const handleLogout = async () => {
    await integrationApi.logout();
    setCurrentUser(null);
  };

  // If not authenticated, render Enterprise Login Screen
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveView('overview');
        }}
      />
    );
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'}`}>
      {/* 1. Collapsible Enterprise Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={handleSelectView}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. Main Viewport Container */}
      <div className="app-main-viewport">
        {/* Top Header */}
        <Header
          activeView={activeView}
          activeJobId={activeJobId}
          onClearActiveJob={handleClearActiveJob}
          onSelectView={handleSelectView}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onRefresh={handleRefresh}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenTestUpload={() => setIsTestUploadOpen(true)}
          onOpenBeautifier={() => handleOpenBeautifier()}
        />

        {/* 3. Core Scrollable Viewport */}
        <main className="app-content-body">
          <ErrorBoundary onReset={() => {
            setActiveJobId(null);
            setSelectedErpFilter('ALL');
          }}>
            {activeView === 'overview' ? (
              <OverviewPage
                onNavigateToJobs={handleNavigateToJobsWithErp}
                onNavigateToKafkaStudio={() => handleSelectView('kafka-studio')}
                onNavigateToS3={() => handleSelectView('s3-activity')}
                onNavigateToDlq={() => handleSelectView('errors')}
                onOpenTestUpload={() => setIsTestUploadOpen(true)}
              />
            ) : activeView === 'jobs' ? (
              <IntegrationJobsPage
                onNavigateToOverview={() => handleSelectView('overview')}
                activeJobId={activeJobId}
                onActiveJobChange={setActiveJobId}
                initialSourceFilter={selectedErpFilter}
                onClearSourceFilter={() => setSelectedErpFilter('ALL')}
                onOpenTestUpload={() => setIsTestUploadOpen(true)}
              />
            ) : (activeView === 'kafka-studio' || activeView === 'kafka-cli' || activeView === 'errors') ? (
              <KafkaStudioPage initialTab={activeView === 'kafka-cli' ? 'cli' : activeView === 'errors' ? 'dlq' : 'visual'} />
            ) : activeView === 's3-activity' ? (
              <S3ActivityPage />
            ) : activeView === 'settings' ? (
              <SettingsPage />
            ) : (
              <PlaceholderPage
                viewId={activeView}
                onReturnOverview={() => handleSelectView('overview')}
                onNavigateToJobs={() => handleSelectView('jobs')}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* 4. Global Test Upload Hub Modal */}
      <TestUploadModal
        isOpen={isTestUploadOpen}
        onClose={() => setIsTestUploadOpen(false)}
        onOpenBeautifier={handleOpenBeautifier}
      />

      {/* 5. Global JSON Beautifier & Syntax Formatter Modal */}
      <JsonBeautifierModal
        isOpen={isBeautifierOpen}
        initialJson={beautifierInitialJson}
        onClose={() => {
          setIsBeautifierOpen(false);
          setBeautifierInitialJson('');
        }}
      />
    </div>
  );
}
