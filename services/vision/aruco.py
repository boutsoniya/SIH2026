"""Optional ArUco marker verification for the physical reference card.

ArUco support is used as an independent backend verification signal. Browser
geometry remains capture guidance and is never trusted solely because it reports
four corners.
"""

import cv2
import numpy as np


def detect_aruco_markers(image: np.ndarray, expected_ids=(0, 1, 2, 3)) -> dict:
    aruco = getattr(cv2, "aruco", None)
    if aruco is None:
        return {
            "status": "unavailable",
            "verified": False,
            "reason": "OpenCV ArUco support is not installed.",
            "detected_ids": [],
        }

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    dictionary = aruco.getPredefinedDictionary(aruco.DICT_4X4_50)
    parameters = aruco.DetectorParameters()
    corners, ids, _ = aruco.ArucoDetector(dictionary, parameters).detectMarkers(gray)

    detected_ids = [int(v) for v in ids.flatten()] if ids is not None else []
    expected = [int(v) for v in expected_ids]
    matched = sorted(set(detected_ids).intersection(expected))

    marker_centers = {}
    if ids is not None:
        for marker_id, marker_corners in zip(ids.flatten(), corners):
            marker_centers[str(int(marker_id))] = [
                round(float(marker_corners[0, :, 0].mean()), 2),
                round(float(marker_corners[0, :, 1].mean()), 2),
            ]

    return {
        "status": "ok",
        "verified": len(matched) == len(expected),
        "dictionary": "DICT_4X4_50",
        "expected_ids": expected,
        "detected_ids": detected_ids,
        "matched_ids": matched,
        "marker_centers": marker_centers,
        "reason": "All configured reference markers detected." if len(matched) == len(expected)
        else "Reference marker set is incomplete.",
    }
