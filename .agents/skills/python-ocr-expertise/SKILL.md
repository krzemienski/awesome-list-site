---
name: python-ocr-expertise
description: |
  Python OCR with PyTesseract, PaddleOCR, EasyOCR, docTR, keras-ocr, TrOCR.
  Use when: Extracting text from images/documents, building OCR pipelines, choosing between OCR libraries, debugging OCR accuracy.
  Covers: 9 OCR libraries (3 tiers), preprocessing pipeline, PSM modes, GPU acceleration, confidence filtering, library selection guide.
  Keywords: ocr, tesseract, pytesseract, paddleocr, easyocr, text extraction, image, document
---

# Python OCR Expertise

## APPLICABILITY GUARD

Python-specific. Only activate for Python OCR libraries or Python-based text extraction pipelines.

## When to Use

- Extracting text from images or scanned documents
- Building production OCR pipelines
- Choosing between OCR libraries
- Debugging OCR accuracy issues

## When NOT to Use

- Document understanding beyond text extraction (use `ai-multimodal`)
- PDF text extraction from digital PDFs (use `pdf` skill — no OCR needed)
- Non-Python OCR implementations
- Simple screenshot text reading (use Claude's vision directly)

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Skip image preprocessing | OCR accuracy drops 30-50% on raw images | Always apply: grayscale → blur → Otsu binarization → deskew |
| Use default PSM mode for single-line text | PSM 3 (auto) wastes time on layout analysis for simple inputs | Use PSM 7 (single line) or PSM 8 (single word) for targeted extraction |
| Ignore confidence scores | Low-confidence results introduce garbage text silently | Filter at 0.7 threshold minimum; adjust per use case |
| Use PyTesseract for multilingual production | Tesseract accuracy lags significantly behind deep learning options | Use PaddleOCR (best accuracy) or EasyOCR (easiest setup) for multilingual |
| Load OCR models per-request in web services | Model loading takes 2-10 seconds; kills response time | Initialize model once at startup; reuse across requests |

## Conflicts

- `pdf` skill: Use pdf skill for digital PDF text; this skill for scanned images/documents needing OCR.
- `ai-multimodal`: Use ai-multimodal for document understanding; this skill for raw text extraction.

## Library Selection

| Use Case | Library | Why |
|----------|---------|-----|
| Simple text extraction | PyTesseract | Lightest setup, adequate for clean images |
| Best accuracy (multilingual) | PaddleOCR | State-of-the-art PP-OCRv4/v5 |
| Quick setup, 80+ languages | EasyOCR | One-liner setup, good accuracy |
| Document understanding | docTR | Layout + text in one pipeline |
| Handwritten text | TrOCR | Transformer-based, best for handwriting |
| Edge/mobile deployment | RapidOCR | ONNX-based, lightweight |

**Accuracy hierarchy**: PaddleOCR >= docTR > EasyOCR > PyTesseract

## Essential Preprocessing

```python
import cv2
def preprocess_for_ocr(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary
```

## PyTesseract PSM Modes (Expert Knowledge)

| PSM | Use Case |
|-----|----------|
| 3 | Fully automatic (default) |
| 4 | Single column, variable sizes |
| 6 | Uniform block of text |
| 7 | Single text line |
| 8 | Single word |
| 11 | Sparse text (find as much as possible) |
| 13 | Raw line (bypass hacks) |

## Intake & Routing

| Task | Reference File |
|------|---------------|
| Build new OCR pipeline | `workflows/build-ocr-pipeline.md` |
| Choose/compare libraries | `workflows/library-selection.md` |
| Debug accuracy issues | `references/troubleshooting.md` |
| Image preprocessing | `references/preprocessing.md` |
| PyTesseract deep dive | `references/pytesseract.md` |
| PaddleOCR deep dive | `references/paddleocr.md` |
| EasyOCR deep dive | `references/easyocr.md` |
| docTR/keras-ocr/TrOCR | `references/doctr.md` |

## Related Skills

- `ai-multimodal` — document understanding beyond OCR
- `pdf` — PDF text extraction (digital, non-scanned)
- `media-processing` — image preprocessing pipelines
