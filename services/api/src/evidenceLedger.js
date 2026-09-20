import crypto from "crypto";

const ledger = new Map();
const records = new Map();

function canonical(record) {
  return JSON.stringify(record, Object.keys(record).sort());
}

export function appendEvidence(record) {
  if (!record?.test_id || !record?.record_hash) throw new Error("test_id and record_hash are required");
  const previous = ledger.get(record.test_id);
  if (previous) return previous;
  const previousHash = [...ledger.values()].at(-1)?.ledger_hash || null;
  const payload = canonical({ test_id: record.test_id, record_hash: record.record_hash, previous_ledger_hash: previousHash });
  const ledgerHash = crypto.createHash("sha256").update(payload).digest("hex");
  const receipt = { test_id: record.test_id, record_hash: record.record_hash, previous_ledger_hash: previousHash, ledger_hash: ledgerHash, accepted_at: new Date().toISOString() };
  ledger.set(record.test_id, receipt);
  records.set(record.test_id, { ...record, ledger_receipt: receipt });
  return receipt;
}

export function verifyLedger() {
  let previousHash = null;
  for (const receipt of ledger.values()) {
    const expected = crypto.createHash("sha256").update(canonical({ test_id: receipt.test_id, record_hash: receipt.record_hash, previous_ledger_hash: previousHash })).digest("hex");
    if (expected !== receipt.ledger_hash) return { valid: false, failed_test_id: receipt.test_id };
    previousHash = receipt.ledger_hash;
  }
  return { valid: true, count: ledger.size, head: previousHash };
}

export function getEvidence(testId) {
  return records.get(testId) || null;
}
