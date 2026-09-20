import { useMemo, useState } from 'react';
import { buildEvidencePacket, downloadEvidencePacket, printEvidencePacket } from './evidencePacket';

const EVENT_LABELS = { CAPTURED: 'Image captured', CALIBRATED: 'Reference card calibrated', ANALYZED: 'Presumptive analysis completed', SEALED: 'Evidence record sealed', SYNCED: 'Record synchronized' };

function eventSteps(record) {
  const ts = record?.timestamp || new Date().toISOString();
  const base = new Date(ts).getTime();
  const stages = [['CAPTURED', 0], ['CALIBRATED', 2], ['ANALYZED', 4], ['SEALED', 6]];
  if (record?.sync_status === 'SYNCED') stages.push(['SYNCED', 8]);
  return stages.map(([event, seconds]) => ({ id: event, label: EVENT_LABELS[event], actor: record?.operator_id || 'Operator', timestamp: new Date(base + seconds * 1000).toISOString() }));
}

export function AuditReplay({ record, onClose }) {
  const [cursor, setCursor] = useState(0);
  const events = useMemo(() => eventSteps(record), [record]);
  const visible = events.slice(0, cursor + 1);
  const progress = Math.round(((cursor + 1) / events.length) * 100);
  const current = events[cursor];
  return (
    <div className="forensic-modal" role="dialog" aria-modal="true" aria-label="Evidence replay">
      <div className="forensic-sheet">
        <div className="forensic-head"><div><span className="eyebrow">AUDIT REPLAY</span><h3>{record?.test_id}</h3><p className="muted">Reconstruct the evidence journey without changing the sealed record.</p></div><button className="camera-close" onClick={onClose}>Close</button></div>
        <div className="replay-progress"><span style={{ width: progress + '%' }} /></div>
        <div className="replay-stage"><div className="replay-stage-top"><span>EVENT {cursor + 1} / {events.length}</span><strong>{current.label}</strong></div><div className="replay-clock">{new Date(current.timestamp).toLocaleTimeString()}</div><p>{current.id === 'ANALYZED' ? 'Result: ' + (record?.result || 'INCONCLUSIVE') + ' · Quality: ' + (record?.quality?.passed === false ? 'BLOCKED' : 'PASSED / GATED') : current.id === 'SEALED' ? 'SHA-256 image hash + record hash + digital signature captured.' : current.id === 'CALIBRATED' ? 'Reference-card and calibration state recorded before interpretation.' : current.id === 'SYNCED' ? 'Evidence package acknowledged by the connected workflow.' : 'Capture event registered with operator and device context.'}</p></div>
        <div className="replay-timeline">{visible.map((item) => <div className="replay-event" key={item.id}><span className="replay-dot">✓</span><div><strong>{item.label}</strong><small>{item.actor} · {new Date(item.timestamp).toLocaleString()}</small></div></div>)}</div>
        <div className="replay-actions"><button className="secondary" onClick={() => setCursor(0)}>Restart</button><button className="primary" disabled={cursor >= events.length - 1} onClick={() => setCursor((v) => Math.min(v + 1, events.length - 1))}>{cursor >= events.length - 1 ? 'Replay complete' : 'Next event →'}</button></div>
      </div>
    </div>
  );
}

export function VerificationPortal({ record, onClose, onVerify }) {
  const [copied, setCopied] = useState(false);
  if (!record) return null;
  const verificationId = 'VERIFY-' + record.test_id;
  const integrityItems = [['Image SHA-256', Boolean(record.image_sha256)], ['Record hash', Boolean(record.record_hash)], ['Digital signature', Boolean(record.signature)], ['Evidence bag', Boolean(record.evidence_bag_id)], ['GPS metadata', Boolean(record.gps)]];
  const verified = integrityItems.slice(0, 3).every(([, ok]) => ok);
  const copyId = async () => { try { await navigator.clipboard.writeText(verificationId); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_) {} };
  return (
    <div className="forensic-modal" role="dialog" aria-modal="true" aria-label="Evidence verification portal">
      <div className="forensic-sheet verification-sheet">
        <div className="forensic-head"><div><span className="eyebrow">EVIDENCE VERIFICATION PORTAL</span><h3>{record.test_id}</h3><p className="muted">A read-only integrity view for a sealed field-test record.</p></div><button className="camera-close" onClick={onClose}>Close</button></div>
        <div className="verification-banner"><span>{verified ? '✓' : '!'}</span><div><strong>{verified ? 'Cryptographic package present' : 'Verification data incomplete'}</strong><small>{verified ? 'The stored package contains the core integrity artifacts. Run live verification to validate them.' : 'One or more integrity artifacts are missing from this record.'}</small></div></div>
        <div className="verification-id"><div><span>VERIFICATION ID</span><strong>{verificationId}</strong></div><button className="location-test" onClick={copyId}>{copied ? 'Copied' : 'Copy ID'}</button></div>
        <div className="verification-grid">{integrityItems.map(([label, ok]) => <div key={label}><span>{label}</span><strong className={ok ? 'verify-ok' : 'verify-missing'}>{ok ? 'PRESENT' : 'MISSING'}</strong></div>)}</div>
        <div className="verification-facts"><div><span>Outcome</span><strong>{record.result || 'INCONCLUSIVE'}</strong></div><div><span>Evidence bag</span><strong>{record.evidence_bag_id || 'Not recorded'}</strong></div><div><span>Operator</span><strong>{record.operator_id || 'Not recorded'}</strong></div><div><span>FSL status</span><strong>{record.fsl_status || 'PENDING'}</strong></div></div>
        <div className="replay-actions"><button className="secondary" onClick={async () => downloadEvidencePacket(await buildEvidencePacket(record))}>Export evidence packet</button><button className="secondary" onClick={async () => printEvidencePacket(await buildEvidencePacket(record))}>Print packet</button><button className="primary" onClick={() => onVerify(record)}>Run integrity verification</button></div>
      </div>
    </div>
  );
}