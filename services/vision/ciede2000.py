"""Perceptual colour-distance utilities.

The function is intentionally generic: kit-specific target colours and thresholds
must come from a validated reference profile rather than hard-coded universal
drug-identification thresholds.
"""
import math


def _lab_to_lch(lab):
    L, a, b = map(float, lab)
    C = math.hypot(a, b)
    h = math.degrees(math.atan2(b, a)) % 360
    return L, C, h


def delta_e_2000(lab1, lab2):
    L1, C1, h1 = _lab_to_lch(lab1)
    L2, C2, h2 = _lab_to_lch(lab2)
    C_bar = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt((C_bar**7) / (C_bar**7 + 25**7)))
    a1p = (1 + G) * float(lab1[1])
    a2p = (1 + G) * float(lab2[1])
    C1p, C2p = math.hypot(a1p, float(lab1[2])), math.hypot(a2p, float(lab2[2]))
    h1p = math.degrees(math.atan2(float(lab1[2]), a1p)) % 360
    h2p = math.degrees(math.atan2(float(lab2[2]), a2p)) % 360
    dLp = L2 - L1
    dCp = C2p - C1p
    dh = h2p - h1p
    if C1p * C2p == 0:
        dhp = 0
    elif dh > 180:
        dhp = dh - 360
    elif dh < -180:
        dhp = dh + 360
    else:
        dhp = dh
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))
    Lbp = (L1 + L2) / 2
    Cbp = (C1p + C2p) / 2
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2
    elif h1p + h2p < 360:
        hbp = (h1p + h2p + 360) / 2
    else:
        hbp = (h1p + h2p - 360) / 2
    T = (1
         - 0.17 * math.cos(math.radians(hbp - 30))
         + 0.24 * math.cos(math.radians(2 * hbp))
         + 0.32 * math.cos(math.radians(3 * hbp + 6))
         - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dtheta = 30 * math.exp(-((hbp - 275) / 25) ** 2)
    Rc = 2 * math.sqrt((Cbp**7) / (Cbp**7 + 25**7))
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dtheta)) * Rc
    return math.sqrt(
        (dLp / Sl) ** 2
        + (dCp / Sc) ** 2
        + (dHp / Sh) ** 2
        + Rt * (dCp / Sc) * (dHp / Sh)
    )


def compare_to_reference(measured_lab, target_lab):
    if measured_lab is None or target_lab is None:
        return {"status": "unavailable", "delta_e_00": None}
    value = delta_e_2000(measured_lab, target_lab)
    return {"status": "computed", "delta_e_00": round(float(value), 4)}
