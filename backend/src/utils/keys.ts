export function accessCardKey(id: string) {
  return `access_cards.${id}`;
}

export const documentsKey = 'documents';

export function documentKey(id: string) {
  return `${documentsKey}.${id}`;
}

export function tokenKey(value: string) {
  return `tokens.${value}`;
}

export const HAS_INITIALIZED = 'meta.HAS_INITIALIZED';
