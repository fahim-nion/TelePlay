import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diagnosePlaybackError } from './player-errors.js';

describe('Player Error Diagnostics', () => {
  it('detects mixed content blocks on HTTPS sites loading HTTP streams', () => {
    const diag = diagnosePlaybackError('http://stream.example.com/live.m3u8', undefined, undefined, true);
    assert.equal(diag.title, 'Mixed Content Blocked by Browser');
    assert.equal(diag.isExternalPlayerRecommended, true);
    assert.ok(diag.advice.includes('external video player'));
  });

  it('detects CORS and manifest load failures', () => {
    const diag = diagnosePlaybackError('https://stream.example.com/live.m3u8', 'manifestLoadError: network error', undefined, false);
    assert.equal(diag.title, 'Broadcaster CORS Restriction or Network Error');
    assert.equal(diag.isExternalPlayerRecommended, true);
    assert.ok(diag.reason.includes('CORS'));
  });

  it('detects unsupported codec / buffer append errors', () => {
    const diag = diagnosePlaybackError('https://stream.example.com/live.m3u8', 'bufferAppendingError: audio codec not supported', undefined, false);
    assert.equal(diag.title, 'Unsupported Broadcast Codec');
    assert.equal(diag.isExternalPlayerRecommended, true);
    assert.ok(diag.advice.includes('VLC'));
  });

  it('detects discontinued 404 stream endpoints', () => {
    const diag = diagnosePlaybackError('https://stream.example.com/dead.m3u8', '404 not found', 404, false);
    assert.equal(diag.title, 'Stream Endpoint Discontinued (HTTP 404)');
    assert.equal(diag.isExternalPlayerRecommended, false);
    assert.ok(diag.advice.includes('alternative stream source'));
  });

  it('provides generic fallback diagnostic when error detail is unspecified', () => {
    const diag = diagnosePlaybackError('https://stream.example.com/live.m3u8', undefined, undefined, false);
    assert.equal(diag.title, 'Stream Playback Interrupted');
    assert.equal(diag.isExternalPlayerRecommended, true);
  });
});

