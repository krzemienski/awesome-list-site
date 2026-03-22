<overview>
EasyOCR is a ready-to-use OCR library with support for 80+ languages. It uses CRAFT for text detection and CRNN for recognition. Known for its simplicity and good multilingual support.

**Official Repository:** https://github.com/JaidedAI/EasyOCR
**Documentation:** https://www.jaided.ai/easyocr/
</overview>

<installation>
```bash
# Standard installation
pip install easyocr

# For GPU support (CUDA required)
pip install easyocr torch torchvision

# From source (latest features)
pip install git+https://github.com/JaidedAI/EasyOCR.git

# Verify installation
python -c "import easyocr; print(easyocr.__version__)"
```

**Model Storage:**
Models are downloaded automatically to:
- Linux/Mac: `~/.EasyOCR/`
- Windows: `C:\Users\<username>\.EasyOCR\`

Or specify custom directory:
```python
reader = easyocr.Reader(['en'], model_storage_directory='./models')
```
</installation>

<basic_usage>
```python
import easyocr

# Initialize reader (models download on first use)
reader = easyocr.Reader(['en'])  # English only

# Multiple languages
reader = easyocr.Reader(['en', 'fr', 'de'])  # English, French, German

# Chinese with English
reader = easyocr.Reader(['ch_sim', 'en'])

# Read text from image
result = reader.readtext('image.png')

# Parse results
for detection in result:
    bbox = detection[0]      # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    text = detection[1]      # Recognized text
    confidence = detection[2] # Confidence score (0-1)
    print(f"Text: '{text}', Confidence: {confidence:.2f}")

# Simplified output (text only)
result = reader.readtext('image.png', detail=0)
# Returns: ['text1', 'text2', ...]

# Paragraph mode (groups text)
result = reader.readtext('image.png', paragraph=True)
```
</basic_usage>

<configuration>
<reader_options>
```python
reader = easyocr.Reader(
    # Languages
    lang_list=['en', 'ch_sim'],  # List of language codes
    
    # GPU/CPU
    gpu=True,                     # Use GPU (default: True if available)
    
    # Model paths
    model_storage_directory='./models',  # Custom model directory
    download_enabled=True,        # Auto-download models
    
    # Detection model
    detector=True,                # Enable text detection
    
    # Recognition model
    recognizer=True,              # Enable text recognition
    
    # Advanced detection options
    detection='DB',               # 'CRAFT' (default) or 'DB'
    
    # Advanced recognition options
    recognition='Transformer',    # 'Transformer' or default CRNN
    
    # Verbosity
    verbose=True,                 # Show progress
)
```
</reader_options>

<readtext_options>
```python
result = reader.readtext(
    image,                        # Image path, URL, numpy array, or bytes
    
    # Detection parameters
    decoder='greedy',             # 'greedy', 'beamsearch', or 'wordbeamsearch'
    beamWidth=5,                  # Beam width for beam search
    batch_size=1,                 # Batch size for recognition
    
    # Detection thresholds
    text_threshold=0.7,           # Text confidence threshold
    low_text=0.4,                 # Low text confidence bound
    link_threshold=0.4,           # Link confidence threshold
    canvas_size=2560,             # Maximum image size
    mag_ratio=1.0,                # Image magnification ratio
    
    # Output options
    detail=1,                     # 0: text only, 1: full details
    paragraph=False,              # Group text into paragraphs
    
    # Filtering
    min_size=20,                  # Minimum text height
    
    # Rotation handling
    rotation_info=None,           # [90, 180, 270] to try rotations
    
    # Character control
    contrast_ths=0.1,             # Contrast threshold
    adjust_contrast=0.5,          # Contrast adjustment
    
    # Character filtering
    allowlist=None,               # Only recognize these characters
    blocklist=None,               # Never recognize these characters
    
    # Advanced
    workers=0,                    # Parallel workers (0=auto)
    output_format='standard',     # 'standard' or 'dict'
)
```
</readtext_options>
</configuration>

<language_support>
```python
# Language codes (subset of 80+)
LANGUAGES = {
    # Latin scripts
    'en': 'English',
    'fr': 'French', 
    'de': 'German',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'it': 'Italian',
    'nl': 'Dutch',
    'pl': 'Polish',
    
    # Asian languages
    'ch_sim': 'Chinese Simplified',
    'ch_tra': 'Chinese Traditional',
    'ja': 'Japanese',
    'ko': 'Korean',
    'th': 'Thai',
    'vi': 'Vietnamese',
    
    # Other scripts
    'ar': 'Arabic',
    'ru': 'Russian',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    
    # Special
    'latin': 'Latin generic',
    'cyrillic': 'Cyrillic generic',
    'devanagari': 'Devanagari generic',
}

# Check available languages
print(easyocr.get_languages())
```
</language_support>

<advanced_features>
<detection_only>
```python
# Get text regions without recognition
reader = easyocr.Reader(['en'])
horizontal_list, free_list = reader.detect('image.png')

# horizontal_list: horizontally oriented text boxes
# free_list: rotated or free-form text boxes
```
</detection_only>

<recognition_only>
```python
# Recognize pre-cropped text images
import cv2

reader = easyocr.Reader(['en'])
img = cv2.imread('cropped_text.png')

# Direct recognition (no detection)
result = reader.recognize(img)
```
</recognition_only>

<batch_processing>
```python
import easyocr
from concurrent.futures import ThreadPoolExecutor
import os

