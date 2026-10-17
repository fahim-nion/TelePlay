import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';

/**
 * Validates an incoming admin token using constant-time string comparison.
 */
export function verifyAdminToken(providedToken: string | undefined, expectedToken: string): boolean {
  if (!providedToken || !expectedToken) return false;

  const providedBuf = Buffer.from(providedToken);
  const expectedBuf = Buffer.from(expectedToken);

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Fastify preHandler hook ensuring requests have a valid admin credential.
 */
export function createAdminAuthHook(expectedToken: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    // 1. Check x-admin-token header
    let token = req.headers['x-admin-token'] as string | undefined;

    // 2. Fall back to Authorization: Bearer <token>
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token || !verifyAdminToken(token, expectedToken)) {
      reply.status(401);
      return reply.send({
        error: 'Unauthorized: Valid admin token required.',
        statusCode: 401,
      });
    }
  };
}

