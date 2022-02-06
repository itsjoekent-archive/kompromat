import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  Document,
  DocumentField,
  EncryptedDocument,
  RequestHandler,
  RouteHandlerPlugins,
} from '../types';
import { encrypt } from '../utils/cryptography';
import { documentKey } from '../utils/keys';
import validateAuthHeader from '../utils/validateAuthHeader';

interface DocumentBody {
  name?: string;
  fields?: DocumentField[];
}

function createDocument(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const { body } = request;
    const { name, fields }: DocumentBody = body;

    if (!name || typeof name !== 'string' || name.length > 64) {
      response.status(400).json({ error: 'Invalid access card name' });
      return;
    }

    if (!fields || !fields.length) {
      response.status(400).json({ error: 'Missing field(s)' });
      return;
    }

    const vaultKey = await validateAuthHeader(plugins, request);

    if (!vaultKey) {
      response.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = uuid();

    const documentUnsafe: Document = {
      id,
      name,
      fields,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const encryptedFields = encrypt(vaultKey, JSON.stringify(fields));
    const document: EncryptedDocument = {
      ...documentUnsafe,
      fields: encryptedFields,
    };

    await plugins.db.put(documentKey(id), document);

    response.json({ document: documentUnsafe });
  }

  return routeHandler;
}

export default createDocument;
