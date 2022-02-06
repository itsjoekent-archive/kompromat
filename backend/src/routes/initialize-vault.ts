import { hash } from 'bcrypt';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { AccessCard, RequestHandler, RouteHandlerPlugins } from '../types';
import { encrypt } from '../utils/cryptography';
import { HAS_INITIALIZED, accessCardKey } from '../utils/keys';
import randomBytes from '../utils/randomBytes';

interface VaultBody {
  pin?: string;
}

function initializeVault(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body, headers } = request;
    const { pin }: VaultBody = body;

    if (plugins.firewall.isBlocked(request)) {
      response.status(401).json({ error: 'Cannot initialize vault' });
      return;
    }

    if (!pin || isNaN(parseInt(pin)) || pin.length !== 6) {
      response.status(400).json({ error: 'Invalid vault pin' });
      return;
    }

    const hasInitialized = await plugins.db.get(HAS_INITIALIZED);

    if (hasInitialized) {
      response.status(400).json({ error: 'Vault already initialized' });
      return;
    }

    const id = uuid();

    const secret = await randomBytes(26);
    const vaultKey = await randomBytes(32);

    const encryptionKey = `${secret}${pin}`;

    const key = encrypt(encryptionKey, vaultKey);
    const challenge = encrypt(encryptionKey, 'kompromat');

    const accessCard: AccessCard = {
      id,
      name: 'Default Access Card',
      key,
      challenge,
      createdAt: Date.now(),
    };

    await plugins.db.put(accessCardKey(id), accessCard);
    await plugins.db.put(HAS_INITIALIZED, true);

    response.json({ accessCardId: id, accessCardSecret: secret });
  }

  return routeHandler;
}

export default initializeVault;
