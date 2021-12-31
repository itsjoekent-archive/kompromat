import fs from 'fs/promises';
import path from 'path';

import getValue from 'get-value';
import setValue from 'set-value';
import unsetValue from 'unset-value';

const DB_PATH = path.join(process.cwd(), 'kompromat.json');

type Resolver = (value?: any) => void;
const locks: Awaited<Promise<Resolver>>[] = [];

async function waitForLock(): Promise<Resolver> {
  let resolver: Resolver | null = null;
  let lockIndex = -1;
  const lock = new Promise((resolve) => resolver = resolve);

  function release() {
    if (lockIndex > -1) {
      locks.splice(lockIndex, 1);
    }

    if (locks.length) {
      const next = locks.shift();

      if (typeof next === 'function') {
        next();
      }
    }
  }

  if (typeof resolver === 'function') {
    lockIndex = locks.push(resolver) - 1;
  }

  if (locks.length > 1) {
    await lock;
  }

  return release;
}

export async function parseDbFile(): Promise<any> {
  let file = '{}';

  try {
    file = await fs.readFile(DB_PATH, { encoding: 'utf8' });
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }

  const db = JSON.parse(file || '{}');
  return db;
}

async function writeDBFile(data: any): Promise<void> {
  const file = JSON.stringify(data);

  await fs.writeFile(DB_PATH, file, { encoding: 'utf8', flag: 'w' });
}

type GetItem = (key: string) => Promise<any>;
async function get(key: string): Promise<any> {
  const releaseLock = await waitForLock();

  const db = await parseDbFile();
  const value = getValue(db, key);

  releaseLock();

  return value;
}

type PutItem = (key: string, data: any) => Promise<void>;
async function put(key: string, data: any): Promise<void> {
  const releaseLock = await waitForLock();

  const db = await parseDbFile();
  setValue(db, key, data);

  await writeDBFile(db);

  releaseLock();
}

type ClearItems = () => Promise<void>;
async function clear(): Promise<void> {
  const releaseLock = await waitForLock();

  writeDBFile({});
  releaseLock();
}

type DeleteItem = (key: string) => Promise<void>;
async function del(key: string): Promise<void> {
  const releaseLock = await waitForLock();

  const db = await parseDbFile();
  unsetValue(db, key);

  await writeDBFile(db);

  releaseLock();
}

async function append(key: string, data: any): Promise<void> {

}

export interface DB {
  get: GetItem,
  put: PutItem,
  del: DeleteItem,
  clear: ClearItems,
}

const DB_Functions: DB = {
  get,
  put,
  del,
  clear,
};

export default DB_Functions;
