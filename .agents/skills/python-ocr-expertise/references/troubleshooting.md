<overview>
Common OCR issues, their causes, and solutions. Use this reference when debugging accuracy problems or unexpected behavior.
</overview>

<issue_categories>

<category name="No Text Detected">
<symptoms>
- Empty results from OCR
- Very few words detected
- Missing large portions of text
</symptoms>

<causes_and_solutions>
<cause name="Image too small/low resolution">
**Solution:** Resize to minimum 300 DPI
```python
def resize_for_ocr(img, target_dpi=300, current_dpi=72):
    scale = target_dpi / current_dpi
    new_size = (int(img.shape[1] * scale), int(img.shape[0] * scale))
    return cv2.resize(img, new_size, interpolation=cv2.INTER_CUBIC)
```
</cause>

<cause name="Text color similar to background">
**Solution:** Increase contrast or invert colors
```python
# Enhance contrast
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
enhanced = clahe.apply(gray)

# Or invert if light text on dark background
inverted = cv2.bitwise_not(gray)
```
</cause>

<cause name="Wrong detection thresholds">
**Solution:** Lower detection thresholds

For PaddleOCR:
```python
ocr = PaddleOCR(det_db_thresh=0.2, det_db_box_thresh=0.4)
```

For EasyOCR:
```python
result = reader.readtext(img, text_threshold=0.5, low_text=0.3)
```
</cause>

<cause name="Text too small relative to image">
**Solution:** Crop to text region or increase mag_ratio
```python
# EasyOCR
result = reader.readtext(img, mag_ratio=1.5)
```
</cause>

<cause name="Rotated or skewed text">
**Solution:** Enable rotation handling
```python
# PaddleOCR
ocr = PaddleOCR(use_angle_cls=True)
result = ocr.ocr(img, cls=True)

# EasyOCR
result = reader.readtext(img, rotation_info=[90, 180, 270])
```
</cause>
</causes_and_solutions>
</category>

<category name="Wrong Characters">
<symptoms>
- Characters substituted (0 vs O, 1 vs l)
- Garbled or nonsense output
- Partial words recognized
</symptoms>

<causes_and_solutions>
<cause name="Similar-looking characters">
**Solution:** Use character whitelist
```python
# PyTesseract
config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789'
text = pytesseract.image_to_string(img, config=config)

# EasyOCR
result = reader.readtext(img, allowlist='0123456789')
```
</cause>

<cause name="Font not recognized well">
**Solution:** Try different OCR engine or train custom model
```python
# Try PaddleOCR for better font handling
from paddleocr import PaddleOCR
ocr = PaddleOCR(lang='en')
```
</cause>

<cause name="Noise interfering with recognition">
**Solution:** Better preprocessing
```python
# Denoise
denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

# Morphological cleanup
kernel = np.ones((1, 1), np.uint8)
cleaned = cv2.morphologyEx(denoised, cv2.MORPH_CLOSE, kernel)
```
</cause>

<cause name="Wrong language model">
**Solution:** Specify correct language
```python
# PyTesseract
text = pytesseract.image_to_string(img, lang='deu')  # German

# PaddleOCR
ocr = PaddleOCR(lang='german')

# EasyOCR
reader = easyocr.Reader(['de'])
```
</cause>
</causes_and_solutions>
</category>

<category name="Low Confidence Scores">
<symptoms>
- Many results below threshold
- Inconsistent recognition
- Need to use very low threshold
</symptoms>

<causes_and_solutions>
<cause name="Poor image quality">
**Solution:** Comprehensive preprocessing
```python
def improve_quality(img):
    # Enhance contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    # Sharpen
    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    sharpened = cv2.filter2D(enhanced, -1, kernel)
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(sharpened, None, 10, 7, 21)
    
    return denoised
```
</cause>

