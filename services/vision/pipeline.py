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
    reference = detect_reference_card(image)
    reference_box = polygon_box(reference)
    quality["capture_guidance"] = []

    if not quality["checks"]["resolution"]:
        quality["capture_guidance"].append("Move closer so the test reaction fills more of the frame.")
    if quality["brightness"] < 70:
        quality["capture_guidance"].append("Image is dark. Use even ambient light and avoid strong shadows.")
    elif quality["brightness"] > 190:
        quality["capture_guidance"].append("Image is bright. Reduce glare and avoid direct flash on the test area.")
    if quality["sharpness"] < 150:
        quality["capture_guidance"].append("Image may be blurred. Hold the device steady and recapture.")
    if reference_box is None:
        quality["capture_guidance"].append("Reference colour card was not detected. Keep the full card visible and unobstructed.")
    if not quality["capture_guidance"]:
        quality["capture_guidance"].append("Capture conditions look suitable for the next analysis stage.")

    if not quality["passed"]:
        return {
            "status": "quality_rejected",
            "result": "INCONCLUSIVE",
            "confidence": None,
            "quality": quality,
            "reference_card": reference_box,
            "next_action": quality["capture_guidance"][0],
        }

    calibration = calibrate_from_reference(image, reference_box)
    roi = detect_reaction_roi(image, reference)
    features_result = extract_color_features(image, roi)
    inference = predict(features_result.get("features", {}))

    return {
        "status": "ready_for_inference",
        **inference,
        "quality": quality,
        "calibration": calibration,
        "reference_card": reference_box,
        "roi": roi,
        "features": features_result,
        "color_interpretation": features_result.get("color_interpretation"),
        "explanation": "Image quality, reference-card candidate detection and reaction ROI feature extraction completed. The observed colour is reported separately from substance identification. No validated field model is attached, so the safe result remains inconclusive.",
    }
