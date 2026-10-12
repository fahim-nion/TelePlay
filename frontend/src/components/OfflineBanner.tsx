import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onRetry, isRetrying }) => {
  return (
    <div
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        gap: '1rem',
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <WifiOff size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fca5a5' }}>
            Termux Backend Offline / Connecting
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Showing cached data. Live health checking and catalog updates resume once the server is reachable.
          </p>
        </div>
      </div>

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
  );
};
