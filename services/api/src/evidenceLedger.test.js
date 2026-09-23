import { test } from "node:test";
import { appendEvidence, verifyLedger } from "./evidenceLedger.js";
import assert from "node:assert/strict";

test("ledger chains receipts", () => {
  const a = appendEvidence({ test_id: "A", record_hash: "a".repeat(64) });
  const b = appendEvidence({ test_id: "B", record_hash: "b".repeat(64) });
  assert.equal(a.previous_ledger_hash, null);
  assert.equal(b.previous_ledger_hash, a.ledger_hash);
  assert.equal(verifyLedger().valid, true);
});
