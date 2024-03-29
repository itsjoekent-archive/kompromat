import getValue from 'get-value';
import setValue from 'set-value';
import ms from 'ms';
import { Request } from 'express';
import { RouteHandlerPlugins, AuthenticationLogEntry } from '../types';
import { authenticationLog, configSettingKey } from '../utils/keys';

const LOG_EXPIRATION = ms('2 weeks');

export default async function writeLoginAttempt(
  description: string,
  isSuccessful: boolean,
  plugins: RouteHandlerPlugins,
): Promise<void> {
  const entry: AuthenticationLogEntry = {
    description,
    isSuccessful,
    timestamp: Date.now(),
  };

  await plugins.db.batch(async (db: any) => {
    const log = (getValue(db, authenticationLog) || []) as AuthenticationLogEntry[];
    const updatedLog = [...log, entry]
      .filter((item) => (item.timestamp + LOG_EXPIRATION) > Date.now());

    setValue(db, authenticationLog, updatedLog);
    return db;
  });
}
