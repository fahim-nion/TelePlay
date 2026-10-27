import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
  Star,
  Copy,
  Terminal,
  Layers,
  Globe,
  Check,
  Flag,
  AlertTriangle,
} from 'lucide-react';
import { ChannelDetail, StreamSource, Channel } from '../types';
import { StatusBadge } from './StatusBadge';
import { getChannelInitials } from '../utils/time';
import { diagnosePlaybackError, PlayerDiagnostic } from '../utils/player-errors';

interface PlayerViewProps {
  channel: ChannelDetail;
  onClose: () => void;
  onNextChannel?: () => void;
  onPreviousChannel?: () => void;
  hasNextChannel?: boolean;
  hasPreviousChannel?: boolean;
  isFavorite: boolean;
  onToggleFavorite: (channel: Channel) => void;
  onOpenReportModal?: (channelName: string) => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  channel,
  onClose,
  onNextChannel,
  onPreviousChannel,
  hasNextChannel = false,
  hasPreviousChannel = false,
  isFavorite,
  onToggleFavorite,
  onOpenReportModal,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Stream selection state
  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(0);
  const currentStream: StreamSource | undefined = channel.streams[selectedStreamIndex] || channel.streams[0];

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
  const [playbackState, setPlaybackState] = useState<'loading' | 'playing' | 'paused' | 'error'>('loading');
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

  const showToast = (msg: string) => {
    setCopiedNote(msg);
    setTimeout(() => {
      setCopiedNote((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  // Teardown and initialize stream playback (only when stream URL changes)
  const initPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !currentStream) {
      setPlaybackState('error');
      setErrorDiagnostic(diagnosePlaybackError('', 'No stream source available'));
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
        // Attempt playback with fallback to muted autoplay
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
        reason: 'Your browser environment does not support MediaSource Extensions (MSE) or native HLS.',
        advice: 'Please use a modern Chromium, Firefox, or Safari browser, or open in VLC.',
        isExternalPlayerRecommended: true,
      });
    }
  }, [currentStream?.stream_url]);

