// Basic validation utilities for standard TypeScript types
// Replaces branded type validation after migration

export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidISODate(value: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (!isoDateRegex.test(value)) {
    return false;
  }
  
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
}

export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isValidPositiveInteger(value: unknown): value is number {
  return isValidNumber(value) && Number.isInteger(value) && value > 0;
}