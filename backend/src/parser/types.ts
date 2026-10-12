/**
 * Types for M3U / M3U8 Playlist Parsing
 */

export interface M3UHeader {
  raw: string;
  tvgUrl?: string;
  attributes: Record<string, string>;
}

export interface M3UEntry {
  name: string;
  url: string;
  duration: number;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  tvgCountry?: string;
  tvgLanguage?: string;
  groupTitle?: string;
  rawAttributes: Record<string, string>;
  extraTags: string[];
  lineNumber: number;
}

export interface ParseWarning {
  lineNumber: number;
  line: string;
  message: string;
}

export interface ParsedPlaylist {
  header?: M3UHeader;
  entries: M3UEntry[];
  warnings: ParseWarning[];
  totalLinesProcessed: number;
}

