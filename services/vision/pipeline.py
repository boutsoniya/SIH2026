import cv2
import numpy as np
from calibration import calibrate_from_reference, detect_reference_card
from features import extract_color_features
from model import predict
from roi import detect_reaction_roi


def quality_gate(image: np.ndarray) -> dict:
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    checks = {"resolution": width >= 200 and height >= 150, "brightness": 40 <= brightness <= 220, "sharpness": sharpness >= 100}
    return {"passed": all(checks.values()), "width": width, "height": height, "brightness": round(brightness, 2), "sharpness": round(sharpness, 2), "checks": checks}


def polygon_box(polygon):
    if polygon is None:
        return None
    x, y, w, h = cv2.boundingRect(polygon)
    return [int(x), int(y), int(w), int(h)]


def analyze_image(payload: bytes) -> dict:
    array = np.frombuffer(payload, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        return {"status": "invalid_image", "result": "INCONCLUSIVE"}
    quality = quality_gate(image)
    if not quality["passed"]:
        return {"status": "quality_rejected", "result": "INCONCLUSIVE", "confidence": None, "quality": quality, "next_action": "Recapture image under better framing and lighting."}

    reference = detect_reference_card(image)
    reference_box = polygon_box(reference)
    calibration = calibrate_from_reference(image, reference_box)
    roi = detect_reaction_roi(image, reference)
    features_result = extract_color_features(image, roi)
    inference = predict(features_result.get("features", {}))
    return {"status": "ready_for_inference", **inference, "quality": quality, "calibration": calibration, "reference_card": reference_box, "roi": roi, "features": features_result, "explanation": "Quality, reference-card candidate detection and ROI feature extraction completed. No validated field model is attached, so the safe result remains inconclusive."}
