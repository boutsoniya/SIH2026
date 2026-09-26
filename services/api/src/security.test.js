import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';

const { app } = await import('./server.js');

async function request(path, options = {}) {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, options);
  } finally {
    server.close();
  }
}

test('health exposes RBAC and auth posture', async () => {
  const response = await request('/health');
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.security.rbac, true);
});

test('FSL role is blocked from officer analysis', async () => {
  const form = new FormData();
  form.append('image', new Blob(['demo'], { type: 'image/jpeg' }), 'demo.jpg');
  const response = await request('/api/analyze', {
    method: 'POST',
    headers: { 'X-Role': 'FSL', 'X-Operator-Id': 'FSL-01' },
    body: form,
  });
  assert.equal(response.status, 403);
});

test('invalid role is rejected', async () => {
  const response = await request('/api/evidence/ledger/verify', {
    headers: { 'X-Role': 'UNKNOWN' },
  });
  assert.equal(response.status, 400);
});


test('FSL reconciliation is surfaced by evidence verification', async () => {
  const record = {
    test_id: 'FSL-READINESS-001',
    record_hash: 'c'.repeat(64),
    evidence_bag_id: 'BAG-FSL-001',
    result: 'INCONCLUSIVE',
  };
  const syncResponse = await request('/api/evidence/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Role': 'OFFICER', 'X-Operator-Id': 'OFFICER-01' },
    body: JSON.stringify(record),
  });
  assert.equal(syncResponse.status, 200);

  const reconcileResponse = await request('/api/fsl/reconcile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Role': 'SUPERVISOR', 'X-Operator-Id': 'SUP-01' },
    body: JSON.stringify({
      evidence_bag_id: 'BAG-FSL-001',
      laboratory_reference: 'LAB-DEMO-001',
      status: 'CONFIRMED',
      field_result: 'INCONCLUSIVE',
    }),
  });
  assert.equal(reconcileResponse.status, 200);

  const verifyResponse = await request('/api/evidence/verify/FSL-READINESS-001', {
    headers: { 'X-Role': 'FSL', 'X-Operator-Id': 'FSL-01' },
  });
  const body = await verifyResponse.json();
  assert.equal(verifyResponse.status, 200);
  assert.equal(body.fsl_status, 'CONFIRMED');
  assert.equal(body.laboratory_reference, 'LAB-DEMO-001');
});

test('officer cannot read FSL reconciliation details', async () => {
  const response = await request('/api/fsl/reconcile/BAG-FSL-001', {
    headers: { 'X-Role': 'OFFICER', 'X-Operator-Id': 'OFFICER-01' },
  });
  assert.equal(response.status, 403);
});
