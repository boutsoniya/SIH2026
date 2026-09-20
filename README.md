# NARCOSCOPE — Digital Companion for Field Drug Testing

> SIH 2026 · Problem Statement SIH26231 · Prototype

NARCOSCOPE is a field-first digital companion for colorimetric drug testing. It combines guided image capture, reference-card color calibration, computer vision, machine-learning assisted presumptive interpretation, and tamper-evident evidence records.

## Core workflow

**Capture → Validate → Calibrate → Analyze → Explain → Geotag → Hash → Sign → Verify → Sync**

## Why this architecture

The prototype is designed around the operational needs of field testing rather than treating the problem as image classification alone. Every analysis can be associated with operator identity, timestamp, location, image hash, model output, quality checks, and an auditable record.

## Planned modules

1. Field Capture & Guided Imaging
2. Reference-Card Detection & Color Calibration
3. Image Quality Control
4. ROI Detection & Computer Vision
5. ML-assisted Presumptive Classification
6. Explainable Result & Uncertainty
7. Evidence Integrity — SHA-256, metadata, signatures, verification
8. Offline-first History & Sync
9. Secure Search & Audit Dashboard
10. Evaluation, Documentation & SIH Demo

## Prototype boundary

The output is **presumptive** and is not a replacement for laboratory confirmation or certified forensic testing. Real-world performance requires representative field images and laboratory-confirmed labels.

## Repository structure

```text
SIH2026/
├── apps/
│   ├── field-app/          # React/PWA field interface
│   └── dashboard/          # Evidence/search dashboard
├── services/
│   ├── api/                # Backend API
│   └── vision/             # Python CV/ML inference
├── packages/
│   ├── evidence/           # Hashing, record integrity, verification
│   └── shared/             # Shared schemas/types
├── data/
│   ├── sample/
│   └── schemas/
├── docs/
│   ├── architecture/
│   ├── ppt/
│   └── demo/
├── tests/
└── README.md
```

## Technical direction

- Frontend: React + Vite + PWA capabilities
- Backend: Node.js + Express
- Vision/ML: Python + OpenCV + scikit-learn, with room for stronger models after real-data evaluation
- Local persistence: IndexedDB/local storage for prototype offline operation
- Evidence integrity: SHA-256 content hashing + signed record design
- API contracts: JSON with explicit schemas and validation

## Development principle

Existing publicly visible prototype ideas may inform the design, but this repository maintains its own implementation, evidence model, UI workflow, evaluation protocol, and documentation.

## Deployment

The current prototype is deployed on Render as two services:

- **Field App:** https://narcoscope-field.onrender.com
- **Vision API:** https://narcoscope-vision.onrender.com

The field app is configured to call the deployed Vision API through `VITE_VISION_API_URL`. The Vision API accepts cross-origin requests from the Field App domain through the `CORS_ORIGINS` configuration.

The prototype's offline sync flow remains explicitly local/demo behavior until a server-side sync endpoint is implemented.

## Status

Core field workflow, evidence integrity scaffolding, offline persistence, Vision API deployment, and automated frontend build validation are in place. Final browser-level end-to-end validation is still required before presenting the deployment as a fully validated field workflow.

## Production hardening (v14)

The API now includes a lightweight role-based access-control layer and an auditable request trail for the prototype:

- **OFFICER** — submit field analysis and sync captured evidence.
- **SUPERVISOR** — officer permissions plus ledger verification and FSL reconciliation.
- **FSL** — evidence verification, ledger verification, and laboratory reconciliation.
- **API key protection** — set `API_AUTH_KEY` in production; requests then require `X-API-Key`.
- **Operator attribution** — send `X-Operator-Id` with requests; role is supplied through `X-Role`.
- **Sync conflict protection** — a reused test ID with a different record hash returns HTTP 409 instead of overwriting evidence.
- **Audit trail** — security-sensitive events are retained in a bounded in-memory audit stream for the prototype.

Authentication is intentionally optional when `API_AUTH_KEY` is unset so the local/SIH demo remains easy to run. A production deployment should set the key, restrict `CORS_ORIGINS`, use real identity-provider authentication, and persist audit/ledger state in durable storage.

### API validation

Run:

```bash
cd services/api
npm test
```

These tests cover the ledger chain and the v14 access-control boundary. They are security/contract tests, not evidence of forensic model accuracy.

## One-scan evidence verification (v15)

Sealed evidence records now expose a compact verification QR containing only the Verification ID/Test ID. An Investigator or FSL user can open the **#verify** route, scan the QR with a supported browser, or enter the identifier manually.

- QR payload contains identifiers only; it does not embed evidence images, private keys, or sensitive case data.
- The verification route calls the server-side evidence verification endpoint.
- Verification checks the stored record and evidence ledger state; it does not reclassify the substance.
- Printable evidence packets include the same verification QR.
- Set `VITE_API_BASE_URL` for deployments where the field app and API are hosted on different origins.
- Native QR scanning uses the browser `BarcodeDetector` API; unsupported browsers fall back to manual ID entry.

### Controlled demo validation scenarios

For a judge/demo run, validate the workflow with controlled scenarios rather than claiming forensic accuracy:

1. **Clean verification:** create/sync a sealed record, scan its QR, confirm the record and ledger verify.
2. **Wrong identifier:** scan or enter an unknown ID, confirm a clear review/error state.
3. **Tamper simulation:** modify a copy of a sealed record and confirm local integrity verification fails.
4. **Sync conflict:** submit the same test ID with a different record hash and confirm HTTP 409.
5. **FSL reconciliation:** update the laboratory status with a Supervisor/FSL role and verify it from the portal.
6. **Unsupported browser:** confirm manual Verification ID entry remains available.

These scenarios validate the application workflow and security contracts; they are not sensitivity/specificity evidence for substance identification.
