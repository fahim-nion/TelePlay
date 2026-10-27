import React, { useState } from 'react';
import { WifiOff, RefreshCw, Settings, Check } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl } from '../services/api';

interface OfflineBannerProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onRetry, isRetrying }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [urlInput, setUrlInput] = useState(() => getApiBaseUrl());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(urlInput);
    setShowConfig(false);
    onRetry();
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
      role="alert"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <WifiOff size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fca5a5' }}>
              Termux Backend Offline / Connecting
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Cannot reach {getApiBaseUrl() || 'local /api'} backend. Showing cached data.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-muted)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.375rem',
              padding: '0.4rem 0.65rem',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            <Settings size={13} />
            <span>Set Backend URL</span>
          </button>

          <button
            onClick={onRetry}
            disabled={isRetrying}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '0.375rem',
              padding: '0.4rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
            <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
          </button>
        </div>
      </div>

      {showConfig && (
        <form
          onSubmit={handleSave}
          style={{
            display: 'flex',
            gap: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(239, 68, 68, 0.2)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="e.g. https://my-phone.trycloudflare.com or http://192.168.1.5:3000"
            style={{
              flex: 1,
              minWidth: '240px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.375rem',
              color: '#fff',
              padding: '0.35rem 0.65rem',
              fontSize: '0.8125rem',
            }}
          />
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Check size={14} />
            Save & Connect
          </button>
        </form>
      )}
    </div>
  );
};
