import { promisify } from 'util';
import crypto from 'crypto';

const randomBytesAsync = promisify(crypto.randomBytes);

export default async function randomBytes(length: number): Promise<string> {
  const bytes = await randomBytesAsync(length);
  return bytes.toString('hex');
}
