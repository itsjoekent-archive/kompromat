import { Request, Response } from 'express';
import ms from 'ms';
import useragent from 'useragent';
import {
  AccessCard,
  RequestHandler,
  RouteHandlerPlugins,
  Token,
} from '../types';
import { encrypt, decrypt } from '../utils/cryptography';
import { accessCardKey, tokenKey } from '../utils/keys';
import randomBytes from '../utils/randomBytes';
import writeLoginAttempt from '../utils/writeLoginAttempt';

interface Credentials {
  accessCardId?: string;
  accessCardSecret?: string;
  pin?: string;
}

function authenticate(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body } = request;
    const { accessCardId, accessCardSecret, pin }: Credentials = body;

    if (plugins.firewall.isBlocked(request)) {
      response.status(401).json({ error: 'Invalid login credentials' });
      return;
    }

    if (!accessCardId || !accessCardSecret) {
      plugins.firewall.failedLoginAttempt(request);
      response.status(400).json({ error: 'Missing access card id and/or access card secret' });
      return;
    }

    const accessCard = await plugins.db.get(accessCardKey(accessCardId)) as AccessCard;
    if (!accessCard) {
      plugins.firewall.failedLoginAttempt(request);
      response.status(401).json({ error: 'Invalid login credentials' });
      return;
    }

    if (!pin) {
      plugins.firewall.failedLoginAttempt(request);
      response.status(401).json({ error: 'Missing pin' });
      return;
    }

    const decryptionKey = `${accessCardSecret}${pin}`;

    if (decrypt(decryptionKey, accessCard.challenge) !== 'kompromat') {
      plugins.firewall.failedLoginAttempt(request);
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

    const userAgentHeader = request.headers['user-agent'] || '';
    const description = `Login from ${plugins.firewall.getIp(request)} on ${useragent.lookup(userAgentHeader).toString()}`;
    await writeLoginAttempt(description, true, plugins);

    response.json({ tokenId, tokenAccessSecret });
  }

  return routeHandler;
}

export default authenticate;
