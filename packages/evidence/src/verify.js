import { createHash } from 'node:crypto';
import { canonicalize, recordHash, sha256 } from './index.js';

/**
 * Build the deterministic payload that is covered by recordHash.
 * Signature material is intentionally excluded from the hash input.
 */
export function evidencePayload(record) {
  const { record_hash: _recordHash, signature: _signature, integrity_status: _integrity, ...payload } = record;
  return payload;
}

export function computeRecordHash(record) {
  return recordHash(evidencePayload(record));
}

export function verifyImageHash(imageBuffer, expectedHash) {
  if (!expectedHash) return { valid: false, reason: 'missing_expected_hash' };
  const actualHash = sha256(imageBuffer);
  return {
    valid: actualHash === expectedHash,
    expectedHash,
    actualHash,
  };
}

export function verifyRecord(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, status: 'INVALID_RECORD', reason: 'record_not_object' };
  }

  if (!record.record_hash) {
    return { valid: false, status: 'UNVERIFIED', reason: 'missing_record_hash' };
  }

  const expectedHash = computeRecordHash(record);
  const valid = expectedHash === record.record_hash;

  return {
    valid,
    status: valid ? 'VERIFIED' : 'TAMPER_DETECTED',
    expectedHash,
    storedHash: record.record_hash,
  };
}

export function signableCanonicalPayload(record) {
  return canonicalize(evidencePayload(record));
}

export function contentDigest(value) {
  return createHash('sha256').update(Buffer.from(canonicalize(value), 'utf8')).digest('hex');
}
