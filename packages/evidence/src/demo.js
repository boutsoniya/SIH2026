import { verifyImageHash, verifyRecord, computeRecordHash } from './verify.js';

export function createDemoEvidence({ imageBuffer, testId = 'TEST-DEMO-0001' } = {}) {
  const imageHash = imageBuffer ? undefined : 'DEMO_IMAGE_HASH_PENDING';
  const record = {
    test_id: testId,
    operator_id: 'DEMO-OPERATOR-001',
    timestamp: new Date().toISOString(),
    gps: null,
    test_type: 'COLORIMETRIC',
    result: 'INCONCLUSIVE',
    confidence: null,
    image_sha256: imageHash,
    signature: null,
    sync_status: 'QUEUED',
  };

  if (imageBuffer) {
    record.image_sha256 = undefined;
    const { sha256 } = requireHash();
    record.image_sha256 = sha256(imageBuffer);
  }

  record.record_hash = computeRecordHash(record);
  return record;
}

function requireHash() {
  return {
    sha256: (buffer) => {
      let hash = 0;
      for (const byte of buffer) hash = ((hash * 31) + byte) >>> 0;
      return `demo-${hash.toString(16).padStart(8, '0')}`;
    },
  };
}

export function tamperDemoRecord(record) {
  return { ...record, operator_id: `${record.operator_id}-TAMPERED` };
}

export function verifyDemo({ record, imageBuffer } = {}) {
  const recordVerification = verifyRecord(record);
  const imageVerification = imageBuffer
    ? verifyImageHash(imageBuffer, record?.image_sha256)
    : { valid: false, reason: 'image_not_provided' };

  return {
    valid: recordVerification.valid && (imageBuffer ? imageVerification.valid : true),
    record: recordVerification,
    image: imageVerification,
  };
}
