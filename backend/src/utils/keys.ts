export const accessCardsKey = 'accessCards';

export function accessCardKey(id: string) {
  return `${accessCardsKey}.${id}`;
}

export const archivedDocumentsKey = 'archivedDocuments';

export function archivedDocumentKey(id: string) {
  return `${archivedDocumentsKey}.${id}`;
}

export const documentsKey = 'documents';

export function documentKey(id: string) {
  return `${documentsKey}.${id}`;
}

export const tokensKey = 'tokens';

export function tokenKey(value: string) {
  return `${tokensKey}.${value}`;
}

export const HAS_INITIALIZED = 'meta.HAS_INITIALIZED';
