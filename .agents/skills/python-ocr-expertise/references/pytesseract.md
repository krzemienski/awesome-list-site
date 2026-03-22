<overview>
PyTesseract is the Python wrapper for Google's Tesseract OCR engine. It's the most widely-used open-source OCR library, offering support for 100+ languages with active community maintenance.

**Official Repository:** https://github.com/madmaze/pytesseract
**Tesseract Docs:** https://tesseract-ocr.github.io/tessdoc/
</overview>

<installation>
```bash
# Install Tesseract OCR engine (required)
# Ubuntu/Debian
sudo apt install tesseract-ocr tesseract-ocr-eng libtesseract-dev

# macOS
brew install tesseract tesseract-lang

# Windows - Download from https://github.com/UB-Mannheim/tesseract/wiki
# Add to PATH or set pytesseract.pytesseract.tesseract_cmd

# Install Python wrapper
pip install pytesseract pillow opencv-python
```

**Verify Installation:**
```python
import pytesseract
print(pytesseract.get_tesseract_version())
```

**Additional Languages:**
```bash
# Ubuntu - install specific language
sudo apt install tesseract-ocr-chi-sim  # Chinese Simplified
sudo apt install tesseract-ocr-fra      # French
sudo apt install tesseract-ocr-deu      # German

# macOS - all languages
brew install tesseract-lang
```
</installation>

<basic_usage>
```python
import pytesseract
from PIL import Image
import cv2

# Basic text extraction
text = pytesseract.image_to_string(Image.open('image.png'))

# With OpenCV
img = cv2.imread('image.png')
text = pytesseract.image_to_string(img)

# Specify language
text = pytesseract.image_to_string(img, lang='eng+fra')

# Get detailed output with bounding boxes
data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
# Returns: level, page_num, block_num, par_num, line_num, word_num,
#          left, top, width, height, conf, text

# Get bounding boxes
boxes = pytesseract.image_to_boxes(img)

# Get hOCR output (HTML with coordinates)
hocr = pytesseract.image_to_pdf_or_hocr(img, extension='hocr')

# Create searchable PDF
pdf = pytesseract.image_to_pdf_or_hocr(img, extension='pdf')
```
</basic_usage>

<configuration>
<config_options>
**Page Segmentation Modes (--psm):**
| PSM | Description | Use Case |
|-----|-------------|----------|
| 0 | Orientation and script detection only | Detect page rotation |
| 1 | Automatic page segmentation with OSD | General documents |
| 3 | Fully automatic (default) | Most documents |
| 4 | Single column of variable sizes | Newspaper columns |
| 5 | Single uniform block of vertically aligned text | Vertical text |
| 6 | Single uniform block of text | Paragraphs, receipts |
| 7 | Single text line | Single sentences |
| 8 | Single word | Individual words |
| 9 | Single word in a circle | Circular text |
| 10 | Single character | Individual characters |
| 11 | Sparse text (find as much as possible) | Scattered text |
| 12 | Sparse text with OSD | Scattered text + rotation |
| 13 | Raw line (bypass hacks) | When PSM 7 fails |

**OCR Engine Modes (--oem):**
| OEM | Description | Notes |
|-----|-------------|-------|
| 0 | Legacy engine only | Original Tesseract |
| 1 | Neural nets LSTM only | Best accuracy (default) |
| 2 | Legacy + LSTM | Fallback mode |
| 3 | Default (based on availability) | Auto-select |
</config_options>

<config_usage>
```python
# Custom configuration string
custom_config = r'--oem 3 --psm 6'
text = pytesseract.image_to_string(img, config=custom_config)

# Character whitelist (only recognize these characters)
config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789'
numbers_only = pytesseract.image_to_string(img, config=config)

# Character blacklist (exclude these characters)
config = r'-c tessedit_char_blacklist=!@#$%^&*()'
text = pytesseract.image_to_string(img, config=config)

# Preserve interword spaces
config = r'--oem 3 --psm 6 preserve_interword_spaces=1'
text = pytesseract.image_to_string(img, config=config)

# Multiple options combined
config = r'''
    --oem 3 
    --psm 6 
    -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
    -c preserve_interword_spaces=1
'''
text = pytesseract.image_to_string(img, config=config)
```
</config_usage>
</configuration>

