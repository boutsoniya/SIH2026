import { createHash } from 'node:crypto';

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function recordHash(record) {
  return sha256(Buffer.from(canonicalize(record), 'utf8'));
}
