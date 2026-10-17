import React, { useState } from 'react';
import { Tv, Radio, Star, Sparkles, Globe, Info, ListMusic, Menu, X } from 'lucide-react';
import { NavigationTab } from '../types';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  favoritesCount: number;
  isBackendHealthy: boolean | null;
  onOpenPlaylistBuilder?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  favoritesCount,
  isBackendHealthy,
  onOpenPlaylistBuilder,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavigationTab; label: string; icon: React.FC<any>; count?: number }[] = [
    { id: 'discover', label: 'Discover', icon: Sparkles },
    { id: 'channels', label: 'Channels', icon: Tv },
    { id: 'categories', label: 'Categories', icon: Radio },
    { id: 'countries', label: 'Countries', icon: Globe },
    { id: 'playlist', label: 'Build Playlist', icon: ListMusic },
    { id: 'favorites', label: 'Favorites', icon: Star, count: favoritesCount },
    { id: 'about', label: 'About & Sources', icon: Info },
  ];

  const handleTabClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand / Logo */}
        <div
          onClick={() => handleTabClick('discover')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--accent)',
              color: '#020617',
              padding: '0.45rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(34, 211, 238, 0.4)',
            }}
          >
            <Tv size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-main)' }}>
                TelePlay
              </span>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(34, 211, 238, 0.15)',
                  color: 'var(--accent)',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '0.25rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                FTA
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isBackendHealthy === true ? '#10b981' : isBackendHealthy === false ? '#ef4444' : '#f59e0b',
                  display: 'inline-block',
                }}
              />
              <span>{isBackendHealthy === true ? 'Termux Online' : isBackendHealthy === false ? 'Offline (Cached)' : 'Connecting'}</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  borderRadius: '0.375rem',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      backgroundColor: 'rgba(234, 179, 8, 0.2)',
                      color: '#eab308',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right CTA / Mobile menu button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onOpenPlaylistBuilder && (
            <button
              onClick={onOpenPlaylistBuilder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(129, 140, 248, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(129, 140, 248, 0.3)',
                borderRadius: '0.375rem',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              className="builder-btn"
            >
              <ListMusic size={15} />
              <span>Export M3U</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              color: 'var(--text-main)',
              padding: '0.4rem',
              cursor: 'pointer',
            }}
            className="mobile-nav-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '0.75rem 1rem',
          }}
          className="mobile-nav-menu"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.65rem 0.75rem',
                    fontSize: '0.9375rem',
                    fontWeight: isActive ? 600 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: 'rgba(234, 179, 8, 0.2)',
                        color: '#eab308',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px',
                        fontWeight: 700,
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
