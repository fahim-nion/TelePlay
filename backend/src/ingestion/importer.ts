import { getSourceById, ApprovedSource } from './sources.js';
import { safeFetch, SafeFetchOptions } from './safe-fetcher.js';
import { parseM3U } from '../parser/m3u.js';
import { M3UEntry, ParseWarning } from '../parser/types.js';

export interface ImportSummary {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  dryRun: boolean;
  totalParsed: number;
  uniqueUrls: number;
  duplicateUrls: number;
  bytesRead: number;
  categories: Record<string, number>;
  countries: Record<string, number>;
  warningsCount: number;
  warnings: ParseWarning[];
  sampleEntries: M3UEntry[];
  durationMs: number;
}

/**
 * Ingestion Service.
 * Fetches approved playlists safely, parses entries, and produces summaries.
 * Dry-run mode allows inspection without persisting to database.
 */
export async function ingestSource(
  sourceId: string,
  options: {
    dryRun?: boolean;
    fetchOptions?: SafeFetchOptions;
    injectedContent?: string; // For testing without network
  } = {}
): Promise<ImportSummary> {
  const startTime = Date.now();
  const source = getSourceById(sourceId);

  if (!source) {
    throw new Error(`Cannot ingest source "${sourceId}": Not found in approved source registry.`);
  }

  if (!source.enabled) {
    throw new Error(`Cannot ingest source "${sourceId}": Source is disabled in registry.`);
  }

  let rawContent: string;
  let bytesRead = 0;

  if (options.injectedContent !== undefined) {
    rawContent = options.injectedContent;
    bytesRead = Buffer.byteLength(rawContent, 'utf-8');
  } else {
    // Perform safe bounded network fetch
    const fetchRes = await safeFetch(source.url, options.fetchOptions);
    rawContent = fetchRes.data;
    bytesRead = fetchRes.bytesRead;
  }

  // Pure parser processing
  const parsed = parseM3U(rawContent);

  // Compute metrics and duplicates
  const seenUrls = new Set<string>();
  let duplicateUrls = 0;
  const categories: Record<string, number> = {};
  const countries: Record<string, number> = {};

  for (const entry of parsed.entries) {
    if (seenUrls.has(entry.url)) {
      duplicateUrls++;
    } else {
      seenUrls.add(entry.url);
    }

    const category = entry.groupTitle || source.categoryDefault || 'Uncategorized';
    categories[category] = (categories[category] || 0) + 1;

    if (entry.tvgCountry) {
      countries[entry.tvgCountry] = (countries[entry.tvgCountry] || 0) + 1;
    }
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    dryRun: options.dryRun ?? true,
    totalParsed: parsed.entries.length,
    uniqueUrls: seenUrls.size,
    duplicateUrls,
    bytesRead,
    categories,
    countries,
    warningsCount: parsed.warnings.length,
    warnings: parsed.warnings,
    sampleEntries: parsed.entries.slice(0, 5),
    durationMs: Date.now() - startTime,
  };
}

