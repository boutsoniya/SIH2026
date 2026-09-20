import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from aruco import detect_aruco_markers


def test_aruco_empty_frame_is_safe():
    result = detect_aruco_markers(np.zeros((240, 320, 3), dtype=np.uint8))
    assert result["verified"] is False
    assert result["detected_ids"] == []


def test_aruco_expected_ids_are_explicit():
    result = detect_aruco_markers(np.zeros((240, 320, 3), dtype=np.uint8), expected_ids=(0, 1, 2, 3))
    assert result["expected_ids"] == [0, 1, 2, 3]
