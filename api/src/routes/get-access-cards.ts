import { Request, Response } from 'express';
import { AccessCard, RequestHandler, RouteHandlerPlugins } from '../types';
import { decrypt } from '../utils/cryptography';
import { accessCardsKey } from '../utils/keys';
import validateAuthHeader from '../utils/validateAuthHeader';

interface AccessCardsContainer {
  [key: string]: AccessCard;
}

function getAccessCards(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const vaultKey = await validateAuthHeader(plugins, request);

    if (!vaultKey) {
      response.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const accessCards: AccessCardsContainer | null = await plugins.db.get(accessCardsKey);

    if (!accessCards) {
      response.json([]);
      return;
    }

    response.json({
      accessCards: Object.keys(accessCards).map((id: string) => ({
        id,
        name: accessCards[id].name,
      })),
    });
  }

  return routeHandler;
}

export default getAccessCards;
