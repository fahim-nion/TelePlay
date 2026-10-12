import React from 'react';
import { LayoutGrid, List, Filter, X, ArrowUpDown } from 'lucide-react';
import { CategoryCount, CountryCount, ChannelFilters, ViewMode } from '../types';

interface FilterBarProps {
  filters: ChannelFilters;
  categories: CategoryCount[];
  countries: CountryCount[];
  viewMode: ViewMode;
  totalChannels: number;
  onFilterChange: (updated: Partial<ChannelFilters>) => void;
  onResetFilters: () => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  categories,
  countries,
  viewMode,
  totalChannels,
  onFilterChange,
  onResetFilters,
  onViewModeChange,
}) => {
  const hasActiveFilters = Boolean(
    filters.category ||
    filters.country ||
    filters.healthStatus ||
    filters.search ||
    filters.sortBy
  );

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '0.85rem 1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
    >
      {/* Left side: Filter Dropdowns */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          <Filter size={15} />
          <span>Filters:</span>
        </div>

        {/* Category Dropdown */}
        <select
          value={filters.category || ''}
          onChange={(e) => onFilterChange({ category: e.target.value || undefined, page: 1 })}
          aria-label="Filter by category"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '0.4rem 0.65rem',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">All Categories ({categories.reduce((a, b) => a + b.count, 0)})</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c.count})
            </option>
          ))}
        </select>

        {/* Country Dropdown */}
        <select
          value={filters.country || ''}
          onChange={(e) => onFilterChange({ country: e.target.value || undefined, page: 1 })}
          aria-label="Filter by country"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '0.4rem 0.65rem',
            fontSize: '0.8125rem',
            cursor: 'pointer',
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

        {/* Health Status Dropdown */}
        <select
          value={filters.healthStatus || ''}
          onChange={(e) => onFilterChange({ healthStatus: e.target.value || undefined, page: 1 })}
          aria-label="Filter by health status"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '0.4rem 0.65rem',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">All Health Statuses</option>
          <option value="working">Working recently</option>
          <option value="intermittent">Intermittent</option>
          <option value="unreachable">Unreachable</option>
          <option value="unsupported">Browser limitation</option>
          <option value="stale">Stale</option>
          <option value="not_checked">Not checked</option>
        </select>

        {/* Sort By Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            value={filters.sortBy || 'name'}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as any, page: 1 })}
            aria-label="Sort channels"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              padding: '0.4rem 0.65rem',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="name">Name (A-Z)</option>
            <option value="recently_checked">Recently Verified</option>
            <option value="created_at">Recently Added</option>
          </select>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            title="Clear all filters"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              backgroundColor: 'transparent',
              color: '#ef4444',
              border: '1px dashed rgba(239, 68, 68, 0.4)',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.55rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <X size={12} />
            <span>Clear filters</span>
          </button>
        )}
      </div>

      {/* Right side: View Mode Toggle & Total Count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <strong>{totalChannels}</strong> channel{totalChannels === 1 ? '' : 's'}
        </span>

        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '2px',
          }}
        >
          <button
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
            aria-label="Grid view"
            style={{
              background: viewMode === 'grid' ? 'var(--bg-secondary)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.35rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            title="List view"
            aria-label="List view"
            style={{
              background: viewMode === 'list' ? 'var(--bg-secondary)' : 'transparent',
              color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.35rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
