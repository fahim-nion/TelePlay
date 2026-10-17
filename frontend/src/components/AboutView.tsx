import React from 'react';
import { Shield, Radio, Server, ExternalLink, Flag, Database } from 'lucide-react';
import { SourceRecord } from '../types';
import { formatRelativeTime } from '../utils/time';

interface AboutViewProps {
  sources: SourceRecord[];
  onOpenReportModal: () => void;
  onSelectSource?: (sourceId: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ sources, onOpenReportModal, onSelectSource }) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          About TelePlay & Source Transparency
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          A lean, transparent Free-To-Air directory running on low-resource mobile hardware.
        </p>
      </div>

      {/* Architecture Highlights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <Radio size={24} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>Direct Streaming</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Video streams connect your browser directly to official public broadcasters. The Termux backend never proxies video bytes, preserving phone battery and mobile data.
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <Server size={24} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>Termux Embedded</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Engineered with Node.js and built-in SQLite (no native C++ compilation or Python required), running self-contained on Android with strictly bounded memory.
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <Shield size={24} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>SSRF & Probing Safety</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Every fetch and probe validates DNS destinations, blocking private RFC 1918 subnets, cloud metadata endpoints, and loopback ranges.
          </p>
        </div>
      </div>

      {/* Approved Sources Section */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Database size={18} style={{ color: 'var(--accent)' }} />
          Approved Ingestion Sources & Provenance
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          TelePlay enforces a strict whitelist policy. Commercial, illicit, or scraper feeds are rejected. Only public, community-curated Free-To-Air channels are indexed.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sources.map((s) => (
            <div
              key={s.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</h4>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  Approved Source
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <strong>Attribution:</strong> {s.attribution}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <strong>License / Terms:</strong> {s.terms}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <span>Last updated: {s.last_fetched_at ? formatRelativeTime(s.last_fetched_at) : 'Active'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {onSelectSource && (
                    <button
                      onClick={() => onSelectSource(s.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: 0,
                      }}
                    >
                      Inspect Source Details &rarr;
                    </button>
                  )}
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                  >
                    View Source <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transparency & Report Action */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ maxWidth: '520px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Report a broken or inappropriate channel
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Found a stream that has ceased broadcasting or does not comply with Free-To-Air guidelines? Send a report for investigation.
          </p>
        </div>
        <button
          onClick={onOpenReportModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.375rem',
            padding: '0.55rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Flag size={15} />
          <span>Report Channel</span>
        </button>
      </div>
    </div>
  );
};
