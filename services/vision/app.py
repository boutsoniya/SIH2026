from fastapi import FastAPI, File, UploadFile
from pipeline import analyze_image

app = FastAPI(title="NARCOSCOPE Vision Service", version="0.1.0")

@app.get("/health")
def health():
    return {"service": "narcoscope-vision", "status": "ok"}

@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    payload = await image.read()
    return analyze_image(payload)
