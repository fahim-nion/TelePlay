import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Star,
  Copy,
  Layers,
  Check,
  AlertTriangle,
  Tv,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { ChannelDetail, StreamSource, Channel } from '../types';
import { StatusBadge } from './StatusBadge';
import { getChannelInitials } from '../utils/time';
import { diagnosePlaybackError, PlayerDiagnostic } from '../utils/player-errors';
import { getCountryName, getCountryFlag } from '../utils/countries';

interface HomePlayerProps {
  channel: ChannelDetail | null;
  channels: Channel[];
  loading?: boolean;
  onSelectChannel: (channel: Channel) => void;
  onNextChannel: () => void;
  onPreviousChannel: () => void;
  hasNextChannel: boolean;
  hasPreviousChannel: boolean;
  isFavorite: boolean;
  onToggleFavorite: (channel: Channel) => void;
  onOpenReportModal?: (channelName: string) => void;
}

export const HomePlayer: React.FC<HomePlayerProps> = ({
  channel,
  channels,
  loading = false,
  onSelectChannel,
  onNextChannel,
  onPreviousChannel,
  hasNextChannel,
  hasPreviousChannel,
  isFavorite,
  onToggleFavorite,
  onOpenReportModal,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Stream selection state
  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(0);
  const currentStream: StreamSource | undefined = channel?.streams[selectedStreamIndex] || channel?.streams[0];

  // Playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('teleplay_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('teleplay_volume');
      return saved ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });
  const [playbackState, setPlaybackState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle');
  const [errorDiagnostic, setErrorDiagnostic] = useState<PlayerDiagnostic | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedNote, setCopiedNote] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  // Refs to hold current volume/muted without triggering playback re-init
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Reset stream index when channel changes
  useEffect(() => {
    setSelectedStreamIndex(0);
    setImageError(false);
  }, [channel?.id]);

  const showToast = (msg: string) => {
    setCopiedNote(msg);
    setTimeout(() => {
      setCopiedNote((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  // Teardown and initialize stream playback (only when channel or stream URL changes)
  const initPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !currentStream) {
      if (!channel) {
        setPlaybackState('idle');
      } else {
        setPlaybackState('error');
        setErrorDiagnostic(diagnosePlaybackError('', 'No stream source available for this channel'));
      }
      return;
    }

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    video.removeAttribute('src');
    video.load();

    setPlaybackState('loading');
    setErrorDiagnostic(null);

    video.volume = volumeRef.current;
    video.muted = isMutedRef.current;

    const streamUrl = currentStream.stream_url;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Attempt unmuted play first; fall back to muted autoplay if browser blocks audio
        video.play().then(() => {
          setIsPlaying(true);
          setPlaybackState('playing');
        }).catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => {
            setIsPlaying(true);
            setPlaybackState('playing');
          }).catch(() => {
            setIsPlaying(false);
            setPlaybackState('paused');
          });
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.destroy();
              setPlaybackState('error');
              setErrorDiagnostic(diagnosePlaybackError(streamUrl, data.details));
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setPlaybackState('error');
              setErrorDiagnostic(diagnosePlaybackError(streamUrl, data.details));
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS for Safari and iOS WebKit
      video.src = streamUrl;
      const onLoaded = () => {
        video.play().then(() => {
          setIsPlaying(true);
          setPlaybackState('playing');
        }).catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => setPlaybackState('paused'));
        });
      };
      const onError = () => {
        setPlaybackState('error');
        setErrorDiagnostic(diagnosePlaybackError(streamUrl, 'Safari native playback error'));
      };

      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
    } else {
      setPlaybackState('error');
      setErrorDiagnostic({
        title: 'Browser Does Not Support HLS Playback',
        reason: 'Your browser does not support MediaSource Extensions (MSE) or native HLS.',
        advice: 'Please use a modern Chromium, Firefox, or Safari browser, or open the stream in VLC.',
        isExternalPlayerRecommended: true,
      });
    }
  }, [channel?.id, currentStream?.stream_url]);

  useEffect(() => {
    initPlayback();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initPlayback]);

  // Video event handlers
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setPlaybackState('playing');
      }).catch((err) => {
        console.warn('Playback resume failed:', err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
      setPlaybackState('paused');
    }
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem('teleplay_muted', String(nextMuted));
    } catch {
      // Ignore storage errors
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
    try {
      localStorage.setItem('teleplay_volume', String(newVol));
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        // Fallback to video element fullscreen on iOS Safari
        const video = videoRef.current as any;
        if (video?.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  const handleCopyStreamUrl = () => {
    if (!currentStream) return;
    navigator.clipboard.writeText(currentStream.stream_url).then(
      () => showToast('Copied direct stream URL to clipboard'),
      () => showToast('Failed to copy stream URL')
    );
  };

  // Keyboard shortcuts when focusing player
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      handlePlayPause();
    } else if (e.key === 'm') {
      e.preventDefault();
      handleToggleMute();
    } else if (e.key === 'f') {
      e.preventDefault();
      handleToggleFullscreen();
    } else if (e.key === 'ArrowRight' && hasNextChannel) {
      e.preventDefault();
      onNextChannel();
    } else if (e.key === 'ArrowLeft' && hasPreviousChannel) {
      e.preventDefault();
      onPreviousChannel();
    }
  };

  if (!channel && loading) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '1rem',
          padding: '2rem 1rem',
          textAlign: 'center',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
          <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
          <span>Loading live player...</span>
        </div>
      </div>
    );
  }

  const countryName = channel?.country ? getCountryName(channel.country) : null;
  const countryFlag = channel?.country ? getCountryFlag(channel.country) : null;

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="home-player-card"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 12px 36px -8px rgba(0, 0, 0, 0.6)',
        marginBottom: '2.25rem',
        outline: 'none',
        position: 'relative',
      }}
    >
      {/* Toast Alert Banner */}
      {copiedNote && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 30,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          }}
        >
          <Check size={14} />
          <span>{copiedNote}</span>
        </div>
      )}

      {/* Player Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        {/* Left: Channel Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          {channel?.logo_url && !imageError ? (
            <img
              src={channel.logo_url}
              alt={channel.display_name}
              onError={() => setImageError(true)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                objectFit: 'contain',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '2px',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: 'var(--accent)',
                flexShrink: 0,
              }}
            >
              {channel ? getChannelInitials(channel.display_name) : 'TV'}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0,
                }}
              >
                {channel?.display_name || 'Select a Channel'}
              </h3>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '9999px',
                  padding: '0.15rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#10b981',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                <span
                  className="animate-pulse"
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
                LIVE
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {countryName && (
                <span>
                  {countryFlag} {countryName}
                </span>
              )}
              {countryName && <span>•</span>}
              <span>{channel?.category || 'General'}</span>
              {channel?.streams && channel.streams.length > 1 && (
                <>
                  <span>•</span>
                  <span style={{ color: 'var(--accent)' }}>
                    {channel.streams.length} Stream Options
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {channel && (
            <button
              onClick={() => onToggleFavorite(channel)}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle favorite"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                color: isFavorite ? '#fbbf24' : 'var(--text-muted)',
                padding: '0.4rem 0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
              }}
            >
              <Star size={15} fill={isFavorite ? '#fbbf24' : 'none'} />
              <span className="player-btn-label">{isFavorite ? 'Starred' : 'Favorite'}</span>
            </button>
          )}

          {currentStream && (
            <button
              onClick={handleCopyStreamUrl}
              title="Copy M3U8 stream link to play in VLC / PotPlayer"
              aria-label="Copy stream link"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                color: 'var(--text-muted)',
                padding: '0.4rem 0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
              }}
            >
              <Copy size={15} />
              <span className="player-btn-label">Copy Stream</span>
            </button>
          )}

          {channel && onOpenReportModal && (
            <button
              onClick={() => onOpenReportModal(channel.display_name)}
              title="Report broken or dead stream"
              aria-label="Report broken stream"
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                color: 'var(--text-muted)',
                padding: '0.4rem 0.6rem',
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.8rem',
              }}
            >
              <AlertTriangle size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport (16:9 Aspect Ratio) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#000',
          aspectRatio: '16 / 9',
          maxHeight: '620px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
          }}
          onClick={handlePlayPause}
        />

        {/* Buffering Spinner */}
        {playbackState === 'loading' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              zIndex: 10,
            }}
          >
            <div
              className="animate-spin"
              style={{
                width: '42px',
                height: '42px',
                border: '4px solid rgba(255, 255, 255, 0.2)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
              }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
              Connecting to live broadcast...
            </span>
          </div>
        )}

        {/* Paused Overlay with Play Button */}
        {playbackState === 'paused' && (
          <div
            onClick={handlePlayPause}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px var(--accent-glow)',
                transform: 'scale(1)',
                transition: 'transform 0.15s ease',
              }}
            >
              <Play size={28} style={{ marginLeft: '4px' }} />
            </div>
          </div>
        )}

        {/* Error Diagnostic Overlay */}
        {playbackState === 'error' && errorDiagnostic && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(10, 15, 25, 0.94)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              textAlign: 'center',
              zIndex: 20,
            }}
          >
            <AlertTriangle size={36} style={{ color: '#ef4444', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
              {errorDiagnostic.title}
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '440px', marginBottom: '0.75rem' }}>
              {errorDiagnostic.reason}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {channel?.streams && channel.streams.length > 1 && (
                <button
                  onClick={() => {
                    const nextIndex = (selectedStreamIndex + 1) % channel.streams.length;
                    setSelectedStreamIndex(nextIndex);
                  }}
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Try Alternate Stream ({((selectedStreamIndex + 1) % channel.streams.length) + 1}/{channel.streams.length})
                </button>
              )}
              {hasNextChannel && (
                <button
                  onClick={onNextChannel}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.375rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                  }}
                >
                  Next Channel &rarr;
                </button>
              )}
              {currentStream && (
                <button
                  onClick={handleCopyStreamUrl}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    borderRadius: '0.375rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Copy Stream for VLC</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {/* Left: Playback & Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={onPreviousChannel}
            disabled={!hasPreviousChannel}
            title="Previous Channel"
            aria-label="Previous channel"
            style={{
              background: 'transparent',
              border: 'none',
              color: hasPreviousChannel ? 'var(--text-main)' : 'var(--text-subtle)',
              cursor: hasPreviousChannel ? 'pointer' : 'not-allowed',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause broadcast' : 'Play broadcast'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              backgroundColor: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 12px var(--accent-glow)',
            }}
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={onNextChannel}
            disabled={!hasNextChannel}
            title="Next Channel"
            aria-label="Next channel"
            style={{
              background: 'transparent',
              border: 'none',
              color: hasNextChannel ? 'var(--text-main)' : 'var(--text-subtle)',
              cursor: hasNextChannel ? 'pointer' : 'not-allowed',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SkipForward size={18} />
          </button>

          {/* Volume / Mute Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.35rem' }}>
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              aria-label="Toggle mute"
              style={{
                background: 'transparent',
                border: 'none',
                color: isMuted ? '#ef4444' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              aria-label="Volume slider"
              style={{
                width: '65px',
                accentColor: 'var(--accent)',
                cursor: 'pointer',
              }}
              className="player-volume-slider"
            />
          </div>
        </div>

        {/* Center / Right: Multi-stream selector pills & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {channel?.streams && channel.streams.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Layers size={13} style={{ color: 'var(--text-muted)' }} />
              {channel.streams.map((stream, idx) => (
                <button
                  key={stream.id || idx}
                  onClick={() => setSelectedStreamIndex(idx)}
                  style={{
                    backgroundColor: selectedStreamIndex === idx ? 'var(--accent)' : 'var(--bg-card)',
                    color: selectedStreamIndex === idx ? '#000' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.25rem',
                    padding: '0.2rem 0.45rem',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                  }}
                >
                  Stream {idx + 1}
                </button>
              ))}
            </div>
          )}

          {channel?.health_status && (
            <StatusBadge status={channel.health_status} lastChecked={channel.last_checked_at} />
          )}

          <button
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen (f)"
            aria-label="Toggle fullscreen"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {/* Quick Channel Surf Strip (Horizontal Carousel of Working Channels) */}
      {channels.length > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-card)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <Radio size={14} style={{ color: 'var(--accent)' }} />
              <span>Quick Channel Surf ({channels.length} Verified Channels)</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              Click any channel to tune in
            </span>
          </div>

          <div
            className="channel-surf-strip"
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.35rem',
              scrollbarWidth: 'thin',
            }}
          >
            {channels.slice(0, 16).map((c) => {
              const isSelected = channel?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectChannel(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: isSelected ? 'var(--bg-secondary)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    padding: '0.4rem 0.65rem',
                    color: isSelected ? 'var(--accent)' : 'var(--text-main)',
                    fontSize: '0.775rem',
                    fontWeight: isSelected ? 700 : 500,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 12px var(--accent-glow)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Tv size={13} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <span>{c.display_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
