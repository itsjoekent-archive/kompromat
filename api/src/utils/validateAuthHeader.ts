import { Request } from 'express';
import { AccessCard, RouteHandlerPlugins, Token } from '../types';
import { decrypt } from '../utils/cryptography';
import { accessCardKey, tokenKey } from '../utils/keys';

interface ValidationResult {
  tokenAccessSecret: string;
  vaultKey: string;
}

async function validationLogic(
  plugins: RouteHandlerPlugins,
  request: Request
): Promise<ValidationResult | null> {
  const tokenId = request.get('x-kompromat-token-id');
  if (!tokenId) {
    return null;
  }

  const tokenAccessSecret = request.get('x-kompromat-token-access-secret');
  if (!tokenAccessSecret) {
    return null;
  }

  const token = await plugins.db.get(tokenKey(tokenId)) as Token;
  if (!token) {
    return null;
  }

  if (!token.expiresAt || token.expiresAt < Date.now()) {
    await plugins.db.del(tokenKey(tokenId));
    return null;
  }

  const accessCard = await plugins.db.get(accessCardKey(token.createdBy)) as AccessCard;
  if (!accessCard) {
    return null;
  }

  if (decrypt(tokenAccessSecret, token.challenge) !== 'kompromat') {
    return null;
  }

  return { tokenAccessSecret, vaultKey: token.vaultKey };
}

export default async function validateAuthHeader(
  plugins: RouteHandlerPlugins,
  request: Request
): Promise<string | null> {
  if (plugins.firewall.isBlocked(request)) {
    return null;
  }

  const validationResult = await validationLogic(plugins, request);

  if (!validationResult) {
    plugins.firewall.failedLoginAttempt(request);
    return null;
  }

  const { tokenAccessSecret, vaultKey } = validationResult;
  return decrypt(tokenAccessSecret, vaultKey);
}
