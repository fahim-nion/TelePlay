import dns from 'node:dns/promises';
import net from 'node:net';

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
  resolvedIp?: string;
}

/**
 * Checks if an IPv4 address belongs to a private, loopback, or link-local range.
 */
export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Treat invalid as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local / AWS & Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

/**
 * Checks if an IPv6 address belongs to a loopback, unique local, or link-local range.
 */
export function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // Loopback (::1)
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

  // Unspecified (::)
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;

  // Unique Local Address (fc00::/7 -> fc.. or fd..)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  // Link-Local (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab]/i.test(lower)) return true;

  // IPv4-mapped IPv6 (::ffff:192.0.2.1)
  if (lower.startsWith('::ffff:')) {
    const v4Part = lower.slice(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateIpv4(v4Part);
    }
  }

  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * 1. Restricts protocols strictly to http: and https:
 * 2. Blocks localhost hostnames
 * 3. Resolves DNS and blocks private/loopback/link-local/metadata IP addresses
 */
export async function validateUrlSafety(targetUrl: string): Promise<UrlSafetyResult> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { safe: false, reason: 'Malformed URL format' };
  }

  // 1. Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      safe: false,
      reason: `Forbidden protocol "${parsed.protocol}". Only http: and https: are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject obvious localhost / loopback aliases
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { safe: false, reason: `Forbidden local hostname: ${hostname}` };
  }

  // 3. If hostname is directly an IP address
  if (net.isIPv4(hostname)) {
    if (isPrivateIpv4(hostname)) {
      return { safe: false, reason: `Forbidden private/local IPv4 address: ${hostname}`, resolvedIp: hostname };
    }
    return { safe: true, resolvedIp: hostname };
  }

  if (net.isIPv6(hostname)) {
    if (isPrivateIpv6(hostname)) {
      return { safe: false, reason: `Forbidden private/local IPv6 address: ${hostname}`, resolvedIp: hostname };
    }
    return { safe: true, resolvedIp: hostname };
  }

  // 4. Resolve DNS to verify actual destination IP
  try {
    const lookup = await dns.lookup(hostname);
    const resolvedIp = lookup.address;

    if (lookup.family === 4) {
      if (isPrivateIpv4(resolvedIp)) {
        return {
          safe: false,
          reason: `DNS resolved to forbidden private IPv4 address: ${resolvedIp}`,
          resolvedIp,
        };
      }
    } else if (lookup.family === 6) {
      if (isPrivateIpv6(resolvedIp)) {
        return {
          safe: false,
          reason: `DNS resolved to forbidden private IPv6 address: ${resolvedIp}`,
          resolvedIp,
        };
      }
    }

    return { safe: true, resolvedIp };
  } catch (err) {
    return {
      safe: false,
      reason: `DNS resolution failed for hostname "${hostname}": ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

