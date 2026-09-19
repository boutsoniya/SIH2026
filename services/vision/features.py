"""Colour features and human-readable colour interpretation used by the vision pipeline."""

import cv2
import numpy as np


def interpret_color(features: dict) -> dict:
    if not features:
        return {
            "status": "unavailable",
            "display_name": "Not available",
            "family": "Unknown",
            "description": "No reaction ROI colour could be measured.",
            "hex": "#9AA6B2",
            "hue_degrees": None,
            "saturation_pct": None,
            "brightness_pct": None,
        }

    hue = float(features.get("mean_h", 0.0)) * 2.0
    saturation = float(features.get("mean_s", 0.0)) / 255.0 * 100.0
    value = float(features.get("mean_v", 0.0)) / 255.0 * 100.0

    if saturation < 12:
        family, display = "Low saturation", "Neutral / grey"
    elif hue < 15 or hue >= 345:
        family, display = "Red", "Red"
    elif hue < 40:
        family, display = "Orange", "Orange"
    elif hue < 70:
        family, display = "Yellow", "Yellow"
    elif hue < 170:
        family, display = "Green", "Green"
    elif hue < 230:
        family, display = "Cyan / Blue", "Blue"
    elif hue < 285:
        family, display = "Blue", "Blue-violet"
    elif hue < 330:
        family, display = "Purple", "Purple / violet"
    else:
        family, display = "Magenta", "Pink / magenta"

    hsv_pixel = np.array([[[float(features.get("mean_h", 0.0)), float(features.get("mean_s", 0.0)), float(features.get("mean_v", 0.0))]]], dtype=np.float32)
    rgb = cv2.cvtColor(hsv_pixel, cv2.COLOR_HSV2RGB)[0, 0]
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    hex_color = "#{:02X}{:02X}{:02X}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))

    return {
        "status": "ok",
        "display_name": display,
        "family": family,
        "description": (
            f"A {display.lower()} colour response is visible in the detected reaction region."
            " Exact chemical meaning is kit-specific and requires the validated reference card."
        ),
        "hex": hex_color,
        "hue_degrees": round(hue, 1),
        "saturation_pct": round(saturation, 1),
        "brightness_pct": round(value, 1),
    }


def extract_color_features(image: np.ndarray, roi_box) -> dict:
    if roi_box is None:
        return {"status": "missing_roi", "features": {}, "color_interpretation": interpret_color({})}

    x, y, w, h = roi_box
    crop = image[y:y + h, x:x + w]
    if crop.size == 0:
        return {"status": "invalid_roi", "features": {}, "color_interpretation": interpret_color({})}

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
    return {
        "status": "ok",
        "features": features,
        "color_interpretation": interpret_color(features),
    }
