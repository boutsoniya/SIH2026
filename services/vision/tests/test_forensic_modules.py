import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from anti_spoof import screen_spoof_signal
from barcode import scan_qr
from ciede2000 import delta_e_2000
from fsl_reconciliation import reconcile
from reagent import parse_reagent_qr


def test_ciede_identical_colour_is_zero():
    assert abs(delta_e_2000((50, 10, -20), (50, 10, -20))) < 1e-9


def test_ciede_is_symmetric():
    a = delta_e_2000((55, 12, -18), (45, 5, 22))
    b = delta_e_2000((45, 5, 22), (55, 12, -18))
    assert abs(a - b) < 1e-9


def test_reagent_qr_valid():
    result = parse_reagent_qr('{"kit":"SCOTT","lot":"LOT-123","expires":"2099-12-31"}')
    assert result["valid"] is True
    assert result["expired"] is False
    assert result["lot"] == "LOT-123"


def test_reagent_qr_rejects_missing_fields():
    result = parse_reagent_qr('{"kit":"SCOTT"}')
    assert result["valid"] is False


def test_reagent_qr_rejects_malformed_json():
    assert parse_reagent_qr("not-json")["valid"] is False


def test_empty_spoof_input_is_safe():
    result = screen_spoof_signal(None)
    assert result["flag"] is False
    assert result["status"] == "unavailable"


def test_empty_barcode_input_is_safe():
    result = scan_qr(None)
    assert result["detected"] is False


def test_fsl_reconciliation_links_matching_bag():
    result = reconcile(
        {"evidence_bag_id": "BAG-1", "result": "PRESUMPTIVE_POSITIVE"},
        {"evidence_bag_id": "BAG-1", "status": "CONFIRMED", "laboratory_reference": "FSL-22"},
    )
    assert result["status"] == "CONFIRMED"
    assert result["laboratory_reference"] == "FSL-22"


def test_fsl_reconciliation_rejects_wrong_bag():
    result = reconcile(
        {"evidence_bag_id": "BAG-1", "result": "PRESUMPTIVE_POSITIVE"},
        {"evidence_bag_id": "BAG-2", "status": "CONFIRMED"},
    )
    assert result["status"] == "REQUIRES_REVIEW"


def test_fsl_reconciliation_rejects_unknown_status():
    result = reconcile(
        {"evidence_bag_id": "BAG-1"},
        {"evidence_bag_id": "BAG-1", "status": "MAGIC"},
    )
    assert result["status"] == "REQUIRES_REVIEW"