reader = easyocr.Reader(['en'], gpu=True)

def process_image(image_path):
    try:
        result = reader.readtext(image_path, detail=0)
        return image_path, ' '.join(result)
    except Exception as e:
        return image_path, f"Error: {e}"

# Process multiple images
image_files = [f for f in os.listdir('images') if f.endswith(('.png', '.jpg'))]

with ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(
        process_image, 
        [os.path.join('images', f) for f in image_files]
    ))
```
</batch_processing>

<custom_model>
```python
# Use custom trained model
reader = easyocr.Reader(
    ['custom'],
    recog_network='custom_net',
    model_storage_directory='./custom_models',
    user_network_directory='./custom_networks',
)
```
</custom_model>
</advanced_features>

<visualization>
```python
import easyocr
from PIL import Image, ImageDraw
import cv2
import numpy as np

def draw_boxes(image_path, output_path):
    reader = easyocr.Reader(['en'])
    result = reader.readtext(image_path)
    
    # Using PIL
    image = Image.open(image_path)
    draw = ImageDraw.Draw(image)
    
    for detection in result:
        bbox = detection[0]
        text = detection[1]
        confidence = detection[2]
        
        # Draw polygon
        points = [tuple(p) for p in bbox]
        points.append(points[0])  # Close polygon
        draw.line(points, fill='red', width=2)
        
        # Draw text
        draw.text((bbox[0][0], bbox[0][1] - 20), 
                  f"{text} ({confidence:.2f})", fill='blue')
    
    image.save(output_path)
    return image

# Using OpenCV for bounding boxes
def draw_boxes_cv2(image_path, output_path):
    reader = easyocr.Reader(['en'])
    result = reader.readtext(image_path)
    
    image = cv2.imread(image_path)
    
    for detection in result:
        bbox = detection[0]
        text = detection[1]
        confidence = detection[2]
        
        # Convert to numpy array
        pts = np.array(bbox, np.int32).reshape((-1, 1, 2))
        cv2.polylines(image, [pts], True, (0, 255, 0), 2)
        
        # Put text
        cv2.putText(image, f"{text} ({confidence:.2f})", 
                    (int(bbox[0][0]), int(bbox[0][1]) - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
    
    cv2.imwrite(output_path, image)
    return image
```
</visualization>

<performance_optimization>
```python
# GPU acceleration
reader = easyocr.Reader(['en'], gpu=True)

# Reduce image size for speed
result = reader.readtext(
    'image.png',
    canvas_size=1280,  # Smaller = faster
    mag_ratio=0.8,     # Reduce magnification
)

# Use faster decoder
result = reader.readtext(
    'image.png',
    decoder='greedy',  # Faster than beamsearch
)

# Batch recognition
result = reader.readtext(
    'image.png',
    batch_size=4,  # Process multiple text regions together
)

# Reduce text threshold for speed (may reduce accuracy)
result = reader.readtext(
    'image.png',
    text_threshold=0.5,
    low_text=0.3,
)
```
</performance_optimization>

<common_issues>
<issue name="CUDA out of memory">
**Solution:** Use CPU or reduce image size
```python
reader = easyocr.Reader(['en'], gpu=False)
# or
result = reader.readtext('image.png', canvas_size=1280)
```
</issue>

<issue name="Slow first run">
**Cause:** Models are being downloaded
**Solution:** Pre-download models or use smaller model set
```python
# Only load languages you need
reader = easyocr.Reader(['en'])  # Not ['en', 'fr', 'de', ...]
```
</issue>

<issue name="Wrong characters recognized">
**Solution:** Use character filtering
```python
# Only recognize alphanumeric
result = reader.readtext('image.png', 
                         allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')

# Block specific characters
result = reader.readtext('image.png', blocklist='!@#$%')
```
</issue>

<issue name="Missing rotated text">
**Solution:** Enable rotation handling
```python
result = reader.readtext('image.png', rotation_info=[90, 180, 270])
```
</issue>

<issue name="Text not detected">
**Solution:** Adjust thresholds
```python
result = reader.readtext(
    'image.png',
    text_threshold=0.5,   # Lower = more sensitive
    low_text=0.3,
    link_threshold=0.3,
)
```
</issue>
</common_issues>

<best_practices>
1. **Choose languages carefully** - Loading fewer languages is faster
2. **Use GPU when available** - Significant speed improvement
3. **Filter by confidence** - Ignore results below 0.5-0.7 confidence
4. **Use paragraph mode** for documents with logical text flow
5. **Adjust canvas_size** for speed vs. accuracy tradeoff
6. **Pre-process images** for better results (grayscale, contrast)
7. **Use allowlist** when you know the character set
8. **Combine with PaddleOCR** for multi-engine validation
</best_practices>

<comparison_with_alternatives>
| Feature | EasyOCR | PyTesseract | PaddleOCR |
|---------|---------|-------------|-----------|
| Languages | 80+ | 100+ | 80+ |
| Speed | Medium | Fast | Fast |
| Accuracy | Good | Good | Excellent |
| Setup | Easy | Medium | Easy |
| GPU Support | Yes | No | Yes |
| Deep Learning | Yes | No | Yes |
| Custom Training | Limited | Yes | Yes |
| Best For | Quick setup | Simple tasks | Production |
</comparison_with_alternatives>
