import React, { useState } from 'react';
import { Play, Star, Copy, Globe, Layers } from 'lucide-react';
import { Channel } from '../types';
import { StatusBadge } from './StatusBadge';
import { getChannelInitials } from '../utils/time';

interface ChannelRowProps {
  channel: Channel;
  isFavorite: boolean;
  onToggleFavorite: (channel: Channel) => void;
  onPlay: (channel: Channel) => void;
  onCopyUrl?: (channel: Channel) => void;
}

export const ChannelRow: React.FC<ChannelRowProps> = ({
  channel,
  isFavorite,
  onToggleFavorite,
  onPlay,
  onCopyUrl,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
        gap: '1rem',
        transition: 'background-color 0.15s ease',
      }}
      className="channel-row"
    >
      {/* Left: Logo, Name, Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
        <button
          onClick={() => onToggleFavorite(channel)}
          title={isFavorite ? 'Remove favorite' : 'Add to favorites'}
          aria-label={isFavorite ? 'Remove favorite' : 'Add to favorites'}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0.2rem',
            color: isFavorite ? '#eab308' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Star size={16} fill={isFavorite ? '#eab308' : 'none'} />
        </button>

        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '0.375rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
          }}
        >
          {channel.logo_url && !imageError ? (
            <img
              src={channel.logo_url}
              alt={channel.display_name}
              onError={() => setImageError(true)}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }}
            />
          ) : (
            <span>{getChannelInitials(channel.display_name)}</span>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <h4
            title={channel.display_name}
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {channel.display_name}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>{channel.category}</span>
            {channel.country && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Globe size={11} /> {channel.country}
              </span>
            )}
            {channel.stream_count > 1 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Layers size={11} /> {channel.stream_count} streams
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Health Status */}
      <div style={{ flexShrink: 0 }}>
        <StatusBadge status={channel.health_status} lastCheckedAt={channel.last_checked_at} compact />
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        {onCopyUrl && (
          <button
            onClick={() => onCopyUrl(channel)}
            title="Copy channel URL"
            aria-label="Copy channel URL"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              color: 'var(--text-muted)',
              padding: '0.4rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Copy size={14} />
          </button>
        )}

        <button
          onClick={() => onPlay(channel)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: 'var(--accent)',
            color: '#020617',
            border: 'none',
            borderRadius: '0.375rem',
            padding: '0.4rem 0.75rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Play size={13} fill="#020617" />
          <span>Play</span>
        </button>
      </div>
    </div>
  );
};
