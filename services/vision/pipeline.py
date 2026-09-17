import cv2
import numpy as np


def quality_gate(image: np.ndarray) -> dict:
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    checks = {
        "resolution": width >= 200 and height >= 150,
        "brightness": 40 <= brightness <= 220,
        "sharpness": sharpness >= 100,
    }
    return {
        "passed": all(checks.values()),
        "width": width,
        "height": height,
        "brightness": round(brightness, 2),
        "sharpness": round(sharpness, 2),
        "checks": checks,
    }


def analyze_image(payload: bytes) -> dict:
    array = np.frombuffer(payload, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        return {"status": "invalid_image", "result": "INCONCLUSIVE"}

    quality = quality_gate(image)
    if not quality["passed"]:
        return {
            "status": "quality_rejected",
            "result": "INCONCLUSIVE",
            "confidence": None,
            "quality": quality,
            "next_action": "Recapture image under better framing and lighting.",
        }

    return {
        "status": "ready_for_inference",
        "result": "INCONCLUSIVE",
        "confidence": None,
        "quality": quality,
        "calibration": {"status": "pending", "reference_card": "not_detected"},
        "roi": None,
        "explanation": "No validated field model is attached yet; the safe default is inconclusive.",
    }
