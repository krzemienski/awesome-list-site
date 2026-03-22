<overview>
PaddleOCR is Baidu's state-of-the-art multilingual OCR toolkit built on PaddlePaddle. It offers ultra-lightweight models with excellent accuracy, supporting 80+ languages. PP-OCRv4/v5 models achieve industry-leading performance.

**Official Repository:** https://github.com/PaddlePaddle/PaddleOCR
**Documentation:** https://paddlepaddle.github.io/PaddleOCR/
</overview>

<installation>
```bash
# Basic installation
pip install paddleocr

# For GPU support
pip install paddlepaddle-gpu  # CUDA required

# For CPU only
pip install paddlepaddle

# Install from source for latest features
git clone https://github.com/PaddlePaddle/PaddleOCR.git
cd PaddleOCR
pip install -r requirements.txt

# Verify installation
python -c "from paddleocr import PaddleOCR; print('OK')"
```

**GPU-Specific Installation:**
```bash
# CUDA 11.8
pip install paddlepaddle-gpu==2.6.0 -i https://mirror.baidu.com/pypi/simple

# CUDA 12.0
pip install paddlepaddle-gpu==2.6.0.post120 -f https://www.paddlepaddle.org.cn/whl/linux/mkl/avx/stable.html
```
</installation>

<basic_usage>
```python
from paddleocr import PaddleOCR, draw_ocr
from PIL import Image

# Initialize OCR (downloads models automatically on first run)
ocr = PaddleOCR(use_angle_cls=True, lang='en')

# Perform OCR
result = ocr.ocr('image.png', cls=True)

# Parse results
for line in result[0]:
    box = line[0]           # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    text = line[1][0]       # Recognized text
    confidence = line[1][1] # Confidence score (0-1)
    print(f"Text: {text}, Confidence: {confidence:.2f}")

# Visualization
image = Image.open('image.png').convert('RGB')
boxes = [line[0] for line in result[0]]
txts = [line[1][0] for line in result[0]]
scores = [line[1][1] for line in result[0]]

# Draw results (requires font file)
im_show = draw_ocr(image, boxes, txts, scores, font_path='path/to/font.ttf')
im_show = Image.fromarray(im_show)
im_show.save('result.jpg')
```
</basic_usage>

<configuration>
<initialization_options>
```python
ocr = PaddleOCR(
    # Core settings
    use_angle_cls=True,        # Enable text direction classification
    lang='en',                  # Language: 'ch', 'en', 'korean', 'japan', 'french', etc.
    use_gpu=True,               # Enable GPU
    gpu_mem=500,                # GPU memory (MB)
    
    # Model selection
    det_model_dir=None,         # Custom detection model path
    rec_model_dir=None,         # Custom recognition model path
    cls_model_dir=None,         # Custom classification model path
    
    # Detection parameters
    det_db_thresh=0.3,          # Binarization threshold
    det_db_box_thresh=0.6,      # Box threshold
    det_db_unclip_ratio=1.5,    # Expansion ratio
    det_limit_side_len=960,     # Limit on image side length
    det_limit_type='max',       # 'max' or 'min'
    
    # Recognition parameters
    rec_batch_num=6,            # Recognition batch size
    rec_image_shape='3,48,320', # Recognition input shape
    
    # Display
    show_log=False,             # Hide logging
    
    # Performance
    enable_mkldnn=True,         # Enable MKL-DNN for CPU
    cpu_threads=10,             # CPU thread count
)
```
</initialization_options>

<detection_only>
```python
# Detection only (get text regions without recognition)
ocr = PaddleOCR(use_angle_cls=False, lang='en')
result = ocr.ocr('image.png', det=True, rec=False, cls=False)

# result contains bounding boxes only
for box in result[0]:
    print(f"Text region: {box}")
```
</detection_only>

<recognition_only>
```python
# Recognition only (already cropped text images)
ocr = PaddleOCR(use_angle_cls=False, lang='en')
result = ocr.ocr('cropped_text.png', det=False, rec=True, cls=False)

# result contains text and confidence only
text = result[0][0][0]
confidence = result[0][0][1]
```
</recognition_only>

<multilingual>
```python
# Supported languages with their codes
LANGUAGES = {
    'chinese_simplified': 'ch',
    'chinese_traditional': 'chinese_cht',
    'english': 'en',
    'french': 'french',
    'german': 'german',
    'korean': 'korean',
    'japanese': 'japan',
    'arabic': 'arabic',
    'cyrillic': 'cyrillic',
    'devanagari': 'devanagari',
    'latin': 'latin',
    # ... 80+ languages supported
}

# Use Korean OCR
ocr = PaddleOCR(lang='korean', use_angle_cls=True)
result = ocr.ocr('korean_text.jpg')

# Multiple languages (use model that supports both)
# For mixed content, use the primary language model
ocr = PaddleOCR(lang='ch', use_angle_cls=True)  # Chinese handles English too
```
</multilingual>
</configuration>

<pp_ocrv4_v5>
**PP-OCRv5 (Latest - 2024):**
```python
from paddleocr import PaddleOCR

# PP-OCRv5 is the default in latest version
ocr = PaddleOCR(
    lang="en",
    use_doc_orientation_classify=False,  # Disable if not needed
    use_doc_unwarping=False,             # Disable document unwarping
    use_textline_orientation=False,      # Disable textline orientation
)

result = ocr.predict("document.png")
for res in result:
    res.print()
    res.save_to_img("output")
    res.save_to_json("output")
```

