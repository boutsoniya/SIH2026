import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from color_calibration import calibrate_color_patches, apply_lab_calibration


def test_calibration_needs_all_reference_patches():
    image = np.zeros((300, 300, 3), dtype=np.uint8)
    result = calibrate_color_patches(image, {"light": [0, 0, 100, 100]})
    assert result["status"] == "insufficient"


def test_apply_lab_calibration_is_identity_when_not_ready():
    values = [100, 120, 130]
    result = apply_lab_calibration(values, {"status": "insufficient"})
    assert result == values
