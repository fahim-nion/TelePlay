import { M3UHeader, M3UEntry, ParseWarning, ParsedPlaylist } from './types.js';

/**
 * Parses key-value attributes from an attribute string.
 * Supports: key="value", key='value', and key=value formats.
 * Handles attributes with spaces and escaped characters.
 */
export function parseAttributes(attrString: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (!attrString || attrString.trim().length === 0) {
    return attributes;
  }

  // Regex matching key="value", key='value', or key=unquoted
  const attrRegex = /([a-zA-Z0-9_\-:]+)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const key = match[1].toLowerCase().trim();
    // match[2] is double-quoted, match[3] is single-quoted, match[4] is unquoted
    const value = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    attributes[key] = value;
  }

  return attributes;
}

/**
 * Parses an #EXTINF line into duration, attributes, and channel name.
 * Robustly distinguishes the delimiter comma from commas inside quoted attribute values.
 */
export function parseExtInfLine(line: string): {
  duration: number;
  attributes: Record<string, string>;
  name: string;
} {
  const prefixMatch = line.match(/^#EXTINF:\s*/i);
  const content = prefixMatch ? line.slice(prefixMatch[0].length).trim() : line.trim();

  // Find the comma that separates attributes/duration from the channel title.
  // We must skip any commas enclosed within quotes.
  let commaIndex = -1;
  let insideDoubleQuote = false;
  let insideSingleQuote = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"' && !insideSingleQuote) {
      insideDoubleQuote = !insideDoubleQuote;
    } else if (char === "'" && !insideDoubleQuote) {
      insideSingleQuote = !insideSingleQuote;
    } else if (char === ',' && !insideDoubleQuote && !insideSingleQuote) {
      commaIndex = i;
      break;
    }
  }

  let durationAndAttrs = content;
  let name = '';

  if (commaIndex !== -1) {
    durationAndAttrs = content.substring(0, commaIndex).trim();
    name = content.substring(commaIndex + 1).trim();
  }

  // Parse duration and remaining attributes
  // Duration is the first token (e.g. "-1", "0", "120")
  const spaceIndex = durationAndAttrs.search(/\s/);
  let durationStr = durationAndAttrs;
  let attrStr = '';

  if (spaceIndex !== -1) {
    durationStr = durationAndAttrs.substring(0, spaceIndex).trim();
    attrStr = durationAndAttrs.substring(spaceIndex + 1).trim();
  }

  const parsedDuration = parseFloat(durationStr);
  const duration = Number.isFinite(parsedDuration) ? parsedDuration : -1;
  const attributes = parseAttributes(attrStr);

  return {
    duration,
    attributes,
    name: name || attributes['tvg-name'] || 'Unnamed Channel',
  };
}

/**
 * Pure, deterministic M3U / M3U8 Playlist Parser.
 *
 * Supports:
 * - #EXTM3U with header attributes (e.g., x-tvg-url, url-tvg)
 * - #EXTINF with duration, attributes, and channel names containing commas and Unicode
 * - CRLF (\r\n) and LF (\n) line endings
 * - Intermediary tags (#EXTGRP, #EXTVLCOPT)
 * - Malformed line detection with warnings without throwing
 */
export function parseM3U(content: string): ParsedPlaylist {
  const warnings: ParseWarning[] = [];
  const entries: M3UEntry[] = [];
  let header: M3UHeader | undefined;

  if (!content || content.trim().length === 0) {
    return {
      entries,
      warnings: [{ lineNumber: 1, line: '', message: 'Playlist content is empty' }],
      totalLinesProcessed: 0,
    };
  }

  // Split lines on CRLF or LF
  const lines = content.split(/\r?\n/);
  const totalLines = lines.length;

  let pendingInf: {
    duration: number;
    attributes: Record<string, string>;
    name: string;
    extraTags: string[];
    lineNumber: number;
  } | null = null;

  for (let i = 0; i < totalLines; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const lineNumber = i + 1;

    // Ignore empty lines
    if (line.length === 0) {
      continue;
    }

    // Header line: #EXTM3U
    if (line.startsWith('#EXTM3U')) {
      const headerAttrs = parseAttributes(line.slice(7));
      header = {
        raw: line,
        tvgUrl: headerAttrs['x-tvg-url'] || headerAttrs['url-tvg'],
        attributes: headerAttrs,
      };
      continue;
    }

    // Extended info tag: #EXTINF
    if (line.startsWith('#EXTINF:')) {
      if (pendingInf) {
        warnings.push({
          lineNumber: pendingInf.lineNumber,
          line: lines[pendingInf.lineNumber - 1],
          message: 'Previous #EXTINF entry was missing a stream URL before next #EXTINF',
        });
      }

      const parsed = parseExtInfLine(line);
      pendingInf = {
        duration: parsed.duration,
        attributes: parsed.attributes,
        name: parsed.name,
        extraTags: [],
        lineNumber,
      };
      continue;
    }

    // Other comment or extension tags
    if (line.startsWith('#')) {
      if (pendingInf) {
        pendingInf.extraTags.push(line);

        // If tag is #EXTGRP and group-title wasn't defined in attributes, capture it
        if (line.startsWith('#EXTGRP:') && !pendingInf.attributes['group-title']) {
          pendingInf.attributes['group-title'] = line.slice(8).trim();
        }
      }
      continue;
    }

    // Line is a stream URL
    if (pendingInf) {
      const groupTitle =
        pendingInf.attributes['group-title'] ||
        pendingInf.attributes['grouptitle'] ||
        undefined;

      entries.push({
        name: pendingInf.name,
        url: line,
        duration: pendingInf.duration,
        tvgId: pendingInf.attributes['tvg-id'],
        tvgName: pendingInf.attributes['tvg-name'],
        tvgLogo: pendingInf.attributes['tvg-logo'],
        tvgCountry: pendingInf.attributes['tvg-country'],
        tvgLanguage: pendingInf.attributes['tvg-language'],
        groupTitle,
        rawAttributes: pendingInf.attributes,
        extraTags: pendingInf.extraTags,
        lineNumber: pendingInf.lineNumber,
      });

      pendingInf = null;
    } else {
      // URL found without preceding #EXTINF
      warnings.push({
        lineNumber,
        line,
        message: 'Stream URL encountered without preceding #EXTINF header',
      });
      // Optionally create minimal fallback entry for orphan URL
      entries.push({
        name: line.split('/').pop()?.split('?')[0] || 'Unknown Stream',
        url: line,
        duration: -1,
        rawAttributes: {},
        extraTags: [],
        lineNumber,
      });
    }
  }

  // Trailing #EXTINF with no URL
  if (pendingInf) {
    warnings.push({
      lineNumber: pendingInf.lineNumber,
      line: lines[pendingInf.lineNumber - 1],
      message: 'Trailing #EXTINF at end of file without stream URL',
    });
  }

  return {
    header,
    entries,
    warnings,
    totalLinesProcessed: totalLines,
  };
}
