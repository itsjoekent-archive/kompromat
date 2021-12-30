import { compare } from 'bcrypt';
import { Request, Response } from 'express';
import ms from 'ms';
import {
  AccessCard,
  RequestHandler,
  RouteHandlerPlugins,
  Token,
} from '../types';
import { accessCardKey, tokenKey } from '../utils/keys';
import randomBytes from '../utils/randomBytes';

interface Credentials {
  accessCardId?: string;
  accessCardSecret?: string;
}

function authenticate(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body } = request;
    const { accessCardId, accessCardSecret }: Credentials = body;

    if (!accessCardId || !accessCardSecret) {
      response.status(400).json({ error: 'Missing access card id and/or access card secret' });
      return;
    }

    const accessCardBuffer = await plugins.db.get(accessCardKey(accessCardId));
    if (!accessCardBuffer) {
      response.status(401).json({ error: 'Invalid login' });
      return;
    }

    const accessCard = JSON.parse(accessCardBuffer.toString());

    const comparison = await compare(accessCardSecret, accessCard.secret);
    if (!comparison) {
      response.status(401).json({ error: 'Invalid login' });
      return;
    }

    const value = await randomBytes(64);

    const token: Token = {
      value,
      expiresAt: Date.now() + ms('5 minutes'),
      createdBy: accessCardId,
    };

    await plugins.db.put(tokenKey(value), JSON.stringify(accessCard));

    response.json({ token });
  }

  return routeHandler;
}

export default authenticate;
