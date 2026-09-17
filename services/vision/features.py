"""Colour features used by the model adapter."""

import cv2
import numpy as np


def extract_color_features(image: np.ndarray, roi_box) -> dict:
    if roi_box is None:
        return {"status": "missing_roi", "features": {}}

    x, y, w, h = roi_box
    crop = image[y:y + h, x:x + w]
    if crop.size == 0:
        return {"status": "invalid_roi", "features": {}}

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
    features = {
        "mean_h": round(float(np.mean(hsv[:, :, 0])), 4),
        "mean_s": round(float(np.mean(hsv[:, :, 1])), 4),
        "mean_v": round(float(np.mean(hsv[:, :, 2])), 4),
        "mean_l": round(float(np.mean(lab[:, :, 0])), 4),
        "mean_a": round(float(np.mean(lab[:, :, 1])), 4),
        "mean_b": round(float(np.mean(lab[:, :, 2])), 4),
        "std_h": round(float(np.std(hsv[:, :, 0])), 4),
        "std_s": round(float(np.std(hsv[:, :, 1])), 4),
        "std_v": round(float(np.std(hsv[:, :, 2])), 4),
    }
    return {"status": "ok", "features": features}
