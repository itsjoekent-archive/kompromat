import getValue from 'get-value';
import unsetValue from 'unset-value';
import type { BaseLogger } from 'pino';
import type { DBPlugin } from './db';
import type { TokensContainer } from './types';
import { tokensKey, tokenKey } from './utils/keys';

interface Params {
  logger: BaseLogger;
  db: DBPlugin;
}

export default async function reaper({ logger, db }: Params) {
  logger.info('Running reaper...');

  await db.batch((db) => {
    const tokens = getValue(db, tokensKey) as TokensContainer;

    Object.keys(tokens).forEach((tokenId) => {
      if (tokens[tokenId].expiresAt < Date.now()) {
        unsetValue(db, tokenKey(tokenId));
      }
    });

    return db;
  });
}
