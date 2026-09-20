import cv2
import numpy as np


def _glare_ratio(image: np.ndarray) -> float:
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    highlights = (hsv[:, :, 2] >= 245) & (hsv[:, :, 1] <= 35)
    return float(np.mean(highlights))


def _contrast(image: np.ndarray) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(np.std(gray))


def quality_gate(image: np.ndarray) -> dict:
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    contrast = _contrast(image)
    glare_ratio = _glare_ratio(image)

    checks = {
        "resolution": width >= 200 and height >= 150,
        "brightness": 40 <= brightness <= 220,
        "sharpness": sharpness >= 100,
        "contrast": contrast >= 18,
        "glare": glare_ratio <= 0.08,
    }

    passed = all(checks.values())
    score_parts = [
        checks["resolution"],
        checks["brightness"],
        checks["sharpness"],
        checks["contrast"],
        checks["glare"],
    ]
    quality_score = round(sum(score_parts) / len(score_parts) * 100)

    guidance = []
    if not checks["resolution"]:
        guidance.append("Move closer so the test reaction fills more of the frame.")
    if brightness < 70:
        guidance.append("Image is dark. Use even ambient light and avoid strong shadows.")
    elif brightness > 190:
        guidance.append("Image is bright. Reduce glare and avoid direct flash on the test area.")
    if sharpness < 150:
        guidance.append("Image may be blurred. Hold the device steady and recapture.")
    if contrast < 18:
        guidance.append("The image has low contrast. Use a clearer background and even lighting.")
    if glare_ratio > 0.08:
        guidance.append("Strong glare is covering part of the image. Tilt the device or remove direct reflections.")

    return {
        "passed": passed,
        "quality_score": quality_score,
        "width": width,
        "height": height,
        "brightness": round(brightness, 2),
        "sharpness": round(sharpness, 2),
        "contrast": round(contrast, 2),
        "glare_ratio": round(glare_ratio, 4),
        "checks": checks,
        "capture_guidance": guidance or ["Capture conditions look suitable for the next analysis stage."],
    }


def validate_reference(reference_box, image_shape) -> dict:
    if reference_box is None:
        return {
            "detected": False,
            "usable": False,
            "reason": "Reference colour card was not detected.",
        }

    x, y, w, h = reference_box
    height, width = image_shape[:2]
    area_ratio = (w * h) / float(width * height)
    usable = area_ratio >= 0.01 and area_ratio <= 0.70 and w >= 30 and h >= 30

    return {
        "detected": True,
        "usable": usable,
        "area_ratio": round(area_ratio, 4),
        "box": [int(x), int(y), int(w), int(h)],
        "reason": None if usable else "Reference card candidate is too small or outside the usable frame.",
    }
