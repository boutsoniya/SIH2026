import { useEffect, useMemo, useRef, useState } from 'react';
import { getEvidence, listEvidence, saveEvidence, syncQueuedEvidence, supportsOfflineStorage } from './offlineQueue';
import { DEMO_RECORDS } from './demoRecords';
import { analyzeImage, checkVisionHealth } from './visionApi';
import { computeRecordHash, sha256Hex, signEvidenceRecord, verifyImageBlob, verifyRecord, verifySignature } from './evidenceCrypto';
import { AuditReplay, VerificationPortal } from './forensicViews';

const steps = ['Capture', 'Calibrate', 'Analyze', 'Evidence'];
const DEMO_CASES = {
  inconclusive: {
    label: 'Faint / uneven colour',
    display_name: 'Faint / uneven',
    family: 'Low-confidence response',
    hex: '#D7C4CF',
    hue_degrees: 320,
    saturation_pct: 10,
    brightness_pct: 85,
    possible_match: 'No reliable reference-card match',
    plain_meaning: 'The colour is too weak or uneven to match reliably.',
    outcome: 'INCONCLUSIVE',
    note: 'Synthetic demo case: the reaction is intentionally weak or uneven, so the workflow asks the officer to recapture or follow the prescribed confirmation process.'
  },
  magenta: {
    label: 'Pink / magenta',
    display_name: 'Pink / magenta',
    family: 'Magenta',
    hex: '#C44876',
    hue_degrees: 337,
    saturation_pct: 58,
    brightness_pct: 77,
    possible_match: 'Example reference-card association: Cocaine',
    plain_meaning: 'The reference card for this example shows a pink / magenta reaction associated with a cocaine target.',
    outcome: 'PRESUMPTIVE_POSITIVE',
    note: 'Synthetic demo association only. The displayed reference-card match is not a chemical identification and depends on the validated kit profile.'
  },
  blue: {
    label: 'Blue',
    display_name: 'Blue',
    family: 'Cyan / Blue',
    hex: '#3A9BC4',
    hue_degrees: 198,
    saturation_pct: 70,
    brightness_pct: 77,
    possible_match: 'Example reference-card association: Amphetamine',
    plain_meaning: 'The reference card for this example shows a blue reaction associated with an amphetamine target.',
    outcome: 'PRESUMPTIVE_POSITIVE',
    note: 'Synthetic demo association only. The displayed reference-card match is not a chemical identification and depends on the validated kit profile.'
  },
  violet: {
    label: 'Purple / violet',
    display_name: 'Purple / violet',
    family: 'Purple',
    hex: '#8E72B2',
    hue_degrees: 267,
    saturation_pct: 36,
    brightness_pct: 70,
    possible_match: 'Example reference-card association: MDMA',
    plain_meaning: 'The reference card for this example shows a purple / violet reaction associated with an MDMA target.',
    outcome: 'PRESUMPTIVE_POSITIVE',
    note: 'Synthetic demo association only. The displayed reference-card match is not a chemical identification and depends on the validated kit profile.'
  },
  green: {
    label: 'Green',
    display_name: 'Green',
    family: 'Green',
    hex: '#6AA861',
    hue_degrees: 113,
    saturation_pct: 42,
    brightness_pct: 66,
    possible_match: 'Example reference-card association: Cannabis',
    plain_meaning: 'The reference card for this example shows a green reaction associated with a cannabis target.',
    outcome: 'PRESUMPTIVE_POSITIVE',
    note: 'Synthetic demo association only. The displayed reference-card match is not a chemical identification and depends on the validated kit profile.'
  },
  yellow: {
    label: 'Yellow',
    display_name: 'Yellow',
    family: 'Yellow',
    hex: '#E4CE75',
    hue_degrees: 50,
    saturation_pct: 49,
    brightness_pct: 89,
    possible_match: 'Example reference-card association: No significant change / negative control',
    plain_meaning: 'The reaction stays near the expected baseline colour for this example.',
    outcome: 'PRESUMPTIVE_NEGATIVE',
    note: 'Synthetic demo association only. Use the validated kit interpretation rather than treating colour alone as proof.'
  }
};

