<objective>
Help you choose the right OCR library for your specific use case based on requirements, constraints, and priorities.
</objective>

<required_reading>
After selecting a library, read its corresponding reference:
- `references/pytesseract.md`
- `references/paddleocr.md`
- `references/easyocr.md`
- `references/doctr.md` (includes keras-ocr, TrOCR, Surya, RapidOCR)
</required_reading>

<process>

<step name="1. Answer Selection Questions">

**Q1: What type of text are you processing?**
- A) Printed documents (scanned, PDF)
- B) Photos/screenshots with text
- C) Handwritten text
- D) Mixed (printed + handwritten)
- E) Specialized (receipts, forms, tables)

**Q2: What languages do you need?**
- A) English only
- B) Single non-English language
- C) Multiple languages
- D) Mixed languages in same document
- E) Right-to-left languages (Arabic, Hebrew)

**Q3: What's your priority?**
- A) Maximum accuracy
- B) Maximum speed
- C) Balance of both
- D) Minimal dependencies
- E) Custom training capability

**Q4: What's your deployment environment?**
- A) Local development
- B) Cloud server with GPU
- C) Cloud server CPU only
- D) Edge device / mobile
- E) Browser / WASM

**Q5: Do you need structured output?**
- A) Plain text only
- B) Text with bounding boxes
- C) Table extraction
- D) Form field extraction
- E) Full document understanding
</step>

<step name="2. Use Decision Matrix">

```
DECISION MATRIX

If Q1 = C (Handwritten):
    → TrOCR (best for handwritten)
    → Alternative: PaddleOCR with handwriting model

If Q1 = E (Specialized):
    → PaddleOCR + PPStructure (tables, forms)
    → docTR (document understanding)

If Q3 = A (Maximum accuracy):
    → PaddleOCR PP-OCRv5 (state-of-the-art)
    → docTR with db_resnet50 + master

If Q3 = B (Maximum speed):
    → RapidOCR (ONNX optimized)
    → PyTesseract (if simple documents)
    → PaddleOCR with mobile models

If Q4 = D (Edge device):
    → RapidOCR (ONNX)
    → PaddleOCR mobile models

If Q4 = E (Browser):
    → Tesseract.js
    → ONNX Web runtime

If Q5 = C or D (Tables/Forms):
    → PaddleOCR + PPStructure
    → docTR

If Q2 = E (RTL languages):
    → PaddleOCR (good Arabic support)
    → EasyOCR (supports many RTL)
```
</step>

<step name="3. Library Comparison">

**Overall Recommendation Matrix:**

| Use Case | Primary Choice | Alternative |
|----------|---------------|-------------|
| General purpose, best accuracy | PaddleOCR | docTR |
| Quick setup, multilingual | EasyOCR | PaddleOCR |
| Simple documents, CPU | PyTesseract | RapidOCR |
| Handwritten text | TrOCR | PaddleOCR |
| Document understanding | PaddleOCR + PPStructure | docTR |
| Custom training needed | docTR | keras-ocr |
| Edge deployment | RapidOCR | PaddleOCR mobile |
| Minimal dependencies | PyTesseract | RapidOCR |

**Detailed Feature Comparison:**

| Feature | PyTesseract | PaddleOCR | EasyOCR | docTR | TrOCR |
|---------|-------------|-----------|---------|-------|-------|
| **Accuracy** | ★★★ | ★★★★★ | ★★★★ | ★★★★★ | ★★★★★ |
| **Speed** | ★★★★ | ★★★★ | ★★★ | ★★★ | ★★ |
| **Ease of Use** | ★★★ | ★★★★★ | ★★★★★ | ★★★★ | ★★★ |
| **Languages** | 100+ | 80+ | 80+ | 30+ | 10+ |
| **GPU Support** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Custom Training** | ✅ | ✅ | Limited | ✅ | ✅ |
| **Table Extraction** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Form Extraction** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Handwritten** | ★★ | ★★★ | ★★★ | ★★★ | ★★★★★ |
| **Installation** | Medium | Easy | Easy | Medium | Easy |
| **Dependencies** | Light | Medium | Heavy | Medium | Light |
</step>

<step name="4. Installation Instructions">

**PyTesseract:**
```bash
# Install Tesseract engine first
# Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-eng
# macOS: brew install tesseract
# Windows: Download from GitHub

pip install pytesseract pillow opencv-python
```

