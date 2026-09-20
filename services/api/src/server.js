import express from 'express';
import cors from 'cors';
import multer from 'multer';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const labReconciliation = new Map();

app.get('/health', (_req, res) => {
  res.json({ service: 'narcoscope-api', status: 'ok', version: '0.2.0' });
});

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image is required' });

  res.json({
    test_id: req.body.test_id || `TEST-${Date.now()}`,
    evidence_bag_id: req.body.evidence_bag_id || null,
    reagent_lot: req.body.reagent_lot || null,
    status: 'received',
    filename: req.file.originalname,
    bytes: req.file.size,
    result: 'INCONCLUSIVE',
    confidence: null,
    message: 'Image received. Connect the validated vision service before using a substance-level interpretation.'
  });
});

app.post('/api/fsl/reconcile', (req, res) => {
  const { evidence_bag_id, laboratory_reference, status, field_result } = req.body || {};
  if (!evidence_bag_id || !status) {
    return res.status(400).json({ error: 'evidence_bag_id and status are required' });
  }
  const allowed = new Set(['PENDING', 'CONFIRMED', 'NOT_CONFIRMED', 'REQUIRES_REVIEW']);
  const normalized = String(status).toUpperCase();
  if (!allowed.has(normalized)) return res.status(400).json({ error: 'invalid laboratory status' });

  const record = {
    evidence_bag_id,
    laboratory_reference: laboratory_reference || null,
    status: normalized,
    field_result: field_result || 'INCONCLUSIVE',
    updated_at: new Date().toISOString()
  };
  labReconciliation.set(evidence_bag_id, record);
  res.json(record);
});

app.get('/api/fsl/reconcile/:evidenceBagId', (req, res) => {
  const record = labReconciliation.get(req.params.evidenceBagId);
  if (!record) return res.status(404).json({ error: 'no laboratory reconciliation found' });
  res.json(record);
});

app.listen(port, () => console.log(`NARCOSCOPE API listening on :${port}`));
