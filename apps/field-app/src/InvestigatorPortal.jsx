import { useState } from 'react';

export default function InvestigatorPortal() {
  const [id, setId] = useState('');
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const verify = async () => {
    const testId = id.trim().replace(/^VERIFY-/, '');
    if (!testId) return;
    setLoading(true); setState(null);
    try {
      const response = await fetch(`/api/evidence/verify/${encodeURIComponent(testId)}`);
      const data = await response.json();
      setState(data);
    } catch (error) {
      setState({ verified: false, status: 'NETWORK_ERROR', reason: error.message });
    } finally { setLoading(false); }
  };
  return (
    <section className="investigator-portal">
      <div className="portal-header"><span className="eyebrow">INDEPENDENT VERIFICATION</span><h2>Evidence verification</h2><p className="muted">Enter a Verification ID or Test ID to inspect the server-side integrity receipt. This view does not alter the sealed evidence.</p></div>
      <div className="portal-search"><input value={id} onChange={(e) => setId(e.target.value)} placeholder="VERIFY-TEST-2026-123456" onKeyDown={(e) => e.key === 'Enter' && verify()} /><button className="primary" onClick={verify} disabled={loading}>{loading ? 'Checking…' : 'Verify record'}</button></div>
      {state && <div className={`portal-result ${state.verified ? 'verified' : 'review'}`}>
        <div className="portal-result-head"><span className="portal-icon">{state.verified ? '✓' : '!'}</span><div><strong>{state.verified ? 'Evidence integrity verified' : 'Verification requires review'}</strong><small>{state.status}</small></div></div>
        <div className="portal-grid">
          <div><span>Verification ID</span><strong>{state.verification_id || '—'}</strong></div>
          <div><span>Test ID</span><strong>{state.test_id || '—'}</strong></div>
          <div><span>Evidence bag</span><strong>{state.evidence_bag_id || '—'}</strong></div>
          <div><span>Outcome</span><strong>{state.result || 'INCONCLUSIVE'}</strong></div>
          <div><span>Operator</span><strong>{state.operator_id || '—'}</strong></div>
          <div><span>FSL status</span><strong>{state.fsl_status || 'PENDING'}</strong></div>
          <div className="wide"><span>Record hash</span><strong className="mono">{state.record_hash || '—'}</strong></div>
          <div className="wide"><span>Image SHA-256</span><strong className="mono">{state.image_sha256 || '—'}</strong></div>
          <div><span>Signature</span><strong>{state.signature_algorithm || 'Not recorded'}</strong></div>
          <div><span>Ledger</span><strong>{state.ledger?.valid ? 'CHAIN VALID' : 'REVIEW'}</strong></div>
        </div>
        <p className="portal-note">Field interpretation remains presumptive/inconclusive. Laboratory confirmation remains authoritative.</p>
      </div>}
    </section>
  );
}
