export type HealthStatus =
  | 'working'
  | 'intermittent'
  | 'unreachable'
  | 'unsupported'
  | 'not_checked'
  | 'stale';

export interface ProbeResult {
  status: HealthStatus;
  httpStatus?: number;
  responseTimeMs: number;
  errorSummary?: string;
  isHlsValid?: boolean;
}

export interface HealthCheckOptions {
  timeoutMs?: number;
  maxBytes?: number;
  checkVariant?: boolean;
}

export interface HealthCheckBatchOptions {
  batchSize?: number;
  timeoutMs?: number;
  maxBytes?: number;
  globalConcurrency?: number;
  staleThresholdHours?: number;
}

export interface BatchRunResult {
  jobId: string;
  totalChecked: number;
  workingCount: number;
  unreachableCount: number;
  unsupportedCount: number;
  durationMs: number;
  checkpointId: number;
}

