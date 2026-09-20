"""Shared card geometry validation and perspective normalization.

The browser may provide guidance geometry, but the vision service remains
authoritative: it validates the quadrilateral before using it for calibration
and reaction-ROI extraction.
"""

import cv2
import numpy as np


def _ordered_corners(corners):
    pts = np.asarray(corners, dtype=np.float32).reshape(-1, 2)
    if pts.shape != (4, 2) or not np.isfinite(pts).all():
        return None
    center = pts.mean(axis=0)
    angles = np.arctan2(pts[:, 1] - center[1], pts[:, 0] - center[0])
    pts = pts[np.argsort(angles)]
    start = int(np.argmin(pts[:, 0] + pts[:, 1]))
    pts = np.roll(pts, -start, axis=0)
    if np.cross(pts[1] - pts[0], pts[2] - pts[1]) < 0:
        pts = pts[[0, 3, 2, 1]]
    return pts


def validate_card_geometry(geometry, image_shape):
    """Validate pixel-space card corners and return normalized geometry."""
    if not geometry or not geometry.get("card_corners"):
        return {"valid": False, "status": "missing", "reason": "Card geometry was not supplied."}

    h, w = image_shape[:2]
    raw_corners = geometry["card_corners"]
    if geometry.get("coordinate_space") == "normalized":
        raw_corners = [[float(p[0]) * w, float(p[1]) * h] for p in raw_corners]
    pts = _ordered_corners(raw_corners)
    if pts is None:
        return {"valid": False, "status": "invalid", "reason": "Exactly four finite card corners are required."}

    margin = 0.02 * max(w, h)
    if np.any(pts[:, 0] < -margin) or np.any(pts[:, 0] > w + margin) or np.any(pts[:, 1] < -margin) or np.any(pts[:, 1] > h + margin):
        return {"valid": False, "status": "out_of_bounds", "reason": "Card corners fall outside the captured image."}

    area = abs(cv2.contourArea(pts.reshape(-1, 1, 2)))
    if area < h * w * 0.03:
        return {"valid": False, "status": "too_small", "reason": "Reference card area is too small for reliable normalization."}

    edges = np.linalg.norm(np.roll(pts, -1, axis=0) - pts, axis=1)
    if edges.min() < 10:
        return {"valid": False, "status": "degenerate", "reason": "Reference card geometry contains a near-zero edge."}

    aspect = max(edges[0], edges[2]) / max(1e-6, (edges[1] + edges[3]) / 2)
    if not 1.05 <= aspect <= 5.0:
        return {"valid": False, "status": "aspect_invalid", "reason": "Reference card aspect ratio is outside the supported range."}

    dst_w, dst_h = 1000, 700
    destination = np.float32([[0, 0], [dst_w - 1, 0], [dst_w - 1, dst_h - 1], [0, dst_h - 1]])
    matrix = cv2.getPerspectiveTransform(pts.astype(np.float32), destination)
    normalized = cv2.perspectiveTransform(pts.reshape(1, 4, 2).astype(np.float32), matrix)[0]

    reaction = geometry.get("reaction_roi")
    reaction_norm = None
    reaction_pixels = None
    if reaction:
        try:
            rx, ry, rw, rh = [float(reaction[k]) for k in ("x", "y", "width", "height")]
            if geometry.get("coordinate_space") == "normalized":
                rx, rw = rx * w, rw * w
                ry, rh = ry * h, rh * h
            if geometry.get("coordinate_space") == "normalized":
                reaction_pixels = [rx * w, ry * h, rw * w, rh * h]
                rx, ry, rw, rh = reaction_pixels
            if rw > 0 and rh > 0:
                corners = np.float32([[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]])
                rn = cv2.perspectiveTransform(corners.reshape(1, 4, 2), matrix)[0]
                minx, miny = rn.min(axis=0)
                maxx, maxy = rn.max(axis=0)
                reaction_norm = [round(float(minx), 2), round(float(miny), 2), round(float(maxx - minx), 2), round(float(maxy - miny), 2)]
        except (TypeError, ValueError, KeyError):
            reaction_norm = None

    return {
        "valid": True,
        "status": "ready",
        "source": geometry.get("source", "browser_guidance"),
        "card_corners": [[round(float(x), 2), round(float(y), 2)] for x, y in pts],
        "homography": matrix.round(8).tolist(),
        "normalized_size": [dst_w, dst_h],
        "normalized_corners": normalized.round(2).tolist(),
        "reaction_roi": reaction_norm,
        "reaction_roi_pixels": [round(float(v), 2) for v in reaction_pixels] if reaction_pixels else None,
        "area_ratio": round(float(area / (w * h)), 5),
        "aspect_ratio": round(float(aspect), 4),
    }


def normalize_card(image, geometry):
    """Perspective-warp an image using already validated geometry."""
    if not geometry or not geometry.get("valid"):
        return None
    dst_w, dst_h = geometry["normalized_size"]
    matrix = np.asarray(geometry["homography"], dtype=np.float32)
    return cv2.warpPerspective(image, matrix, (int(dst_w), int(dst_h)))
