export interface PlayerDiagnostic {
  title: string;
  reason: string;
  advice: string;
  isExternalPlayerRecommended: boolean;
}

/**
 * Diagnoses browser playback failures and returns user-friendly, honest explanations.
 * Explains CORS restrictions, mixed content, unsupported broadcast codecs, and network failures.
 */
export function diagnosePlaybackError(
  streamUrl: string,
  errorDetail?: string,
  httpStatus?: number,
  isSecureContext: boolean = typeof window !== 'undefined' && window.location.protocol === 'https:'
): PlayerDiagnostic {
  const isHttpStream = streamUrl.startsWith('http://');

  if (isSecureContext && isHttpStream) {
    return {
      title: 'Mixed Content Blocked by Browser',
      reason: 'This stream uses plain HTTP, which modern browsers automatically block when viewing a secure HTTPS web page.',
      advice: 'Open the stream in an external video player such as VLC or mpv, or use HTTP if accessing a local Termux backend.',
      isExternalPlayerRecommended: true,
    };
  }

  const detailLower = (errorDetail || '').toLowerCase();

  if (detailLower.includes('manifestload') || detailLower.includes('networkerror') || detailLower.includes('cors')) {
    return {
      title: 'Broadcaster CORS Restriction or Network Error',
      reason: 'The broadcaster does not send permissive CORS headers (Access-Control-Allow-Origin), preventing in-browser playback, or the stream server is unreachable.',
      advice: 'Dedicated desktop and mobile players (VLC, mpv, IINA) bypass browser CORS rules and will play this stream directly.',
      isExternalPlayerRecommended: true,
    };
  }

  if (detailLower.includes('buffer') || detailLower.includes('codec') || detailLower.includes('mediaerror') || detailLower.includes('demux')) {
    return {
      title: 'Unsupported Broadcast Codec',
      reason: 'The stream uses an IPTV broadcast codec (such as MPEG-2 video, AC3/Dolby audio, or raw TS encapsulation) that your web browser cannot decode in hardware.',
      advice: 'External players like VLC, mpv, and PotPlayer decode all broadcast audio and video formats natively.',
      isExternalPlayerRecommended: true,
    };
  }

  if (httpStatus === 404 || httpStatus === 410) {
    return {
      title: 'Stream Endpoint Discontinued (HTTP 404)',
      reason: 'The broadcaster discontinued or relocated this specific playlist URL.',
      advice: 'Switch to an alternative stream source if available, or submit a broken-link report.',
      isExternalPlayerRecommended: false,
    };
  }

  return {
    title: 'Stream Playback Interrupted',
    reason: errorDetail || 'The video stream could not be loaded or encountered a playback disruption.',
    advice: 'Try refreshing or opening the stream URL in an external media player.',
    isExternalPlayerRecommended: true,
  };
}

