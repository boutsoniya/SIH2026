import { appendEvidence, verifyLedger } from "./evidenceLedger.js";

test("ledger chains receipts", () => {
  const a = appendEvidence({ test_id: "A", record_hash: "a".repeat(64) });
  const b = appendEvidence({ test_id: "B", record_hash: "b".repeat(64) });
  expect(a.previous_ledger_hash).toBeNull();
  expect(b.previous_ledger_hash).toBe(a.ledger_hash);
  expect(verifyLedger().valid).toBe(true);
});
