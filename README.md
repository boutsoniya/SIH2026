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
│   └── shared/              # Shared schemas/types
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

## Status

Foundation initialized. Next: field-app shell, API contract, evidence schema, and CV service scaffold.
