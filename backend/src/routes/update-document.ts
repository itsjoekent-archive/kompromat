import { Request, Response } from 'express';
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

interface RequestParams {
  id?: string;
}

function updateDocument(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const vaultKey = await validateAuthHeader(plugins, request);

    if (!vaultKey) {
      response.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { body, params } = request;
    const { name, fields }: DocumentBody = body;
    const { id }: RequestParams = params;

    if (!id) {
      response.status(404).json({ error: 'Document not found' });
      return;
    }

    if (!name || typeof name !== 'string' || name.length > 64) {
      response.status(400).json({ error: 'Invalid access card name' });
      return;
    }

    if (!fields || !fields.length) {
      response.status(400).json({ error: 'Missing field(s)' });
      return;
    }

    const encryptedDocument: EncryptedDocument | null = await plugins.db.get(documentKey(id));

    if (!encryptedDocument) {
      response.status(404).json({ error: 'Document not found' });
      return;
    }

    const documentUnsafe: Document = {
      ...encryptedDocument,
      fields,
      name,
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

export default updateDocument;
