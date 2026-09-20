# Validation & scientific readiness

## Validation boundary

The application separates **measurement infrastructure** from **validated substance classification**.

The following can be tested deterministically in CI:
- image-quality gating
- reference-card geometry and homography
- ArUco reference-card verification
- reagent QR parsing and expiry checks
- multi-patch colour calibration
- LAB/CIEDE2000 calculations
- anti-spoof signals
- evidence ledger integrity
- FSL reconciliation rules

Final field classification must be backed by a kit-specific validated reference profile and representative physical dataset. The repository does not treat synthetic examples as evidence of real-world accuracy.

## Required validation dataset

For each supported kit/card version, collect controlled captures covering:
- multiple phones/cameras
- indoor/outdoor illumination
- glare and shadow conditions
- different viewing angles
- reagent lots and expiry states
- negative/reference samples
- known positive reference samples where legally and scientifically appropriate

Keep ground truth and acquisition metadata separate from the model under test. Report sensitivity, specificity, false-positive rate, false-negative rate, inconclusive rate, and calibration error with confidence intervals.

## Release gate

Do not label a kit profile as validated until its dataset, protocol, thresholds, and acceptance criteria have been reviewed by the responsible technical/forensic authority.
