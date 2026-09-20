import { useEffect, useRef, useState } from 'react';

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

function parseCode(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    return String(parsed.test_id || parsed.verification_id || parsed.id || '').replace(/^VERIFY-/, '');
  } catch {
    return value.replace(/^VERIFY-/, '').replace(/^https?:\/\/[^/]+\/(?:verify\/)?/, '');
  }
}

export default function QuickVerify({ onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('READY');
  const [result, setResult] = useState(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stop(), []);

  const verify = async (rawCode = code) => {
    const id = parseCode(rawCode);
    if (!id) return;
    setStatus('VERIFYING');
    setResult(null);
    try {
      const response = await fetch(apiBase() + `/api/evidence/verify/${encodeURIComponent(id)}`, {
        headers: { 'X-Role': 'FSL' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Verification failed (HTTP ${response.status})`);
      setResult({ ...data, verified: Boolean(data.ledger?.valid) });
      setStatus('DONE');
    } catch (error) {
      setResult({ verified: false, status: 'REVIEW', error: error.message });
      setStatus('ERROR');
    }
  };

  const startScanner = async () => {
    if (!('BarcodeDetector' in window)) {
      setStatus('UNSUPPORTED');
      return;
    }
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      detectorRef.current = detector;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus('SCANNING');
      const scan = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            setCode(codes[0].rawValue);
            stop();
            await verify(codes[0].rawValue);
            return;
          }
        } catch {}
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch (error) {
      setStatus(error?.message || 'CAMERA_ERROR');
    }
  };

  return (
    <main className="verify-shell">
      <section className="quick-verify">
        <div className="verify-head">
          <div><span className="eyebrow">FSL / SUPERVISOR</span><h1>One-scan verification</h1><p className="muted">Scan an evidence QR or enter its Verification ID. This view checks the sealed record and ledger; it does not reinterpret the field result.</p></div>
          <button className="secondary" onClick={onBack}>Back to field app</button>
        </div>

        <div className="scanner-card">
          <div className="scanner-stage">
            <video ref={videoRef} muted playsInline />
            <div className="scanner-frame"><span>ALIGN QR</span></div>
          </div>
          <div className="scanner-actions">
            <button className="primary" onClick={startScanner} disabled={status === 'SCANNING' || status === 'VERIFYING'}>Scan QR</button>
            <span className="scan-status">{status.replaceAll('_', ' ')}</span>
          </div>
          {status === 'UNSUPPORTED' && <p className="notice">This browser does not expose the native QR scanner. Enter the Verification ID below.</p>}
        </div>

        <div className="manual-verify">
          <label><span>Verification ID / Test ID</span><input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verify()} placeholder="VERIFY-TEST-2026-123456" /></label>
          <button className="primary" onClick={() => verify()} disabled={!code.trim() || status === 'VERIFYING'}>Verify record</button>
        </div>

        {result && <div className={`quick-result ${result.verified ? 'ok' : 'review'}`}>
          <div className="quick-result-title"><span>{result.verified ? '✓' : '!'}</span><div><strong>{result.verified ? 'Integrity verified' : 'Review required'}</strong><small>{result.error || 'Server-side evidence and ledger check completed.'}</small></div></div>
          <div className="quick-grid">
            <div><span>Verification ID</span><strong>{result.verification_id || '—'}</strong></div>
            <div><span>Evidence bag</span><strong>{result.evidence_bag_id || '—'}</strong></div>
            <div><span>Outcome</span><strong>{result.result || 'INCONCLUSIVE'}</strong></div>
            <div><span>FSL status</span><strong>{result.fsl_status || 'PENDING'}</strong></div>
            <div className="wide"><span>Record hash</span><strong className="mono">{result.record_hash || '—'}</strong></div>
            <div className="wide"><span>Image SHA-256</span><strong className="mono">{result.image_sha256 || '—'}</strong></div>
          </div>
          <p className="notice">Integrity verification confirms the evidence record has not failed the available cryptographic/ledger checks. Laboratory confirmation remains authoritative.</p>
        </div>}
      </section>
    </main>
  );
}
