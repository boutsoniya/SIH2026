import express from 'express';
import cors from 'cors';
import multer from 'multer';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ service: 'narcoscope-api', status: 'ok', version: '0.1.0' });
});

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image is required' });

  // Vision service integration will be added after the API contract is locked.
  res.json({
    test_id: req.body.test_id || `TEST-${Date.now()}`,
    status: 'received',
    filename: req.file.originalname,
    bytes: req.file.size,
    result: 'INCONCLUSIVE',
    confidence: null,
    message: 'Image received. Validated vision inference is not connected yet.'
  });
});

app.listen(port, () => console.log(`NARCOSCOPE API listening on :${port}`));
