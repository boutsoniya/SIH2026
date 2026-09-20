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
