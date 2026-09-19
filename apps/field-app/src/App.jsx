import { useEffect, useMemo, useState } from 'react';
import { getEvidence, listEvidence, saveEvidence, syncQueuedEvidence, supportsOfflineStorage } from './offlineQueue';
import { DEMO_RECORDS } from './demoRecords';
import { analyzeImage, checkVisionHealth } from './visionApi';
import { computeRecordHash, sha256Hex, verifyImageBlob, verifyRecord } from './evidenceCrypto';

const steps = ['Capture', 'Calibrate', 'Analyze', 'Evidence'];

export default function App() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [offline, setOffline] = useState(true);
  const [records, setRecords] = useState(DEMO_RECORDS);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [storageReady, setStorageReady] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [visionStatus, setVisionStatus] = useState('not checked');
  const [integrityMessage, setIntegrityMessage] = useState('');

  const queued = useMemo(() => records.filter((record) => ['QUEUED', 'FAILED', 'SYNCING'].includes(record.sync_status)).length, [records]);
  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query || `${record.test_id} ${record.operator_id} ${record.result} ${record.sync_status}`.toLowerCase().includes(query);
      const matchesFilter = filter === 'ALL' || record.result === filter || record.sync_status === filter || record.integrity_status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [records, search, filter]);

  const refreshQueue = async () => {
    if (!supportsOfflineStorage()) return;
    const items = await listEvidence();
    setRecords((current) => {
      const localIds = new Set(items.map((item) => item.test_id));
      return [...items, ...current.filter((item) => !localIds.has(item.test_id))].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });
    setStorageReady(true);
  };

  useEffect(() => { refreshQueue(); checkVisionHealth().then(() => setVisionStatus('online')).catch(() => setVisionStatus('offline')); }, []);

  const runAnalysis = async () => {
    if (!file) { setAnalysisError('Choose a test image first.'); return; }
    setAnalyzing(true); setAnalysisError(''); setAnalysis(null); setIntegrityMessage('');
    try {
      const result = await analyzeImage(file);
      setAnalysis(result);
      setOffline(false);
      setStep(2);
    } catch (error) {
      setAnalysisError(`${error.message} You can continue with the offline workflow and create an INCONCLUSIVE record.`);
      setOffline(true);
    } finally { setAnalyzing(false); }
  };

  const createEvidence = async () => {
    const image_sha256 = file ? await sha256Hex(file) : null;
    const baseRecord = {
      test_id: `TEST-DEMO-${Date.now().toString().slice(-6)}`,
      operator_id: 'DEMO-OPERATOR-001', timestamp: new Date().toISOString(), gps: null,
      test_type: 'COLORIMETRIC', result: analysis?.result || 'INCONCLUSIVE', confidence: analysis?.confidence ?? null,
      image_sha256, signature: null, sync_status: 'QUEUED', integrity_status: 'UNVERIFIED',
      analysis_status: analysis?.status || 'offline_demo', quality: analysis?.quality || null,
    };
    const record = { ...baseRecord, record_hash: await computeRecordHash(baseRecord) };
    await saveEvidence(record, file || null);
    await refreshQueue(); setIntegrityMessage('Evidence sealed locally: image SHA-256 and deterministic record hash computed in-browser.'); setStep(3);
  };

  const verifyEvidence = async (record) => {
    setIntegrityMessage('Verifying evidence…');
    try {
      const stored = await getEvidence(record.test_id);
      const recordCheck = await verifyRecord(stored || record);
      const imageCheck = stored?.image_blob && stored?.image_sha256 ? await verifyImageBlob(stored.image_blob, stored.image_sha256) : { valid: null, reason: 'image_not_stored' };
      const valid = recordCheck.valid && (imageCheck.valid !== false);
      setIntegrityMessage(valid ? `✓ ${record.test_id}: record and captured image hashes match.` : `⚠ ${record.test_id}: integrity check failed — possible tampering or missing evidence image.`);
      if (valid && stored) {
        setRecords((current) => current.map((item) => item.test_id === record.test_id ? { ...item, integrity_status: 'VERIFIED' } : item));
      }
    } catch (error) { setIntegrityMessage(`Verification error: ${error.message}`); }
  };

  const syncNow = async () => {
    if (syncing || !storageReady) return;
    setSyncing(true);
    try { await syncQueuedEvidence(); setLastSync(new Date()); await refreshQueue(); } finally { setSyncing(false); }
  };

  const next = () => setStep((value) => Math.min(value + 1, steps.length - 1));

  return (
    <main className="shell">
      <header className="topbar">
        <div><span className="eyebrow">FIELD OPERATIONS</span><h1>NARCOSCOPE</h1></div>
        <div className="topbar-actions"><button className="queue-pill" onClick={() => setStep(3)}><strong>{queued}</strong> queued</button><button className="status" onClick={() => setOffline(!offline)}><span className={`dot ${offline ? 'offline' : 'online'}`} />{offline ? 'Offline queue' : 'Connected'}</button></div>
      </header>

      <section className="hero"><div><p className="eyebrow">DIGITAL COMPANION FOR FIELD DRUG TESTING</p><h2>Capture evidence.<br />Make the uncertainty visible.</h2><p className="muted">A field-first workflow for guided capture, colour calibration, presumptive analysis and tamper-evident records.</p></div><div className="hero-card"><span>VISION SERVICE</span><strong>{visionStatus}</strong><small>FastAPI + OpenCV pipeline</small></div></section>

      <nav className="steps">{steps.map((label, index) => <button key={label} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>)}</nav>

      <section className="workspace">
        {step === 0 && <div className="panel capture"><div className="capture-frame"><div className="guide-card">REFERENCE CARD</div><div className="guide-kit">TEST KIT<br /><small>ALIGN INSIDE FRAME</small></div><div className="crosshair">+</div></div><div className="capture-controls"><div><h3>Guided capture</h3><p className="muted">Select a field image. The vision service will run a quality gate before calibration, ROI extraction and safe inference.</p></div><label className="upload">{file?.name || 'Choose test image'}<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>{analysisError && <div className="notice">{analysisError}</div>}<button className="primary" onClick={runAnalysis} disabled={analyzing}>{analyzing ? 'Analyzing…' : 'Run vision quality gate →'}</button><button className="secondary" onClick={() => { setAnalysis({ status: 'offline_demo', result: 'INCONCLUSIVE', confidence: null, quality: { passed: true }, reference_card: [0, 0, 1, 1], calibration: { status: 'ready', method: 'offline_demo' } }); setOffline(true); setAnalysisError(''); setIntegrityMessage('Offline demo: calibration and evidence flow are simulated locally; no server inference was used.'); setStep(1); }}>Use offline demo workflow</button></div></div>}

        {step === 1 && <div className="panel split"><div className="calibration-visual"><div className="card-grid">{Array.from({ length: 12 }).map((_, i) => <span key={i} />)}</div></div><div><span className="eyebrow">STEP 02</span><h3>Reference-card calibration</h3><p className="muted">The reference card provides a colour baseline so the pipeline can compensate for illumination and camera differences. In offline demo mode, this stage is simulated locally to demonstrate the workflow.</p>{analysis?.calibration && <div className="notice">Calibration status: {analysis.calibration.status || 'computed'} · reference candidate detected.</div>}<div className="metrics"><div><strong>{analysis?.quality?.passed ? 'PASS' : '—'}</strong><span>quality gate</span></div><div><strong>{analysis?.reference_card ? 'YES' : '—'}</strong><span>reference card</span></div></div><button className="primary" onClick={next}>Continue to analysis →</button></div></div>}

        {step === 2 && <div className="panel result"><div className="result-badge">PRESUMPTIVE FIELD RESULT</div><h3>Analysis ready</h3><p className="muted">Digital interpretation of the colorimetric field test. Laboratory confirmation remains required.</p><div className="metrics"><div><strong>{analysis?.result || 'INCONCLUSIVE'}</strong><span>classification</span></div><div><strong>{analysis?.confidence != null ? `${Math.round(analysis.confidence * 100)}%` : '—'}</strong><span>confidence</span></div><div><strong>{analysis?.quality?.passed ? 'PASS' : '—'}</strong><span>quality gate</span></div></div><div className="notice">{analysis?.explanation || 'The current prototype has no validated kit-specific model attached, so the safe result remains INCONCLUSIVE.'}</div>{analysis?.roi && <p className="sync-note">Reaction ROI: {analysis.roi.join(', ')} · Features extracted: {Object.keys(analysis.features?.features || {}).length}</p>}<button className="primary" onClick={createEvidence}>Create evidence record →</button></div>}

        {step === 3 && <div className="panel evidence"><div className="evidence-heading"><div><span className="eyebrow">COMMAND CENTER</span><h3>Evidence history</h3><p className="muted">Searchable local history for demo records and field-captured evidence.</p></div><button className="sync-button" onClick={syncNow} disabled={syncing || !storageReady}>{syncing ? 'Syncing…' : 'Sync queue'}</button></div><div className="history-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search test ID, operator, result…" /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All records</option><option value="INCONCLUSIVE">Inconclusive</option><option value="PRESUMPTIVE_POSITIVE">Presumptive positive</option><option value="PRESUMPTIVE_NEGATIVE">Presumptive negative</option><option value="QUEUED">Queued</option><option value="SYNCED">Synced</option><option value="VERIFIED">Integrity verified</option></select></div><div className="history-list">{visibleRecords.length ? visibleRecords.map((record) => <article className="history-row" key={record.test_id}><div><strong>{record.test_id}</strong><span>{record.operator_id} · {new Date(record.timestamp).toLocaleString()}</span></div><div className="history-tags"><span className={`tag result-${record.result.toLowerCase()}`}>{record.result.replaceAll('_', ' ')}</span><span className="tag">{record.integrity_status}</span><span className="tag">{record.sync_status}</span>{record.image_sha256 && <button className="tag verify-tag" onClick={() => verifyEvidence(record)}>Verify</button>}</div></article>) : <div className="empty-state">No evidence records match this search.</div>}</div>{integrityMessage && <div className="notice">{integrityMessage}</div>}<div className="sync-panel"><div><strong>Offline evidence queue</strong><span>Records remain local until sync is confirmed.</span></div><span className="sync-count">{queued} pending</span></div>{lastSync && <p className="sync-note">Last local sync: {lastSync.toLocaleTimeString()}</p>}<button className="primary" onClick={() => setStep(0)}>Start another test ↗</button></div>}
      </section>
    </main>
  );
}
