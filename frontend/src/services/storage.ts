import { Channel, FavoriteChannel, ViewMode } from '../types';

const FAVORITES_KEY = 'teleplay_favorites';
const RECENT_KEY = 'teleplay_recently_watched';
const VIEW_MODE_KEY = 'teleplay_view_mode';

export function getFavorites(): FavoriteChannel[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavorite(channelId: number): boolean {
  const favorites = getFavorites();
  return favorites.some((f) => f.id === channelId);
}

export function toggleFavorite(channel: Channel): boolean {
  const favorites = getFavorites();
  const index = favorites.findIndex((f) => f.id === channel.id);
  let isNowFavorite = false;

  if (index >= 0) {
    favorites.splice(index, 1);
    isNowFavorite = false;
  } else {
    favorites.unshift({
      id: channel.id,
      name: channel.display_name,
      category: channel.category,
      country: channel.country,
      logo_url: channel.logo_url,
      health_status: channel.health_status,
      last_checked_at: channel.last_checked_at,
      stream_count: channel.stream_count,
      saved_at: new Date().toISOString(),
    });
    isNowFavorite = true;
  }

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error('Failed to save favorite:', err);
  }

  return isNowFavorite;
}

export function removeFavorite(channelId: number): void {
  const favorites = getFavorites().filter((f) => f.id !== channelId);
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error('Failed to update favorites:', err);
  }
}

export function getRecentlyWatched(): FavoriteChannel[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyWatched(channel: Channel): void {
  try {
    let recent = getRecentlyWatched().filter((r) => r.id !== channel.id);
    recent.unshift({
      id: channel.id,
      name: channel.display_name,
      category: channel.category,
      country: channel.country,
      logo_url: channel.logo_url,
      health_status: channel.health_status,
      last_checked_at: channel.last_checked_at,
      stream_count: channel.stream_count,
      saved_at: new Date().toISOString(),
    });
    // Keep max 20 entries
    recent = recent.slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch (err) {
    console.error('Failed to record recently watched:', err);
  }
}

export function getViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export function setViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // Ignore
  }
}
