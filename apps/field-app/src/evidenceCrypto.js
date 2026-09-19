const encoder = new TextEncoder();
const KEY_DB = 'narcoscope-signing';
const KEY_STORE = 'keys';

function openKeyDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function bytesFromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64FromBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
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

async function getSigningKeyPair() {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable in this browser.');

  const db = await openKeyDb();
  const existing = await new Promise((resolve, reject) => {
    const request = db.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).get('default');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });

  if (existing?.privateKey && existing?.publicKey) {
    return { privateKey: existing.privateKey, publicKey: existing.publicKey };
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign', 'verify'],
  );

  await new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite');
    tx.objectStore(KEY_STORE).put({
      id: 'default',
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      created_at: new Date().toISOString(),
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  return keyPair;
}

export async function signEvidenceRecord(record) {
  const { privateKey, publicKey } = await getSigningKeyPair();
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', publicKey);
  const payload = { ...record, public_key_jwk: publicKeyJwk };
  const recordHash = await computeRecordHash(payload);
  const signatureBytes = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(canonicalize(payload)),
  );

  return {
    ...payload,
    record_hash: recordHash,
    signature: base64FromBytes(new Uint8Array(signatureBytes)),
    signature_algorithm: 'ECDSA-P256-SHA256',
  };
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

export async function verifySignature(record) {
  if (!record?.signature || !record?.public_key_jwk) {
    return { valid: false, status: 'UNSIGNED', reason: 'signature_or_public_key_missing' };
  }

  try {
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      record.public_key_jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      bytesFromBase64(record.signature),
      encoder.encode(canonicalize(evidencePayload(record))),
    );

    return {
      valid,
      status: valid ? 'SIGNED_VERIFIED' : 'SIGNATURE_INVALID',
      algorithm: record.signature_algorithm || 'ECDSA-P256-SHA256',
    };
  } catch (error) {
    return { valid: false, status: 'SIGNATURE_ERROR', reason: error.message };
  }
}

export async function verifyImageBlob(imageBlob, expectedHash) {
  if (!imageBlob || !expectedHash) return { valid: false, reason: 'image_or_expected_hash_missing' };
  const actualHash = await sha256Hex(imageBlob);
  return { valid: actualHash === expectedHash, actualHash, expectedHash };
}
