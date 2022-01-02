import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { AccessCard, RequestHandler, RouteHandlerPlugins } from '../types';
import { encrypt } from '../utils/cryptography';
import { accessCardKey } from '../utils/keys';
import randomBytes from '../utils/randomBytes';
import validateAuthHeader from '../utils/validateAuthHeader';

interface AccessCardBody {
  name?: string;
  pin?: string;
}

function createAccessCard(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body } = request;
    const { name, pin }: AccessCardBody = body;

    if (!name || typeof name !== 'string' || name.length > 64) {
      response.status(400).json({ error: 'Invalid access card name' });
      return;
    }

    if (!pin || isNaN(parseInt(pin)) || pin.length !== 6) {
      response.status(400).json({ error: 'Invalid vault pin' });
      return;
    }

    const vaultKey = await validateAuthHeader(plugins, request);

    if (!vaultKey) {
      response.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = uuid();

    const secret = await randomBytes(26);

    const encryptionKey = `${secret}${pin}`;

    const key = encrypt(encryptionKey, vaultKey);
    const challenge = encrypt(encryptionKey, 'kompromat');

    const accessCard: AccessCard = {
      id,
      name,
      key,
      challenge,
      createdAt: Date.now(),
    };

    await plugins.db.put(accessCardKey(id), accessCard);

    response.json({ accessCard: { id, name, secret } });
  }

  return routeHandler;
}

export default createAccessCard;