<cause name="Text too blurry">
**Solution:** Sharpen before OCR
```python
def unsharp_mask(img, sigma=1.0, amount=1.5):
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    sharpened = cv2.addWeighted(img, 1 + amount, blurred, -amount, 0)
    return sharpened
```
</cause>

<cause name="Mixed content (text + graphics)">
**Solution:** Crop to text regions first
```python
def extract_text_regions(img):
    # Use detection only first
    ocr = PaddleOCR(use_angle_cls=True)
    result = ocr.ocr(img, det=True, rec=False)
    
    regions = []
    for box in result[0]:
        x_coords = [p[0] for p in box]
        y_coords = [p[1] for p in box]
        x1, y1 = int(min(x_coords)), int(min(y_coords))
        x2, y2 = int(max(x_coords)), int(max(y_coords))
        regions.append(img[y1:y2, x1:x2])
    
    return regions
```
</cause>
</causes_and_solutions>
</category>

<category name="Performance Issues">
<symptoms>
- OCR very slow
- Memory errors
- GPU not being used
</symptoms>

<causes_and_solutions>
<cause name="GPU not initialized">
**Solution:** Verify GPU usage
```python
# PyTorch (for EasyOCR, docTR)
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"Current device: {torch.cuda.current_device()}")

# PaddlePaddle
import paddle
print(f"GPU available: {paddle.is_compiled_with_cuda()}")
```
</cause>

<cause name="Images too large">
**Solution:** Resize before processing
```python
def limit_image_size(img, max_side=2048):
    h, w = img.shape[:2]
    if max(h, w) > max_side:
        scale = max_side / max(h, w)
        new_size = (int(w * scale), int(h * scale))
        return cv2.resize(img, new_size)
    return img
```
</cause>

<cause name="Not using batch processing">
**Solution:** Batch multiple images
```python
# PaddleOCR doesn't have native batch, but process sequentially
from concurrent.futures import ThreadPoolExecutor

def process_batch(images, max_workers=4):
    ocr = PaddleOCR(use_angle_cls=True)
    
    def process_one(img):
        return ocr.ocr(img, cls=True)
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(process_one, images))
    
    return results
```
</cause>

<cause name="Memory leak in loop">
**Solution:** Clear cache periodically
```python
import gc
import torch

for i, img in enumerate(images):
    result = ocr.ocr(img)
    process_result(result)
    
    if i % 100 == 0:
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
```
</cause>
</causes_and_solutions>
</category>

<category name="Installation Issues">
<symptoms>
- Import errors
- Missing dependencies
- Version conflicts
</symptoms>

<causes_and_solutions>
<cause name="Tesseract not installed (PyTesseract)">
**Solution:** Install Tesseract OCR engine
```bash
# Ubuntu
sudo apt install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract

# Windows
# Download from https://github.com/UB-Mannheim/tesseract/wiki
# Add to PATH

# Then verify
python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
```
</cause>

<cause name="CUDA version mismatch">
**Solution:** Match PyTorch/PaddlePaddle CUDA version
```bash
# Check CUDA version
nvcc --version

# Install matching PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118  # for CUDA 11.8

# Or PaddlePaddle
pip install paddlepaddle-gpu==2.6.0  # Check compatibility table
```
</cause>

<cause name="OpenCV headless conflict">
**Solution:** Use only one OpenCV variant
```bash
pip uninstall opencv-python opencv-python-headless opencv-contrib-python
pip install opencv-python  # or opencv-python-headless for servers
```
</cause>
</causes_and_solutions>
</category>

</issue_categories>

