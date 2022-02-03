import getValue from 'get-value';
import setValue from 'set-value';
import { Request } from 'express';
import { RouteHandlerPlugins, AuthenticationLogEntry } from '../types';
import { authenticationLog, configSettingKey } from '../utils/keys';

const LOG_EXPIRATION = 1000 * 60 * 60 * 24 * 90;

export default async function writeLoginAttempt(
  isSuccessful: boolean,
  plugins: RouteHandlerPlugins,
  request: Request
): Promise<void> {
  const entry: AuthenticationLogEntry = {
    timestamp: Date.now(),
    isSuccessful,
    description: '',
  };

  await plugins.db.batch(async (db: any) => {
    const log = getValue(db, authenticationLog, []) as AuthenticationLogEntry[];
    const updatedLog = [...log, entry].filter((item) => (item.timestamp + LOG_EXPIRATION) > Date.now());

    setValue(db, authenticationLog, updatedLog);

    return db;
  });

  const log = await plugins.db.get(authenticationLog) as AuthenticationLogEntry[];
  // if XX failed attempts over <config limit>, process.exit

}
