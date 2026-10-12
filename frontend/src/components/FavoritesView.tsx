import React from 'react';
import { Star, Clock, Trash2, Play, Copy } from 'lucide-react';
import { FavoriteChannel, Channel } from '../types';
import { StatusBadge } from './StatusBadge';
import { getChannelInitials } from '../utils/time';

interface FavoritesViewProps {
  favorites: FavoriteChannel[];
  recentlyWatched: FavoriteChannel[];
  onRemoveFavorite: (channelId: number) => void;
  onPlay: (channel: Channel) => void;
  onCopyUrl?: (channel: Channel) => void;
  onBrowseChannels: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  recentlyWatched,
  onRemoveFavorite,
  onPlay,
  onCopyUrl,
  onBrowseChannels,
}) => {
  const toChannel = (fav: FavoriteChannel): Channel => ({
    id: fav.id,
    canonical_name: fav.name.toLowerCase(),
    display_name: fav.name,
    category: fav.category,
    country: fav.country,
    language: null,
    logo_url: fav.logo_url,
    tvg_id: null,
    stream_count: fav.stream_count,
    health_status: fav.health_status,
    last_checked_at: fav.last_checked_at,
    created_at: fav.saved_at,
    updated_at: fav.saved_at,
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Favorites Section */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star size={22} fill="#eab308" color="#eab308" />
            Starred Channels ({favorites.length})
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Saved locally in your browser
          </span>
        </div>

        {favorites.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--border)',
              borderRadius: '0.75rem',
              padding: '3rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <Star size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              No favorite channels yet
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Click the star icon on any channel card while browsing to save it to your local quick-access list.
            </p>
            <button
              onClick={onBrowseChannels}
              style={{
                backgroundColor: 'var(--accent)',
                color: '#020617',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.6rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Browse Catalogue
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {favorites.map((fav) => {
              const ch = toChannel(fav);
              return (
                <div
                  key={fav.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '0.375rem',
                            backgroundColor: 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                          }}
                        >
                          {fav.logo_url ? (
                            <img src={fav.logo_url} alt={fav.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span>{getChannelInitials(fav.name)}</span>
                          )}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{fav.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fav.category}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveFavorite(fav.id)}
                        title="Remove from favorites"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '0.3rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <StatusBadge status={fav.health_status} lastCheckedAt={fav.last_checked_at} compact />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <button
                      onClick={() => onPlay(ch)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        backgroundColor: 'var(--accent)',
                        color: '#020617',
                        border: 'none',
                        borderRadius: '0.375rem',
                        padding: '0.45rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Play size={14} fill="#020617" />
                      <span>Play</span>
                    </button>
                    {onCopyUrl && (
                      <button
                        onClick={() => onCopyUrl(ch)}
                        title="Copy channel stream URL"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.375rem',
                          padding: '0.45rem 0.6rem',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Watched Section */}
      {recentlyWatched.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recently Played</h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {recentlyWatched.map((item) => (
              <div
                key={item.id}
                onClick={() => onPlay(toChannel(item))}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                className="recent-item"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                  <Play size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </span>
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