function makeDemoAnalysis(key) {
  const demo = DEMO_CASES[key] || DEMO_CASES.inconclusive;
  return {
    status: 'offline_demo',
    model_status: 'simulated',
    result: demo.outcome,
    confidence: null,
    quality: { passed: true, width: 1280, height: 720, brightness: 126.4, sharpness: 248.7, checks: { resolution: true, brightness: true, sharpness: true } },
    reference_card: [0, 0, 1, 1],
    calibration: { status: 'ready', method: 'offline_demo' },
    roi: [0, 0, 1, 1],
    features: { features: { mean_h: demo.hue_degrees / 2, mean_s: demo.saturation_pct * 2.55, mean_v: demo.brightness_pct * 2.55 } },
    color_interpretation: {
      status: 'demo',
      display_name: demo.display_name,
      family: demo.family,
      description: 'Synthetic offline-demo colour observation shown to demonstrate the interpretation workflow.',
      hex: demo.hex,
      hue_degrees: demo.hue_degrees,
      saturation_pct: demo.saturation_pct,
      brightness_pct: demo.brightness_pct,
      possible_match: demo.possible_match
    },
    demo_case: demo.label,
    demo_note: demo.note,
    explanation: demo.note
  };
}


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
  const [demoCase, setDemoCase] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const [captureCoach, setCaptureCoach] = useState({ status: 'WAITING', score: 0, checks: { brightness: false, contrast: false, sharpness: false, stability: false }, tips: ['Start the camera and hold the device steady.'] });
  const [operatorId, setOperatorId] = useState('DEMO-OPERATOR-001');
  const [testId, setTestId] = useState(() => `TEST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`);
  const [testKit, setTestKit] = useState('Standard colorimetric field-test profile');
  const [evidenceBagId, setEvidenceBagId] = useState('BAG-DEMO-2026-001');
  const [reagentQr, setReagentQr] = useState('{"kit":"DEMO-KIT","lot":"LOT-DEMO-001","expires":"2027-12-31"}');
  const [locationStatus, setLocationStatus] = useState('not captured');
  const [previewUrl, setPreviewUrl] = useState('');
  const [latestEvidence, setLatestEvidence] = useState(null);
  const [replayRecord, setReplayRecord] = useState(null);
  const [verificationRecord, setVerificationRecord] = useState(null);

  const demoPalette = [
    { key: 'yellow', label: 'Yellow', hex: DEMO_CASES.yellow.hex },
    { key: 'magenta', label: 'Pink / magenta', hex: DEMO_CASES.magenta.hex },
    { key: 'violet', label: 'Purple / violet', hex: DEMO_CASES.violet.hex },
    { key: 'blue', label: 'Blue', hex: DEMO_CASES.blue.hex },
    { key: 'green', label: 'Green', hex: DEMO_CASES.green.hex },
    { key: 'inconclusive', label: 'Faint / uneven', hex: DEMO_CASES.inconclusive.hex },
  ];

  const queued = useMemo(() => records.filter((record) => ['QUEUED', 'FAILED', 'SYNCING'].includes(record.sync_status)).length, [records]);
  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query || `${record.test_id} ${record.operator_id} ${record.test_kit || ''} ${record.result} ${record.sync_status}`.toLowerCase().includes(query);
      const matchesFilter = filter === 'ALL' || record.result === filter || record.sync_status === filter || record.integrity_status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [records, search, filter]);

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const openCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Device camera is not available in this browser. Use the image upload option instead.');
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      setCameraActive(true);
      setCaptureCoach({ status: 'CHECKING', score: 0, checks: { brightness: false, contrast: false, sharpness: false, stability: false }, tips: ['Checking live image quality…'] });
      requestAnimationFrame(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      });
    } catch (error) {
      setCameraError(error?.message || 'Camera permission was denied or the camera could not be opened.');
      setCameraOpen(false);
      setCameraActive(false);
    }
  };

  const evaluateLiveFrame = () => {
    const video = cameraVideoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    const canvas = cameraCanvasRef.current || document.createElement('canvas');
    cameraCanvasRef.current = canvas;
    const width = 320; const height = Math.max(180, Math.round((video.videoHeight / video.videoWidth) * width));
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data; const gray = new Float32Array(width * height);
    let sum = 0, sumSq = 0, edges = 0, glare = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4; const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[y * width + x] = g; sum += g; sumSq += g * g;
      if (data[i] > 248 && data[i + 1] > 248 && data[i + 2] > 248) glare++;
    }
    const n = width * height; const mean = sum / n; const variance = Math.max(0, sumSq / n - mean * mean);
    for (let y = 1; y < height; y++) for (let x = 1; x < width; x++) edges += Math.abs(gray[y * width + x] - gray[y * width + x - 1]) + Math.abs(gray[y * width + x] - gray[(y - 1) * width + x]);
    const brightness = mean >= 45 && mean <= 215; const contrast = variance >= 350; const sharpness = edges / n >= 9; const glareOk = glare / n < 0.12;
    const passed = brightness && contrast && sharpness && glareOk; const tips = [];
    if (!brightness) tips.push(mean < 45 ? 'Too dark — move to brighter, even light.' : 'Too bright — avoid direct light on the reaction.');
    if (!contrast) tips.push('Low contrast — keep the reaction and reference card clearly visible.');
    if (!sharpness) tips.push('Hold steady — image appears soft or blurred.');
    if (!glareOk) tips.push('Glare detected — tilt the phone or reagent slightly.');
    if (!tips.length) tips.push('Capture conditions look stable. Keep the reference card and reaction area aligned.');
    setCaptureCoach({ status: passed ? 'READY' : 'ADJUST', score: Math.round(([brightness, contrast, sharpness, glareOk].filter(Boolean).length / 4) * 100), checks: { brightness, contrast, sharpness, stability: glareOk }, tips });
  };

  const captureFromCamera = () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera preview is not ready yet. Please wait a moment and try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Camera capture is unavailable in this browser.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('The camera frame could not be captured.');
        return;
      }
      const captured = new File([blob], 'narcoscope-camera-capture.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      setFile(captured);
      setCameraOpen(false);
      stopCamera();
      setCameraError('');
      setAnalysisError('');
    }, 'image/jpeg', 0.92);
  };

  useEffect(() => {
    if (!cameraOpen || !cameraActive) return undefined;
    const timer = window.setInterval(evaluateLiveFrame, 650);
    return () => window.clearInterval(timer);
  }, [cameraOpen, cameraActive]);
  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!file) { setPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const startOfflineDemo = () => {
    setDemoCase('');
    setAnalysis(null);
    setOffline(true);
    setAnalysisError('');
    setIntegrityMessage('Offline demo ready. Match the observed reaction colour to the reference card.');
    setStep(1);
  };

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
      const result = await analyzeImage(file, { reagentQr, evidenceBagId });
      setAnalysis(result);
      setOffline(false);
      if (result?.status === 'quality_rejected') {
        setAnalysisError(result.next_action || 'Quality gate halted the workflow. Recapture with better framing and lighting.');
        setStep(0);
        return;
      }
      setStep(1);
    } catch (error) {
      setAnalysisError(`${error.message} You can continue with the offline workflow and create an INCONCLUSIVE record.`);
      setOffline(true);
    } finally { setAnalyzing(false); }
  };

  const captureGps = () => new Promise((resolve) => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      resolve(null);
      return;
    }

    setLocationStatus('capturing');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gps = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy_m: Number(position.coords.accuracy.toFixed(1)),
        };
        setLocationStatus('captured');
        resolve(gps);
      },
      (error) => {
        const reason = {
          1: 'permission denied',
          2: 'location unavailable',
          3: 'location request timed out',
        }[error?.code] || 'location unavailable';
        setLocationStatus(reason);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });

  const testGps = async () => {
    const gps = await captureGps();
    setIntegrityMessage(
      gps
        ? `GPS ready for this evidence record (accuracy ±${gps.accuracy_m} m).`
        : 'GPS could not be captured. Turn on device Location, allow browser access for this site, and try again.'
    );
  };

  const createEvidence = async () => {
    setIntegrityMessage('Capturing location and sealing the evidence record…');
    const image_sha256 = file ? await sha256Hex(file) : null;
    const gps = await captureGps();

    const baseRecord = {
      test_id: testId.trim() || `TEST-${Date.now().toString().slice(-6)}`,
      operator_id: operatorId.trim() || 'UNSPECIFIED-OPERATOR',
      timestamp: new Date().toISOString(),
      gps,
      test_type: 'COLORIMETRIC',
      test_kit: testKit,
      evidence_bag_id: evidenceBagId.trim() || null,
      reagent_qr: reagentQr.trim() || null,
      reagent: analysis?.reagent || null,
      anti_spoof: analysis?.anti_spoof || null,
      calibration: analysis?.calibration || null,
      color_distance: analysis?.color_distance || null,
      result: analysis?.result || 'INCONCLUSIVE',
      confidence: analysis?.confidence ?? null,
      image_sha256,
      signature: null,
      sync_status: 'QUEUED',
      integrity_status: 'UNVERIFIED',
      analysis_status: analysis?.status || 'offline_demo',
      quality: analysis?.quality || null,
      capture_device: {
        user_agent: navigator.userAgent,
        platform: navigator.platform || 'unknown',
        language: navigator.language || 'unknown',
      },
      chain_of_custody: [
        {
          event: 'CAPTURED',
          timestamp: new Date().toISOString(),
          actor: operatorId.trim() || 'UNSPECIFIED-OPERATOR',
        },
        {
          event: 'SEALED',
          timestamp: new Date().toISOString(),
          actor: operatorId.trim() || 'UNSPECIFIED-OPERATOR',
        },
      ],
    };

    const record = await signEvidenceRecord(baseRecord);
    await saveEvidence(record, file || null);
    setLatestEvidence(record);

    const locationNote = gps ? 'GPS captured.' : 'GPS unavailable or permission was denied; record retained with GPS marked unavailable.';
    const signatureNote = record.signature ? 'ECDSA signature created.' : 'Signature unavailable.';
    await refreshQueue();
    setIntegrityMessage(`Evidence sealed locally. Image SHA-256 + record hash + ECDSA signature created. Chain-of-custody captured. ${locationNote} ${signatureNote}`);
    setStep(3);
  };

  const verifyEvidence = async (record) => {
    setIntegrityMessage('Verifying evidence…');
    try {
      const stored = await getEvidence(record.test_id);
      const target = stored || record;
      const recordCheck = await verifyRecord(target);
      const signatureCheck = await verifySignature(target);
      const imageCheck = target?.image_blob && target?.image_sha256 ? await verifyImageBlob(target.image_blob, target.image_sha256) : { valid: null, reason: 'image_not_stored' };
      const valid = recordCheck.valid && signatureCheck.valid && (imageCheck.valid !== false);

      setIntegrityMessage(
        valid
          ? `✓ ${record.test_id}: record hash, image hash and digital signature all verify.`
          : `⚠ ${record.test_id}: verification failed — review record hash, signature, or captured image.`
      );

      if (valid && stored) {
        setRecords((current) => current.map((item) => item.test_id === record.test_id ? { ...item, integrity_status: 'VERIFIED', signature_status: 'SIGNED_VERIFIED' } : item));
      }
    } catch (error) {
      setIntegrityMessage(`Verification error: ${error.message}`);
    }
  };

  const syncNow = async () => {
    if (syncing || !storageReady) return;
    setSyncing(true);
    try { await syncQueuedEvidence(); setLastSync(new Date()); await refreshQueue(); } finally { setSyncing(false); }
  };

  const next = () => { stopCamera(); setStep((value) => Math.min(value + 1, steps.length - 1)); };

  return (
    <main className="shell">
      <header className="topbar">
        <div><span className="eyebrow">FIELD OPERATIONS</span><h1>NARCOSCOPE</h1></div>
        <div className="topbar-actions"><button className="queue-pill" onClick={() => setStep(3)}><strong>{queued}</strong> queued</button><button className="status" onClick={() => setOffline(!offline)}><span className={`dot ${offline ? 'offline' : 'online'}`} />{offline ? 'Offline queue' : 'Connected'}</button></div>
      </header>

      <section className="hero"><div><p className="eyebrow">DIGITAL COMPANION FOR FIELD DRUG TESTING</p><h2>Capture evidence.<br />Make the uncertainty visible.</h2><p className="muted">A field-first workflow for guided capture, colour calibration, presumptive analysis and tamper-evident records.</p></div><div className="hero-card"><span>VISION SERVICE</span><strong>{visionStatus}</strong><small>FastAPI + OpenCV pipeline</small></div></section>

      <nav className="steps">{steps.map((label, index) => <button key={label} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>)}</nav>

      {cameraOpen && <div className="camera-modal" role="dialog" aria-modal="true" aria-label="NARCOSCOPE camera capture">
        <div className="camera-sheet">
          <div className="camera-sheet-head">
            <div>
              <span className="eyebrow">STEP 01 · LIVE CAMERA</span>
              <h3>Align the test before capture</h3>
              <p className="muted">Keep both the reference card and reaction area inside the frame. The card is used as the calibration reference.</p>
            </div>
            <button className="camera-close" onClick={() => { stopCamera(); setCameraOpen(false); }}>Close</button>
          </div>
          <div className="camera-stage">
            <video ref={cameraVideoRef} className="camera-video" playsInline muted autoPlay />
            <div className="camera-overlay">
              <div className="reference-zone">REFERENCE CARD</div>
              <div className="reaction-zone">REACTION AREA</div>
              <div className="camera-crosshair">+</div>
            </div>
          </div>
          <div className="camera-checks">
            <span>✓ Reference card visible</span>
            <span>✓ Reaction area visible</span>
            <span>✓ Avoid glare / blur</span>
          </div>
          <div className="camera-sheet-actions">
            <button className="secondary" onClick={() => { stopCamera(); setCameraOpen(false); }}>Cancel</button>
            <div className="live-coach"><div className="live-coach-head"><span className="section-label">LIVE CAPTURE COACH</span><strong className={captureCoach.status === 'READY' ? 'coach-ready' : 'coach-adjust'}>{captureCoach.status} · {captureCoach.score}/100</strong></div><div className="coach-checks"><span className={captureCoach.checks.brightness ? 'ok' : ''}>Brightness</span><span className={captureCoach.checks.contrast ? 'ok' : ''}>Contrast</span><span className={captureCoach.checks.sharpness ? 'ok' : ''}>Sharpness</span><span className={captureCoach.checks.stability ? 'ok' : ''}>Glare / stability</span></div><div className="coach-tips">{captureCoach.tips.map((tip) => <div key={tip}>• {tip}</div>)}</div></div>
            <button className="primary" onClick={captureFromCamera} disabled={!cameraActive || captureCoach.status !== 'READY'}>{captureCoach.status === 'READY' ? 'Capture image' : 'Adjust to capture'}</button>
          </div>
        </div>
      </div>}

      <section className="workspace">
        {step === 0 && <div className="panel capture">
          <div className="capture-frame">
            <div className="guide-card">REFERENCE CARD</div>
            <div className="guide-kit">TEST KIT<br /><small>ALIGN INSIDE FRAME</small></div>
            <div className="crosshair">+</div>
          </div>
          <div className="capture-controls">
            <div>
              <span className="eyebrow">STEP 01</span>
              <h3>Guided capture</h3>
              <p className="muted">Use the device camera to capture the reaction. Keep the reference colour card and test reaction area visible together so the vision pipeline can use the card for calibration.</p>
            </div>
            <div className="camera-actions">
              <button className="primary camera-open-button" onClick={openCamera}>{file ? 'Retake with device camera' : 'Open device camera'}</button>
              <label className="upload">{file?.name || 'Choose image from device'}<input type="file" accept="image/*" capture="environment" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
            </div>
            {file && <div className="capture-selected">Selected: <strong>{file.name}</strong></div>}
            <div className="capture-guidance">
              <span className="section-label">IN-FRAME CHECK</span>
              <span>1. Reference card visible · 2. Reaction area visible · 3. Avoid glare and blur</span>
            </div>
            {cameraError && <div className="notice">{cameraError}</div>}
            <div className="setup-grid"><label className="field-input"><span className="section-label">TEST / CASE ID</span><input value={testId} onChange={(event) => setTestId(event.target.value.toUpperCase())} placeholder="TEST-2026-000184" /></label><label className="field-input"><span className="section-label">TEST KIT / PROFILE</span><select value={testKit} onChange={(event) => setTestKit(event.target.value)}><option>Standard colorimetric field-test profile</option><option>Demonstration reference profile</option><option>Validated kit profile (configured)</option></select></label><label className="field-input"><span className="section-label">EVIDENCE BAG / BARCODE ID</span><input value={evidenceBagId} onChange={(event) => setEvidenceBagId(event.target.value)} placeholder="BAG-NCB-2026-001" /></label><label className="field-input"><span className="section-label">REAGENT QR PAYLOAD</span><input value={reagentQr} onChange={(event) => setReagentQr(event.target.value)} placeholder='{"kit":"SCOTT","lot":"LOT-123","expires":"2027-06-30"}' /></label></div>
            <label className="field-input"><span className="section-label">OPERATOR ID</span><input value={operatorId} onChange={(event) => setOperatorId(event.target.value)} placeholder="e.g. OFFICER-042" /></label>
            <div className="location-row"><div className={`location-chip location-${locationStatus.replaceAll(' ', '-')} `}>GPS: {locationStatus === 'not captured' ? 'will capture when evidence is saved' : locationStatus}</div><button className="location-test" onClick={testGps} type="button">Test GPS access</button></div>
            {analysisError && <div className="notice">{analysisError}</div>}
            <button className="primary" onClick={runAnalysis} disabled={analyzing || !file}>{analyzing ? 'Analyzing…' : 'Run vision quality gate →'}</button>
            <button className="secondary" onClick={startOfflineDemo}>Use offline demo workflow</button>
          </div>
        </div>}

        {step === 1 && <div className="panel split">
          <div className="calibration-visual">
            <div className="demo-preview">
              <div className="demo-preview-head"><span className={offline ? "live-chip" : "live-chip live-chip-live"}>● {offline ? "OFFLINE DEMO" : "LIVE CAPTURE"}</span><span>{offline ? "REFERENCE CARD VIEW" : "CAPTURED IMAGE REVIEW"}</span></div>
              {offline ? <><div className="demo-card">
                <div className="demo-card-brand">NARCOSCOPE</div>
                <div className="demo-card-title">REFERENCE COLOUR CARD</div>
                <div className="demo-swatches">{demoPalette.map(({ key, hex }) => <button type="button" key={key} className={demoCase === key ? 'demo-swatch selected' : 'demo-swatch'} style={{ background: hex }} onClick={() => { setDemoCase(key); setAnalysis(makeDemoAnalysis(key)); }} aria-label={`Select ${DEMO_CASES[key].display_name}`} />)}</div>
              </div>
              <div className="demo-test-kit"><div className="kit-brand">NARCOSCOPE</div><div className="kit-window">{demoCase ? <span style={{ background: DEMO_CASES[demoCase].hex }} /> : <span className="unselected-dot" />}</div><div className="kit-well" /></div></> : <div className="captured-image-wrap"><img src={previewUrl} alt="Captured field test" /><div className="image-target reference-target">REFERENCE CARD</div><div className="image-target reaction-target">REACTION AREA</div></div>}
              <div className="demo-preview-foot">{offline ? <><span>Image quality: Good</span><span>Card: Detected</span><span>Colour match: {demoCase ? 'Selected' : 'Waiting'}</span></> : <><span>Image: {analysis?.quality?.passed ? 'Ready' : 'Review'}</span><span>Card: {analysis?.reference_card ? 'Detected' : 'Not detected'}</span><span>ROI: {analysis?.roi ? 'Detected' : 'Not detected'}</span></>}</div>
            </div>
          </div>
          <div>
            <span className="eyebrow">STEP 02</span>
            <div className="offline-badge">{offline ? "OFFLINE DEMO / SIMULATED CALIBRATION" : "LIVE IMAGE / SERVER ANALYSIS"}</div>
            <h3>{offline ? "Match the reaction colour" : "Review capture & calibration"}</h3>
            <p className="muted">{offline ? "Match the reaction area to the reference colour card. The demo deliberately waits for your selection." : "NARCOSCOPE has already run the image quality gate and reference-card candidate detection. Review the capture quality before moving to the presumptive interpretation."}</p>

            {!offline && <div className="quality-summary">
              <div><span className="section-label">IMAGE</span><strong>{analysis?.quality?.width || '—'} × {analysis?.quality?.height || '—'}</strong><small>resolution</small></div>
              <div><span className="section-label">BRIGHTNESS</span><strong>{analysis?.quality?.brightness ?? '—'}</strong><small>mean intensity</small></div>
              <div><span className="section-label">SHARPNESS</span><strong>{analysis?.quality?.sharpness ?? '—'}</strong><small>Laplacian variance</small></div>
              <div><span className="section-label">CALIBRATION</span><strong>{analysis?.calibration?.status || '—'}</strong><small>reference baseline</small></div>
            </div>}

            {!offline && <div className="professional-section">
              <div className="section-header-row"><div><span className="section-label">AUTOMATED OBSERVATION</span><strong>{analysis?.color_interpretation?.display_name || 'Colour not available'}</strong></div><span className="selection-status">{analysis?.color_interpretation ? 'MEASURED' : 'REVIEW'}</span></div>
              <div className="match-summary">
                <div className="match-preview">{analysis?.color_interpretation?.hex ? <span style={{ background: analysis.color_interpretation.hex }} /> : <span className="empty-match">?</span>}</div>
                <div><strong>{analysis?.color_interpretation?.family || 'Reaction colour awaiting review'}</strong><p>{analysis?.color_interpretation?.description || 'The reaction ROI could not be interpreted from the current image.'}</p></div>
              </div>
              {analysis?.quality?.capture_guidance?.length > 0 && <div className="capture-coach"><span className="section-label">CAPTURE COACH</span>{analysis.quality.capture_guidance.map((tip) => <div key={tip}>• {tip}</div>)}</div>}
            </div>}

            {offline && <div className="professional-section">
              <div className="section-header-row"><div><span className="section-label">1 · SELECT OBSERVED COLOUR</span><strong>{demoCase ? DEMO_CASES[demoCase].display_name : 'Nothing selected yet'}</strong></div><span className="selection-status">{demoCase ? 'MATCHED' : 'SELECT ONE'}</span></div>
              <div className="colour-choice-grid">{demoPalette.map(({ key, label, hex }) => <button type="button" key={key} className={demoCase === key ? 'colour-choice selected' : 'colour-choice'} onClick={() => { setDemoCase(key); setAnalysis(makeDemoAnalysis(key)); }}><span className="choice-swatch" style={{ background: hex }} /><span>{label}</span>{demoCase === key && <span className="choice-check">✓</span>}</button>)}</div>
            </div>}

            {offline && <div className="professional-section">
              <span className="section-label">2 · REFERENCE CARD INTERPRETATION</span><div className="interpretation-warning">Reference-card match ≠ confirmed substance</div>
              <div className="match-summary">
                <div className="match-preview">{demoCase ? <span style={{ background: DEMO_CASES[demoCase].hex }} /> : <span className="empty-match">?</span>}</div>
                <div><strong>{demoCase ? DEMO_CASES[demoCase].possible_match : 'Choose a colour to see the example association'}</strong><p>{demoCase ? DEMO_CASES[demoCase].plain_meaning : 'This demo deliberately does not preselect a colour. The officer makes the visual match first.'}</p></div>
              </div>
            </div>}

            {!offline && <div className="professional-section">
              <span className="section-label">REFERENCE-CARD CALIBRATION</span><div className="match-summary"><div className="match-preview"><span className="empty-match">✓</span></div><div><strong>{analysis?.calibration?.status === 'ready' ? 'Baseline captured' : 'Calibration requires review'}</strong><p>{analysis?.calibration?.method || 'Reference-card calibration status returned by the vision service.'}</p></div></div>
            </div>}

            <div className="metrics"><div><strong>{analysis?.quality?.passed ? 'PASS' : 'REVIEW'}</strong><span>image quality</span></div><div><strong>{analysis?.reference_card ? 'FOUND' : 'REVIEW'}</strong><span>reference card</span></div><div><strong>{offline ? (demoCase ? 'READY' : 'WAITING') : (analysis?.roi ? 'FOUND' : 'REVIEW')}</strong><span>{offline ? 'colour match' : 'reaction ROI'}</span></div></div>

            {offline && <div className="notice">Offline demo uses synthetic colour cases to demonstrate the interaction. Colour associations are illustrative and kit-specific; they are not chemical identifications.</div>}
            {!offline && analysis?.quality?.passed && !analysis?.reference_card && <div className="notice">The image quality passed, but the reference card could not be detected. Recapture with the full reference card visible before relying on colour interpretation.</div>}
            <button className="primary" onClick={next} disabled={offline ? !demoCase : !analysis}>Continue to analysis →</button>
          </div>
        </div>}

        {step === 2 && <div className="panel result">
          <div className="result-badge">PRESUMPTIVE FIELD RESULT</div>
          <h3>What the camera observed</h3>
          <p className="muted">NARCOSCOPE separates the observed colour from the final substance decision. Colour alone is not treated as proof of a substance.</p>

          <div className="observation-card">
            <div className="colour-swatch" style={{ background: analysis?.color_interpretation?.hex || '#9AA6B2' }} />
            <div className="observation-copy">
              <span className="section-label">OBSERVED REACTION COLOUR</span>
              <strong>{analysis?.color_interpretation?.display_name || 'Not available'}</strong>
              <span>{analysis?.color_interpretation?.description || 'No reaction colour could be measured from the detected ROI.'}</span>
            </div>
            <div className="colour-stats">
              <span><b>{analysis?.color_interpretation?.hue_degrees != null ? analysis.color_interpretation.hue_degrees + '°' : '—'}</b> hue</span>
              <span><b>{analysis?.color_interpretation?.saturation_pct != null ? analysis.color_interpretation.saturation_pct + '%' : '—'}</b> saturation</span>
              <span><b>{analysis?.color_interpretation?.brightness_pct != null ? analysis.color_interpretation.brightness_pct + '%' : '—'}</b> brightness</span>
            </div>
          </div>

          <div className="interpretation-grid">
            <div className="interpretation-card">
              <span className="section-label">REFERENCE CARD</span>
              <strong>{analysis?.color_interpretation?.family || 'Not available'} family</strong>
              <p>Compare this response with the physical, kit-specific reference card before assigning a substance interpretation.</p>
            </div>
            <div className="interpretation-card">
              <span className="section-label">POSSIBLE MEANING</span>
              <strong>Kit-specific reaction</strong>
              <p>The same colour family can have different meanings across reagent kits. A validated kit profile is required for substance-level interpretation.</p>
            </div>
            <div className="interpretation-card">
              <span className="section-label">CURRENT DECISION</span>
              <strong>{analysis?.status === 'offline_demo' ? 'SIMULATED ' + (analysis?.result || 'INCONCLUSIVE') : (analysis?.result || 'INCONCLUSIVE')}</strong>
              <p>{analysis?.status === 'offline_demo' ? 'Offline demo scenario only — not a real substance detection.' : analysis?.confidence != null ? 'Model confidence: ' + Math.round(analysis.confidence * 100) + '%.' : 'No validated kit-specific classifier is active in this prototype.'}</p>
            </div>
          </div>

          <div className="metrics">
            <div><strong>{analysis?.quality?.passed ? 'PASS' : '—'}</strong><span>quality gate</span></div>
            <div><strong>{analysis?.reference_card ? 'YES' : '—'}</strong><span>reference card</span></div>
            <div><strong>{analysis?.roi ? 'FOUND' : '—'}</strong><span>reaction ROI</span></div>
          </div>

          <div className="help-box">
            <div className="help-icon">?</div>
            <div><span className="section-label">WHAT DOES THIS MEAN?</span><strong>{analysis?.color_interpretation?.display_name || 'Observed reaction'} is what the camera measured in the reaction area.</strong><p>{analysis?.color_interpretation?.plain_meaning || 'Compare the observed colour with the physical reference card for the selected test kit.'} Do not treat colour alone as a confirmed identification.</p></div>
          </div>

          <div className="analysis-basis">
            <div className="section-header-row"><div><span className="section-label">HOW THIS RESULT WAS DERIVED</span><strong>{analysis?.status === 'offline_demo' ? 'Demonstration pathway' : 'Vision pipeline pathway'}</strong></div><span className="selection-status">{analysis?.status === 'offline_demo' ? 'SIMULATED' : 'REVIEWABLE'}</span></div>
            <div className="basis-grid">
              <div><b>{analysis?.quality?.passed ? '✓' : '!'}</b><span>Image quality<br /><small>{analysis?.quality?.passed ? 'meets gate' : 'requires review'}</small></span></div>
              <div><b>{analysis?.reference_card ? '✓' : '!'}</b><span>Reference card<br /><small>{analysis?.reference_card ? 'candidate detected' : 'not detected'}</small></span></div>
              <div><b>{analysis?.calibration?.status === 'ready' ? '✓' : '!'}</b><span>Calibration<br /><small>{analysis?.calibration?.status || 'review needed'}</small></span></div>
              <div><b>{analysis?.roi ? '✓' : '!'}</b><span>Reaction area<br /><small>{analysis?.roi ? 'ROI detected' : 'not detected'}</small></span></div>
              <div><b>{analysis?.features?.features ? '✓' : '!'}</b><span>Colour features<br /><small>{analysis?.features?.features ? 'HSV / LAB measured' : 'not available'}</small></span></div>
            </div>
          </div>

          <div className="next-action">
            <span className="section-label">RECOMMENDED NEXT STEP</span>
            <strong>{analysis?.result === 'INCONCLUSIVE' ? 'Compare the observed colour with the kit reference card, then confirm presumptive findings through the prescribed laboratory workflow.' : 'Record the presumptive result and retain the original image and evidence metadata for verification.'}</strong>
          </div>

          <div className="notice"><strong>{analysis?.status === 'offline_demo' ? 'SIMULATED DEMO RESULT.' : 'Presumptive field result.'}</strong> {analysis?.status === 'offline_demo' ? 'This offline scenario is illustrative and does not indicate that the named substance is present.' : 'This digital interpretation supports field testing; it does not replace laboratory confirmation.'} {analysis?.demo_note || analysis?.explanation || 'The current prototype has no validated kit-specific model attached, so the safe result remains INCONCLUSIVE.'}</div>
          {analysis?.roi && <p className="sync-note">Reaction ROI: {analysis.roi.join(', ')} · Features extracted: {Object.keys(analysis.features?.features || {}).length}</p>}
          <button className="primary" onClick={createEvidence}>Create evidence record →</button>
        </div>}

        {step === 3 && <div className="panel evidence"><div className="evidence-heading"><div><span className="eyebrow">COMMAND CENTER</span><h3>Evidence history</h3><p className="muted">Searchable local history for demo records and field-captured evidence.</p></div><button className="sync-button" onClick={syncNow} disabled={syncing || !storageReady}>{syncing ? 'Syncing…' : 'Sync queue'}</button></div><div className="history-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search test ID, operator, result…" /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All records</option><option value="INCONCLUSIVE">Inconclusive</option><option value="PRESUMPTIVE_POSITIVE">Presumptive positive</option><option value="PRESUMPTIVE_NEGATIVE">Presumptive negative</option><option value="QUEUED">Queued</option><option value="SYNCED">Synced</option><option value="VERIFIED">Integrity verified</option></select></div><div className="history-list">{visibleRecords.length ? visibleRecords.map((record) => <article className="history-row" key={record.test_id}><div><strong>{record.test_id}</strong><span>{record.operator_id} · {record.test_kit || 'Colorimetric profile'} · {new Date(record.timestamp).toLocaleString()}</span></div><div className="history-tags"><span className={`tag result-${record.result.toLowerCase()}`}>{record.result.replaceAll('_', ' ')}</span><span className="tag">{record.integrity_status}</span><span className="tag">{record.sync_status}</span><span className="tag">{record.signature ? 'SIGNED' : 'UNSIGNED'}</span>{record.gps ? <span className="tag">GPS</span> : <span className="tag">GPS N/A</span>}{record.image_sha256 && <button className="tag verify-tag" onClick={() => verifyEvidence(record)}>Verify</button>}<button className="tag forensic-action" onClick={() => setReplayRecord(record)}>Replay</button><button className="tag forensic-action" onClick={() => setVerificationRecord(record)}>Evidence portal</button></div></article>) : <div className="empty-state">No evidence records match this search.</div>}</div>{integrityMessage && <div className="notice">{integrityMessage}</div>}{latestEvidence && <div className="evidence-certificate">
  <div className="certificate-top"><div><span className="eyebrow">SEALED TEST RECORD</span><h4>{latestEvidence.test_id}</h4></div><span className="verified-pill">SIGNED</span></div>
  <div className="certificate-grid">
    <div><span>Operator</span><strong>{latestEvidence.operator_id}</strong></div>
    <div><span>Test kit</span><strong>{latestEvidence.test_kit || 'Colorimetric profile'}</strong></div>
    <div><span>Date / time</span><strong>{new Date(latestEvidence.timestamp).toLocaleString()}</strong></div>
    <div><span>GPS</span><strong>{latestEvidence.gps ? latestEvidence.gps.latitude + ', ' + latestEvidence.gps.longitude : 'Unavailable'}</strong></div>
    <div><span>Image SHA-256</span><strong>{latestEvidence.image_sha256 ? latestEvidence.image_sha256.slice(0,16) + '…' : 'Not available'}</strong></div>
    <div><span>Record hash</span><strong>{latestEvidence.record_hash ? latestEvidence.record_hash.slice(0,16) + '…' : 'Not available'}</strong></div>
  </div>
  <div className="certificate-status"><span>Integrity chain</span><strong>Image hash · Record hash · ECDSA signature</strong><button className="location-test" onClick={() => verifyEvidence(latestEvidence)} type="button">Verify sealed record</button><button className="location-test danger-test" onClick={async () => { const tampered={...latestEvidence, operator_id: latestEvidence.operator_id + '-CHANGED'}; const a=await verifyRecord(tampered); const b=await verifySignature(tampered); setIntegrityMessage(a.valid && b.valid ? 'Unexpected: tampered copy still verified.' : 'Tamper simulation: the modified copy failed integrity verification. Original sealed record was not changed.'); }} type="button">Simulate tamper</button></div>
</div>}

<div className="sync-panel"><div><strong>Offline evidence queue</strong><span>Records remain local until sync is confirmed.</span></div><span className="sync-count">{queued} pending</span></div>{lastSync && <p className="sync-note">Last local sync: {lastSync.toLocaleTimeString()}</p>}<button className="primary" onClick={() => setStep(0)}>Start another test ↗</button></div>}
      </section>
      {replayRecord && <AuditReplay record={replayRecord} onClose={() => setReplayRecord(null)} />}
      {verificationRecord && <VerificationPortal record={verificationRecord} onClose={() => setVerificationRecord(null)} onVerify={async (record) => { await verifyEvidence(record); setVerificationRecord(null); }} />}
    </main>
  );
}
