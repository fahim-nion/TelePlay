import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Standard HTTP security headers tailored for an embedded API backend.
 * Enforces strict MIME sniffing protection, clickjacking prevention, and framing denial.
 */
export async function registerSecurityHeaders(app: FastifyInstance) {
  app.addHook('onSend', async (_req: FastifyRequest, reply: FastifyReply) => {
    // Prevent MIME-sniffing
    reply.header('X-Content-Type-Options', 'nosniff');

    // Prevent framing / clickjacking
    reply.header('X-Frame-Options', 'DENY');

    // Strict referrer privacy
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict permissions
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // Defense-in-depth API Content Security Policy
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  });
}

