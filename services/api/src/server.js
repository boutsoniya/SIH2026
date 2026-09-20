import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { appendEvidence, getEvidence, verifyLedger } from './evidenceLedger.js';

export const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
const port = process.env.PORT || 4000;
const API_AUTH_KEY = process.env.API_AUTH_KEY || '';
const AUDIT_MAX = 1000;
const auditEvents = [];
const labReconciliation = new Map();

const ROLES = Object.freeze({ OFFICER: 'OFFICER', SUPERVISOR: 'SUPERVISOR', FSL: 'FSL' });
const PERMISSIONS = Object.freeze({
  analyze: new Set([ROLES.OFFICER, ROLES.SUPERVISOR]),
  sync: new Set([ROLES.OFFICER, ROLES.SUPERVISOR]),
  verify: new Set([ROLES.OFFICER, ROLES.SUPERVISOR, ROLES.FSL]),
  reconcile: new Set([ROLES.SUPERVISOR, ROLES.FSL]),
  ledger: new Set([ROLES.SUPERVISOR, ROLES.FSL]),
});

app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((v) => v.trim()) : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Role', 'X-Operator-Id'],
}));
app.use(express.json({ limit: '1mb' }));

function roleFromRequest(req) {
  const requested = String(req.get('x-role') || ROLES.OFFICER).toUpperCase();
  return Object.values(ROLES).includes(requested) ? requested : null;
}

function recordAudit(req, event, metadata = {}) {
  const entry = {
    audit_id: crypto.randomUUID(),
    event,
    actor: req.actor || { role: 'SYSTEM', operator_id: 'SYSTEM' },
    timestamp: new Date().toISOString(),
    path: req.path,
    metadata,
  };
  auditEvents.push(entry);
  if (auditEvents.length > AUDIT_MAX) auditEvents.shift();
  return entry;
}

function authenticate(req, res, next) {
  if (API_AUTH_KEY && req.get('x-api-key') !== API_AUTH_KEY) {
    return res.status(401).json({ error: 'authentication required' });
  }
  const role = roleFromRequest(req);
  if (!role) return res.status(400).json({ error: 'invalid role' });
  req.actor = { role, operator_id: req.get('x-operator-id') || 'ANONYMOUS' };
  next();
}

function authorize(permission) {
  return (req, res, next) => {
    if (!PERMISSIONS[permission]?.has(req.actor.role)) {
      recordAudit(req, 'ACCESS_DENIED', { permission });
      return res.status(403).json({ error: 'insufficient role permission', required_permission: permission });
    }
    next();
  };
}

app.get('/health', (_req, res) => res.json({
  service: 'narcoscope-api',
  status: 'ok',
  version: '0.4.0',
  security: { api_key_enabled: Boolean(API_AUTH_KEY), rbac: true },
}));

app.use('/api', authenticate);

app.post('/api/analyze', authorize('analyze'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image is required' });
  const testId = req.body.test_id || `TEST-${Date.now()}`;
  recordAudit(req, 'ANALYSIS_RECEIVED', { test_id: testId, evidence_bag_id: req.body.evidence_bag_id || null });
  res.json({
    test_id: testId,
    evidence_bag_id: req.body.evidence_bag_id || null,
    reagent_lot: req.body.reagent_lot || null,
    status: 'received',
    filename: req.file.originalname,
    bytes: req.file.size,
    result: 'INCONCLUSIVE',
    confidence: null,
    message: 'Image received. Connect the validated vision service before using a substance-level interpretation.',
  });
});

app.post('/api/evidence/sync', authorize('sync'), (req, res) => {
  const record = req.body || {};
  if (!record.test_id || !record.record_hash) return res.status(400).json({ error: 'test_id and record_hash are required' });

  const existing = getEvidence(record.test_id);
  if (existing && existing.record_hash !== record.record_hash) {
    recordAudit(req, 'SYNC_CONFLICT', { test_id: record.test_id });
    return res.status(409).json({ error: 'evidence conflict: test_id already exists with a different record_hash' });
  }

  const receipt = appendEvidence({ ...record, sync_actor: req.actor.operator_id });
  recordAudit(req, existing ? 'SYNC_REPLAY' : 'EVIDENCE_ACCEPTED', {
    test_id: record.test_id,
    evidence_bag_id: record.evidence_bag_id || null,
    ledger_hash: receipt.ledger_hash,
  });
  res.json({ status: 'accepted', idempotent: Boolean(existing), receipt });
});

app.get('/api/evidence/verify/:testId', authorize('verify'), (req, res) => {
  const record = getEvidence(req.params.testId);
  if (!record) return res.status(404).json({ error: 'evidence record not found' });
  const ledgerCheck = verifyLedger();
  recordAudit(req, 'EVIDENCE_VERIFIED', { test_id: req.params.testId, ledger_valid: ledgerCheck.valid });
  res.json({
    verification_id: `VERIFY-${req.params.testId}`,
    test_id: record.test_id,
    image_sha256: record.image_sha256 || null,
    record_hash: record.record_hash,
    signature_algorithm: record.signature_algorithm || null,
    evidence_bag_id: record.evidence_bag_id || null,
    result: record.result || 'INCONCLUSIVE',
    operator_id: record.operator_id || null,
    timestamp: record.timestamp || null,
    fsl_status: record.fsl_reconciliation?.status || null,
    ledger: ledgerCheck,
  });
});

app.get('/api/audit', authorize('ledger'), (_req, res) => res.json({ count: auditEvents.length, events: auditEvents.slice(-100) }));

app.get('/api/evidence/ledger/verify', authorize('ledger'), (req, res) => {
  const result = verifyLedger();
  recordAudit(req, 'LEDGER_VERIFIED', result);
  res.json(result);
});

app.post('/api/fsl/reconcile', authorize('reconcile'), (req, res) => {
  const { evidence_bag_id, laboratory_reference, status, field_result } = req.body || {};
  if (!evidence_bag_id || !status) return res.status(400).json({ error: 'evidence_bag_id and status are required' });
  const allowed = new Set(['PENDING', 'CONFIRMED', 'NOT_CONFIRMED', 'REQUIRES_REVIEW']);
  const normalized = String(status).toUpperCase();
  if (!allowed.has(normalized)) return res.status(400).json({ error: 'invalid laboratory status' });

  const record = {
    evidence_bag_id,
    laboratory_reference: laboratory_reference || null,
    status: normalized,
    field_result: field_result || 'INCONCLUSIVE',
    updated_at: new Date().toISOString(),
    updated_by: req.actor.operator_id,
  };
  labReconciliation.set(evidence_bag_id, record);
  recordAudit(req, 'FSL_RECONCILIATION_UPDATED', { evidence_bag_id, status: normalized });
  res.json(record);
});

app.get('/api/fsl/reconcile/:evidenceBagId', authorize('verify'), (req, res) => {
  const record = labReconciliation.get(req.params.evidenceBagId);
  if (!record) return res.status(404).json({ error: 'no laboratory reconciliation found' });
  res.json(record);
});

if (process.env.NODE_ENV !== 'test') app.listen(port, () => console.log(`NARCOSCOPE API listening on :${port}`));
