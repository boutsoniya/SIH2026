"""Evidence/reagent QR scanning helpers using OpenCV's QR detector."""
import cv2


def scan_qr(image):
    if image is None or image.size == 0:
        return {"detected": False, "value": None, "reason": "Empty image."}
    detector = cv2.QRCodeDetector()
    value, points, _ = detector.detectAndDecode(image)
    if value:
        return {"detected": True, "value": value.strip(), "reason": "QR detected."}
    return {"detected": False, "value": None, "reason": "No QR payload detected."}
