"""Reaction-area ROI candidate extraction."""

import cv2
import numpy as np


def detect_reaction_roi(image: np.ndarray, reference_polygon=None):
    """Find a conservative reaction-area candidate.

    If a reference card is detected, its area is excluded from candidates. The
    returned box is a candidate only; kit-specific validation is still required.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    mask = cv2.threshold(saturation, 45, 255, cv2.THRESH_BINARY)[1]
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))

    if reference_polygon is not None:
        cv2.fillPoly(mask, [reference_polygon], 0)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    h, w = gray.shape
    image_area = h * w
    candidates = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if image_area * 0.002 <= area <= image_area * 0.35:
            x, y, bw, bh = cv2.boundingRect(contour)
            if bw >= 20 and bh >= 20:
                candidates.append((area, (x, y, bw, bh)))

    return max(candidates, key=lambda item: item[0])[1] if candidates else None
