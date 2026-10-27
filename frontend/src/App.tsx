import { useEffect, useState, useCallback } from 'react';
import {
  Channel,
  ChannelDetail,
  CatalogueStats,
  CategoryCount,
  CountryCount,
  SourceRecord,
  ChannelFilters,
  ViewMode,
  NavigationTab,
  FavoriteChannel,
} from './types';
import {
  fetchHealth,
  fetchStats,
  fetchChannels,
  fetchChannelById,
  fetchCategories,
  fetchCountries,
  fetchSources,
} from './services/api';
import {
  getFavorites,
  toggleFavorite,
  removeFavorite,
  isFavorite,
  getRecentlyWatched,
  addRecentlyWatched,
  getViewMode,
  setViewMode,
} from './services/storage';
import { Navbar } from './components/Navbar';
import { SearchHero } from './components/SearchHero';
import { StatsSummary } from './components/StatsSummary';
import { FilterBar } from './components/FilterBar';
import { ChannelCard } from './components/ChannelCard';
import { ChannelRow } from './components/ChannelRow';
import { CategoryGrid } from './components/CategoryGrid';
import { CountryGrid } from './components/CountryGrid';
import { FavoritesView } from './components/FavoritesView';
import { AboutView } from './components/AboutView';
import { SkeletonCard } from './components/SkeletonCard';
import { OfflineBanner } from './components/OfflineBanner';
import { ReportModal } from './components/ReportModal';
import { PlayerView } from './components/PlayerView';
import { HomePlayer } from './components/HomePlayer';
import { PlaylistBuilder } from './components/PlaylistBuilder';
import { SourceDetailModal } from './components/SourceDetailModal';
import { parseUrlState, buildUrlQuery, copyShareableLink } from './utils/url-state';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';

