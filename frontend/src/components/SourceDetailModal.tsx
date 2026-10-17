import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Database, Tv, Radio, Clock, ShieldCheck, Loader, Filter } from 'lucide-react';
import { SourceDetail, Channel } from '../types';
import { fetchSourceById } from '../services/api';
import { formatRelativeTime } from '../utils/time';

interface SourceDetailModalProps {
  sourceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onFilterBySource: (sourceId: string) => void;
  onPlayChannel: (channel: Channel) => void;
}

export const SourceDetailModal: React.FC<SourceDetailModalProps> = ({
  sourceId,
  isOpen,
  onClose,
  onFilterBySource,
  onPlayChannel,
}) => {
  const [source, setSource] = useState<SourceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sourceId) {
      setSource(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetchSourceById(sourceId)
      .then((data) => setSource(data.source))
      .catch((err) => setError(err.message || 'Failed to load source details'))
      .finally(() => setLoading(false));
  }, [isOpen, sourceId]);

  if (!isOpen || !sourceId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {source ? source.name : 'Source Details'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
              <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading source provenance & channels...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#f87171' }}>
              <p>{error}</p>
            </div>
          ) : source ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Provenance Badge & Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <Tv size={14} style={{ color: 'var(--accent)' }} />
                    <span>Indexed Channels</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {source.channel_count}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <Radio size={14} style={{ color: '#10b981' }} />
                    <span>Active Streams</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {source.stream_count}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>Refresh Window</span>
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    Every {source.refresh_interval_hours}h
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <ShieldCheck size={14} style={{ color: '#10b981' }} />
                    <span>Approval Status</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981', marginTop: '0.25rem' }}>
                    Verified FTA
                  </div>
                </div>
              </div>

              {/* Attribution and Terms */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Provenance & Licensing
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                  <strong>Attribution:</strong> {source.attribution}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                  <strong>Terms & Usage:</strong> {source.terms}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  <strong>Last Sync:</strong> {source.last_fetched_at ? formatRelativeTime(source.last_fetched_at) : 'Active'}
                </p>
              </div>

              {/* Sample Channels from this Source */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    Sample Channels Provided ({source.channels?.length || 0})
                  </h4>
                  <button
                    onClick={() => {
                      onFilterBySource(source.id);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Filter size={13} />
                    <span>View all in directory &rarr;</span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '0.5rem',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '0.25rem',
                  }}
                >
                  {source.channels && source.channels.length > 0 ? (
                    source.channels.map((ch) => (
                      <div
                        key={ch.id}
                        onClick={() => {
                          onPlayChannel({
                            id: ch.id,
                            canonical_name: ch.display_name.toLowerCase(),
                            display_name: ch.display_name,
                            category: ch.category,
                            country: ch.country,
                            language: null,
                            logo_url: ch.logo_url,
                            tvg_id: null,
                            stream_count: 1,
                            created_at: '',
                            updated_at: '',
                          });
                          onClose();
                        }}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.375rem',
                          padding: '0.5rem 0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease',
                        }}
                        title={`Play ${ch.display_name}`}
                      >
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          <Tv size={12} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {ch.display_name}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No channels listed.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {source && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <a
              href={source.source_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                textDecoration: 'none',
              }}
            >
              <span>Upstream Repository</span>
              <ExternalLink size={13} />
            </a>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  onFilterBySource(source.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.45rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Filter size={14} />
                <span>Filter Channels ({source.channel_count})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