<preprocessing_for_tesseract>
```python
import cv2
import numpy as np
from PIL import Image
import pytesseract

def preprocess_for_tesseract(image_path):
    """
    Comprehensive preprocessing pipeline for Tesseract OCR.
    """
    # Read image
    img = cv2.imread(image_path)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Noise removal using Gaussian blur
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Otsu's binarization (automatic threshold)
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Alternative: Adaptive threshold for uneven lighting
    # binary = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    #                                cv2.THRESH_BINARY, 11, 2)
    
    # Deskewing
    coords = np.column_stack(np.where(binary > 0))
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = 90 + angle
    (h, w) = binary.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    deskewed = cv2.warpAffine(binary, M, (w, h), 
                               flags=cv2.INTER_CUBIC, 
                               borderMode=cv2.BORDER_REPLICATE)
    
    # Morphological operations to clean up
    kernel = np.ones((1, 1), np.uint8)
    cleaned = cv2.morphologyEx(deskewed, cv2.MORPH_CLOSE, kernel)
    
    return cleaned

def resize_for_tesseract(img, target_dpi=300):
    """
    Tesseract works best at 300 DPI.
    """
    # Assuming original is 72 DPI
    scale_factor = target_dpi / 72
    new_size = (int(img.shape[1] * scale_factor), 
                int(img.shape[0] * scale_factor))
    return cv2.resize(img, new_size, interpolation=cv2.INTER_CUBIC)

# Usage
preprocessed = preprocess_for_tesseract('document.png')
text = pytesseract.image_to_string(preprocessed, config='--oem 3 --psm 6')
```
</preprocessing_for_tesseract>

<advanced_features>
```python
# Get confidence scores for each word
data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

# Filter by confidence
n_boxes = len(data['text'])
for i in range(n_boxes):
    if int(data['conf'][i]) > 60:  # confidence threshold
        text = data['text'][i]
        x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
        print(f"'{text}' at ({x}, {y}) with confidence {data['conf'][i]}")

# Draw bounding boxes
def draw_ocr_boxes(image_path, min_conf=60):
    img = cv2.imread(image_path)
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    
    for i in range(len(data['text'])):
        if int(data['conf'][i]) > min_conf:
            x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(img, data['text'][i], (x, y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
    
    return img
```
</advanced_features>

<common_issues>
<issue name="Empty or Garbage Output">
**Causes:** Poor image quality, wrong PSM, text too small
**Solutions:**
1. Increase image resolution (target 300 DPI)
2. Apply preprocessing (grayscale, binarization)
3. Try different PSM modes
4. Check if correct language is installed
</issue>

<issue name="Slow Performance">
**Causes:** Large images, unnecessary processing
**Solutions:**
1. Resize images to appropriate size (not too large)
2. Crop to text regions only
3. Use `--oem 1` for LSTM-only mode (faster)
4. Process in parallel for multiple images
</issue>

<issue name="Wrong Characters">
**Causes:** Similar-looking characters, font issues
**Solutions:**
1. Use character whitelist for known character sets
2. Apply spell-checking post-processing
3. Train custom model for specific fonts
4. Use `tessedit_char_whitelist` config
</issue>

<issue name="Missing Text">
**Causes:** Text too small, low contrast, touching characters
**Solutions:**
1. Upscale image before OCR
2. Increase contrast with preprocessing
3. Apply morphological operations to separate characters
4. Try PSM 11 (sparse text mode)
</issue>
</common_issues>

<best_practices>
1. **Always preprocess:** Grayscale → Binarization → Noise removal → Deskew
2. **Match PSM to content:** Single line? Use PSM 7. Block of text? Use PSM 6.
3. **Filter by confidence:** Ignore results below 60% confidence
4. **Use appropriate resolution:** Target 300 DPI for printed text
5. **Install correct languages:** Ensure language packs match document content
6. **Combine with spell-checking:** Post-process with libraries like `pyspellchecker`
7. **Consider alternatives:** For complex layouts, try PaddleOCR or docTR
</best_practices>

<api_reference>
**Key Functions:**
| Function | Description |
|----------|-------------|
| `image_to_string(image, lang, config)` | Extract plain text |
| `image_to_data(image, output_type)` | Get detailed data with positions |
| `image_to_boxes(image)` | Get character bounding boxes |
| `image_to_osd(image)` | Detect orientation and script |
| `image_to_pdf_or_hocr(image, extension)` | Generate PDF or hOCR |
| `get_tesseract_version()` | Check installed version |

**Output Types (for image_to_data):**
- `pytesseract.Output.DICT` - Dictionary
- `pytesseract.Output.STRING` - Tab-separated string
- `pytesseract.Output.BYTES` - Raw bytes
- `pytesseract.Output.DATAFRAME` - Pandas DataFrame
</api_reference>
