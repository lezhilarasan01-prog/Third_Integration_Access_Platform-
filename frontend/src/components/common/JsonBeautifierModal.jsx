import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Code2,
  Copy,
  Check,
  X,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Minimize2,
  Maximize2,
  RotateCcw,
  Download,
  ClipboardPaste,
  Layers
} from 'lucide-react';

const SAMPLE_MAWM_JSON = `{
  "Data": [
    {
      "AsnOriginTypeId": "P",
      "BusinessUnitId": "CID001683",
      "AsnId": "1064389422",
      "DestinationFacilityId": "IN_5180",
      "Extended": {
        "DhlCustRef2": "W533",
        "DhlCustRef3": "InboundSupplier",
        "DhlCustRef1": "false",
        "DhlCustRef4": "A"
      },
      "Lpn": [
        {
          "Actions": { "LpnDetail": "RESET" },
          "LpnId": "00173217306660655741",
          "LpnSizeTypeId": "A49",
          "Extended": {
            "DhlCustRefTtext1": "WAITING",
            "DhlCustRef1": "58",
            "DhlCustRef2": "40"
          },
          "LpnDetail": [
            {
              "ItemId": "1370811001264A03",
              "ShippedQuantity": "29",
              "QuantityUomId": "Units",
              "InventoryTypeId": "F",
              "ProductStatusId": "W533",
              "RetailPrice": "999",
              "CountryOfOrigin": "MA"
            }
          ]
        }
      ]
    }
  ]
}`;

export default function JsonBeautifierModal({ isOpen, onClose, initialJson = '' }) {
  const [rawInput, setRawInput] = useState(() => initialJson || '');
  const [indentSize, setIndentSize] = useState(2);
  const [copied, setCopied] = useState(false);

  // Synchronize when initialJson changes
  React.useEffect(() => {
    if (initialJson) {
      setRawInput(initialJson);
    }
  }, [initialJson]);

  // Compute Beautified Output and Syntax Analysis
  const analysis = useMemo(() => {
    if (!rawInput.trim()) {
      return {
        isValid: null,
        formatted: '',
        error: null,
        charCount: 0,
        lineCount: 0,
        byteSize: 0,
        keyCount: 0
      };
    }

    try {
      const parsed = JSON.parse(rawInput);
      const formatted = JSON.stringify(parsed, null, indentSize);
      const charCount = formatted.length;
      const lineCount = formatted.split('\n').length;
      const byteSize = new Blob([formatted]).size;

      // Count total keys recursively
      let count = 0;
      const countKeys = (obj) => {
        if (obj && typeof obj === 'object') {
          if (Array.isArray(obj)) {
            obj.forEach(countKeys);
          } else {
            const keys = Object.keys(obj);
            count += keys.length;
            keys.forEach(k => countKeys(obj[k]));
          }
        }
      };
      countKeys(parsed);

      return {
        isValid: true,
        formatted,
        error: null,
        charCount,
        lineCount,
        byteSize,
        keyCount: count
      };
    } catch (err) {
      return {
        isValid: false,
        formatted: rawInput,
        error: err.message,
        charCount: rawInput.length,
        lineCount: rawInput.split('\n').length,
        byteSize: new Blob([rawInput]).size,
        keyCount: 0
      };
    }
  }, [rawInput, indentSize]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = analysis.formatted || rawInput;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRawInput(text);
    } catch (e) {
      console.warn('Clipboard read permission denied', e);
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(rawInput);
      setRawInput(JSON.stringify(parsed));
    } catch (e) {
      // ignore if invalid
    }
  };

  const handleBeautify = (spaces = 2) => {
    setIndentSize(spaces);
    try {
      const parsed = JSON.parse(rawInput);
      setRawInput(JSON.stringify(parsed, null, spaces));
    } catch (e) {
      // ignore
    }
  };

  const handleDownload = () => {
    const content = analysis.formatted || rawInput;
    if (!content) return;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beautified_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 1080,
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-default)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                JSON Beautifier &amp; Syntax Formatter
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Format, validate, minify, and inspect ERP payload structures &amp; MAWM Canonical JSON
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {analysis.isValid === true && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                <CheckCircle2 size={13} />
                <span>Valid JSON ({analysis.lineCount} lines • {(analysis.byteSize / 1024).toFixed(1)} KB)</span>
              </span>
            )}

            {analysis.isValid === false && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <AlertTriangle size={13} />
                <span>Invalid JSON Syntax</span>
              </span>
            )}

            <button
              type="button"
              className="header-icon-button"
              onClick={onClose}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar Bar */}
        <div
          style={{
            padding: '0.6rem 1.5rem',
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          {/* Quick Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleBeautify(2)}
              className="hero-btn hero-btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem', fontWeight: 600 }}
              title="Beautify with 2-space indentation"
            >
              <Sparkles size={13} color="#38bdf8" />
              <span>Beautify (2 Spaces)</span>
            </button>

            <button
              type="button"
              onClick={() => handleBeautify(4)}
              className="hero-btn hero-btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
              title="Beautify with 4-space indentation"
            >
              <span>4 Spaces</span>
            </button>

            <button
              type="button"
              onClick={handleMinify}
              className="hero-btn hero-btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
              title="Minify / Compress into single-line JSON"
            >
              <Minimize2 size={13} />
              <span>Minify</span>
            </button>

            <button
              type="button"
              onClick={handlePaste}
              className="hero-btn hero-btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
              title="Paste from clipboard"
            >
              <ClipboardPaste size={13} />
              <span>Paste</span>
            </button>

            <button
              type="button"
              onClick={() => setRawInput('')}
              className="hero-btn hero-btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
              title="Clear editor"
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>

            <button
              type="button"
              onClick={() => setRawInput(SAMPLE_MAWM_JSON)}
              className="hero-btn hero-btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem', color: '#10b981' }}
              title="Load standard MAWM { Data: [ ... ] } sample"
            >
              <FileCode size={13} color="#10b981" />
              <span>Load MAWM Sample</span>
            </button>
          </div>

          {/* Export / Copy Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={handleCopy}
              className="hero-btn hero-btn-secondary"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.74rem', fontWeight: 700 }}
              title="Copy beautified JSON to clipboard"
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="hero-btn hero-btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}
              title="Download formatted JSON file"
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Syntax Error Banner if Invalid */}
        {analysis.error && (
          <div
            style={{
              padding: '0.65rem 1.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span><strong>JSON Syntax Error:</strong> {analysis.error}</span>
          </div>
        )}

        {/* Main Editor Surface */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            overflow: 'hidden',
            minHeight: 460
          }}
        >
          {/* Left Panel: Raw Input Area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-app)'
            }}
          >
            <div
              style={{
                padding: '0.4rem 1rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-dim)',
                borderBottom: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>RAW JSON INPUT</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {rawInput.length} chars
              </span>
            </div>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste raw, unformatted, or minified JSON here..."
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                padding: '1rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                lineHeight: '1.5',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                border: 'none',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Right Panel: Beautified Output with Syntax Formatting */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#070b12',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '0.4rem 1rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#38bdf8',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: '#0a101d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>BEAUTIFIED CANONICAL OUTPUT</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                {analysis.lineCount} lines • {analysis.keyCount} keys
              </span>
            </div>
            <pre
              style={{
                flex: 1,
                margin: 0,
                padding: '1rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                lineHeight: '1.5',
                overflowX: 'auto',
                overflowY: 'auto',
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}
            >
              {analysis.formatted || (
                <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                  Formatted JSON will appear here in realtime as you type or paste...
                </span>
              )}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Universal MAWM Envelope Format: <code>{`{ "Data": [ ... ] }`}</code>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