**Model Comparison:**
| Model | Speed | Accuracy | Size | Notes |
|-------|-------|----------|------|-------|
| PP-OCRv5 | Fast | Highest | ~15MB | Latest, best quality |
| PP-OCRv4 | Faster | High | ~12MB | Good balance |
| PP-OCRv3 | Fastest | Good | ~10MB | Lightweight |
| PP-OCRv2 | Fast | Good | ~8MB | Legacy |
</pp_ocrv4_v5>

<advanced_features>
<table_recognition>
```python
from paddleocr import PPStructure

# Table and layout recognition
table_engine = PPStructure(show_log=True, lang='en')
result = table_engine('document_with_tables.pdf')

# Process results
for page in result:
    for region in page:
        if region['type'] == 'table':
            html_table = region['res']['html']
            print(html_table)
        elif region['type'] == 'text':
            text = region['res']['text']
            print(text)
```
</table_recognition>

<document_layout>
```python
from paddleocr import PPStructure

# Layout analysis with recovery
engine = PPStructure(table=True, ocr=True, show_log=True)
result = engine('complex_document.pdf')

# Get structured output
for page_idx, page in enumerate(result):
    for idx, region in enumerate(page):
        region_type = region['type']  # 'text', 'table', 'figure', 'title'
        bbox = region['bbox']
        content = region.get('res', {})
```
</document_layout>

<key_information_extraction>
```python
# VQA and KIE (Key Information Extraction)
from paddlenlp import Taskflow

# Document understanding
schema = ['Invoice Number', 'Date', 'Total Amount', 'Vendor']
ie = Taskflow('information_extraction', schema=schema)
result = ie('invoice_image.jpg')
```
</key_information_extraction>
</advanced_features>

<command_line>
```bash
# Basic CLI usage
paddleocr --image_dir ./test_images/ --lang en

# With specific model
paddleocr --image_dir ./doc/imgs/ --det_model_dir ./inference/det/ \
          --rec_model_dir ./inference/rec/ --rec_char_dict_path ./ppocr/utils/ppocr_keys_v1.txt

# Detection only
paddleocr --image_dir ./test.jpg --det true --rec false

# Recognition only (cropped images)
paddleocr --image_dir ./cropped/ --det false --rec true

# Save results
paddleocr --image_dir ./test.jpg --save_crop_res true --crop_res_save_dir ./output/
```
</command_line>

<performance_optimization>
```python
# Batch processing
from paddleocr import PaddleOCR
import glob

ocr = PaddleOCR(
    use_angle_cls=True,
    lang='en',
    use_gpu=True,
    rec_batch_num=30,      # Increase batch size for GPU
    cpu_threads=8,          # For CPU mode
    enable_mkldnn=True,     # MKL-DNN acceleration
)

# Process multiple images
image_files = glob.glob('images/*.jpg')
for img_path in image_files:
    result = ocr.ocr(img_path, cls=True)
    
# Memory optimization
import gc
gc.collect()

# Limit image size for speed
ocr = PaddleOCR(
    det_limit_side_len=640,  # Smaller = faster
    det_limit_type='max',
)
```
</performance_optimization>

<deployment>
```python
# Export to ONNX for deployment
# From command line:
# paddle2onnx --model_dir ./inference/det --model_filename inference.pdmodel \
#             --params_filename inference.pdiparams --save_file det.onnx

# Using PaddleOCR-json for API deployment
# https://github.com/hiroi-sora/PaddleOCR-json

# Docker deployment
# docker pull paddlecloud/paddleocr:latest
# docker run -it -v $PWD:/paddle --name ppocr paddlecloud/paddleocr:latest
```
</deployment>

<common_issues>
<issue name="ModuleNotFoundError: No module named 'paddle'">
**Solution:** Install PaddlePaddle first
```bash
pip install paddlepaddle  # CPU
pip install paddlepaddle-gpu  # GPU
```
</issue>

<issue name="CUDA out of memory">
**Solution:** Reduce batch size or image size
```python
ocr = PaddleOCR(
    gpu_mem=500,           # Limit GPU memory
    det_limit_side_len=640, # Smaller images
    rec_batch_num=4,       # Smaller batches
)
```
</issue>

<issue name="Slow on CPU">
**Solution:** Enable MKL-DNN and optimize threads
```python
ocr = PaddleOCR(
    enable_mkldnn=True,
    cpu_threads=8,
    use_mp=True,  # Multiprocessing
)
```
</issue>

<issue name="Wrong text direction">
**Solution:** Enable angle classification
```python
ocr = PaddleOCR(use_angle_cls=True, lang='en')
result = ocr.ocr('rotated_image.jpg', cls=True)
```
</issue>
</common_issues>

<best_practices>
1. **Enable angle classification** for documents that may be rotated
2. **Use appropriate language model** - 'ch' handles mixed Chinese/English well
3. **Adjust det_db_thresh** for different contrast levels (lower for faint text)
4. **Batch process** images when doing bulk OCR
5. **Use PP-OCRv5** for best accuracy, v3 for maximum speed
6. **Enable MKLDNN** on CPU for significant speedup
7. **Limit image size** if speed is priority
8. **Consider PPStructure** for document understanding
</best_practices>

<model_zoo>
**Detection Models:**
- en_PP-OCRv4_det: English detection
- ch_PP-OCRv4_det: Chinese detection (works for most languages)
- ml_PP-OCRv3_det: Multilingual

**Recognition Models:**
- en_PP-OCRv4_rec: English recognition
- ch_PP-OCRv4_rec: Chinese recognition
- japan_PP-OCRv3_rec: Japanese
- korean_PP-OCRv3_rec: Korean
- arabic_PP-OCRv3_rec: Arabic
- cyrillic_PP-OCRv3_rec: Russian, etc.

**Specialized:**
- PP-Structure: Layout analysis
- PPStructure-Table: Table recognition
- PP-ChatOCR: OCR + LLM
</model_zoo>
