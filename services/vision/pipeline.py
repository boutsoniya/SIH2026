import cv2
import numpy as np

from anti_spoof import screen_spoof_signal
from aruco import detect_aruco_markers
from calibration import calibrate_from_reference, detect_reference_card
from color_calibration import calibrate_color_patches, apply_lab_calibration
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
    aruco = detect_aruco_markers(image)
    supplied_geometry = validate_card_geometry(card_geometry, image.shape) if card_geometry else {"valid": False, "status": "not_supplied"}
    reference = detect_reference_card(image)
    reference_box = polygon_box(reference)
    reference_check = validate_reference(reference_box, image.shape)
    if supplied_geometry.get("valid"):
        if aruco.get("verified"):
            supplied_geometry["source"] = "aruco_verified"
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
            "aruco": aruco,
            "reagent": reagent,
            "evidence_bag_id": evidence_bag_id,
            "card_geometry": supplied_geometry,
            "aruco": aruco,
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
        roi = tuple(int(v) for v in supplied_geometry["reaction_roi_pixels"]) if supplied_geometry.get("reaction_roi_pixels") else detect_reaction_roi(image, reference)
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
            "calibration": {**calibration, "color_calibration": color_calibration},
        "card_geometry": supplied_geometry,
            "roi": None,
            "features": None,
            "next_action": "Reaction area could not be located. Reframe the test and recapture.",
            "explanation": (
                "The reaction region could not be isolated reliably, so no colour "
                "interpretation was produced."
            ),
        }

    features_result = extract_color_features(normalized_card if normalized_card is not None else image, (0, 0, normalized_card.shape[1], normalized_card.shape[0]) if normalized_card is not None and roi is None else roi)
    measured = features_result.get("features", {})
    color_calibration = {"status": "not_configured", "method": "multi_patch_lab"}
    profile = reagent.get("calibration_profile") if reagent.get("valid") else None
    if normalized_card is not None and profile and profile.get("patches"):
        patch_boxes = {}
        for patch in profile.get("patches", []):
            box = patch.get("box")
            if isinstance(box, list) and len(box) == 4:
                patch_boxes[patch.get("name", "")] = [box[0] * normalized_card.shape[1], box[1] * normalized_card.shape[0], box[2] * normalized_card.shape[1], box[3] * normalized_card.shape[0]]
        color_calibration = calibrate_color_patches(normalized_card, patch_boxes, profile)
        if color_calibration.get("status") == "ready":
            corrected = apply_lab_calibration((measured.get("mean_l"), measured.get("mean_a"), measured.get("mean_b")), color_calibration)
            measured = {**measured, "raw_mean_lab": [measured.get("mean_l"), measured.get("mean_a"), measured.get("mean_b")], "mean_l": corrected[0], "mean_a": corrected[1], "mean_b": corrected[2]}
            features_result["features"] = measured
    inference = predict(measured)
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
