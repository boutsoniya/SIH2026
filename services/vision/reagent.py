"""Reagent QR parsing and validity checks.

The payload is expected to be JSON, e.g.:
{"kit":"SCOTT","lot":"LOT-123","expires":"2027-06-30"}
"""
import json
from datetime import date


def parse_reagent_qr(payload):
    if not payload:
        return {"valid": False, "reason": "Empty reagent QR payload."}
    try:
        data = json.loads(payload)
    except (TypeError, json.JSONDecodeError):
        return {"valid": False, "reason": "QR payload is not valid JSON."}
    kit = str(data.get("kit", "")).strip()
    lot = str(data.get("lot", "")).strip()
    expires = str(data.get("expires", "")).strip()
    if not kit or not lot or not expires:
        return {"valid": False, "reason": "Kit, lot and expiry are required."}
    try:
        expiry = date.fromisoformat(expires)
    except ValueError:
        return {"valid": False, "reason": "Expiry must use YYYY-MM-DD."}
    expired = expiry < date.today()
    target_lab = data.get("target_lab")
    if target_lab is not None and (not isinstance(target_lab, list) or len(target_lab) != 3):
        target_lab = None
    return {
        "valid": True,
        "expired": expired,
        "kit": kit,
        "lot": lot,
        "expires": expires,
        "target_lab": target_lab,
        "reason": "Reagent expired." if expired else "Reagent metadata valid.",
    }
