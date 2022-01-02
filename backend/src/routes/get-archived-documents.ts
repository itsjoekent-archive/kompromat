import { Request, Response } from 'express';
import {
  Document,
  DocumentField,
  EncryptedDocument,
  RequestHandler,
  RouteHandlerPlugins,
} from '../types';
import { decrypt } from '../utils/cryptography';
import { archivedDocumentsKey } from '../utils/keys';
import validateAuthHeader from '../utils/validateAuthHeader';

interface EncryptedDocumentsContainer {
  [key: string]: EncryptedDocument;
}

function getArchivedDocuments(plugins: RouteHandlerPlugins): RequestHandler {
  async function routeHandler(request: Request, response: Response) {
    const vaultKey = await validateAuthHeader(plugins, request);

    if (!vaultKey) {
      response.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const encryptedDocuments: EncryptedDocumentsContainer | null = await plugins.db.get(archivedDocumentsKey);
    const decryptedDocuments: Document[] = [];

    if (!encryptedDocuments) {
      response.json([]);
      return;
    }

    Object.keys(encryptedDocuments).forEach((documentId) => {
      const encryptedDocument: EncryptedDocument = encryptedDocuments[documentId];
      const document: Document = {
        ...encryptedDocument,
        fields: [],
      };

      const decryptedFields = JSON.parse(decrypt(vaultKey, encryptedDocument.fields) || '') as DocumentField[];

      if (Array.isArray(decryptedFields)) {
        document.fields = decryptedFields;
      }

      decryptedDocuments.push(document);
    });

    response.json({ documents: decryptedDocuments.sort((a, b) => b.updatedAt - a.updatedAt) });
  }

  return routeHandler;
}

export default getArchivedDocuments;
