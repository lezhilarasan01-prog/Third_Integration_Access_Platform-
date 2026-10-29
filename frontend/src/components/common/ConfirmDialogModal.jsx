import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, RefreshCw, Copy, Check, FileText } from 'lucide-react';

export default function ConfirmDialogModal({
  isOpen,
  title = 'Delete Confirmation',
  message,
  recordName,
  recordId,
  details = [],
  warningText = 'This will permanently delete this record from the database. This action cannot be undone.',
  confirmText = 'Delete Permanently',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'danger',
  onClose,
  onConfirm
}) {
  const [copiedId, setCopiedId] = React.useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleCopyId = (e) => {
    e.stopPropagation();
    if (recordId) {
      navigator.clipboard?.writeText(recordId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const isDanger = variant === 'danger';

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
        animation: 'fadeInBackdrop 0.18s ease-out'
      }}
    >
      <div
        className="modal-window delete-modal-window"
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(165deg, #111827 0%, #0b0f19 100%)',
          border: isDanger ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '14px',
          boxShadow: isDanger
            ? '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px -5px rgba(239, 68, 68, 0.15)'
            : '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px -5px rgba(245, 158, 11, 0.15)',
          overflow: 'hidden',
          animation: 'scaleUpModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '1.15rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: isDanger
              ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, transparent 100%)'
              : 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, transparent 100%)'
          }}
        >
          <div className="modal-header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: isDanger ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                color: isDanger ? '#ef4444' : '#f59e0b'
              }}
            >
              {isDanger ? <Trash2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #f3f4f6)' }}>
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #9ca3af)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '0.35rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.35rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Question / Message */}
          <div style={{ fontSize: '0.92rem', color: 'var(--text-main, #e5e7eb)', lineHeight: 1.5 }}>
            {message ? (
              message
            ) : (
              <span>
                Are you sure you want to permanently delete transaction{' '}
                <strong style={{ color: '#ffffff' }}>"{recordName || 'Record'}"</strong>?
              </span>
            )}
          </div>

          {/* Record Identifier Card */}
          {recordId && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <FileText size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
                <span
                  style={{
                    color: '#94a3b8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={recordId}
                >
                  {recordId}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedId ? '#10b981' : '#64748b',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px',
                  transition: 'color 0.15s'
                }}
                title="Copy Transaction UUID"
              >
                {copiedId ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Optional Details Grid */}
          {Array.isArray(details) && details.length > 0 && (
            <div
              className="delete-info-card"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '0.75rem 0.95rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.65rem 1rem',
                fontSize: '0.8rem'
              }}
            >
              {details.map((item, idx) => (
                <div key={idx}>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.72rem', marginBottom: '2px' }}>
                    {item.label}
                  </div>
                  <div style={{ color: 'var(--text-main, #f1f5f9)', fontWeight: 600 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warning notice */}
          {warningText && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: isDanger ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '8px',
                fontSize: '0.78rem',
                lineHeight: 1.45,
                color: isDanger ? '#fca5a5' : '#fde68a'
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px', color: isDanger ? '#ef4444' : '#f59e0b' }} />
              <span>{warningText}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <button
            type="button"
            className="modal-secondary-btn"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '0.55rem 1.1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: 'var(--text-main, #e2e8f0)',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={isDanger ? 'modal-danger-btn' : 'modal-primary-btn'}
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '0.55rem 1.25rem',
              background: isDanger
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: isDanger
                ? '0 4px 14px rgba(239, 68, 68, 0.35)'
                : '0 4px 14px rgba(245, 158, 11, 0.35)',
              transition: 'all 0.15s'
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="spin-icon" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                {isDanger ? <Trash2 size={14} /> : <AlertTriangle size={14} />}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

