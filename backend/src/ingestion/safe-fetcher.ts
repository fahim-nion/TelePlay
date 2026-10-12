import { validateUrlSafety } from './ssrf.js';

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  etag?: string;
  lastModified?: string;
}

export interface SafeFetchResult {
  status: number;
  data: string;
  etag?: string;
  lastModified?: string;
  finalUrl: string;
  bytesRead: number;
  isNotModified: boolean;
}

export class SafeFetchError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SafeFetchError';
    this.code = code;
  }
}

/**
 * Executes a secure HTTP/HTTPS fetch with SSRF verification, redirect inspection,
 * strict response byte ceilings, timeouts, and conditional request support.
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024; // 5 MB default for playlists
  const maxRedirects = options.maxRedirects ?? 3;

  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // 1. SSRF Safety check before making connection
    const safety = await validateUrlSafety(currentUrl);
    if (!safety.safe) {
      throw new SafeFetchError(
        `Security check failed for URL "${currentUrl}": ${safety.reason}`,
        'SSRF_BLOCKED'
      );
    }

    // 2. Prepare conditional headers
    const reqHeaders: Record<string, string> = {
      'User-Agent': 'TelePlay/0.1 (IPTV-Discovery-Directory; Termux-Android)',
      Accept: 'application/x-mpegurl, audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*',
      ...options.headers,
    };

    if (options.etag) {
      reqHeaders['If-None-Match'] = options.etag;
    }
    if (options.lastModified) {
      reqHeaders['If-Modified-Since'] = options.lastModified;
    }

    // 3. Setup timeout controller
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        headers: reqHeaders,
        redirect: 'manual', // Strictly manual to intercept and re-verify redirect destinations
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutTimer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new SafeFetchError(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT');
      }
      throw new SafeFetchError(
        `Network error fetching "${currentUrl}": ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR'
      );
    }

    clearTimeout(timeoutTimer);

    // 4. Handle 304 Not Modified
    if (response.status === 304) {
      return {
        status: 304,
        data: '',
        finalUrl: currentUrl,
        bytesRead: 0,
        isNotModified: true,
        etag: response.headers.get('etag') || options.etag,
        lastModified: response.headers.get('last-modified') || options.lastModified,
      };
    }

    // 5. Handle Redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new SafeFetchError(`Redirect status ${response.status} missing Location header`, 'BAD_REDIRECT');
      }

      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new SafeFetchError(`Exceeded maximum redirect limit of ${maxRedirects}`, 'TOO_MANY_REDIRECTS');
      }

      // Resolve relative redirect against current URL
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new SafeFetchError(`Invalid redirect location URL: ${location}`, 'BAD_REDIRECT_URL');
      }

      continue; // Loop to next hop with SSRF validation
    }

    // 6. Handle HTTP errors
    if (!response.ok) {
      throw new SafeFetchError(
        `HTTP error ${response.status} (${response.statusText}) for "${currentUrl}"`,
        `HTTP_${response.status}`
      );
    }

    // 7. Bounded streaming read to protect phone memory
    const body = response.body;
    if (!body) {
      return {
        status: response.status,
        data: '',
        finalUrl: currentUrl,
        bytesRead: 0,
        isNotModified: false,
      };
    }

    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let totalBytes = 0;
    let chunks = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            reader.cancel();
            throw new SafeFetchError(
              `Response size exceeded safe limit of ${maxBytes} bytes (read ${totalBytes} bytes)`,
              'MAX_BYTES_EXCEEDED'
            );
          }
          chunks += decoder.decode(value, { stream: true });
        }
      }
      chunks += decoder.decode(); // Flush remainder
    } catch (err) {
      if (err instanceof SafeFetchError) throw err;
      throw new SafeFetchError(
        `Error reading response stream: ${err instanceof Error ? err.message : String(err)}`,
        'STREAM_READ_ERROR'
      );
    }

    return {
      status: response.status,
      data: chunks,
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined,
      finalUrl: currentUrl,
      bytesRead: totalBytes,
      isNotModified: false,
    };
  }

  throw new SafeFetchError(`Exceeded maximum redirect limit of ${maxRedirects}`, 'TOO_MANY_REDIRECTS');
}