export default function App() {
  // Navigation & View Preferences (initialized from URL if present)
  const initialUrl = parseUrlState(window.location.search);
  const [currentTab, setCurrentTab] = useState<NavigationTab>(initialUrl.tab);
  const [viewMode, setLocalViewMode] = useState<ViewMode>(getViewMode);

  // Filters & Pagination (initialized from URL if present; default healthStatus to 'working')
  const [filters, setFilters] = useState<ChannelFilters>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasExplicitHealthStatus = searchParams.has('healthStatus');
    return {
      ...initialUrl.filters,
      healthStatus: hasExplicitHealthStatus ? initialUrl.filters.healthStatus : 'working',
    };
  });

  // Data States
  const [channels, setChannels] = useState<Channel[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalChannels, setTotalChannels] = useState(0);
  const [stats, setStats] = useState<CatalogueStats | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [countries, setCountries] = useState<CountryCount[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);

  // Local Storage States
  const [favorites, setFavorites] = useState<FavoriteChannel[]>(getFavorites);
  const [recentlyWatched, setRecentlyWatched] = useState<FavoriteChannel[]>(getRecentlyWatched);

  // Status & UI States
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [retryingBackend, setRetryingBackend] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Embedded Homepage TV Player Screen
  const [homePlayerChannel, setHomePlayerChannel] = useState<ChannelDetail | null>(null);
  const [loadingHomePlayer, setLoadingHomePlayer] = useState<boolean>(false);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportChannelName, setReportChannelName] = useState('');
  const [reportChannelId, setReportChannelId] = useState<number | undefined>(undefined);
  const [reportStreamUrl, setReportStreamUrl] = useState<string | undefined>(undefined);

  // Source Detail Modal
  const [activeSourceDetailId, setActiveSourceDetailId] = useState<string | null>(null);

  // Full Player Modal View
  const [activePlayerChannel, setActivePlayerChannel] = useState<ChannelDetail | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setLocalViewMode(mode);
    setViewMode(mode);
  };

  // Load Catalogue Metadata (Health, Stats, Categories, Countries, Sources)
  const loadMetadata = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [healthRes, statsRes, catRes, countRes, sourcesRes] = await Promise.allSettled([
        fetchHealth(),
        fetchStats(),
        fetchCategories(),
        fetchCountries(),
        fetchSources(),
      ]);

      if (healthRes.status === 'fulfilled') {
        setIsBackendHealthy(true);
      } else {
        setIsBackendHealthy(false);
      }

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.stats);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.categories);
      if (countRes.status === 'fulfilled') setCountries(countRes.value.countries);
      if (sourcesRes.status === 'fulfilled') setSources(sourcesRes.value.sources);
    } catch {
      setIsBackendHealthy(false);
    } finally {
      setLoadingMeta(false);
      setRetryingBackend(false);
    }
  }, []);

  // Load Channels with current filters
  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const data = await fetchChannels(filters);
      setChannels(data.channels);
      setTotalPages(data.pagination.totalPages);
      setTotalChannels(data.pagination.total);
      setIsBackendHealthy(true);
    } catch (err) {
      console.warn('Failed to fetch channels:', err);
      setIsBackendHealthy(false);
    } finally {
      setLoadingChannels(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Automatically pre-load the first verified channel into the Homepage player
  useEffect(() => {
    if (channels.length > 0 && !homePlayerChannel) {
      let isMounted = true;
      fetchChannelById(channels[0].id)
        .then((data) => {
          if (isMounted) setHomePlayerChannel(data.channel);
        })
        .catch(() => {
          if (isMounted) {
            setHomePlayerChannel({
              ...channels[0],
              streams: [],
            });
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [channels, homePlayerChannel]);

  // Navigate between tabs with browser history tracking
  const navigateTab = useCallback(
    (newTab: NavTab, updatedFilters?: Partial<ChannelFilters>, pushHistory = true) => {
      setCurrentTab(newTab);
      const nextFilters = updatedFilters ? { ...filters, ...updatedFilters } : filters;
      if (updatedFilters) {
        setFilters(nextFilters);
      }
      if (pushHistory) {
        const qs = buildUrlQuery(newTab, nextFilters);
        window.history.pushState({ tab: newTab, filters: nextFilters }, '', `${window.location.pathname}${qs}`);
      }
    },
    [filters]
  );

  // Sync URL query state when filters change inside current tab (using replaceState to avoid polluting history on simple toggles)
  useEffect(() => {
    const qs = buildUrlQuery(currentTab, filters);
    const newUrl = `${window.location.pathname}${qs}`;
    window.history.replaceState({ tab: currentTab, filters }, '', newUrl);
  }, [currentTab, filters]);

  // Handle browser popstate navigation (Back / Forward gestures and buttons)
  useEffect(() => {
    const handlePopState = () => {
      // If player modal is open, close it first without navigating away
      if (activePlayerChannel) {
        setActivePlayerChannel(null);
        return;
      }
      if (reportModalOpen) {
        setReportModalOpen(false);
        return;
      }
      if (activeSourceDetailId) {
        setActiveSourceDetailId(null);
        return;
      }

      // Restore tab and filters from URL search state
      const parsed = parseUrlState(window.location.search);
      setCurrentTab(parsed.tab);
      setFilters(parsed.filters);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePlayerChannel, reportModalOpen, activeSourceDetailId]);

  // Handlers
  const handleFilterChange = (updated: Partial<ChannelFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...updated,
      page: updated.page !== undefined ? updated.page : 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      country: '',
      healthStatus: 'working',
      sourceId: '',
      sortBy: 'name',
      page: 1,
      limit: 24,
    });
  };

  const handleShareView = async () => {
    const success = await copyShareableLink(currentTab, filters);
    showToast(success ? 'Shareable view link copied to clipboard!' : 'Failed to copy link');
  };

  const handleSelectCategory = (category: string) => {
    navigateTab('channels', { category, page: 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCountry = (country: string) => {
    navigateTab('channels', { country, page: 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavoriteChannel = (channel: Channel) => {
    const isNowFav = toggleFavorite(channel);
    setFavorites(getFavorites());
    showToast(isNowFav ? `Starred ${channel.display_name}` : `Removed ${channel.display_name} from favorites`);
  };

  const handleRemoveFavoriteById = (channelId: number) => {
    removeFavorite(channelId);
    setFavorites(getFavorites());
    showToast('Removed from favorites');
  };

  // Tune the homepage TV player directly
  const handleTuneHomePlayer = async (channel: Channel) => {
    addRecentlyWatched(channel);
    setRecentlyWatched(getRecentlyWatched());
    setLoadingHomePlayer(true);

    try {
      const data = await fetchChannelById(channel.id);
      setHomePlayerChannel(data.channel);
    } catch {
      setHomePlayerChannel({
        ...channel,
        streams: [],
      });
    } finally {
      setLoadingHomePlayer(false);
    }
  };

  const homeChannelIndex = homePlayerChannel
    ? channels.findIndex((c) => c.id === homePlayerChannel.id)
    : -1;
  const hasHomePreviousChannel = homeChannelIndex > 0;
  const hasHomeNextChannel = homeChannelIndex >= 0 && homeChannelIndex < channels.length - 1;

  const handleNextHomeChannel = () => {
    if (hasHomeNextChannel) {
      handleTuneHomePlayer(channels[homeChannelIndex + 1]);
    }
  };

  const handlePreviousHomeChannel = () => {
    if (hasHomePreviousChannel) {
      handleTuneHomePlayer(channels[homeChannelIndex - 1]);
    }
  };

  const handlePlayChannel = async (channel: Channel) => {
    addRecentlyWatched(channel);
    setRecentlyWatched(getRecentlyWatched());

    // If on Homepage / Discover tab: tune the embedded homepage player and smoothly scroll to it
    if (currentTab === 'discover') {
      await handleTuneHomePlayer(channel);
      const playerEl = document.querySelector('.home-player-card');
      if (playerEl) {
        playerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    // On other tabs (Channels, Favorites): open full player modal
    try {
      const data = await fetchChannelById(channel.id);
      setActivePlayerChannel(data.channel);
      window.history.pushState({ modal: 'player' }, '', window.location.href);
    } catch (err) {
      console.warn('Failed to fetch full channel detail, falling back:', err);
      // Fallback for offline mode or cached channels
      setActivePlayerChannel({
        ...channel,
        streams: [],
      });
      window.history.pushState({ modal: 'player' }, '', window.location.href);
    }
  };

  const activeChannelIndex = activePlayerChannel
    ? channels.findIndex((c) => c.id === activePlayerChannel.id)
    : -1;
  const hasPreviousChannel = activeChannelIndex > 0;
  const hasNextChannel = activeChannelIndex >= 0 && activeChannelIndex < channels.length - 1;

  const handleNextChannel = () => {
    if (hasNextChannel) {
      handlePlayChannel(channels[activeChannelIndex + 1]);
    }
  };

  const handlePreviousChannel = () => {
    if (hasPreviousChannel) {
      handlePlayChannel(channels[activeChannelIndex - 1]);
    }
  };

  const handleCopyChannelUrl = (channel: Channel) => {
    const channelUrl = `${window.location.origin}/api/channels/${channel.id}`;
    navigator.clipboard.writeText(channelUrl).then(
      () => showToast(`Copied ${channel.display_name} URL to clipboard`),
      () => showToast('Failed to copy to clipboard')
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      handleFilterChange({ page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const retryBackendConnection = () => {
    setRetryingBackend(true);
    loadMetadata();
    loadChannels();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--accent)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1.25rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 100,
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <Check size={16} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => navigateTab(tab)}
        favoritesCount={favorites.length}
        isBackendHealthy={isBackendHealthy}
        onOpenPlaylistBuilder={() => navigateTab('playlist')}
      />

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem', flex: 1 }}>
        {/* Offline Banner if Termux backend is disconnected */}
        {isBackendHealthy === false && (
          <OfflineBanner onRetry={retryBackendConnection} isRetrying={retryingBackend} />
        )}

        {/* Tab 1: DISCOVER (Homepage) */}
        {currentTab === 'discover' && (
          <div>
            <SearchHero
              searchQuery={filters.search || ''}
              onSearchChange={(search) => {
                handleFilterChange({ search });
              }}
              onSubmitSearch={(search) => {
                navigateTab('channels', { search, page: 1 });
              }}
              onSelectCategoryShortcut={handleSelectCategory}
            />

            {/* Embedded Live TV Player Screen on Homepage */}
            <HomePlayer
              channel={homePlayerChannel}
              channels={channels}
              loading={loadingHomePlayer || (loadingChannels && !homePlayerChannel)}
              onSelectChannel={handleTuneHomePlayer}
              onNextChannel={handleNextHomeChannel}
              onPreviousChannel={handlePreviousHomeChannel}
              hasNextChannel={hasHomeNextChannel}
              hasPreviousChannel={hasHomePreviousChannel}
              isFavorite={homePlayerChannel ? isFavorite(homePlayerChannel.id) : false}
              onToggleFavorite={handleToggleFavoriteChannel}
              onOpenReportModal={(name) => {
                if (homePlayerChannel) {
                  setReportChannelName(name);
                  setReportChannelId(homePlayerChannel.id);
                  setReportStreamUrl(homePlayerChannel.streams[0]?.stream_url);
                  setReportModalOpen(true);
                }
              }}
            />

            <StatsSummary stats={stats} loading={loadingMeta} />

            <CategoryGrid categories={categories} onSelectCategory={handleSelectCategory} />

            {/* Featured / Directory Preview */}
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recently Verified Channels</h3>
                <button
                  onClick={() => navigateTab('channels')}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--accent)',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View All Channels &rarr;
                </button>
              </div>

              {loadingChannels ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonCard key={i} viewMode="grid" />
                  ))}
                </div>
              ) : channels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <p>No channels currently available.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {channels.slice(0, 8).map((channel) => (
                    <ChannelCard
                      key={channel.id}
                      channel={channel}
                      isFavorite={isFavorite(channel.id)}
                      onToggleFavorite={handleToggleFavoriteChannel}
                      onPlay={handlePlayChannel}
                      onCopyUrl={handleCopyChannelUrl}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: CHANNELS (Full Directory & Filters) */}
        {currentTab === 'channels' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Channels Directory
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Filter by topic, country origin, and verified technical health status.
              </p>
            </div>

            <FilterBar
              filters={filters}
              categories={categories}
              countries={countries}
              viewMode={viewMode}
              totalChannels={totalChannels}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onViewModeChange={handleViewModeChange}
              onShareView={handleShareView}
            />

            {/* Channels Grid / List */}
            {loadingChannels ? (
              <div
                style={{
                  display: viewMode === 'grid' ? 'grid' : 'flex',
                  gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : undefined,
                  flexDirection: viewMode === 'list' ? 'column' : undefined,
                  gap: '1rem',
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <SkeletonCard key={i} viewMode={viewMode} />
                ))}
              </div>
            ) : channels.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px dashed var(--border)',
                  borderRadius: '0.75rem',
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                }}
              >
                <AlertCircle size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem', opacity: 0.7 }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  No channels match your filters
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
                  Try relaxing your search terms or clearing active category and country filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--accent)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {channels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isFavorite={isFavorite(channel.id)}
                    onToggleFavorite={handleToggleFavoriteChannel}
                    onPlay={handlePlayChannel}
                    onCopyUrl={handleCopyChannelUrl}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {channels.map((channel) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    isFavorite={isFavorite(channel.id)}
                    onToggleFavorite={handleToggleFavoriteChannel}
                    onPlay={handlePlayChannel}
                    onCopyUrl={handleCopyChannelUrl}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginTop: '2.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={(filters.page || 1) <= 1}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Page <strong>{filters.page || 1}</strong> of <strong>{totalPages}</strong>
                </span>

                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={(filters.page || 1) >= totalPages}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: CATEGORIES */}
        {currentTab === 'categories' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                All Categories
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Select any category to explore its Free-To-Air channels.
              </p>
            </div>
            <CategoryGrid categories={categories} onSelectCategory={handleSelectCategory} />
          </div>
        )}

        {/* Tab 4: COUNTRIES */}
        {currentTab === 'countries' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Channels by Country
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Discover regional broadcasts and international news by country origin.
              </p>
            </div>
            <CountryGrid countries={countries} onSelectCountry={handleSelectCountry} />
          </div>
        )}

        {/* Tab 5: PLAYLIST BUILDER (Phase 9) */}
        {currentTab === 'playlist' && (
          <PlaylistBuilder
            categories={categories}
            countries={countries}
            favorites={favorites}
            totalChannels={totalChannels}
          />
        )}

        {/* Tab 6: FAVORITES */}
        {currentTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            recentlyWatched={recentlyWatched}
            onRemoveFavorite={handleRemoveFavoriteById}
            onPlay={handlePlayChannel}
            onCopyUrl={handleCopyChannelUrl}
            onBrowseChannels={() => navigateTab('channels')}
          />
        )}

        {/* Tab 6: ABOUT & SOURCES */}
        {currentTab === 'about' && (
          <AboutView
            sources={sources}
            onOpenReportModal={() => {
              setReportChannelName('');
              setReportChannelId(undefined);
              setReportStreamUrl(undefined);
              setReportModalOpen(true);
            }}
            onSelectSource={(sourceId) => setActiveSourceDetailId(sourceId)}
          />
        )}
      </main>

      {/* Full Browser Player (Phase 8) */}
      {activePlayerChannel && (
        <PlayerView
          channel={activePlayerChannel}
          onClose={() => setActivePlayerChannel(null)}
          onNextChannel={handleNextChannel}
          onPreviousChannel={handlePreviousChannel}
          hasNextChannel={hasNextChannel}
          hasPreviousChannel={hasPreviousChannel}
          isFavorite={isFavorite(activePlayerChannel.id)}
          onToggleFavorite={handleToggleFavoriteChannel}
          onOpenReportModal={(name) => {
            setReportChannelName(name);
            setReportChannelId(activePlayerChannel.id);
            setReportStreamUrl(activePlayerChannel.streams[0]?.stream_url);
            setReportModalOpen(true);
          }}
        />
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        channelName={reportChannelName}
        channelId={reportChannelId}
        streamUrl={reportStreamUrl}
      />

      {/* Source Detail Modal (Phase 10) */}
      <SourceDetailModal
        sourceId={activeSourceDetailId}
        isOpen={Boolean(activeSourceDetailId)}
        onClose={() => setActiveSourceDetailId(null)}
        onFilterBySource={(sourceId) => {
          handleFilterChange({ sourceId, page: 1 });
          navigateTab('channels');
        }}
        onPlayChannel={handlePlayChannel}
      />

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
          padding: '2rem 1rem',
          marginTop: 'auto',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p>
            <strong>TelePlay</strong> — Free-To-Air Public IPTV Directory & Discovery Engine.
          </p>
          <p>
            Direct browser streaming with verified source provenance. No commercial feeds, no video proxying.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => navigateTab('about')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8125rem' }}
            >
              Approved Sources
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setReportChannelName('');
                setReportChannelId(undefined);
                setReportStreamUrl(undefined);
                setReportModalOpen(true);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8125rem' }}
            >
              Report Broken Link
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
