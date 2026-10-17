export interface ExportChannelStream {
  streamUrl: string;
  streamType?: string;
  sourceName?: string | null;
  healthStatus?: string | null;
}

export interface ExportChannelItem {
  id: number;
  displayName: string;
  category: string;
  country?: string | null;
  language?: string | null;
  logoUrl?: string | null;
  tvgId?: string | null;
  streams: ExportChannelStream[];
}

export interface PlaylistExportOptions {
  category?: string;
  country?: string;
  healthStatus?: string;
  channelIds?: number[];
  includeAllStreams?: boolean;
}

