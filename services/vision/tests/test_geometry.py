import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from geometry import validate_card_geometry, normalize_card


def test_geometry_validation_returns_homography():
    image = np.zeros((1000, 1400, 3), dtype=np.uint8)
    result = validate_card_geometry({
        "source": "browser_guidance",
        "card_corners": [[200, 150], [1200, 150], [1200, 850], [200, 850]],
        "reaction_roi": {"x": 420, "y": 480, "width": 560, "height": 190},
    }, image.shape)
    assert result["valid"] is True
    assert len(result["homography"]) == 3
    assert result["reaction_roi"][0] >= 0


def test_geometry_rejects_degenerate_quad():
    image = np.zeros((1000, 1400, 3), dtype=np.uint8)
    result = validate_card_geometry({
        "card_corners": [[10, 10], [11, 10], [12, 10], [13, 10]],
    }, image.shape)
    assert result["valid"] is False


def test_geometry_rejects_missing_corners():
    image = np.zeros((1000, 1400, 3), dtype=np.uint8)
    result = validate_card_geometry({}, image.shape)
    assert result["valid"] is False


def test_normalize_card_changes_to_canonical_size():
    image = np.zeros((1000, 1400, 3), dtype=np.uint8)
    image[150:850, 200:1200] = 255
    geometry = validate_card_geometry({
        "card_corners": [[200, 150], [1200, 150], [1200, 850], [200, 850]],
    }, image.shape)
    warped = normalize_card(image, geometry)
    assert warped is not None
    assert warped.shape[:2] == (700, 1000)
