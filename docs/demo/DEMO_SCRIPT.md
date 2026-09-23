# NARCOSCOPE — 3–5 MINUTE JUDGE DEMO SCRIPT

## Opening — 20 seconds
**Say:**
“Today we are demonstrating NARCOSCOPE, a field-first digital companion for drug-test workflows. The key idea is simple: we do not treat this as image classification alone. We control acquisition, calibration, uncertainty and the evidence trail.”

## 1. Field capture — 35 seconds
Open the Field App.

Show:
- live quality score
- brightness/contrast/sharpness/glare guidance
- reference-card framing

**Say:**
“Before analysis, the system checks whether the image is usable. If the field image is poor, the operator gets a concrete correction instead of receiving a misleading result.”

## 2. Reference-card contract — 30 seconds
Show the card geometry and reaction ROI.

**Say:**
“The physical reference card gives us a controlled geometry and color reference. The browser helps the operator frame it, while the backend performs authoritative geometry checks and can verify the card markers.”

## 3. Analysis — 35 seconds
Run the controlled analysis.

Show:
- quality state
- calibration
- reaction ROI
- interpretation
- uncertainty

**Say:**
“We normalize the card, apply the kit-specific calibration profile, and analyze the reaction region. The output is deliberately presumptive. If the evidence is insufficient, the system can return INCONCLUSIVE.”

## 4. Seal evidence — 30 seconds
Show evidence packet / sealed state.

**Say:**
“Now the important part: the result becomes an evidence record. We bind the image hash, record hash, operator metadata, chain of custody and ledger state.”

## 5. Offline-first — 25 seconds
Show local ledger/sync state.

**Say:**
“Field connectivity is not assumed. Evidence can be retained locally and synchronized later. A conflicting record hash cannot silently overwrite the original evidence.”

## 6. One-scan verification — 35 seconds
Open verification QR.

Scan or enter Verification ID.

**Say:**
“An investigator or FSL user can independently verify the record. The QR contains only an identifier, so it does not expose private keys, evidence images or sensitive case data.”

## 7. FSL handoff — 25 seconds
Show FSL reconciliation.

**Say:**
“The downstream workflow is read-only verification plus laboratory reconciliation. Verification does not silently reclassify the substance.”

## 7.5 Pre-lab readiness — 20 seconds
**Show:** the PRE-LAB READINESS panel after analysis.

**Say:**
“Before handoff, NARCOSCOPE checks whether the digital field evidence package is complete enough for the next documented step. This checks capture and documentation readiness; it does not decide laboratory acceptance or confirm the substance.”

## 8. Failure scenario — 25 seconds
Choose one:
- poor capture
- wrong identifier
- tamper simulation
- sync conflict

**Say:**
“We also designed failure paths explicitly. A field system should fail safely, not just succeed in the happy path.”

## Closing — 20 seconds
**Say:**
“NARCOSCOPE turns a field drug-test strip into a guided, auditable and verifiable digital evidence record — not just an image classification.”

Then state:
“This demonstration validates the field workflow, evidence integrity and verification contracts. Forensic performance will be established through a separate laboratory-confirmed validation study.”
