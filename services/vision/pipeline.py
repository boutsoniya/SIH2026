import cv2
import numpy as np

from anti_spoof import screen_spoof_signal
from calibration import calibrate_from_reference, detect_reference_card
from ciede2000 import compare_to_reference
from features import extract_color_features
from geometry import validate_card_geometry, normalize_card
from model import predict
from quality import quality_gate, validate_reference
from reagent import parse_reagent_qr
from roi import detect_reaction_roi


def polygon_box(polygon):
    if polygon is None:
        return None
    x, y, w, h = cv2.boundingRect(polygon)
    return [int(x), int(y), int(w), int(h)]


def analyze_image(payload: bytes, reagent_qr: str | None = None, evidence_bag_id: str | None = None, card_geometry: dict | None = None) -> dict:
    array = np.frombuffer(payload, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        return {
            "status": "invalid_image",
            "result": "INCONCLUSIVE",
            "confidence": None,
            "next_action": "Capture a valid image of the complete test area.",
        }

    quality = quality_gate(image)
    supplied_geometry = validate_card_geometry(card_geometry, image.shape) if card_geometry else {"valid": False, "status": "not_supplied"}
    reference = detect_reference_card(image)
    reference_box = polygon_box(reference)
    reference_check = validate_reference(reference_box, image.shape)
    if supplied_geometry.get("valid"):
        reference_check = {"usable": True, "reason": "Validated capture geometry supplied."}
        reference_box = [int(min(p[0] for p in supplied_geometry["card_corners"])), int(min(p[1] for p in supplied_geometry["card_corners"])), int(max(p[0] for p in supplied_geometry["card_corners"]) - min(p[0] for p in supplied_geometry["card_corners"])), int(max(p[1] for p in supplied_geometry["card_corners"]) - min(p[1] for p in supplied_geometry["card_corners"]))]
    quality["reference_card"] = reference_check

    spoof = screen_spoof_signal(image)
    reagent = parse_reagent_qr(reagent_qr) if reagent_qr else {
        "valid": False,
        "status": "not_provided",
        "reason": "Reagent QR not supplied; continue only in configured demo/review mode.",
    }

    if not reference_check["usable"]:
        quality["passed"] = False
        quality["capture_guidance"].append(
            reference_check["reason"] or
            "Keep the complete reference card visible and unobstructed."
        )

    if spoof.get("flag"):
        quality["passed"] = False
        quality["capture_guidance"].append(
            "Possible screen re-photography detected. Capture the physical test directly."
        )

    if not quality["passed"]:
        return {
            "status": "quality_rejected",
            "result": "INCONCLUSIVE",
            "confidence": None,
            "quality": quality,
            "reference_card": reference_box,
            "anti_spoof": spoof,
            "reagent": reagent,
            "evidence_bag_id": evidence_bag_id,
            "card_geometry": supplied_geometry,
            "calibration": {"status": "blocked", "method": "reference_card"},
            "roi": None,
            "features": None,
            "next_action": quality["capture_guidance"][0],
            "explanation": (
                "The evidence was not strong enough to continue. "
                "The system halted before interpretation rather than forcing a result."
            ),
        }

    calibration = calibrate_from_reference(image, reference_box)
    if supplied_geometry.get("valid"):
        normalized_card = normalize_card(image, supplied_geometry)
        roi = tuple(int(v) for v in supplied_geometry["reaction_roi"]) if supplied_geometry.get("reaction_roi") else detect_reaction_roi(image, reference)
        calibration["geometry_source"] = supplied_geometry.get("source", "browser_guidance")
        calibration["homography"] = supplied_geometry["homography"]
        calibration["normalized_size"] = supplied_geometry["normalized_size"]
    else:
        normalized_card = None
        roi = detect_reaction_roi(image, reference)

    if roi is None:
        return {
            "status": "analysis_blocked",
            "result": "INCONCLUSIVE",
            "confidence": None,
            "quality": quality,
            "reference_card": reference_box,
            "anti_spoof": spoof,
            "reagent": reagent,
            "evidence_bag_id": evidence_bag_id,
            "calibration": calibration,
        "card_geometry": supplied_geometry,
            "roi": None,
            "features": None,
            "next_action": "Reaction area could not be located. Reframe the test and recapture.",
            "explanation": (
                "The reaction region could not be isolated reliably, so no colour "
                "interpretation was produced."
            ),
        }

    features_result = extract_color_features(image, roi)
    inference = predict(features_result.get("features", {}))
    measured = features_result.get("features", {})
    measured_lab = (measured.get("mean_l"), measured.get("mean_a"), measured.get("mean_b"))
    target_lab = reagent.get("target_lab") if reagent.get("valid") else None
    color_distance = compare_to_reference(measured_lab, target_lab) if target_lab else {"status": "not_configured", "delta_e_00": None}

    return {
        "status": "ready_for_inference",
        **inference,
        "quality": quality,
        "calibration": calibration,
        "reference_card": reference_box,
        "anti_spoof": spoof,
        "reagent": reagent,
        "evidence_bag_id": evidence_bag_id,
        "roi": roi,
        "features": features_result,
        "color_distance": color_distance,
        "color_interpretation": features_result.get("color_interpretation"),
        "explanation": (
            "Image quality, reference-card validation, anti-spoof screening, calibration "
            "and reaction-ROI feature extraction completed. The observed colour is reported "
            "separately from substance identification. No validated field model is attached, "
            "so the safe result remains inconclusive."
        ),
    }
