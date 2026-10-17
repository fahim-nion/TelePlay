import { ExportChannelItem, PlaylistExportOptions } from './types.js';

/**
 * Sanitizes attribute values by replacing double quotes and stripping newlines
 * to prevent M3U injection and format corruption.
 */
function sanitizeAttr(val: string | null | undefined): string {
  if (!val) return '';
  return val.replace(/[\r\n]+/g, ' ').replace(/"/g, "'").trim();
}

/**
 * Sanitizes channel title by stripping carriage returns and newlines.
 */
function sanitizeTitle(title: string): string {
  return title.replace(/[\r\n]+/g, ' ').trim() || 'Untitled Channel';
}

/**
 * Generates a standard UTF-8 M3U playlist from a list of channel items.
 * Strictly conforms to #EXTM3U and #EXTINF IPTV specifications.
 */
export function generateM3U(
  channels: ExportChannelItem[],
  options: PlaylistExportOptions = {}
): string {
  const lines: string[] = ['#EXTM3U'];

  for (const channel of channels) {
    if (!channel.streams || channel.streams.length === 0) {
      continue;
    }

    const streamsToExport = options.includeAllStreams
      ? channel.streams
      : [channel.streams[0]];

    streamsToExport.forEach((stream, idx) => {
      if (!stream.streamUrl || !stream.streamUrl.trim()) return;

      const attrs: string[] = [];

      if (channel.tvgId) {
        attrs.push(`tvg-id="${sanitizeAttr(channel.tvgId)}"`);
      }

      attrs.push(`tvg-name="${sanitizeAttr(channel.displayName)}"`);

      if (channel.logoUrl) {
        attrs.push(`tvg-logo="${sanitizeAttr(channel.logoUrl)}"`);
      }

      if (channel.category) {
        attrs.push(`group-title="${sanitizeAttr(channel.category)}"`);
      }

      if (channel.country) {
        attrs.push(`tvg-country="${sanitizeAttr(channel.country)}"`);
      }

      if (channel.language) {
        attrs.push(`tvg-language="${sanitizeAttr(channel.language)}"`);
      }

      const streamSuffix = streamsToExport.length > 1 ? ` (Stream ${idx + 1})` : '';
      const title = sanitizeTitle(channel.displayName + streamSuffix);
      const extinf = `#EXTINF:-1 ${attrs.join(' ')},${title}`;

      lines.push(extinf);
      lines.push(stream.streamUrl.trim());
    });
  }

  return lines.join('\n') + '\n';
}

