import setValue from 'set-value';
import unsetValue from 'unset-value';
import { Request, Response } from 'express';
import {
  EncryptedDocument,
  RequestHandler,
  RouteHandlerPlugins,
} from '../types';
import { archivedDocumentKey, documentKey } from '../utils/keys';
import validateAuthHeader from '../utils/validateAuthHeader';

interface RequestParams {
  id?: string;
}

function deleteDocument(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const vaultKey = await validateAuthHeader(plugins, request);

    if (!vaultKey) {
      response.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { params } = request;
    const { id }: RequestParams = params;

    if (!id) {
      response.status(500).json({ error: 'Missing document id' });
      return;
    }

    const encryptedDocument: EncryptedDocument | null = await plugins.db.get(archivedDocumentKey(id));

    if (!encryptedDocument) {
      response.status(404).json({ error: 'Archived document not found' });
      return;
    }

    await plugins.db.del(archivedDocumentKey(id));

    response.json({ deleted: true });
  }

  return routeHandler;
}

export default deleteDocument;
