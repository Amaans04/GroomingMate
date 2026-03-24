"""
Face Shape ML Server — FastAPI
Deployable on Railway via Docker.

Local:   python3 server.py
Railway: auto-started via Dockerfile CMD
"""

import io
import os
import cv2
import torch
import torch.nn as nn
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from torchvision import transforms
from torchvision.models import efficientnet_b0
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────
# Local  → full path in .env
# Railway → set MODEL_PATH env var to "face_shape_improved.pth"
#           (model file sits in /app alongside server.py)
MODEL_PATH = os.getenv(
    "MODEL_PATH",
    "./face_shape_improved.pth"
)
CLASSES  = ["Heart", "Oval", "Square"]
IMG_SIZE = 224
DEVICE   = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# ─────────────────────────────────────────────────────────────

app = FastAPI(title="Groommate Face Shape API", version="1.0.0")

# Allow your frontend + backend to call this
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),
    os.getenv("BACKEND_URL",  ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

SHAPE_INFO = {
    "Heart": {
        "emoji"      : "🫀",
        "description": "Wider forehead and cheekbones with a narrow chin.",
        "hairstyles" : ["Side-swept bangs", "Chin-length bob", "Long layers", "Side parts"],
        "avoid"      : ["Volume at temples", "Short cropped styles on top"],
    },
    "Oval": {
        "emoji"      : "🥚",
        "description": "Balanced proportions — the most versatile face shape.",
        "hairstyles" : ["Almost any style works!", "Blunt cuts", "Waves", "Updos"],
        "avoid"      : ["Styles that hide your balanced proportions"],
    },
    "Square": {
        "emoji"      : "⬛",
        "description": "Strong jaw with forehead and jaw roughly equal width.",
        "hairstyles" : ["Soft layers", "Side parts", "Waves and curls", "Long styles"],
        "avoid"      : ["Blunt bobs at jaw level", "Styles that add width at jaw"],
    },
}


# ── OpenCV face detector ──────────────────────────────────────

CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
print("  ✅ OpenCV face detector ready")


# ── Model ─────────────────────────────────────────────────────

def build_model(num_classes: int) -> nn.Module:
    m    = efficientnet_b0(weights=None)
    in_f = m.classifier[1].in_features
    m.classifier = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(in_f, 512),
        nn.ReLU(),
        nn.Dropout(p=0.3),
        nn.Linear(512, 256),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(256, num_classes),
    )
    return m


def load_model() -> nn.Module:
    obj = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
    sd  = obj.get("model_state_dict", obj) if isinstance(obj, dict) else obj
    m   = build_model(len(CLASSES))
    m.load_state_dict(sd, strict=True)
    return m.to(DEVICE).eval()


print(f"  Device : {DEVICE}")
print(f"  Loading model from: {MODEL_PATH}")
model = load_model()
print("  ✅ Model ready")


# ── TTA transforms ────────────────────────────────────────────

tta_tfms = [
    transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]),
    transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=1.0),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]),
    transforms.Compose([
        transforms.Resize((240, 240)),
        transforms.CenterCrop(IMG_SIZE),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]),
    transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ColorJitter(brightness=0.1),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]),
    transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomRotation(5),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]),
]


# ── Face crop ─────────────────────────────────────────────────

def crop_face(image: Image.Image, padding: float = 0.30):
    img_np  = np.array(image)
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    gray    = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    )
    if len(faces) == 0:
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40)
        )
    if len(faces) == 0:
        return image, False

    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    ih, iw     = img_np.shape[:2]
    pad_x, pad_y = int(w * padding), int(h * padding)

    x1 = max(0,  x - pad_x)
    y1 = max(0,  y - pad_y)
    x2 = min(iw, x + w + pad_x)
    y2 = min(ih, y + h + pad_y)

    return image.crop((x1, y1, x2, y2)), True


# ── Predict ───────────────────────────────────────────────────

def predict(image: Image.Image) -> dict:
    face_img, face_found = crop_face(image)

    all_probs = []
    with torch.no_grad():
        for tfm in tta_tfms:
            tensor = tfm(face_img).unsqueeze(0).to(DEVICE)
            probs  = torch.softmax(model(tensor), dim=1)[0].cpu().numpy()
            all_probs.append(probs)

    avg_probs  = np.mean(all_probs, axis=0)
    pred_idx   = int(np.argmax(avg_probs))
    pred_cls   = CLASSES[pred_idx]
    confidence = float(avg_probs[pred_idx])

    all_scores = [
        {"class": cls, "confidence": round(float(p), 4)}
        for cls, p in sorted(zip(CLASSES, avg_probs), key=lambda x: -x[1])
    ]

    return {
        "prediction"   : pred_cls,
        "confidence"   : round(confidence, 4),
        "face_detected": face_found,
        "all_scores"   : all_scores,
        "info"         : SHAPE_INFO[pred_cls],
    }


# ── Routes ────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "model": "face_shape_improved", "classes": CLASSES}


@app.post("/predict")
async def predict_route(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image")

    if image.width < 64 or image.height < 64:
        raise HTTPException(status_code=400, detail="Image too small (min 64x64)")

    return predict(image)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)