from pre_lab_readiness import evaluate_pre_lab_readiness


def test_ready_package():
    result = evaluate_pre_lab_readiness(
        quality={"passed": True},
        reference_check={"usable": True},
        reaction_roi=(10, 10, 20, 20),
        reagent={"valid": True, "expired": False, "kit": "KIT-A", "lot": "LOT-1", "expires": "2027-01-01"},
        evidence_bag_id="BAG-001",
    )
    assert result["status"] == "READY"
    assert result["ready_for_handoff"] is True


def test_inconclusive_result_can_still_be_ready():
    # Readiness is about evidence/package completeness, not substance identification.
    result = evaluate_pre_lab_readiness(
        quality={"passed": True},
        reference_check={"usable": True},
        reaction_roi=(10, 10, 20, 20),
        reagent={"valid": True, "expired": False},
        evidence_bag_id="BAG-002",
    )
    assert result["status"] == "READY"


def test_bad_capture_requires_recapture():
    result = evaluate_pre_lab_readiness(
        quality={"passed": False},
        reference_check={"usable": True},
        reaction_roi=(10, 10, 20, 20),
        reagent={"valid": True, "expired": False},
        evidence_bag_id="BAG-003",
    )
    assert result["status"] == "RECAPTURE_REQUIRED"
    assert result["ready_for_handoff"] is False


def test_missing_metadata_requires_review():
    result = evaluate_pre_lab_readiness(
        quality={"passed": True},
        reference_check={"usable": True},
        reaction_roi=(10, 10, 20, 20),
        reagent={"valid": False, "expired": False},
        evidence_bag_id="",
    )
    assert result["status"] == "REVIEW_REQUIRED"


def test_expired_reagent_requires_review():
    result = evaluate_pre_lab_readiness(
        quality={"passed": True},
        reference_check={"usable": True},
        reaction_roi=(10, 10, 20, 20),
        reagent={"valid": True, "expired": True},
        evidence_bag_id="BAG-005",
    )
    assert result["status"] == "REVIEW_REQUIRED"
