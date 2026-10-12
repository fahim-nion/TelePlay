import React, { useState } from 'react';
import { Play, Star, Copy, Layers, Globe } from 'lucide-react';
import { Channel } from '../types';
import { StatusBadge } from './StatusBadge';
import { getChannelInitials } from '../utils/time';

interface ChannelCardProps {
  channel: Channel;
  isFavorite: boolean;
  onToggleFavorite: (channel: Channel) => void;
  onPlay: (channel: Channel) => void;
  onCopyUrl?: (channel: Channel) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
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
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        position: 'relative',
      }}
      className="channel-card"
    >
      <div>
        {/* Card Header: Avatar & Favorite */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            {/* Channel Logo or Initials */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                fontWeight: 600,
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
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

            {/* Title & Category */}
            <div style={{ minWidth: 0 }}>
              <h3
                title={channel.display_name}
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-main)',
                  lineHeight: 1.3,
                }}
              >
                {channel.display_name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '0.25rem',
                  }}
                >
                  {channel.category}
                </span>
                {channel.country && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Globe size={11} />
                    {channel.country}
                  </span>
                )}
                {channel.language && (
                  <span>• {channel.language}</span>
                )}
              </div>
            </div>
          </div>

          {/* Favorite Toggle Button */}
          <button
            onClick={() => onToggleFavorite(channel)}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.35rem',
              color: isFavorite ? '#eab308' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
          >
            <Star size={18} fill={isFavorite ? '#eab308' : 'none'} />
          </button>
        </div>

        {/* Status Badge & Stream Count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <StatusBadge status={channel.health_status} lastCheckedAt={channel.last_checked_at} />
          {channel.stream_count > 1 && (
            <span
              title={`${channel.stream_count} alternative stream sources available`}
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Layers size={12} />
              {channel.stream_count} sources
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
        <button
          onClick={() => onPlay(channel)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--accent)',
            color: '#020617',
            border: 'none',
            borderRadius: '0.375rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Play size={15} fill="#020617" />
          <span>Play</span>
        </button>

        {onCopyUrl && (
          <button
            onClick={() => onCopyUrl(channel)}
            title="Copy channel URL or export"
            aria-label="Copy channel URL"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              padding: '0.5rem 0.65rem',
              cursor: 'pointer',
            }}
          >
            <Copy size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
