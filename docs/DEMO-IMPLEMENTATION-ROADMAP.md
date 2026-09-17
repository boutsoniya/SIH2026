# NARCOSCOPE — Demo Implementation Roadmap

## Purpose

This document is the implementation checklist for the SIH26231 prototype. It keeps the demo honest: the current AI pipeline is a prototype and must not be presented as validated real-world drug detection.

## Demo target

**Capture → Validate → Calibrate → Analyze → Explain → Evidence → Verify → Sync → History**

## Milestone 1 — Evidence verification

- Recompute SHA-256 of the captured image.
- Canonicalize the evidence JSON before hashing.
- Recompute the record hash and compare it with the stored value.
- Show `VERIFIED` / `TAMPER DETECTED` in the UI.
- Add a demo tamper action that changes one field and visibly fails verification.

### Evidence fields

- test_id
- operator_id
- timestamp
- GPS (when permission/data is available)
- test_type
- presumptive result
- confidence/uncertainty
- image_sha256
- record_hash
- signature status
- sync status

## Milestone 2 — Offline-first queue

Use persistent browser storage for the prototype.

Record states:

`QUEUED → SYNCING → SYNCED`

Failure path:

`SYNCING → FAILED → QUEUED`

Requirements:

- Stable `test_id` for every record.
- No duplicate upload when the same record is retried.
- Visible queue count.
- Last sync timestamp.
- Retry failed records.
- Preserve evidence locally until sync is confirmed.

## Milestone 3 — Command dashboard

Create a separate dashboard view with:

- total records
- presumptive positive / negative / inconclusive counts
- queued / synced / failed counts
- searchable test ID
- filter by result
- filter by date
- filter by operator ID
- filter by test type
- integrity status
- evidence detail panel

Avoid presenting synthetic/demo records as field statistics.

## Milestone 4 — Field capture UX

### Capture

Show:

- camera/upload area
- test-kit guide
- reference-card guide
- focus/blur warning
- exposure/lighting warning
- reference-card detection status
- capture button

### Calibration

Show:

- detected reference card
- calibration status
- color-space conversion (LAB/HSV)
- normalization summary
- quality score

### Analysis

Show:

- ROI overlay
- extracted colorimetric features
- model status
- presumptive result
- uncertainty/confidence
- explanation
- prominent note: **presumptive field result; laboratory confirmation required**

## Milestone 5 — Presentation package

Required visuals:

1. Problem → solution workflow
2. End-to-end architecture
3. Computer-vision pipeline
4. Evidence/hash verification flow
5. Offline queue and sync flow
6. Field-app screens
7. Command-center dashboard
8. Final demo storyboard

## Claims discipline

Allowed:

- prototype
- ML-assisted
- decision-support
- presumptive result
- synthetic/demo data
- engineering validation
- offline-capable design

Avoid unless validated with representative labelled field data:

- 100% accurate
- production-ready
- forensic proof
- laboratory replacement
- real-world accuracy

## Demo script

1. Start a new test.
2. Capture a sample image.
3. Run image-quality validation.
4. Detect and calibrate against the reference card.
5. Detect the test ROI.
6. Produce a prototype presumptive result or `INCONCLUSIVE` when the quality/model gate is not satisfied.
7. Create the evidence record.
8. Display image hash and record hash.
9. Verify the record.
10. Toggle offline mode and queue the record.
11. Restore connectivity and sync it.
12. Open command history and search the test.
13. Change one evidence field in the demo and run verification again to show tamper detection.

## Definition of done for the SIH demo

- The happy path works end-to-end.
- Inconclusive is a first-class outcome.
- Evidence integrity can be demonstrated live.
- Offline queue can be demonstrated live.
- Dashboard can retrieve/search demo records.
- Every result is clearly labelled as prototype/presumptive where appropriate.
- No unsupported accuracy claim appears in the UI or PPT.
