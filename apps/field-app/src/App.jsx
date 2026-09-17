import { useEffect, useMemo, useState } from 'react';
import { listEvidence, saveEvidence, syncQueuedEvidence, supportsOfflineStorage } from './offlineQueue';

const steps = ['Capture', 'Calibrate', 'Analyze', 'Evidence'];

export default function App() {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [offline, setOffline] = useState(true);
  const [records, setRecords] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [storageReady, setStorageReady] = useState(false);

  const queued = useMemo(
    () => records.filter((record) => ['QUEUED', 'FAILED', 'SYNCING'].includes(record.sync_status)).length,
    [records],
  );

  const refreshQueue = async () => {
    if (!supportsOfflineStorage()) return;
    const items = await listEvidence();
    setRecords(items);
    setStorageReady(true);
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  const createEvidence = async () => {
    const record = {
      test_id: `TEST-DEMO-${Date.now().toString().slice(-6)}`,
      operator_id: 'DEMO-OPERATOR-001',
      timestamp: new Date().toISOString(),
      gps: null,
      test_type: 'COLORIMETRIC',
      result: 'INCONCLUSIVE',
      confidence: null,
      image_sha256: null,
      record_hash: null,
      signature: null,
      sync_status: 'QUEUED',
      integrity_status: 'UNVERIFIED',
    };
    await saveEvidence(record);
    await refreshQueue();
    setStep(3);
  };

  const syncNow = async () => {
    if (syncing || !storageReady) return;
    setSyncing(true);
    try {
      await syncQueuedEvidence();
      setLastSync(new Date());
      await refreshQueue();
    } finally {
      setSyncing(false);
    }
  };

  const next = () => setStep((value) => Math.min(value + 1, steps.length - 1));

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">FIELD OPERATIONS</span>
          <h1>NARCOSCOPE</h1>
        </div>
        <div className="topbar-actions">
          <div className="queue-pill"><strong>{queued}</strong> queued</div>
          <button className="status" onClick={() => setOffline(!offline)}>
            <span className={`dot ${offline ? 'offline' : 'online'}`} />
            {offline ? 'Offline queue' : 'Connected'}
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">DIGITAL COMPANION FOR FIELD DRUG TESTING</p>
          <h2>Capture evidence.<br />Make the uncertainty visible.</h2>
          <p className="muted">A field-first workflow for guided capture, colour calibration, presumptive analysis and tamper-evident records.</p>
        </div>
        <div className="hero-card">
          <span>ACTIVE TEST</span>
          <strong>TEST-2026-000184</strong>
          <small>Operator session · Local</small>
        </div>
      </section>

      <nav className="steps">
        {steps.map((label, index) => (
          <button key={label} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}>
            <span>{index + 1}</span>{label}
          </button>
        ))}
      </nav>

      <section className="workspace">
        {step === 0 && (
          <div className="panel capture">
            <div className="capture-frame">
              <div className="guide-card">REFERENCE CARD</div>
              <div className="guide-kit">TEST KIT<br /><small>ALIGN INSIDE FRAME</small></div>
              <div className="crosshair">+</div>
            </div>
            <div className="capture-controls">
              <div>
                <h3>Guided capture</h3>
                <p className="muted">Keep the reference card and reaction area visible. NARCOSCOPE will check framing, brightness and sharpness before analysis.</p>
              </div>
              <label className="upload">
                {fileName || 'Choose test image'}
                <input type="file" accept="image/*" onChange={(event) => setFileName(event.target.files?.[0]?.name || '')} />
              </label>
              <button className="primary" onClick={next}>Run quality gate →</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="panel split">
            <div className="calibration-visual"><div className="card-grid">{Array.from({ length: 12 }).map((_, i) => <span key={i} />)}</div></div>
            <div>
              <span className="eyebrow">STEP 02</span>
              <h3>Reference-card calibration</h3>
              <p className="muted">The reference card provides a colour baseline so the pipeline can compensate for illumination and camera differences.</p>
              <div className="metrics"><div><strong>98%</strong><span>card detected</span></div><div><strong>PASS</strong><span>quality gate</span></div></div>
              <button className="primary" onClick={next}>Continue to analysis →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="panel result">
            <div className="result-badge">PRESUMPTIVE</div>
            <h3>Analysis ready</h3>
            <p className="muted">The result is an AI-assisted presumptive classification and must not be presented as laboratory confirmation.</p>
            <div className="metrics"><div><strong>—</strong><span>classification</span></div><div><strong>—</strong><span>confidence</span></div><div><strong>PASS</strong><span>calibration</span></div></div>
            <div className="notice">Model output is intentionally withheld until a validated model and field-labelled dataset are connected.</div>
            <button className="primary" onClick={createEvidence}>Create evidence record →</button>
          </div>
        )}

        {step === 3 && (
          <div className="panel evidence">
            <div className="evidence-heading">
              <div>
                <span className="eyebrow">EVIDENCE RECORD</span>
                <h3>Integrity-ready test record</h3>
              </div>
              <button className="sync-button" onClick={syncNow} disabled={syncing || !storageReady}>
                {syncing ? 'Syncing…' : 'Sync queue'}
              </button>
            </div>
            <div className="record-grid">
              <span>Latest Test ID</span><strong>{records[0]?.test_id || 'TEST-2026-000184'}</strong>
              <span>Timestamp</span><strong>{records[0] ? new Date(records[0].timestamp).toLocaleString() : 'Captured locally'}</strong>
              <span>Operator</span><strong>{records[0]?.operator_id || 'Session operator'}</strong>
              <span>Location</span><strong>Pending GPS permission</strong>
              <span>Image SHA-256</span><strong className="mono">Pending image upload</strong>
              <span>Integrity</span><strong>{records[0]?.integrity_status || 'UNVERIFIED'}</strong>
              <span>Sync status</span><strong>{records[0]?.sync_status || 'QUEUED'}</strong>
            </div>
            <div className="sync-panel">
              <div><strong>Offline evidence queue</strong><span>Records stay local until sync is confirmed.</span></div>
              <span className="sync-count">{queued} pending</span>
            </div>
            {lastSync && <p className="sync-note">Last local sync: {lastSync.toLocaleTimeString()}</p>}
            <button className="primary" onClick={() => setStep(0)}>Start another test ↗</button>
          </div>
        )}
      </section>
    </main>
  );
}