<diagnostic_script>
```python
"""
OCR Diagnostic Script
Run this to identify common issues with your OCR setup.
"""

import sys
import os

def check_environment():
    print("=== Environment Check ===\n")
    
    # Python version
    print(f"Python: {sys.version}")
    
    # Check GPU
    try:
        import torch
        print(f"PyTorch: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"CUDA version: {torch.version.cuda}")
            print(f"GPU: {torch.cuda.get_device_name(0)}")
    except ImportError:
        print("PyTorch: Not installed")
    
    # Check PaddlePaddle
    try:
        import paddle
        print(f"PaddlePaddle: {paddle.__version__}")
        print(f"Paddle GPU: {paddle.is_compiled_with_cuda()}")
    except ImportError:
        print("PaddlePaddle: Not installed")
    
    print()

def check_ocr_libraries():
    print("=== OCR Libraries ===\n")
    
    # PyTesseract
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print(f"PyTesseract: OK (Tesseract {version})")
    except ImportError:
        print("PyTesseract: Not installed")
    except Exception as e:
        print(f"PyTesseract: Error - {e}")
    
    # PaddleOCR
    try:
        from paddleocr import PaddleOCR
        print("PaddleOCR: OK")
    except ImportError:
        print("PaddleOCR: Not installed")
    except Exception as e:
        print(f"PaddleOCR: Error - {e}")
    
    # EasyOCR
    try:
        import easyocr
        print(f"EasyOCR: OK ({easyocr.__version__})")
    except ImportError:
        print("EasyOCR: Not installed")
    
    # docTR
    try:
        import doctr
        print(f"docTR: OK ({doctr.__version__})")
    except ImportError:
        print("docTR: Not installed")
    
    print()

def check_image(image_path):
    print(f"=== Image Analysis: {image_path} ===\n")
    
    import cv2
    import numpy as np
    
    img = cv2.imread(image_path)
    if img is None:
        print("ERROR: Could not read image")
        return
    
    h, w = img.shape[:2]
    print(f"Dimensions: {w}x{h}")
    print(f"Estimated DPI: {72}")  # Assume 72 DPI
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Check contrast
    contrast = gray.std()
    print(f"Contrast (std): {contrast:.1f}")
    if contrast < 30:
        print("  ⚠️ Low contrast - consider enhancement")
    
    # Check sharpness
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    print(f"Sharpness (Laplacian variance): {laplacian_var:.1f}")
    if laplacian_var < 100:
        print("  ⚠️ Image may be blurry")
    
    # Check if mostly text
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    text_ratio = np.sum(binary == 0) / binary.size
    print(f"Dark pixel ratio: {text_ratio:.2%}")
    
    print()

def test_ocr(image_path, engine='pytesseract'):
    print(f"=== OCR Test ({engine}) ===\n")
    
    import cv2
    img = cv2.imread(image_path)
    
    if engine == 'pytesseract':
        import pytesseract
        result = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        confidences = [int(c) for c in result['conf'] if int(c) > 0]
        texts = [t for t in result['text'] if t.strip()]
        
        print(f"Words detected: {len(texts)}")
        print(f"Average confidence: {np.mean(confidences):.1f}%")
        print(f"Sample text: {' '.join(texts[:10])}")
    
    elif engine == 'paddleocr':
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
        result = ocr.ocr(image_path, cls=True)
        
        if result[0]:
            confidences = [r[1][1] for r in result[0]]
            texts = [r[1][0] for r in result[0]]
            
            print(f"Lines detected: {len(texts)}")
            print(f"Average confidence: {np.mean(confidences):.2f}")
            print(f"Sample text: {texts[0] if texts else 'None'}")
        else:
            print("No text detected")
    
    print()

if __name__ == '__main__':
    check_environment()
    check_ocr_libraries()
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        check_image(image_path)
        test_ocr(image_path, 'pytesseract')
```
</diagnostic_script>

<quick_fixes>
| Problem | Quick Fix |
|---------|-----------|
| No output | Lower thresholds, increase resolution |
| Garbled text | Change PSM mode, try different engine |
| Slow | Resize image, use GPU, limit detection area |
| Wrong language | Specify correct lang parameter |
| Rotated text | Enable angle classification |
| Low confidence | Preprocess: denoise + binarize + sharpen |
| Memory error | Process in smaller batches, reduce image size |
</quick_fixes>
