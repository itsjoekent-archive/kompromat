import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { AccessCard, RequestHandler, RouteHandlerPlugins } from '../types';
import { encrypt } from '../utils/cryptography';
import { accessCardKey } from '../utils/keys';
import randomBytes from '../utils/randomBytes';
import validateAuthHeader from '../utils/validateAuthHeader';

interface AccessCardBody {
  name?: string;
}

interface RequestParams {
  id?: string;
}

function updateAccessCard(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body, params } = request;
    const { name }: AccessCardBody = body;
    const { id }: RequestParams = params;

    if (!id) {
      response.status(500).json({ error: 'Missing access card id' });
      return;
    }

    if (!name || typeof name !== 'string' || name.length > 64) {
      response.status(400).json({ error: 'Invalid access card name' });
      return;
    }

    const vaultKey = await validateAuthHeader(plugins, request);

    if (!vaultKey) {
      response.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const accessCard = await plugins.db.get(accessCardKey(id)) as AccessCard;
    if (!accessCard) {
      response.status(404).json({ error: 'Access card not found' });
      return;
    }

    const updatedAccessCard: AccessCard = { ...accessCard, name };
    await plugins.db.put(accessCardKey(id), updatedAccessCard);

    response.json({ accessCard: { id, name } });
  }

  return routeHandler;
}

export default updateAccessCard;
