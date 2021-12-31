import crypto from 'crypto';

const SEPERATOR = '__IV__';

export function encrypt(encryptionKey: string, data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted = `${iv.toString('hex')}${SEPERATOR}` + encrypted + cipher.final('hex');

  return encrypted;
}

export function decrypt(encryptionKey: string, data: string): string | null {
  const [decipherIv, encryptedString] = data.split(SEPERATOR);

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      encryptionKey,
      Buffer.from(decipherIv, 'hex'),
    );

    let decrypted = decipher.update(encryptedString, 'hex', 'utf8');
    decrypted = decrypted + decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    if ([
      'ERR_OSSL_EVP_BAD_DECRYPT',
      'ERR_CRYPTO_INVALID_KEYLEN',
    ].includes(error.code)) {
      return null;
    }

    throw error;
  }
}
