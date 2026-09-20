"""Kit-specific reference-card color calibration.

Profiles are configuration, not universal drug thresholds. A profile should
come from a validated physical reference card/kit specification.
"""

import cv2
import numpy as np

DEFAULT_PROFILE = {
    "profile_id": "generic-3patch-v1",
    "patches": [
        {"name": "light", "rgb": [245, 245, 245]},
        {"name": "mid", "rgb": [128, 128, 128]},
        {"name": "dark", "rgb": [32, 32, 32]},
    ],
}


def _safe_patch(image, x, y, w, h):
    h_img, w_img = image.shape[:2]
    x1, y1 = max(0, int(x)), max(0, int(y))
    x2, y2 = min(w_img, int(x + w)), min(h_img, int(y + h))
    if x2 <= x1 or y2 <= y1:
        return None
    return image[y1:y2, x1:x2]


def rgb_to_lab(rgb):
    arr = np.uint8([[rgb]])
    lab = cv2.cvtColor(arr, cv2.COLOR_RGB2LAB)[0, 0]
    return lab.astype(np.float32)


def calibrate_color_patches(image, patch_boxes, profile=None):
    """Estimate a 3-channel affine correction from measured to reference LAB.

    patch_boxes maps profile patch names to image-space [x,y,w,h].
    Returns a calibration transform only when all configured patches are usable.
    """
    profile = profile or DEFAULT_PROFILE
    configured = {p["name"]: p for p in profile.get("patches", [])}
    measured, target = [], []

    for name, target_patch in configured.items():
        box = patch_boxes.get(name)
        if not box:
            continue
        crop = _safe_patch(image, *box)
        if crop is None or crop.size == 0:
            continue
        lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB).reshape(-1, 3)
        measured.append(np.median(lab, axis=0))
        target.append(rgb_to_lab(target_patch["rgb"]))

    if len(measured) < len(configured) or len(measured) < 3:
        return {"status": "insufficient", "method": "multi_patch_lab", "patches_used": len(measured)}

    measured = np.asarray(measured, dtype=np.float32)
    target = np.asarray(target, dtype=np.float32)
    A = np.hstack([measured, np.ones((len(measured), 1), dtype=np.float32)])
    coeff, *_ = np.linalg.lstsq(A, target, rcond=None)
    predicted = A @ coeff
    rmse = float(np.sqrt(np.mean((predicted - target) ** 2)))

    return {
        "status": "ready",
        "method": "multi_patch_lab_affine",
        "profile_id": profile.get("profile_id", "unknown"),
        "patches_used": len(measured),
        "rmse": round(rmse, 3),
        "coefficients": coeff.round(6).tolist(),
    }


def apply_lab_calibration(lab_values, calibration):
    if calibration.get("status") != "ready":
        return [float(v) for v in lab_values]
    vector = np.asarray([*lab_values, 1.0], dtype=np.float32)
    coeff = np.asarray(calibration["coefficients"], dtype=np.float32)
    corrected = vector @ coeff
    return [round(float(v), 4) for v in corrected]
