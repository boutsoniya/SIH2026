# NARCOSCOPE Architecture

## Field-to-evidence pipeline

```text
Field Officer
    ↓
React/PWA Field App
    ↓
Guided Capture
    ↓
Image Quality Gate
    ↓
Reference Card Detection
    ↓
Color / Illumination Calibration
    ↓
ROI Detection + Feature Extraction
    ↓
ML-assisted Presumptive Classification
    ↓
Result + Confidence + Explanation
    ↓
Evidence Record
 ┌──┴───────────────┐
 │                  │
SHA-256          Metadata
 │             timestamp/GPS/operator
 └──────┬───────────┘
        ↓
Digital Signature / Integrity Verification
        ↓
Offline Queue / Secure API
        ↓
Evidence & Audit Dashboard
```

## Design decisions

### Reference-card calibration
The reference card is a first-class capture requirement. The pipeline should reject or request recapture when the card cannot be reliably located or image quality is inadequate.

### Presumptive classification
The system must distinguish between positive, negative, and inconclusive outcomes. Low-quality or uncertain observations should be allowed to become inconclusive rather than forcing a binary decision.

### Evidence integrity
The original image should be hashed at ingestion. The record should bind the hash to test ID, operator, timestamp, location, test type, result, and model metadata. Verification must detect changes to either the evidence or its bound metadata.

### Offline-first operation
Field users should be able to capture and review records without continuous connectivity. Sync should be explicit and idempotent so that the same record is not duplicated during reconnection.

### Evaluation
Synthetic data can be used for pipeline development, but reported performance must clearly separate synthetic validation from real-world validation. Future evaluation should use laboratory-confirmed labels, unseen devices, lighting variation, and kit variation.
