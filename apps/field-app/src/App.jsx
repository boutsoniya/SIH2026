import { useState } from 'react';

const steps = ['Capture', 'Calibrate', 'Analyze', 'Evidence'];

export default function App() {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [offline, setOffline] = useState(true);

  const next = () => setStep((value) => Math.min(value + 1, steps.length - 1));

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">FIELD OPERATIONS</span>
          <h1>NARCOSCOPE</h1>
        </div>
        <button className="status" onClick={() => setOffline(!offline)}>
          <span className={`dot ${offline ? 'offline' : 'online'}`} />
          {offline ? 'Offline queue' : 'Connected'}
        </button>
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
            <button className="primary" onClick={next}>Create evidence record →</button>
          </div>
        )}

        {step === 3 && (
          <div className="panel evidence">
            <span className="eyebrow">EVIDENCE RECORD</span>
            <h3>Integrity-ready test record</h3>
            <div className="record-grid">
              <span>Test ID</span><strong>TEST-2026-000184</strong>
              <span>Timestamp</span><strong>Captured locally</strong>
              <span>Operator</span><strong>Session operator</strong>
              <span>Location</span><strong>Pending GPS permission</strong>
              <span>Image SHA-256</span><strong className="mono">Pending image upload</strong>
              <span>Sync status</span><strong>{offline ? 'Queued offline' : 'Ready to sync'}</strong>
            </div>
            <button className="primary" onClick={() => setStep(0)}>Start another test ↗</button>
          </div>
        )}
      </section>
    </main>
  );
}
