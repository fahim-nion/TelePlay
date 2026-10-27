import React, { useMemo } from 'react';
import {
  LayoutGrid,
  List,
  Filter,
  X,
  ArrowUpDown,
  Share2,
  Database,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { CategoryCount, CountryCount, ChannelFilters, ViewMode } from '../types';
import { formatAndSortCountries } from '../utils/countries';

interface FilterBarProps {
  filters: ChannelFilters;
  categories: CategoryCount[];
  countries: CountryCount[];
  viewMode: ViewMode;
  totalChannels: number;
  onFilterChange: (updated: Partial<ChannelFilters>) => void;
  onResetFilters: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onShareView?: () => void;
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
  onShareView,
}) => {
  const hasActiveFilters = Boolean(
    filters.category ||
    filters.country ||
    filters.healthStatus ||
    filters.sourceId ||
    filters.search ||
    (filters.sortBy && filters.sortBy !== 'name')
  );

  // Format and sort countries alphabetically
  const sortedCountries = useMemo(() => {
    return formatAndSortCountries(countries);
  }, [countries]);

  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.category.localeCompare(b.category));
  }, [categories]);

  const isWorkingOnly = filters.healthStatus === 'working';

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
      {/* Left side: Search & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', flex: 1 }}>
        {/* Inline Search Bar */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '0.35rem 0.65rem',
            minWidth: '130px',
            maxWidth: '260px',
            flex: 1,
          }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)', marginRight: '0.4rem', flexShrink: 0 }} />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Search channels..."
            aria-label="Search channels"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '0.8125rem',
              outline: 'none',
              width: '100%',
              minWidth: 0,
            }}
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '', page: 1 })}
              title="Clear search"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.1rem',
                display: 'flex',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Working Only Quick Toggle Button */}
        <button
          onClick={() =>
            onFilterChange({
              healthStatus: isWorkingOnly ? '' : 'working',
              page: 1,
            })
          }
          title={isWorkingOnly ? 'Show all streams' : 'Show only verified working streams'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: isWorkingOnly ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-card)',
            color: isWorkingOnly ? '#4ade80' : 'var(--text-muted)',
            border: `1px solid ${isWorkingOnly ? '#22c55e' : 'var(--border)'}`,
            borderRadius: '0.375rem',
            padding: '0.4rem 0.65rem',
            fontSize: '0.8125rem',
            fontWeight: isWorkingOnly ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <CheckCircle2 size={14} style={{ color: isWorkingOnly ? '#4ade80' : 'var(--text-muted)' }} />
          <span>Working Only</span>
        </button>

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
            maxWidth: '180px',
          }}
        >
          <option value="">All Categories ({categories.reduce((a, b) => a + b.count, 0)})</option>
          {sortedCategories.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c.count})
            </option>
          ))}
        </select>

        {/* Country Dropdown (Full names & sorted alphabetically) */}
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
            maxWidth: '200px',
          }}
        >
          <option value="">All Countries ({sortedCountries.length})</option>
          {sortedCountries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name} ({c.count})
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
          <option value="">All Statuses</option>
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
            <option value="name_desc">Name (Z-A)</option>
            <option value="recently_checked">Recently Verified</option>
            <option value="created_at">Recently Added</option>
          </select>
        </div>

        {/* Active Source Filter Badge */}
        {filters.sourceId && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.65rem',
              fontSize: '0.8125rem',
              color: 'var(--accent)',
            }}
          >
            <Database size={13} />
            <span>Source: <strong>{filters.sourceId}</strong></span>
            <button
              onClick={() => onFilterChange({ sourceId: undefined, page: 1 })}
              title="Remove source filter"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                display: 'flex',
                padding: '0 0 0 2px',
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

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

      {/* Right side: View Mode Toggle, Share View, & Total Count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onShareView && (
          <button
            onClick={onShareView}
            title="Share this filtered view (copies URL)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              padding: '0.4rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
          >
            <Share2 size={13} />
            <span>Share View</span>
          </button>
        )}

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
