import { canonicalize, sha256Hex } from './evidenceCrypto';
import QRCode from 'qrcode';

export async function buildEvidencePacket(record) {
  const packet = {
    packet_version: '1.0',
    packet_type: 'FIELD_EVIDENCE_PACKET',
    generated_at: new Date().toISOString(),
    verification_id: `VERIFY-${record.test_id}`,
    case: {
      test_id: record.test_id,
      test_type: record.test_type,
      timestamp: record.timestamp,
      operator_id: record.operator_id,
      evidence_bag_id: record.evidence_bag_id || null,
      result: record.result || 'INCONCLUSIVE',
      confidence: record.confidence ?? null,
    },
    acquisition: {
      gps: record.gps || null,
      capture_device: record.capture_device || null,
      quality: record.quality || null,
      anti_spoof: record.anti_spoof || null,
    },
    analytical_chain: {
      reagent: record.reagent || null,
      card_geometry: record.card_geometry || null,
      aruco: record.aruco || null,
      calibration: record.calibration || null,
      color_distance: record.color_distance || null,
      roi: record.roi || null,
      features: record.features || null,
    },
    integrity: {
      image_sha256: record.image_sha256 || null,
      record_hash: record.record_hash || null,
      signature: record.signature || null,
      signature_algorithm: record.signature_algorithm || null,
      public_key_jwk: record.public_key_jwk || null,
      ledger_receipt: record.sync_receipt || null,
    },
    chain_of_custody: record.chain_of_custody || [],
    fsl_reconciliation: {
      evidence_bag_id: record.evidence_bag_id || null,
      status: record.fsl_status || 'PENDING',
      laboratory_reference: record.laboratory_reference || null,
    },
    pre_lab_readiness: record.pre_lab_readiness || null,
    audit: {
      sync_status: record.sync_status || 'QUEUED',
      integrity_status: record.integrity_status || 'UNVERIFIED',
      verification_note: 'Field result is presumptive/inconclusive; laboratory confirmation remains authoritative.',
    },
  };
  packet.packet_hash = await sha256Hex(canonicalize(packet));
  return packet;
}

export function downloadEvidencePacket(packet) {
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${packet.verification_id}-evidence-packet.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function printEvidencePacket(packet) {
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ verification_id: packet.verification_id, test_id: packet.case.test_id }), { width: 180, margin: 1 }).catch(() => '');
  const rows = [
    ['Verification ID', packet.verification_id],
    ['Test ID', packet.case.test_id],
    ['Evidence bag', packet.case.evidence_bag_id || 'Not recorded'],
    ['Outcome', packet.case.result],
    ['Operator', packet.case.operator_id || 'Not recorded'],
    ['Timestamp', packet.case.timestamp || 'Not recorded'],
    ['Pre-lab readiness', packet.pre_lab_readiness?.status || 'Not assessed'],
    ['FSL status', packet.fsl_reconciliation.status],
    ['Image SHA-256', packet.integrity.image_sha256 || 'Not recorded'],
    ['Record hash', packet.integrity.record_hash || 'Not recorded'],
    ['Ledger hash', packet.integrity.ledger_receipt?.ledger_hash || 'Not synced'],
    ['Packet hash', packet.packet_hash],
  ];
  const escape = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Field Evidence Packet ${escape(packet.verification_id)}</title>
  <style>body{font:14px Arial,sans-serif;margin:36px;color:#172033}h1{margin-bottom:4px}h2{margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:7px}.sub{color:#64748b}table{width:100%;border-collapse:collapse}td{padding:9px;border-bottom:1px solid #e5e7eb}td:first-child{width:30%;font-weight:700}.notice{margin-top:24px;padding:12px;background:#f1f5f9}.mono{font-family:monospace;word-break:break-all}@media print{button{display:none}}</style></head><body>
  <h1>Field Evidence Packet</h1><div class="sub">${escape(packet.verification_id)} · Generated ${escape(packet.generated_at)}</div>
  ${qrDataUrl ? '<div style="display:flex;align-items:center;gap:16px;margin:16px 0"><img src="' + qrDataUrl + '" width="120" height="120" alt="Verification QR"><div><strong>One-scan verification</strong><div>Scan this QR in the Investigator portal.</div><div style="color:#64748b;margin-top:5px">Verification ID: ' + escape(packet.verification_id) + '</div></div></div>' : ''}<h2>Case Summary</h2><table>${rows.map(([a,b]) => `<tr><td>${escape(a)}</td><td class="${a.toLowerCase().includes('hash')?'mono':''}">${escape(b)}</td></tr>`).join('')}</table>
  <h2>Analytical Chain</h2><pre>${escape(JSON.stringify(packet.analytical_chain,null,2))}</pre>
  <h2>Chain of Custody</h2><pre>${escape(JSON.stringify(packet.chain_of_custody,null,2))}</pre>
  <h2>Pre-Lab Readiness</h2><pre>${escape(JSON.stringify(packet.pre_lab_readiness,null,2))}</pre>
  <h2>Integrity & Reconciliation</h2><pre>${escape(JSON.stringify({integrity:packet.integrity,fsl_reconciliation:packet.fsl_reconciliation,audit:packet.audit},null,2))}</pre>
  <div class="notice"><strong>Interpretation notice:</strong> A field result is presumptive/inconclusive and does not replace laboratory confirmation.</div>
  <script>window.onload=()=>window.print()</script></body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}
