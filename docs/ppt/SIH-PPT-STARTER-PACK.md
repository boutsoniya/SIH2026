# NARCOSCOPE — SIH 2026 PPT Starter Pack

**Problem Statement:** SIH26231 — Digital Companion for Field Drug Testing  
**Project:** NARCOSCOPE — Digital Companion for Field Drug Testing  
**Tagline:** Capture → Calibrate → Analyze → Verify

## 1. What the PPT should communicate

NARCOSCOPE is a field-oriented digital companion for presumptive colorimetric drug testing. It is designed to make field-kit observations more consistent, explainable, traceable, and resistant to evidence tampering.

The product workflow is:

**Capture → Validate → Calibrate → Analyze → Explain → Geotag → Hash → Sign → Verify → Sync**

The system should be presented as a decision-support and evidence-recording layer around an existing field test kit, **not as a laboratory replacement**.

## 2. Recommended 12–15 slide structure

### Slide 1 — Title
- NARCOSCOPE
- Digital Companion for Field Drug Testing
- SIH26231
- Team name / institute / members
- One strong product screenshot or workflow visual

### Slide 2 — Problem
Explain the field challenge:
- colorimetric tests depend on visual interpretation
- lighting/camera conditions can vary
- manual records can be incomplete or difficult to audit
- field teams need a repeatable digital workflow
- presumptive observations need traceability before laboratory confirmation

### Slide 3 — Existing Process & Gaps
Show:
**Physical kit → visual comparison → handwritten/manual record**

Then identify gaps:
- inconsistent lighting and capture conditions
- subjective colour comparison
- weak metadata linkage
- limited auditability
- difficult history/search
- disconnected evidence and result

### Slide 4 — Proposed Solution
Show the NARCOSCOPE workflow:

Capture → Quality Gate → Reference Card → Calibration → ROI → Feature Extraction → Presumptive Classification → Evidence Record → Integrity Verification → Sync

### Slide 5 — What Makes NARCOSCOPE Different
Focus on the system, not just AI:
- reference-card calibration
- image quality gate
- ROI detection
- uncertainty-aware result handling
- timestamp/GPS/operator metadata
- SHA-256 evidence hashing
- tamper-evident record design
- offline-first operation
- searchable evidence history

### Slide 6 — AI / Computer Vision Pipeline
Explain:
1. image quality validation
2. reference-card detection
3. illumination/color calibration
4. reaction-region detection
5. color feature extraction
6. ML-assisted classification
7. confidence + inconclusive state

Important: model performance must only be reported on appropriately labelled validation data. Synthetic-data experiments must not be presented as field accuracy.

### Slide 7 — Field Officer UX
Show 3–4 screens:
- Start Test
- Guided Capture
- Calibration / Quality
- Result

Keep the interface operational and simple.

### Slide 8 — Evidence Integrity
Show an evidence record containing:
- Test ID
- timestamp
- operator ID
- GPS (when available and permitted)
- test type
- presumptive result
- confidence
- image SHA-256
- record hash
- digital signature / verification status

Core message:
**The image and metadata are cryptographically bound into a verifiable evidence record.**

### Slide 9 — Offline-First Architecture
Show:
Field device → local queue → encrypted/controlled storage → sync when connected → server/database → dashboard

Explain that connectivity should not block evidence capture.

### Slide 10 — System Architecture
Recommended layers:
- React/PWA field application
- Node/Express API
- Python/OpenCV vision service
- evidence/integrity package
- database/storage
- dashboard/audit interface

### Slide 11 — Command Center / History
Show dashboard concepts:
- searchable test history
- filters by date/status/test type/operator
- evidence viewer
- integrity verification
- sync status
- audit trail

### Slide 12 — Security & Privacy
Mention:
- content hashing
- signed records
- role-based access design
- minimal collection of personal data
- controlled evidence access
- audit logging
- explicit handling of location data

Do not claim a security certification unless actually obtained.

### Slide 13 — Evaluation Plan
Separate engineering validation from field validation.

Engineering:
- image quality rejection tests
- reference-card detection tests
- ROI detection tests
- hash/verification tests
- offline queue/sync tests

ML/field validation:
- representative field images
- laboratory-confirmed labels
- different devices
- different lighting
- different kit/reference-card conditions
- sensitivity/specificity/confusion matrix where scientifically appropriate

### Slide 14 — Limitations & Responsible Use
- result is presumptive
- laboratory confirmation remains necessary where required
- current prototype needs representative labelled field data
- lighting, camera, kit, and reference-card variation can affect measurements
- candidate CV detectors require validation before production deployment

### Slide 15 — Impact / Future Scope / Demo
Potential future work:
- validated field dataset
- stronger calibration models
- device-aware calibration
- secure key management
- institutional deployment
- analytics and fleet monitoring
- laboratory workflow integration

End with a live demo flow:
**Capture → Calibrate → Analyze → Evidence → Verify**

## 3. Visuals the PPT team should create

1. Problem vs proposed workflow diagram
2. NARCOSCOPE end-to-end architecture
3. Computer vision pipeline
4. Evidence record / cryptographic integrity diagram
5. Offline-first sync diagram
6. Field-app screenshots
7. Dashboard screenshot
8. Demo sequence / storyboard

## 4. Claims discipline

Use:
- “presumptive result”
- “decision-support”
- “ML-assisted”
- “candidate detector” where a component is not field validated
- “prototype” where appropriate

Avoid:
- “100% accurate drug detection”
- “laboratory replacement”
- “forensic proof”
- “production-ready” unless the relevant validation/security work has actually been completed

## 5. Team division for PPT work

**PPT owner:** visual storytelling, slide layout, screenshots, diagrams.

**Technical owner:** architecture, CV/ML pipeline, evidence integrity, evaluation plan.

**Demo owner:** field-app flow, test scenario, fallback screenshots/video.

**Research owner:** official problem statement, user pain points, existing workflow, references and validation methodology.

## 6. Official-reference links

- Smart India Hackathon official portal: https://www.sih.gov.in/
- Official SIH College SPOC guidelines: https://www.sih.gov.in/letters/Guidelines-College-SPOC.pdf

The official guidelines are useful for understanding submission expectations. Always use the current SIH portal/instructions for the active 2026 submission window.

## 7. Repository source of truth

Project repository: https://github.com/boutsoniya/SIH2026

The implementation currently includes the field-app foundation, API foundation, Python vision pipeline, reference-card calibration, reaction ROI extraction, colour features, safe model adapter, evidence schemas, and evidence hashing utilities.

---

## One-line pitch

**NARCOSCOPE turns a subjective field colour test into a guided, calibrated, explainable, offline-capable, and cryptographically verifiable digital evidence workflow.**