**PaddleOCR:**
```bash
pip install paddleocr paddlepaddle  # CPU
pip install paddleocr paddlepaddle-gpu  # GPU
```

**EasyOCR:**
```bash
pip install easyocr
```

**docTR:**
```bash
pip install "python-doctr[torch]"  # PyTorch backend
pip install "python-doctr[tf]"     # TensorFlow backend
```

**TrOCR:**
```bash
pip install transformers torch pillow
```

**RapidOCR:**
```bash
pip install rapidocr-onnxruntime
```
</step>

<step name="5. Quick Test">

Run this test to verify your chosen library works:

```python
def test_ocr_library(library_name, test_image_path):
    """
    Quick test for OCR libraries.
    """
    print(f"Testing {library_name}...")
    
    if library_name == 'pytesseract':
        import pytesseract
        from PIL import Image
        text = pytesseract.image_to_string(Image.open(test_image_path))
        print(f"Result: {text[:100]}...")
        
    elif library_name == 'paddleocr':
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        result = ocr.ocr(test_image_path)
        texts = [r[1][0] for r in result[0]] if result[0] else []
        print(f"Detected {len(texts)} lines")
        print(f"First line: {texts[0] if texts else 'None'}")
        
    elif library_name == 'easyocr':
        import easyocr
        reader = easyocr.Reader(['en'])
        result = reader.readtext(test_image_path, detail=0)
        print(f"Result: {' '.join(result[:5])}...")
        
    elif library_name == 'doctr':
        from doctr.io import DocumentFile
        from doctr.models import ocr_predictor
        model = ocr_predictor(pretrained=True)
        doc = DocumentFile.from_images([test_image_path])
        result = model(doc)
        print(f"Detected {len(result.pages[0].blocks)} blocks")
        
    print("✓ Test passed!")

# Usage
test_ocr_library('paddleocr', 'test_image.png')
```
</step>

</process>

<success_criteria>
Library selection is complete when:
- [ ] Answered all 5 selection questions
- [ ] Identified primary and backup library choices
- [ ] Verified installation works
- [ ] Ran quick test on sample image
- [ ] Read corresponding reference documentation
</success_criteria>

<common_combinations>

**Production Pipeline (High Accuracy):**
```python
# Primary: PaddleOCR
# Fallback: EasyOCR
# Post-processing: Custom spell-check

from paddleocr import PaddleOCR
import easyocr

paddle_ocr = PaddleOCR(use_angle_cls=True, lang='en')
easy_reader = easyocr.Reader(['en'])

def robust_ocr(image_path, min_confidence=0.7):
    # Try PaddleOCR first
    result = paddle_ocr.ocr(image_path)
    
    if result[0]:
        avg_conf = sum(r[1][1] for r in result[0]) / len(result[0])
        if avg_conf >= min_confidence:
            return [r[1][0] for r in result[0]]
    
    # Fallback to EasyOCR
    return easy_reader.readtext(image_path, detail=0)
```

**Document Processing Pipeline:**
```python
# PaddleOCR for text
# PPStructure for tables/layout

from paddleocr import PaddleOCR, PPStructure

ocr = PaddleOCR(lang='en')
structure = PPStructure(table=True, ocr=True)

def process_document(image_path):
    # Get layout and tables
    layout_result = structure(image_path)
    
    results = {
        'text_blocks': [],
        'tables': []
    }
    
    for region in layout_result:
        if region['type'] == 'text':
            results['text_blocks'].append(region['res'])
        elif region['type'] == 'table':
            results['tables'].append(region['res']['html'])
    
    return results
```

**Handwritten + Printed Mixed:**
```python
# TrOCR for handwritten
# PaddleOCR for printed

from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from paddleocr import PaddleOCR

# Initialize
trocr_processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
trocr_model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")
paddle_ocr = PaddleOCR(lang='en')

def classify_and_ocr(image, is_handwritten=False):
    if is_handwritten:
        pixel_values = trocr_processor(image, return_tensors="pt").pixel_values
        generated_ids = trocr_model.generate(pixel_values)
        return trocr_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    else:
        result = paddle_ocr.ocr(image)
        return ' '.join([r[1][0] for r in result[0]]) if result[0] else ''
```
</common_combinations>
