const encoder = new TextEncoder();

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable in this browser.');
  const bytes = typeof value === 'string' ? encoder.encode(value) : new Uint8Array(await value.arrayBuffer());
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function evidencePayload(record) {
  const { record_hash: _recordHash, signature: _signature, integrity_status: _integrity, ...payload } = record;
  return payload;
}

export async function computeRecordHash(record) {
  return sha256Hex(canonicalize(evidencePayload(record)));
}

export async function verifyRecord(record) {
  if (!record?.record_hash) return { valid: false, status: 'UNVERIFIED', reason: 'missing_record_hash' };
  const expectedHash = await computeRecordHash(record);
  return {
    valid: expectedHash === record.record_hash,
    status: expectedHash === record.record_hash ? 'VERIFIED' : 'TAMPER_DETECTED',
    expectedHash,
    storedHash: record.record_hash,
  };
}

export async function verifyImageBlob(imageBlob, expectedHash) {
  if (!imageBlob || !expectedHash) return { valid: false, reason: 'image_or_expected_hash_missing' };
  const actualHash = await sha256Hex(imageBlob);
  return { valid: actualHash === expectedHash, actualHash, expectedHash };
}
