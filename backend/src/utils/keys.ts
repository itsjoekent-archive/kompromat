export function accessCardKey(id: string) {
  return `access_cards.${id}`;
}

export function tokenKey(value: string) {
  return `tokens.${value}`;
}

export const HAS_INITIALIZED = 'meta.HAS_INITIALIZED';