  useEffect(() => {
    initPlayback();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [initPlayback]);

  // Handle Fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      } else if (e.key === 'ArrowRight' && hasNextChannel && onNextChannel) {
        onNextChannel();
      } else if (e.key === 'ArrowLeft' && hasPreviousChannel && onPreviousChannel) {
        onPreviousChannel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setPlaybackState('playing');
      }).catch((err) => {
        console.warn('Play error:', err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
      setPlaybackState('paused');
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem('teleplay_muted', String(nextMuted));
    } catch {
      // Ignore
    }
  };

  const handleVolumeChange = (newVol: number) => {
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
      // Ignore
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => showToast(`Copied ${label} to clipboard`),
      () => showToast('Failed to copy to clipboard')
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(2, 6, 23, 0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Toast Notification */}
      {copiedNote && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--accent)',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
            zIndex: 100,
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Check size={14} style={{ color: 'var(--accent)' }} />
          <span>{copiedNote}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
          {/* Channel Logo */}
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {channel.logo_url && !imageError ? (
              <img
                src={channel.logo_url}
                alt={channel.display_name}
                onError={() => setImageError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span>{getChannelInitials(channel.display_name)}</span>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {channel.display_name}
              </h2>
              <button
                onClick={() => onToggleFavorite(channel)}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isFavorite ? '#eab308' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Star size={16} fill={isFavorite ? '#eab308' : 'none'} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{channel.category}</span>
              {channel.country && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Globe size={11} /> {channel.country}
                </span>
              )}
              {currentStream && (
                <StatusBadge status={currentStream.health_status} lastCheckedAt={currentStream.last_checked_at} compact />
              )}
            </div>
          </div>
        </div>

        {/* Top Actions: Prev / Next / Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {onPreviousChannel && (
            <button
              onClick={onPreviousChannel}
              disabled={!hasPreviousChannel}
              title="Previous channel (Left arrow)"
              aria-label="Previous channel"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                padding: '0.45rem',
                cursor: hasPreviousChannel ? 'pointer' : 'not-allowed',
                opacity: hasPreviousChannel ? 1 : 0.4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SkipBack size={16} />
            </button>
          )}

          {onNextChannel && (
            <button
              onClick={onNextChannel}
              disabled={!hasNextChannel}
              title="Next channel (Right arrow)"
              aria-label="Next channel"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                color: 'var(--text-main)',
                padding: '0.45rem',
                cursor: hasNextChannel ? 'pointer' : 'not-allowed',
                opacity: hasNextChannel ? 1 : 0.4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SkipForward size={16} />
            </button>
          )}

          <button
            onClick={onClose}
            title="Close player (Escape)"
            aria-label="Close player"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              color: 'var(--text-main)',
              padding: '0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginLeft: '0.35rem',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '1.25rem 1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Video Canvas Container */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            backgroundColor: '#000000',
            borderRadius: isFullscreen ? 0 : '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="player-viewport"
        >
          <video
            ref={videoRef}
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onClick={togglePlayPause}
          />

          {/* Buffering Spinner */}
          {playbackState === 'loading' && (
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--accent)',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid rgba(34, 211, 238, 0.2)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Connecting to broadcast...</span>
            </div>
          )}

          {/* Error Diagnostics Overlay */}
          {playbackState === 'error' && errorDiagnostic && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.94)',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                zIndex: 20,
              }}
            >
              <AlertTriangle size={38} style={{ color: '#ef4444', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {errorDiagnostic.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#fca5a5', maxWidth: '580px', marginBottom: '0.5rem' }}>
                {errorDiagnostic.reason}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '540px', marginBottom: '1.5rem' }}>
                {errorDiagnostic.advice}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', justifyContent: 'center' }}>
                <button
                  onClick={initPlayback}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: 'var(--accent)',
                    color: '#020617',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Retry Stream</span>
                </button>

                {currentStream && (
                  <button
                    onClick={() => copyToClipboard(currentStream.stream_url, 'Stream URL')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={14} />
                    <span>Copy Stream URL</span>
                  </button>
                )}

                {onOpenReportModal && (
                  <button
                    onClick={() => onOpenReportModal(channel.display_name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      border: '1px dashed rgba(239, 68, 68, 0.4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Flag size={14} />
                    <span>Report Broken</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bottom Player Controls Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent)',
              padding: '1.25rem 1rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              zIndex: 10,
            }}
          >
            {/* Left Controls: Play/Pause, Live Indicator, Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={togglePlayPause}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.2rem',
                }}
              >
                {isPlaying ? <Pause size={22} fill="#ffffff" /> : <Play size={22} fill="#ffffff" />}
              </button>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '0.25rem',
                  userSelect: 'none',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                <span>LIVE</span>
              </div>

              {/* Volume & Mute */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem',
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
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  aria-label="Volume slider"
                  style={{
                    width: '70px',
                    cursor: 'pointer',
                    accentColor: 'var(--accent)',
                  }}
                />
              </div>
            </div>

            {/* Right Controls: Retry, Fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={initPlayback}
                title="Reload stream"
                aria-label="Reload stream"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.2rem',
                }}
              >
                <RotateCcw size={17} />
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.2rem',
                }}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Lower Info & Controls Section */}
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Stream Switcher (when multiple streams exist) */}
          {channel.streams.length > 1 && (
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <Layers size={15} style={{ color: 'var(--accent)' }} />
                <span>Alternative Stream Sources ({channel.streams.length}):</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {channel.streams.map((stream, idx) => {
                  const isSelected = idx === selectedStreamIndex;
                  return (
                    <button
                      key={stream.id}
                      onClick={() => setSelectedStreamIndex(idx)}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-card)',
                        color: isSelected ? '#020617' : 'var(--text-main)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: '0.375rem',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>Stream {idx + 1}</span>
                      {stream.health_status && (
                        <span style={{ fontSize: '0.6875rem', opacity: isSelected ? 0.9 : 0.7 }}>
                          • {stream.health_status}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* External Player Guidance & Direct Command Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} style={{ color: 'var(--accent)' }} />
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  External Player Guidance (Bypass Browser Limits)
                </h4>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Direct broadcaster stream — zero video proxied
              </span>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              If playback stutters, blocks due to CORS, or fails in your browser, open the raw stream URL in an external media player (VLC, mpv, IINA, or PotPlayer):
            </p>

            {currentStream && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.4rem 0.75rem',
                  gap: '0.75rem',
                  fontSize: '0.8125rem',
                  fontFamily: 'monospace',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-muted)',
                  }}
                >
                  vlc "{currentStream.stream_url}"
                </span>
                <button
                  onClick={() => copyToClipboard(`vlc "${currentStream.stream_url}"`, 'VLC command')}
                  title="Copy VLC launch command"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.25rem',
                    color: 'var(--accent)',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    flexShrink: 0,
                  }}
                >
                  <Copy size={12} />
                  <span>Copy CLI</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

