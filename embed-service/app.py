# pharmacy-erp/embed-service/app.py
from fastapi import FastAPI, UploadFile, File
from insightface.app import FaceAnalysis
import numpy as np, cv2

app = FastAPI()
fa = FaceAnalysis(name='buffalo_l')  # good, compact model
fa.prepare(ctx_id=-1)  # set -1 for CPU

@app.post('/embed')
def embed(image: UploadFile = File(...)):
    data = image.file.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    faces = fa.get(img)
    if not faces:
        return {"ok": False, "reason": "no_face"}
    # largest face
    face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))
    emb = face.normed_embedding.astype(np.float32)
    return {"ok": True, "embedding": emb.tolist()}

# mac
# python3 -m venv .venv
# source .venv/bin/activate
# python -m pip install -U pip wheel setuptools

# windows cmd
# cd D:\pharmacy-erp\embed-service
# py -3.11 -m venv .venv
# .\.venv\Scripts\activate
# python -m pip install -U pip setuptools wheel
# pip install -r requirements.txt
# pip install python-multipart

# cd D:\pharmacy-erp\embed-service
# start interpreter path ctrl+shift+P
# D:\pharmacy-erp\embed-service\.venv\Scripts\python.exe
# py -3.11 -m venv .venv
# .\.venv\Scripts\activate
# uvicorn app:app --host 127.0.0.1 --port 8001