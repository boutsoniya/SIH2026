# SIH 2026 — Judge & Demo Finalization

## 1. One-line pitch

**NARCOSCOPE turns a field drug-test strip into a guided, auditable, verifiable digital evidence record — not just an image classification.**

## 2. Judge demo flow (3–5 minutes)

1. **Field setup:** enter case/test metadata and scan reagent/kit information and the evidence-bag identifier.
2. **Guided capture:** use Capture Coach and Reference Card Lock. Show that poor-quality frames are blocked before analysis.
3. **Analysis:** run the Vision API. Show geometry validation, optional ArUco verification, normalization, calibration and reaction-ROI analysis.
4. **Result + uncertainty:** show a presumptive outcome or **INCONCLUSIVE** state with quality/calibration evidence.
5. **Evidence sealing:** show verification ID, SHA-256 hashes, signature metadata, timestamp/device data, chain-of-custody events and ledger receipt.
6. **Offline-first sync:** demonstrate local evidence retention and later synchronization; conflicting hashes for an existing test ID are rejected.
7. **One-scan verification:** open the verification route, scan the QR or enter the Verification ID, and show the read-only integrity result.
8. **FSL handoff:** show reconciliation status and the printable evidence packet.

## 3. Architecture

**Physical test kit**
→ reagent/kit metadata  
→ evidence bag identifier  
→ **Field App**  
→ Capture Coach  
→ Reference Card Lock  
→ card geometry + reaction ROI  
→ **Vision API**  
→ quality gate  
→ ArUco verification  
→ homography normalization  
→ kit-specific calibration  
→ LAB / CIEDE2000 comparison  
→ presumptive interpretation / INCONCLUSIVE  
→ **Evidence Record**  
→ SHA-256 + signature metadata  
→ offline ledger  
→ sync  
→ **Verification Portal**  
→ QR verification  
→ FSL reconciliation / evidence packet

## 4. Technical differentiators

- **Quality-gated acquisition:** evaluates the image before interpretation.
- **Physical reference-card contract:** controlled optical reference with geometry and optional ArUco markers.
- **Kit-specific calibration:** explicit calibration profiles rather than one universal color threshold.
- **Safe uncertainty:** insufficient evidence can produce **INCONCLUSIVE**.
- **Evidence integrity:** hashes, signatures, chain-of-custody events and ledger receipts.
- **Independent verification:** verifies stored evidence without rerunning or changing the original interpretation.
- **Offline-first field operation:** local retention with later synchronization.

## 5. Problem → solution mapping

| Field problem | NARCOSCOPE response |
|---|---|
| Poor lighting / blur / glare | Live quality coach + backend quality gate |
| Inconsistent camera framing | Reference Card Lock + geometry contract |
| Device/camera color variation | Kit-specific color calibration |
| Ambiguous reaction | Presumptive interpretation + INCONCLUSIVE gating |
| Weak traceability | Structured evidence record |
| Evidence alteration risk | Hashing + signed record design + ledger |
| No connectivity | Offline-first local ledger + later sync |
| Difficult verification | One-scan QR verification |
| Lab handoff fragmentation | FSL reconciliation + evidence packet |
| Audit reconstruction | Replay timeline + audit trail |

## 6. Security and chain of custody

The prototype demonstrates:
- SHA-256 image/record integrity
- signed-record metadata
- chained ledger receipts
- role-aware API boundaries
- operator attribution metadata
- sync conflict protection
- verification without mutation
- QR identifiers that do not contain private keys or evidence images

**Production requirement:** replace demo role headers with real identity/SSO, persist the ledger and audit stream in durable storage, use managed key custody, restrict CORS, and define an operational evidence-retention policy.

## 7. Validation boundary

The current prototype demonstrates the **workflow and engineering contracts**. It must not be presented as validated forensic substance identification.

Before a real-world claim, the project needs:
- representative field images
- laboratory-confirmed labels
- multiple devices and lighting conditions
- kit/lot variation
- blinded evaluation
- predefined acceptance thresholds
- sensitivity/specificity/FPR/FNR
- inconclusive rate
- calibration error
- confidence intervals
- independent technical/forensic review

Synthetic/demo images are suitable for workflow demonstrations but are not accuracy evidence.

## 8. Controlled judge scenarios

1. Clean verification — valid record verifies.
2. Wrong ID — unknown identifier produces a clear error/review state.
3. Tamper simulation — altered record fails integrity verification.
4. Sync conflict — conflicting hash for the same test ID is rejected.
5. FSL reconciliation — laboratory status is recorded and visible.
6. Unsupported browser — manual verification-ID entry remains available.
7. Poor capture — Capture Coach blocks acquisition until quality improves.
8. Insufficient evidence — pipeline gates interpretation to INCONCLUSIVE.

## 9. Judge questions — concise answers

**Is this actually identifying a drug?**  
The current prototype provides a presumptive field interpretation. A production forensic claim requires kit-specific validation against laboratory-confirmed data.

**Why not just use a CNN?**  
Field reliability depends on acquisition quality, physical calibration, traceability and evidence integrity as well as image interpretation.

**What happens when the image is bad?**  
The acquisition coach and backend quality gate can block or downgrade the analysis instead of forcing a confident result.

**Can evidence be changed after capture?**  
The evidence design records hashes/signature metadata and chained ledger receipts; conflicting synchronized records are rejected.

**What if there is no internet?**  
The field workflow retains evidence locally and supports later synchronization.

**How does the lab verify it?**  
The verification portal and QR workflow retrieve the server-side evidence record and integrity state without silently changing the original interpretation.

## 10. Demo safety rule

Never describe controlled demo success as measured forensic accuracy. Say:

> “This demonstration validates the field workflow, evidence integrity and verification contracts. Forensic performance will be established through a separate laboratory-confirmed validation study.”

## 11. Final presentation structure

1. Title + one-line solution
2. Field problem
3. Existing workflow gaps
4. NARCOSCOPE solution
5. End-to-end workflow
6. Architecture
7. Core innovation
8. Safety/uncertainty design
9. Evidence integrity + chain of custody
10. Offline-first + FSL verification
11. Validation plan and limitations
12. Impact + deployment roadmap
13. Live demo
14. Closing: **Capture → Validate → Analyze → Seal → Verify**

## 12. Current deployment

- Field App: https://sih2026-field-app.onrender.com
- API: https://sih2026-api-qk7g.onrender.com
- Vision API: https://sih2026-vision.onrender.com

All three services are configured from the main branch. The latest Vision deployment (v15) is live.
