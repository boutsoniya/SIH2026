"""Field-to-laboratory reconciliation records.

This module deliberately stores status only; laboratory confirmation remains an
external authoritative result and is never inferred from the field image.
"""
VALID = {"PENDING", "CONFIRMED", "NOT_CONFIRMED", "REQUIRES_REVIEW"}


def reconcile(field_record, lab_result):
    if not field_record or not lab_result:
        return {"status": "REQUIRES_REVIEW", "reason": "Both records are required."}
    if field_record.get("evidence_bag_id") != lab_result.get("evidence_bag_id"):
        return {"status": "REQUIRES_REVIEW", "reason": "Evidence bag IDs do not match."}
    status = str(lab_result.get("status", "PENDING")).upper()
    if status not in VALID:
        return {"status": "REQUIRES_REVIEW", "reason": "Unknown laboratory status."}
    return {
        "status": status,
        "evidence_bag_id": field_record.get("evidence_bag_id"),
        "field_result": field_record.get("result", "INCONCLUSIVE"),
        "laboratory_reference": lab_result.get("laboratory_reference"),
    }
