import React, { useRef } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectCategoryShortcut: (category: string) => void;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchQuery,
  onSearchChange,
  onSelectCategoryShortcut,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const popularShortcuts = ['News', 'Animation', 'Music', 'Movies', 'Sports', 'General'];

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem 2rem',
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
      <h2
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--text-main)',
          marginBottom: '0.5rem',
        }}
      >
        Discover Free-To-Air Television
      </h2>
      <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
        Verified public streams, honest technical health checks, direct browser playback.
      </p>

      {/* Search Input Bar */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '0.25rem 0.5rem 0.25rem 1rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        className="search-bar-container"
      >
        <Search size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginRight: '0.75rem' }} />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search channels, countries, or categories..."
          aria-label="Search channels"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            fontSize: '1rem',
            outline: 'none',
            padding: '0.5rem 0',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              inputRef.current?.focus();
            }}
            title="Clear search"
            aria-label="Clear search"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: '0.25rem',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Quick category shortcut pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Sparkles size={13} style={{ color: 'var(--accent)' }} /> Quick tags:
        </span>
        {popularShortcuts.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategoryShortcut(cat)}
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
              borderRadius: '9999px',
              padding: '0.2rem 0.65rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};
