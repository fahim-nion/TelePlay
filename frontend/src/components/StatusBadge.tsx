import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, HelpCircle, ShieldAlert } from 'lucide-react';
import { HealthStatus } from '../types';
import { formatRelativeTime } from '../utils/time';

interface StatusBadgeProps {
  status?: HealthStatus | null;
  lastCheckedAt?: string | null;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, lastCheckedAt, compact = false }) => {
  const currentStatus = status || 'not_checked';

  const config = {
    working: {
      label: 'Working recently',
      shortLabel: 'Working',
      icon: CheckCircle,
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      text: '#10b981',
      description: 'Passed recent automated probe. Playback depends on your browser & source.',
    },
    intermittent: {
      label: 'Intermittent',
      shortLabel: 'Intermittent',
      icon: AlertTriangle,
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      text: '#f59e0b',
      description: 'Checks have mixed or unstable results.',
    },
    unreachable: {
      label: 'Unreachable',
      shortLabel: 'Offline',
      icon: XCircle,
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#ef4444',
      description: 'Recent automated check failed (stream endpoint returned error or timeout).',
    },
    unsupported: {
      label: 'Browser limitation',
      shortLabel: 'Unsupported',
      icon: ShieldAlert,
      bg: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.3)',
      text: '#a855f7',
      description: 'Format or platform requires an external player (e.g. web page embed or proprietary codec).',
    },
    stale: {
      label: 'Stale result',
      shortLabel: 'Stale',
      icon: Clock,
      bg: 'rgba(148, 163, 184, 0.12)',
      border: 'rgba(148, 163, 184, 0.25)',
      text: '#94a3b8',
      description: 'Last health check is older than the configured freshness window.',
    },
    not_checked: {
      label: 'Not checked',
      shortLabel: 'Unchecked',
      icon: HelpCircle,
      bg: 'rgba(100, 116, 139, 0.1)',
      border: 'rgba(100, 116, 139, 0.2)',
      text: '#94a3b8',
      description: 'No probe result recorded yet.',
    },
  }[currentStatus];

  const Icon = config.icon;
  const timeText = lastCheckedAt ? `Checked ${formatRelativeTime(lastCheckedAt)}` : 'Never checked';

  return (
    <div
      title={`${config.label} — ${config.description} (${timeText})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: compact ? '0.15rem 0.45rem' : '0.25rem 0.6rem',
        borderRadius: '9999px',
        fontSize: compact ? '0.75rem' : '0.8125rem',
        fontWeight: 500,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={compact ? 12 : 14} />
      <span>{compact ? config.shortLabel : config.label}</span>
      {lastCheckedAt && !compact && (
        <span style={{ fontSize: '0.6875rem', opacity: 0.8, marginLeft: '0.2rem' }}>
          • {formatRelativeTime(lastCheckedAt)}
        </span>
      )}
    </div>
  );
};

