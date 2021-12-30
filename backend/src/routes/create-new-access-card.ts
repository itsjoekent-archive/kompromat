import { hash } from 'bcrypt';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { AccessCard, RequestHandler, RouteHandlerPlugins } from '../types';
import { accessCardKey } from '../utils/keys';
import randomBytes from '../utils/randomBytes';

interface AccessCardBody {
  name?: string;
}

function createNewAccessCard(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body } = request;
    const { name }: AccessCardBody = body;

    if (!name || typeof name !== 'string' || name.length > 64) {
      response.status(400).json({ error: 'Invalid access card name' });
      return;
    }

    const id = uuid();
    const newAccessCardKey = accessCardKey(id);

    try {
      const existing = await plugins.db.get(newAccessCardKey);
      if (existing) throw new Error('id in use');
    } catch (error: any) {
      if (!error.notFound) {
        throw error;
      }
    }

    const secretUnsafe = await randomBytes(256);
    const secret = await hash(secretUnsafe, 15);

    const accessCard: AccessCard = {
      id,
      name,
      secret,
      vaults: [],
      createdAt: Date.now(),
    };

    await plugins.db.put(newAccessCardKey, JSON.stringify(accessCard));

    response.json({ ...accessCard, secret: secretUnsafe });
  }

  return routeHandler;
}

export default createNewAccessCard;
