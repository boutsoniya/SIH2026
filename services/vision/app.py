import os

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from pipeline import analyze_image

app = FastAPI(title="NARCOSCOPE Vision Service", version="0.1.0")

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
    return {"service": "narcoscope-vision", "status": "ok"}


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    payload = await image.read()
    return analyze_image(payload)
