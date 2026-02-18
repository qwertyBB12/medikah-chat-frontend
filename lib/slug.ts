export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr\.?\s+|dra\.?\s+)/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
