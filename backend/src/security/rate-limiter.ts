import { FastifyRequest, FastifyReply } from 'fastify';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: FastifyRequest) => string;
}

interface ClientRecord {
  timestamps: number[];
}

/**
 * Embedded sliding-window rate limiter tailored for low-resource environments (Termux).
 * Operates purely in-memory with automatic cleanup of expired client buckets.
 */
export class SlidingWindowRateLimiter {
  private clients = new Map<string, ClientRecord>();
  private windowMs: number;
  private maxRequests: number;
  private keyGenerator: (req: FastifyRequest) => string;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.keyGenerator = options.keyGenerator || ((req) => req.ip || '127.0.0.1');

    // Run sweep every windowMs to avoid unbounded memory growth
    this.cleanupTimer = setInterval(() => this.cleanup(), Math.max(30000, this.windowMs));
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  public check(req: FastifyRequest): {
    allowed: boolean;
    remaining: number;
    resetSeconds: number;
    total: number;
  } {
    const key = this.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.clients.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.clients.set(key, record);
    }

    // Filter out timestamps outside the active window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const count = record.timestamps.length;
    const oldestTimestamp = record.timestamps[0] || now;
    const resetSeconds = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000);

    if (count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetSeconds: Math.max(1, resetSeconds),
        total: this.maxRequests,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetSeconds: Math.max(1, resetSeconds),
      total: this.maxRequests,
    };
  }

  public cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, record] of this.clients.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.clients.delete(key);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clients.clear();
  }
}

/**
 * Creates a Fastify preHandler hook applying rate limits.
 */
export function createRateLimitHook(options: RateLimiterOptions) {
  const limiter = new SlidingWindowRateLimiter(options);

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const result = limiter.check(req);

    reply.header('RateLimit-Limit', result.total);
    reply.header('RateLimit-Remaining', result.remaining);
    reply.header('RateLimit-Reset', result.resetSeconds);

    if (!result.allowed) {
      reply.header('Retry-After', result.resetSeconds);
      reply.status(429);
      return reply.send({
        error: 'Too Many Requests: Rate limit quota exceeded.',
        statusCode: 429,
        retryAfterSeconds: result.resetSeconds,
      });
    }
  };
}

