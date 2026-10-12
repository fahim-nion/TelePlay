import React from 'react';
import { Tv, CheckCircle, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { CatalogueStats } from '../types';
import { formatRelativeTime } from '../utils/time';

interface StatsSummaryProps {
  stats: CatalogueStats | null;
  loading: boolean;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ stats, loading }) => {
  if (loading && !stats) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              height: '84px',
            }}
            className="animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Total Channels */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(34, 211, 238, 0.1)',
              color: 'var(--accent)',
            }}
          >
            <Tv size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Catalogue Size
            </span>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {stats.totalChannels.toLocaleString()}
            </p>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {stats.totalStreams.toLocaleString()} stream sources
            </span>
          </div>
        </div>

        {/* Working Recently */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
            }}
          >
            <CheckCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Working Recently
            </span>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', lineHeight: 1.2 }}>
              {stats.workingCount.toLocaleString()}
            </p>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Passed multi-tier probe
            </span>
          </div>
        </div>

        {/* Stale / Unverified */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              color: 'var(--text-muted)',
            }}
          >
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Stale / Awaiting Check
            </span>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {(stats.staleCount + stats.uncheckedCount).toLocaleString()}
            </p>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              Scheduled in background
            </span>
          </div>
        </div>

        {/* Last Refreshed */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(129, 140, 248, 0.1)',
              color: '#818cf8',
            }}
          >
            <RefreshCw size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Source Ingestion
            </span>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3, marginTop: '2px' }}>
              {stats.lastRefreshedAt ? formatRelativeTime(stats.lastRefreshedAt) : 'Ready'}
            </p>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              FTA verified feeds
            </span>
          </div>
        </div>
      </div>

      {/* Honest Health Disclaimer */}
      <div
        style={{
          marginTop: '0.75rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          backgroundColor: 'rgba(34, 211, 238, 0.05)',
          border: '1px solid rgba(34, 211, 238, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <ShieldCheck size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span>
          <strong>Honest status:</strong> Channels are tested by bounded probes. Playback depends on source server availability and your browser's supported codecs (HLS/AAC/H.264).
        </span>
      </div>
    </div>
  );
};
