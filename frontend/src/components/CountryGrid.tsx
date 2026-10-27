import React, { useState, useMemo } from 'react';
import { Globe, Search, X } from 'lucide-react';
import { CountryCount } from '../types';
import { formatAndSortCountries } from '../utils/countries';

interface CountryGridProps {
  countries: CountryCount[];
  onSelectCountry: (country: string) => void;
}

export const CountryGrid: React.FC<CountryGridProps> = ({ countries, onSelectCountry }) => {
  const [search, setSearch] = useState('');

  const formattedCountries = useMemo(() => {
    return formatAndSortCountries(countries);
  }, [countries]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return formattedCountries;
    const q = search.toLowerCase().trim();
    return formattedCountries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [formattedCountries, search]);

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={20} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Browse by Country
          </h3>
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem',
            }}
          >
            {filteredCountries.length} of {formattedCountries.length} countries
          </span>
        </div>

        {/* Quick Country Search */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '0.35rem 0.65rem',
            minWidth: '220px',
          }}
        >
          <Search size={15} style={{ color: 'var(--text-muted)', marginRight: '0.4rem', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country..."
            aria-label="Filter countries"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '0.8125rem',
              outline: 'none',
              width: '100%',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.1rem',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {filteredCountries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <p>No countries match "{search}".</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {filteredCountries.map((c) => (
            <button
              key={c.code}
              onClick={() => onSelectCountry(c.code)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s ease, transform 0.1s ease',
              }}
              className="country-tile"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{c.flag}</span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={c.name}
                >
                  {c.name}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '0.25rem',
                  flexShrink: 0,
                  marginLeft: '0.4rem',
                }}
              >
                {c.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
