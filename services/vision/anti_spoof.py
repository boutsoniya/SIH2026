"""Conservative screen re-photography heuristic.

This is a signal, not proof of manipulation. A field workflow should flag the
capture for review rather than silently declaring a physical sample fake.
"""
import cv2
import numpy as np


def screen_spoof_signal(image):
    if image is None or image.size == 0:
        return {"status": "unavailable", "flag": False, "score": 0.0, "reason": "No image."}
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    spectrum = np.fft.fftshift(np.abs(np.fft.fft2(gray)))
    spectrum = np.log1p(spectrum)
    h, w = gray.shape
    cy, cx = h // 2, w // 2
    radius = max(8, min(h, w) // 10)
    yy, xx = np.ogrid[:h, :w]
    ring = ((xx - cx) ** 2 + (yy - cy) ** 2 > radius**2)
    score = float(np.mean(spectrum[ring]) / max(np.mean(spectrum), 1e-6))
    flag = score > 1.65
    return {
        "status": "flagged" if flag else "clear",
        "flag": flag,
        "score": round(score, 4),
        "reason": "Possible re-photographed screen pattern; review capture." if flag else "No strong screen-pattern signal detected.",
    }
