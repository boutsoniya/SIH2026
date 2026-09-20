const DEFAULT_VISION_URL = 'http://localhost:8000';

export function getVisionBaseUrl() {
  return (import.meta.env.VITE_VISION_API_URL || DEFAULT_VISION_URL).replace(/\/$/, '');
}

export async function analyzeImage(file, { signal, reagentQr = '', evidenceBagId = '', cardGeometry = null } = {}) {
  if (!file) throw new Error('Select a test image before analysis.');

  const body = new FormData();
  body.append('image', file, file.name || 'capture.jpg');
  if (reagentQr) body.append('reagent_qr', reagentQr);
  if (evidenceBagId) body.append('evidence_bag_id', evidenceBagId);
  if (cardGeometry) body.append('card_geometry', JSON.stringify(cardGeometry));

  const response = await fetch(`${getVisionBaseUrl()}/analyze`, {
    method: 'POST',
    body,
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Vision service returned HTTP ${response.status}`);
  }

  return response.json();
}

export async function checkVisionHealth() {
  const response = await fetch(`${getVisionBaseUrl()}/health`);
  if (!response.ok) throw new Error(`Vision service returned HTTP ${response.status}`);
  return response.json();
}


export async function syncEvidence(record, baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/evidence/sync`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record)
  });
  if (!response.ok) throw new Error("Evidence sync failed");
  return response.json();
}
