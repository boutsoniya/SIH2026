export function evaluatePreLabReadiness(analysis, metadata = {}) {
  const qualityOk = Boolean(analysis?.quality?.passed);
  const referenceOk = Boolean(analysis?.reference_card);
  const roiOk = Boolean(analysis?.roi);
  const reagent = analysis?.reagent || {};
  const reagentOk = Boolean(reagent.valid) && !Boolean(reagent.expired);
  const bagOk = Boolean(String(metadata.evidenceBagId || '').trim());

  const checks = [
    { key: 'image_quality', label: 'Image quality', ok: qualityOk, message: qualityOk ? 'Capture quality passed.' : 'Recapture with acceptable image quality.' },
    { key: 'reference_card', label: 'Reference card', ok: referenceOk, message: referenceOk ? 'Reference-card evidence is present.' : 'Reference-card evidence needs review.' },
    { key: 'reaction_roi', label: 'Reaction area', ok: roiOk, message: roiOk ? 'Reaction area was isolated.' : 'Reaction area needs recapture.' },
    { key: 'reagent_metadata', label: 'Reagent metadata', ok: reagentOk, message: reagentOk ? 'Kit / lot / expiry metadata is usable.' : 'Confirm the reagent QR and expiry information.' },
    { key: 'evidence_bag', label: 'Evidence bag', ok: bagOk, message: bagOk ? 'Evidence bag is linked.' : 'Add the evidence bag identifier.' },
  ];

  const recaptureRequired = !qualityOk || !referenceOk || !roiOk;
  const status = recaptureRequired ? 'RECAPTURE_REQUIRED' : checks.every((item) => item.ok) ? 'READY' : 'REVIEW_REQUIRED';

  return {
    status,
    ready_for_handoff: status === 'READY',
    checks,
    next_action: recaptureRequired
      ? 'Recapture or complete the field evidence before handoff.'
      : status === 'READY'
        ? 'Field evidence package is complete for the configured pre-lab handoff checks.'
        : 'Complete the missing metadata and review the field record before handoff.',
    note: 'Readiness checks support documentation and evidence quality only. They do not determine whether a sample must be sent to a laboratory, certify laboratory acceptance, or confirm substance identity.',
  };
}
