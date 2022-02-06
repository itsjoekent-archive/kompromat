import { Request } from 'express';
import LRU from 'lru-cache';
import ms from 'ms';

const blockedIps = new LRU<string, number>({ max: 1000, maxAge: ms('1 week') });

function getIp(request: Request): string {
  return (request.headers['x-forwarded-for'] || request.socket.remoteAddress || '').toString();
}

export function isBlocked(request: Request): boolean {
  const ip = getIp(request);
  return (blockedIps.get(ip) || 0) > 6;
}

export function failedLoginAttempt(request: Request): void {
  const ip = getIp(request);
  const fails = blockedIps.peek(ip) || 0;

  blockedIps.set(ip, fails + 1);
}

export function reset() {
  blockedIps.reset();
}

export interface FirewallPlugin {
  isBlocked: (request: Request) => boolean;
  failedLoginAttempt: (request: Request) => void;
  reset: () => void;
}

const firewall: FirewallPlugin = {
  isBlocked,
  failedLoginAttempt,
  reset,
};

export default firewall;
