# SIH 2026 — NARCOSCOPE PPT CONTENT

## Slide 1 — Title
**NARCOSCOPE**  
Digital Companion for Field Drug Testing  
SIH 2026 · Problem Statement SIH26231

**Tagline:** From field test strip to verifiable digital evidence.

---

## Slide 2 — Problem
Field drug testing can be affected by:
- inconsistent lighting, blur and glare
- inconsistent strip/card positioning
- color variation across devices and conditions
- ambiguous reactions
- weak traceability from capture to laboratory handoff
- poor connectivity in field environments
- difficulty independently verifying an evidence record

**Core gap:** a field test needs more than an image classifier; it needs a controlled acquisition and evidence workflow.

---

## Slide 3 — Our Solution
NARCOSCOPE is a field-first digital companion that:
- guides the officer during capture
- validates image quality and reference-card geometry
- calibrates color against a physical reference
- performs conservative presumptive interpretation
- records uncertainty instead of forcing a result
- seals evidence cryptographically
- works offline and synchronizes later
- enables independent investigator/FSL verification

---

## Slide 4 — End-to-End Workflow
**Kit → Capture → Quality Gate → Reference Card → Calibration → Analysis → Interpretation → Seal → Offline Ledger → Sync → QR Verification → FSL**

Use this slide as the main visual workflow.

---

## Slide 5 — Field Capture Intelligence
### Before analysis, NARCOSCOPE asks: “Is this evidence usable?”
- live brightness / contrast / sharpness / glare checks
- actionable capture guidance
- reference-card framing
- reaction ROI guidance
- backend geometry validation
- capture blocked when required conditions are not satisfied

**Benefit:** poor acquisition is rejected before it becomes a misleading result.

---

## Slide 6 — Reference Card + Calibration
The physical reference card provides a controlled visual contract.

- four-corner geometry
- backend ArUco verification
- perspective normalization
- reaction-area ROI
- kit-specific calibration patches
- LAB-space correction
- CIEDE2000 comparison where a validated target profile exists

**Important:** calibration profiles are kit-specific; no universal drug threshold is assumed.

---

## Slide 7 — Safe AI / Computer Vision
NARCOSCOPE separates:
1. **Image usability**
2. **Physical reference verification**
3. **Color/reaction analysis**
4. **Interpretation**

The system can return **INCONCLUSIVE** when evidence is insufficient.

This prevents the interface from turning uncertainty into false certainty.

---

## Slide 8 — Evidence Integrity
Every sealed record can contain:
- Verification/Test ID
- operator attribution
- timestamp/device metadata
- image SHA-256
- record hash
- signature/public-key metadata
- chain-of-custody events
- evidence bag ID
- audit/ledger receipt
- FSL reconciliation status

**Design goal:** make the evidence trail reconstructable and independently checkable.

---

## Slide 9 — Offline-First Field Operation
Field environments may have weak/no connectivity.

NARCOSCOPE:
- stores evidence locally
- maintains a hash-chained local ledger
- allows later synchronization
- detects conflicting record hashes
- preserves the original evidence identity

**Result:** connectivity is not a prerequisite for capture and evidence creation.

---

## Slide 10 — One-Scan Verification
A sealed packet includes a compact QR containing only the verification identifier.

**Scan → Server verification → Integrity state → Evidence metadata → FSL status**

The QR does not contain:
- private keys
- evidence images
- sensitive case data

Unsupported browsers can use manual Verification ID entry.

---

## Slide 11 — FSL / Investigator Handoff
The downstream user gets a read-only verification view containing:
- evidence identity
- hashes/integrity state
- capture metadata
- evidence bag
- field interpretation
- ledger state
- laboratory reconciliation

The portal verifies the record; it does not silently reclassify the substance.

---

## Slide 12 — Security + Audit
### Controls
- SHA-256 content hashing
- signed record design
- hash-chained ledger
- role-aware API boundary
- operator attribution
- sync conflict protection
- bounded audit events
- QR identifiers only
- verification without mutation

### Production upgrades
- real SSO/identity provider
- durable ledger/audit storage
- managed signing-key custody
- restricted CORS
- formal evidence-retention policy

---

## Slide 13 — Validation Boundary
**What the prototype demonstrates**
- controlled field workflow
- acquisition gates
- geometry/calibration contracts
- evidence integrity
- offline/sync behavior
- verification and FSL workflow

**What still requires formal validation**
- forensic substance-identification performance

Required validation program:
- representative field images
- laboratory-confirmed labels
- multiple devices/lighting conditions
- kit/lot variation
- blinded evaluation
- predefined thresholds
- sensitivity/specificity
- false-positive/false-negative rates
- inconclusive rate
- calibration error
- confidence intervals
- independent technical/forensic review

---

## Slide 14 — Impact + Roadmap
### Immediate
- safer field acquisition
- consistent digital records
- faster evidence verification
- stronger field-to-FSL traceability
- offline operation

### Roadmap
**Phase 1:** controlled field pilot  
**Phase 2:** laboratory-confirmed dataset + validation  
**Phase 3:** device/kit/lot expansion  
**Phase 4:** production identity + durable evidence infrastructure  
**Phase 5:** institutional deployment and monitoring

---

## Slide 15 — Live Demo
### 3–5 minute judge sequence
1. Open field app.
2. Show capture coach.
3. Show reference-card lock.
4. Capture/analyze a controlled sample.
5. Show presumptive/INCONCLUSIVE interpretation.
6. Seal evidence.
7. Show ledger/chain-of-custody state.
8. Sync.
9. Scan verification QR.
10. Open investigator/FSL verification.
11. Demonstrate one failure scenario.
12. Close with validation boundary.

**Demo safety wording:**  
“This demonstration validates the field workflow, evidence integrity and verification contracts. Forensic performance will be established through a separate laboratory-confirmed validation study.”

---

## Slide 16 — Closing
**NARCOSCOPE**

A field test should not end at “detected / not detected.”

It should produce a controlled, traceable and independently verifiable evidence record.

**Capture → Validate → Calibrate → Analyze → Seal → Verify → Handoff**
