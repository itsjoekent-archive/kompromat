import getValue from 'get-value';
import unsetValue from 'unset-value';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { AccessCard, RequestHandler, RouteHandlerPlugins, Token } from '../types';
import { decrypt } from '../utils/cryptography';
import { accessCardsKey, accessCardKey, tokensKey, tokenKey } from '../utils/keys';
import randomBytes from '../utils/randomBytes';
import validateAuthHeader from '../utils/validateAuthHeader';

interface AccessCardBody {
  accessCardSecret?: string;
  pin?: string;
}

interface RequestParams {
  id?: string;
}

interface AccessCardsContainer {
  [key: string]: AccessCard;
}

interface TokensContainer {
  [key: string]: Token;
}

function revokeAccessCard(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body, params } = request;
    const { accessCardSecret, pin }: AccessCardBody = body;
    const { id }: RequestParams = params;

    if (!accessCardSecret) {
      response.status(400).json({ error: 'Missing access card secret' });
      return;
    }

    if (!id) {
      response.status(500).json({ error: 'Missing access card id' });
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

    const accessCard = await plugins.db.get(accessCardKey(id)) as AccessCard;
    if (!accessCard) {
      response.status(404).json({ error: 'Access card not found' });
      return;
    }

    const allAccessCards = await plugins.db.get(accessCardsKey) as AccessCardsContainer;
    if (!allAccessCards || Object.keys(allAccessCards).length < 2) {
      response.status(400).json({ error: 'There must be at least 1 access card configured for the vault' });
      return;
    }

    const tokenId = request.get('x-kompromat-token-id');
    if (!tokenId) {
      response.status(500).json({ error: 'Internal error loading token' });
      return;
    }

    const token = await plugins.db.get(tokenKey(tokenId)) as Token;
    if (!token) {
      response.status(500).json({ error: 'Internal error loading token' });
      return;
    }

    const authenticationAccessCard = await plugins.db.get(accessCardKey(token.createdBy)) as AccessCard;
    if (!authenticationAccessCard) {
      response.status(500).json({ error: 'Internal error loading token' });
      return;
    }

    const encryptionKey = `${accessCardSecret}${pin}`;
    const challenge = decrypt(encryptionKey, authenticationAccessCard.challenge);

    if (challenge !== 'kompromat') {
      response.status(401).json({ error: 'Incorrect pin or access card' });
      return;
    }

    await plugins.db.del(accessCardKey(id));

    await plugins.db.batch((db) => {
      const tokens = getValue(db, tokensKey) as TokensContainer;

      Object.keys(tokens).forEach((tokenId) => {
        if (tokens[tokenId].createdBy === id) {
          unsetValue(db, tokenKey(tokenId));
        }
      });

      return db;
    });

    response.json({ removed: true });
  }

  return routeHandler;
}

export default revokeAccessCard;
