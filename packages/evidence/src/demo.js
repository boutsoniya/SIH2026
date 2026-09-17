import { sha256 } from './index.js';
import { verifyImageHash, verifyRecord, computeRecordHash } from './verify.js';

export function createDemoEvidence({ imageBuffer = null, testId = 'TEST-DEMO-0001' } = {}) {
  const record = {
    test_id: testId,
    operator_id: 'DEMO-OPERATOR-001',
    timestamp: new Date().toISOString(),
    gps: null,
    test_type: 'COLORIMETRIC',
    result: 'INCONCLUSIVE',
    confidence: null,
    image_sha256: imageBuffer ? sha256(imageBuffer) : null,
    signature: null,
    sync_status: 'QUEUED',
  };

  record.record_hash = computeRecordHash(record);
  return record;
}

export function tamperDemoRecord(record) {
  return { ...record, operator_id: `${record.operator_id}-TAMPERED` };
}

export function verifyDemo({ record, imageBuffer = null } = {}) {
  const recordVerification = verifyRecord(record);
  const imageVerification = imageBuffer
    ? verifyImageHash(imageBuffer, record?.image_sha256)
    : { valid: null, reason: 'image_not_provided' };

  return {
    valid: recordVerification.valid && (imageBuffer ? imageVerification.valid : true),
    record: recordVerification,
    image: imageVerification,
  };
}
