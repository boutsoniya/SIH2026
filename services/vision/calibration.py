"""Reference-card calibration primitives.

The detector is deliberately conservative: calibration is only marked ready when
an explicit reference region is supplied and has enough valid pixels. A future
kit-specific detector can plug into `detect_reference_card` without changing the
API contract.
"""

import cv2
import numpy as np


def detect_reference_card(image: np.ndarray):
    """Return a candidate rectangular reference-card contour or None.

    This baseline uses contours only as a candidate generator. It must not be
    treated as a validated production detector until tested against field data.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 60, 160)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image_area = image.shape[0] * image.shape[1]
    candidates = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < image_area * 0.03 or area > image_area * 0.65:
            continue
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, 0.04 * perimeter, True)
        if len(polygon) == 4:
            candidates.append((area, polygon))

    if not candidates:
        return None
    return max(candidates, key=lambda item: item[0])[1]


def calibrate_from_reference(image: np.ndarray, reference_box=None) -> dict:
    """Estimate a simple illumination/color baseline from reference pixels."""
    if reference_box is None:
        return {"status": "not_detected", "method": "reference_card"}

    x, y, w, h = reference_box
    crop = image[max(0, y):y + h, max(0, x):x + w]
    if crop.size == 0:
        return {"status": "invalid_reference", "method": "reference_card"}

    lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
    mean_lab = np.mean(lab.reshape(-1, 3), axis=0)
    return {
        "status": "ready",
        "method": "reference_card_mean_lab",
        "mean_lab": [round(float(v), 3) for v in mean_lab],
        "sample_pixels": int(crop.shape[0] * crop.shape[1]),
    }
