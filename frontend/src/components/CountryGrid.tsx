import React from 'react';
import { Globe, MapPin } from 'lucide-react';
import { CountryCount } from '../types';

interface CountryGridProps {
  countries: CountryCount[];
  onSelectCountry: (country: string) => void;
}

export const CountryGrid: React.FC<CountryGridProps> = ({ countries, onSelectCountry }) => {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={18} style={{ color: 'var(--accent)' }} />
          Browse by Country
        </h3>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {countries.length} countries
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {countries.map((c) => (
          <button
            key={c.country}
            onClick={() => onSelectCountry(c.country)}
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
              transition: 'border-color 0.15s ease',
            }}
            className="country-tile"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {c.country}
              </span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '0.1rem 0.4rem',
                borderRadius: '0.25rem',
              }}
            >
              {c.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

