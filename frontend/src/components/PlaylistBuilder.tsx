import React, { useState } from 'react';
import {
  ListMusic,
  Download,
  Copy,
  Check,
  Star,
  Globe,
  Radio,
  CheckCircle,
  AlertCircle,
  Layers,
  Terminal,
} from 'lucide-react';
import { CategoryCount, CountryCount, FavoriteChannel } from '../types';
import { getPlaylistExportUrl } from '../services/api';

interface PlaylistBuilderProps {
  categories: CategoryCount[];
  countries: CountryCount[];
  favorites: FavoriteChannel[];
  totalChannels: number;
}

export const PlaylistBuilder: React.FC<PlaylistBuilderProps> = ({
  categories,
  countries,
  favorites,
  totalChannels,
}) => {
  // Builder configuration states
  const [scope, setScope] = useState<'catalogue' | 'filtered' | 'favorites'>('catalogue');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(true);
  const [includeAllStreams, setIncludeAllStreams] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Compute export parameters
  const exportOptions = {
    category: scope === 'filtered' && selectedCategory ? selectedCategory : undefined,
    country: scope === 'filtered' && selectedCountry ? selectedCountry : undefined,
    healthStatus: verifiedOnly ? 'working' : undefined,
    channelIds: scope === 'favorites' ? favorites.map((f) => f.id) : undefined,
    includeAllStreams,
  };

  const relativeExportPath = getPlaylistExportUrl(exportOptions);
  const fullExportUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${relativeExportPath}`
    : relativeExportPath;

  // Compute estimated channel count for preview
  let estimatedCount = totalChannels;
  if (scope === 'favorites') {
    estimatedCount = favorites.length;
  } else if (scope === 'filtered') {
    if (selectedCategory) {
      const match = categories.find((c) => c.category === selectedCategory);
      estimatedCount = match ? match.count : 0;
    } else if (selectedCountry) {
      const match = countries.find((c) => c.country === selectedCountry);
      estimatedCount = match ? match.count : 0;
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullExportUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2400);
    });
  };

  const handleDownload = () => {
    window.location.href = relativeExportPath;
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(129, 140, 248, 0.12)',
            color: '#818cf8',
            padding: '0.4rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          <ListMusic size={16} />
          <span>M3U Playlist Export Engine</span>
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Build & Export Custom M3U Playlists
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Generate standardized, UTF-8 encoded playlists compatible with any IPTV player, Smart TV, or media center app.
        </p>
      </div>

      {/* Main Builder Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.75rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Step 1: Scope Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
            1. Select Export Scope
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <button
              onClick={() => setScope('catalogue')}
              style={{
                backgroundColor: scope === 'catalogue' ? 'var(--bg-card)' : 'transparent',
                borderColor: scope === 'catalogue' ? 'var(--accent)' : 'var(--border)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Globe size={18} style={{ color: scope === 'catalogue' ? 'var(--accent)' : 'var(--text-muted)', marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Full Catalogue</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Export all global FTA channels</p>
              </div>
            </button>

            <button
              onClick={() => setScope('filtered')}
              style={{
                backgroundColor: scope === 'filtered' ? 'var(--bg-card)' : 'transparent',
                borderColor: scope === 'filtered' ? 'var(--accent)' : 'var(--border)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Radio size={18} style={{ color: scope === 'filtered' ? 'var(--accent)' : 'var(--text-muted)', marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>By Category / Country</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target a specific topic or region</p>
              </div>
            </button>

            <button
              onClick={() => setScope('favorites')}
              style={{
                backgroundColor: scope === 'favorites' ? 'var(--bg-card)' : 'transparent',
                borderColor: scope === 'favorites' ? 'var(--accent)' : 'var(--border)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Star size={18} style={{ color: scope === 'favorites' ? '#eab308' : 'var(--text-muted)', marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Starred Favorites</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{favorites.length} local channels</p>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Filters (when scope === 'filtered') */}
        {scope === 'filtered' && (
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Filter Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedCountry('');
                }}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Or Filter Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedCategory('');
                }}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              >
                <option value="">All Countries</option>
                {countries.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Reliability & Stream Options */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.65rem', color: 'var(--text-main)' }}>
            2. Reliability Options
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.875rem',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle size={15} style={{ color: '#10b981' }} />
                <span>Recently verified working only (excludes stale/unreachable channels)</span>
              </span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.875rem',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={includeAllStreams}
                onChange={(e) => setIncludeAllStreams(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Layers size={15} style={{ color: 'var(--accent)' }} />
                <span>Include alternative stream sources for multi-feed channels</span>
              </span>
            </label>
          </div>
        </div>

        {/* Step 4: Preview & Actions */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Estimated channels in playlist: <strong style={{ color: 'var(--text-main)' }}>{estimatedCount}</strong>
            </span>
          </div>

          {/* Generated Playlist Link Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '0.4rem 0.65rem',
              gap: '0.65rem',
              marginBottom: '1.25rem',
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: '0.8125rem',
                fontFamily: 'monospace',
                color: 'var(--accent)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fullExportUrl}
            </span>
            <button
              onClick={handleCopyUrl}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: copiedUrl ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-card)',
                color: copiedUrl ? '#10b981' : 'var(--text-main)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedUrl ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--accent)',
                color: '#020617',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              <span>Download .m3u Playlist</span>
            </button>

            <button
              onClick={handleCopyUrl}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Copy size={16} />
              <span>Copy Direct IPTV URL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Honest Playlist Note (Adheres to Design.md line 71) */}
      <div
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '0.5rem',
          padding: '0.85rem 1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}
      >
        <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: '#f59e0b' }}>Important Playlist Notice:</strong> TelePlay exports direct Free-To-Air broadcaster stream URLs. Broadcasters may rotate tokens, alter stream resolution, or cease transmission at any time without notice. Playback reliability in external apps depends on the broadcaster source.
        </div>
      </div>

      {/* External Player Compatibility Guide */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Terminal size={18} style={{ color: 'var(--accent)' }} />
          How to Use Your Exported Playlist
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', fontSize: '0.8125rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>VLC Media Player</h4>
            <p style={{ color: 'var(--text-muted)' }}>
              Open VLC &rarr; <strong>Media</strong> &rarr; <strong>Open Network Stream</strong> (Ctrl+N) &rarr; Paste your copied playlist URL &rarr; Click <strong>Play</strong>.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>TiviMate / IPTV Smarters</h4>
            <p style={{ color: 'var(--text-muted)' }}>
              Go to <strong>Settings</strong> &rarr; <strong>Playlists</strong> &rarr; <strong>Add Playlist</strong> &rarr; Select <strong>M3U Playlist</strong> &rarr; Enter your copied URL.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>mpv / Command Line</h4>
            <p style={{ color: 'var(--text-muted)' }}>
              Run the direct CLI stream command in terminal:
            </p>
            <code style={{ display: 'block', backgroundColor: 'var(--bg-secondary)', padding: '0.3rem 0.5rem', borderRadius: '0.25rem', marginTop: '0.4rem', color: 'var(--accent)' }}>
              mpv "{fullExportUrl}"
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
