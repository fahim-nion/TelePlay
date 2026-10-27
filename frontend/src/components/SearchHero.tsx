import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, ArrowRight } from 'lucide-react';

interface SearchHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmitSearch?: (query: string) => void;
  onSelectCategoryShortcut: (category: string) => void;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchQuery,
  onSearchChange,
  onSubmitSearch,
  onSelectCategoryShortcut,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localQuery);
    if (onSubmitSearch) {
      onSubmitSearch(localQuery);
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearchChange('');
    inputRef.current?.focus();
  };

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
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '0.35rem 0.5rem 0.35rem 1rem',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        className="search-bar-container"
      >
        <Search size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginRight: '0.75rem' }} />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
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
        {localQuery && (
          <button
            type="button"
            onClick={handleClear}
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
              marginRight: '0.35rem',
            }}
          >
            <X size={18} />
          </button>
        )}
        <button
          type="submit"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: 'var(--accent)',
            color: '#000',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.55rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span>Search</span>
          <ArrowRight size={15} />
        </button>
      </form>

      {/* Quick category shortcut pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span>Popular:</span>
        </div>
        {popularShortcuts.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategoryShortcut(category)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '9999px',
              padding: '0.25rem 0.75rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="shortcut-pill"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};
