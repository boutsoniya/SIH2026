import os

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from pipeline import analyze_image

app = FastAPI(title="NARCOSCOPE Vision Service", version="0.2.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"service": "narcoscope-vision", "status": "ok", "version": "0.2.0"}


@app.post("/analyze")
async def analyze(
    image: UploadFile = File(...),
    reagent_qr: str | None = Form(default=None),
    evidence_bag_id: str | None = Form(default=None),
    card_geometry: str | None = Form(default=None),
):
    import json
    payload = await image.read()
    geometry = None
    if card_geometry:
        try:
            geometry = json.loads(card_geometry)
        except json.JSONDecodeError:
            geometry = {"card_corners": []}
    return analyze_image(payload, reagent_qr=reagent_qr, evidence_bag_id=evidence_bag_id, card_geometry=geometry)
