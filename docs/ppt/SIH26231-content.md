# SIH26231 — PPT Content Pack

## Slide 1 — Title
NARCOSCOPE
Digital Companion for Field Drug Testing
SIH 2026 · SIH26231

## Slide 2 — Problem
Field colorimetric tests depend on visual interpretation. Camera conditions, lighting, viewing angle, and manual recording can introduce variability. Field evidence also needs traceability and integrity across capture, analysis, and later review.

## Slide 3 — Objective
Build a field-ready digital companion that assists officers with standardized image capture, reference-card calibration, presumptive interpretation, and secure digital evidence recording.

## Slide 4 — Proposed Workflow
Capture → Quality Check → Reference-Card Calibration → ROI Detection → CV/ML Analysis → Presumptive Result → Evidence Hash → Signed Record → Offline Sync → Search/Audit

## Slide 5 — What Makes It More Than an AI Classifier
- Reference-card based calibration
- Explicit inconclusive path
- Guided field capture
- Evidence hash and integrity verification
- Timestamp, GPS, operator identity
- Offline-first record queue
- Searchable history and audit trail

## Slide 6 — AI / Computer Vision
Image quality assessment → reference-card localization → illumination/color normalization → test ROI localization → colorimetric and geometric features → ML-assisted classification → calibrated confidence/uncertainty.

## Slide 7 — Result Screen
Show result category, confidence/uncertainty, quality score, calibration status, detected ROI, and a short explanation. Clearly label output as PRESUMPTIVE.

## Slide 8 — Evidence Integrity
Each record binds the image SHA-256 hash to test ID, timestamp, operator, location, test type, result, model version, and record metadata. Verification recomputes hashes and reports whether integrity is preserved.

## Slide 9 — Offline-First Field Mode
Capture and review locally → queue unsynced records → reconnect → authenticated sync → server acknowledgement → mark synchronized. Prevent duplicate uploads using a stable record ID.

## Slide 10 — System Architecture
Field App → API → Vision/ML Service → Evidence Service → Database/Object Storage → Dashboard. Local IndexedDB/offline queue sits inside the field app.

## Slide 11 — Evaluation Plan
Baseline pipeline testing on controlled/synthetic samples; then representative real field images with laboratory-confirmed labels. Evaluate class-wise precision/recall/F1, confusion matrix, calibration/uncertainty, image-quality rejection, device variation, lighting variation, and kit variation.

## Slide 12 — Security & Privacy
Least-privilege access, operator identity, integrity hashes, signed records, controlled evidence access, audit events, secure transport, retention policy, and explicit handling of sensitive location/evidence data.

## Slide 13 — Limitations
Prototype output is presumptive. Real-world model accuracy cannot be inferred from synthetic data. Kit-specific chemistry, camera differences, lighting, and field contamination require validation.

## Slide 14 — Future Scope
Larger laboratory-confirmed dataset; multi-kit support; on-device inference; stronger calibration; institutional authentication; secure cloud synchronization; model monitoring; forensic workflow integration.

## Slide 15 — Demo
1. Officer opens field app.
2. Camera guidance detects reference card.
3. App validates focus/exposure.
4. Officer captures test.
5. Calibration and ROI overlay appear.
6. System produces presumptive result.
7. Officer creates evidence record.
8. Hash/signature verification is shown.
9. Device goes offline; history remains available.
10. Device reconnects; queued record syncs.

## Claims discipline
Do not present synthetic-data accuracy as field accuracy. Do not claim laboratory replacement. Use "presumptive result" consistently.
