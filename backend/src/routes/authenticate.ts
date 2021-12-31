import { Request, Response } from 'express';
import ms from 'ms';
import {
  AccessCard,
  RequestHandler,
  RouteHandlerPlugins,
  Token,
} from '../types';
import { encrypt, decrypt } from '../utils/cryptography';
import { accessCardKey, tokenKey } from '../utils/keys';
import randomBytes from '../utils/randomBytes';

interface Credentials {
  accessCardId?: string;
  accessCardSecret?: string;
  pin?: string;
}

function authenticate(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body } = request;
    const { accessCardId, accessCardSecret, pin }: Credentials = body;

    if (!accessCardId || !accessCardSecret) {
      response.status(400).json({ error: 'Missing access card id and/or access card secret' });
      return;
    }

    const accessCard = await plugins.db.get(accessCardKey(accessCardId)) as AccessCard;
    if (!accessCard) {
      response.status(401).json({ error: 'Invalid login credentials' });
      return;
    }

    if (!pin) {
      response.status(401).json({ error: 'Missing pin' });
      return;
    }

    const decryptionKey = `${accessCardSecret}${pin}`;

    if (decrypt(decryptionKey, accessCard.challenge) !== 'kompromat') {
      response.status(401).json({ error: 'Invalid login credentials' });
      return;
    }

    const vaultKey = decrypt(decryptionKey, accessCard.key);

    if (!vaultKey) {
      response.status(500).json({ error: 'Unexpected decryption error, try another access caed' });
      return;
    }

    const tokenId = await randomBytes(32);
    const tokenAccessSecret = await randomBytes(32);

    const tokenVaultKey = encrypt(tokenAccessSecret, vaultKey);
    const tokenChallenge = encrypt(tokenAccessSecret, 'kompromat');

    const token: Token = {
      id: tokenId,
      challenge: tokenChallenge,
      vaultKey: tokenVaultKey,
      expiresAt: Date.now() + ms('5 minutes'),
      createdBy: accessCardId,
    };

    await plugins.db.put(tokenKey(tokenId), token);

    response.json({ tokenId, tokenAccessSecret });
  }

  return routeHandler;
}

export default authenticate;
