import React from 'react';
import {
  Layers,
  ArrowLeftRight,
  AlertTriangle,
  Server,
  FileCode2,
  Radio,
  Settings,
  ArrowLeft,
  Clock
} from 'lucide-react';

const PAGE_META = {
  jobs: {
    title: 'Integration Jobs Registry',
    icon: Layers,
    description: 'Detailed lifecycle tracking, search filters, and manual file intake for batch ingestion runs.',
    nextStep: 'Enterprise Module',
  },
  transactions: {
    title: 'Transactions & Canonical Records',
    icon: ArrowLeftRight,
    description: 'Line-by-line inspection of normalized purchase orders (PO), shipment notices (ASN), inventory balances, and item masters.',
    nextStep: 'Enterprise Module',
  },
  errors: {
    title: 'Errors & Exceptions Cockpit',
    icon: AlertTriangle,
    description: 'Dead-letter row isolation, diagnostic error codes, failed column highlighting, and reprocessing actions.',
    nextStep: 'Enterprise Module',
  },
  sources: {
    title: 'Connected Source Systems',
    icon: Server,
    description: 'Configuration and connectivity health for SAP S/4HANA, Oracle NetSuite, and Customer ERP endpoints.',
    nextStep: 'Enterprise Module',
  },
  profiles: {
    title: 'Mapping Profiles Management',
    icon: FileCode2,
    description: 'Manage dynamic column synonyms and ERP-specific field transformations matching Manhattan Active WM schemas.',
    nextStep: 'Enterprise Module',
  },
  delivery: {
    title: 'MAWM Delivery Monitoring',
    icon: Radio,
    description: 'Outbound dispatch rates, Manhattan Active WM REST API acknowledgment status, and circuit breaker telemetry.',
    nextStep: 'Enterprise Module',
  },
  settings: {
    title: 'Platform Settings & Environment',
    icon: Settings,
    description: 'Manage chunk batch sizes, ingestion pipelines, and middleware daemon configuration.',
    nextStep: 'Enterprise Module',
  },
};

export default function PlaceholderPage({ viewId, onReturnOverview, onNavigateToJobs }) {
  const meta = PAGE_META[viewId] || {
    title: 'Module Under Construction',
    icon: Clock,
    description: 'This integration section will be implemented in subsequent phases.',
    nextStep: 'Next Milestone',
  };

  const Icon = meta.icon;

  return (
    <div className="page-container">
      <div className="placeholder-view">
        <div className="placeholder-icon">
          <Icon size={32} />
        </div>
        <span className="placeholder-step-tag">{meta.nextStep}</span>
        <h2 className="placeholder-title">{meta.title}</h2>
        <p className="placeholder-desc">{meta.description}</p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={onReturnOverview}>
            <ArrowLeft size={16} />
            <span>Return to Overview</span>
          </button>
          {onNavigateToJobs && (
            <button className="btn-primary" onClick={onNavigateToJobs}>
              <Layers size={16} />
              <span>Explore Integration Jobs</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
