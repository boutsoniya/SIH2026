"""Pre-lab evidence readiness checks.

This module does not decide whether a physical sample must be sent to a laboratory.
It checks whether the captured field evidence package is sufficiently complete and
usable for the next documented handoff step.
"""


def evaluate_pre_lab_readiness(
    *,
    quality: dict | None,
    reference_check: dict | None,
    reaction_roi,
    reagent: dict | None,
    evidence_bag_id: str | None,
) -> dict:
    """Return a conservative readiness state for the field evidence package.

    READY means the configured capture/documentation checks passed. It is not a
    laboratory acceptance decision and does not imply substance identification.
    REVIEW_REQUIRED means a missing/invalid metadata item needs attention.
    RECAPTURE_REQUIRED means the captured evidence itself is not usable.
    """

    quality_passed = bool((quality or {}).get("passed"))
    reference_ok = bool((reference_check or {}).get("usable"))
    reaction_ok = reaction_roi is not None

    reagent = reagent or {}
    reagent_present = bool(reagent)
    reagent_valid = bool(reagent.get("valid"))
    reagent_expired = bool(reagent.get("expired"))
    bag_ok = bool(str(evidence_bag_id or "").strip())

    checks = {
        "image_quality": {
            "status": "PASS" if quality_passed else "FAIL",
            "message": "Image quality passed the configured capture gate."
            if quality_passed
            else "Image quality did not pass the capture gate.",
        },
        "reference_card": {
            "status": "PASS" if reference_ok else "FAIL",
            "message": "Reference-card evidence is usable."
            if reference_ok
            else "Reference-card evidence is missing or unusable.",
        },
        "reaction_roi": {
            "status": "PASS" if reaction_ok else "FAIL",
            "message": "Reaction area was isolated."
            if reaction_ok
            else "Reaction area could not be isolated.",
        },
        "reagent_metadata": {
            "status": (
                "PASS"
                if reagent_present and reagent_valid and not reagent_expired
                else "REVIEW"
            ),
            "message": (
                "Kit, lot and expiry metadata are available and valid."
                if reagent_present and reagent_valid and not reagent_expired
                else "Confirm the reagent QR / kit-lot-expiry metadata before handoff."
            ),
        },
        "evidence_bag": {
            "status": "PASS" if bag_ok else "REVIEW",
            "message": "Evidence bag identifier is linked."
            if bag_ok
            else "Add the evidence bag identifier before handoff.",
        },
    }

    if not quality_passed or not reference_ok or not reaction_ok:
        status = "RECAPTURE_REQUIRED"
        next_action = "Recapture or complete the field evidence before handoff."
    elif not (reagent_present and reagent_valid and not reagent_expired and bag_ok):
        status = "REVIEW_REQUIRED"
        next_action = "Complete the missing metadata and review the field record before handoff."
    else:
        status = "READY"
        next_action = "Field evidence package is complete for the configured pre-lab handoff checks."

    return {
        "status": status,
        "ready_for_handoff": status == "READY",
        "checks": checks,
        "next_action": next_action,
        "note": (
            "Readiness checks support documentation and evidence quality only. "
            "They do not determine whether a sample must be sent to a laboratory, "
            "do not certify laboratory acceptance, and do not confirm substance identity."
        ),
    }

# End of readiness module.
