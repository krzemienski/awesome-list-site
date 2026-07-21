<overview>
This reference covers advanced deep learning OCR libraries: docTR, keras-ocr, TrOCR, and other specialized tools.
</overview>

<doctr>
<description>
docTR (Document Text Recognition) is Mindee's open-source OCR library with PyTorch and TensorFlow backends. It offers state-of-the-art accuracy with flexible architecture choices.

**Repository:** https://github.com/mindee/doctr
**Docs:** https://mindee.github.io/doctr/
</description>

<installation>
```bash
# TensorFlow backend
pip install "python-doctr[tf]"

# PyTorch backend (recommended)
pip install "python-doctr[torch]"

# With visualization support
pip install "python-doctr[torch,viz]"

# From source
git clone https://github.com/mindee/doctr.git
pip install -e doctr/.[torch]

# Docker (GPU)
docker run -it --gpus all ghcr.io/mindee/doctr:torch-py3.9.18-gpu-2024-10 bash
```
</installation>

<basic_usage>
```python
from doctr.io import DocumentFile
from doctr.models import ocr_predictor

# Load pre-trained model
model = ocr_predictor(pretrained=True)

# For GPU
model = ocr_predictor(pretrained=True).cuda()

# Load document (supports PDF, images)
doc = DocumentFile.from_pdf("document.pdf")
# or
doc = DocumentFile.from_images(["page1.jpg", "page2.jpg"])

# Run OCR
result = model(doc)

# Export to structured format
json_output = result.export()

# Get plain text
for page in result.pages:
    for block in page.blocks:
        for line in block.lines:
            for word in line.words:
                print(f"{word.value} (confidence: {word.confidence:.2f})")

# Synthesize visualization
import matplotlib.pyplot as plt
synthetic_pages = result.synthesize()
plt.imshow(synthetic_pages[0])
plt.axis('off')
plt.show()
```
</basic_usage>

<model_selection>
```python
from doctr.models import ocr_predictor

# Default (best balance)
model = ocr_predictor(pretrained=True)

# Specify architecture
model = ocr_predictor(
    det_arch='db_resnet50',      # Detection: 'db_resnet50', 'db_mobilenet_v3_large', 'linknet_resnet18'
    reco_arch='crnn_vgg16_bn',   # Recognition: 'crnn_vgg16_bn', 'master', 'sar_resnet31'
    pretrained=True
)

# Lightweight for edge deployment
model = ocr_predictor(
    det_arch='db_mobilenet_v3_large',
    reco_arch='crnn_mobilenet_v3_small',
    pretrained=True
)

# High accuracy
model = ocr_predictor(
    det_arch='db_resnet50',
    reco_arch='master',
    pretrained=True
)
```

**Available Models:**

| Detection | Size | Speed | Accuracy |
|-----------|------|-------|----------|
| db_resnet50 | Large | Medium | Best |
| db_mobilenet_v3_large | Medium | Fast | Good |
| linknet_resnet18 | Small | Fastest | Moderate |

| Recognition | Size | Speed | Accuracy |
|-------------|------|-------|----------|
| crnn_vgg16_bn | Large | Medium | Best |
| master | Large | Slow | Excellent |
| sar_resnet31 | Large | Slow | Excellent |
| crnn_mobilenet_v3_small | Small | Fast | Good |
</model_selection>

<configuration>
```python
from doctr.models import ocr_predictor

model = ocr_predictor(
    pretrained=True,
    
    # Detection parameters
    det_bs=2,                    # Detection batch size
    
    # Recognition parameters
    reco_bs=128,                 # Recognition batch size
    
    # Text detection thresholds
    assume_straight_pages=True,  # Assume no rotation
    straighten_pages=False,      # Auto-straighten pages
    
    # Export options
    export_as_straight_boxes=True,  # Convert to axis-aligned boxes
    
    # Language (for recognition model)
    # Use multilingual model or specify
)

# Disable rotation handling for speed
model = ocr_predictor(
    pretrained=True,
    assume_straight_pages=True,
    straighten_pages=False
)
```
</configuration>

<output_structure>
```python
# Result structure
{
    'pages': [
        {
            'page_idx': 0,
            'dimensions': (height, width),
            'orientation': {'value': 0, 'confidence': 0.99},
            'language': {'value': 'en', 'confidence': 0.95},
            'blocks': [
                {
                    'geometry': ((x1, y1), (x2, y2)),  # Normalized 0-1
                    'lines': [
                        {
                            'geometry': ((x1, y1), (x2, y2)),
                            'words': [
                                {
                                    'value': 'text',
                                    'confidence': 0.98,
                                    'geometry': ((x1, y1), (x2, y2)),
                                    'crop_orientation': {'value': 0}
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

# Access methods
for page in result.pages:
    print(f"Page {page.page_idx}")
    for block in page.blocks:
        for line in block.lines:
            line_text = ' '.join([word.value for word in line.words])
            print(f"  {line_text}")
```
</output_structure>

<custom_training>
```python
from doctr.datasets import CORD
from doctr.models import detection, recognition
from doctr.models.trainer import DetectionTrainer, RecognitionTrainer

# Load dataset
train_set = CORD(train=True, download=True)
val_set = CORD(train=False, download=True)

# Train detection model
det_model = detection.db_resnet50(pretrained=True)
trainer = DetectionTrainer(
    det_model,
    train_loader,
    val_loader,
    learning_rate=1e-4
)
trainer.fit(num_epochs=10)

# Train recognition model
reco_model = recognition.crnn_vgg16_bn(pretrained=True, vocab='custom_vocab')
trainer = RecognitionTrainer(
    reco_model,
    train_loader,
    val_loader
)
trainer.fit(num_epochs=10)
```
</custom_training>
</doctr>

<keras_ocr>
<description>
keras-ocr is an end-to-end OCR pipeline using CRAFT for detection and CRNN for recognition, built on Keras/TensorFlow.

**Repository:** https://github.com/faustomorales/keras-ocr
</description>

<installation>
```bash
pip install keras-ocr

# From source
pip install git+https://github.com/faustomorales/keras-ocr.git
```
</installation>

<basic_usage>
```python
import keras_ocr

# Create pipeline (downloads models automatically)
pipeline = keras_ocr.pipeline.Pipeline()

# Read images
images = [
    keras_ocr.tools.read('image1.jpg'),
    keras_ocr.tools.read('image2.jpg'),
]

# Run OCR
predictions = pipeline.recognize(images)

# Parse results
for image, prediction in zip(images, predictions):
    for text, box in prediction:
        print(f"Text: {text}")
        # box is array of 4 (x, y) coordinates
        
# Visualization
fig, axs = plt.subplots(nrows=len(images), figsize=(20, 20))
for ax, image, prediction in zip(axs, images, predictions):
    keras_ocr.tools.drawAnnotations(image=image, predictions=prediction, ax=ax)
plt.show()
```
</basic_usage>

<custom_training>
```python
import keras_ocr

# Create synthetic data generator
data_dir = keras_ocr.tools.get_default_data_dir()

# Generate training data
alphabet = string.digits + string.ascii_letters + ' '
recognizer = keras_ocr.recognition.Recognizer(alphabet=alphabet)
recognizer.compile()

# Create dataset
backgrounds = keras_ocr.tools.get_backgrounds()
fonts = keras_ocr.tools.get_fonts()

generator = keras_ocr.data_generation.get_training_image_generator(
    backgrounds=backgrounds,
    fonts=fonts,
    height=64,
    width=256,
    text_generator=keras_ocr.data_generation.get_text_generator(alphabet=alphabet)
)

# Train
recognizer.training_model.fit(
    generator,
    steps_per_epoch=1000,
    epochs=10
)

# Save
recognizer.model.save('custom_recognizer.h5')
```
</custom_training>
</keras_ocr>

<trocr>
<description>
TrOCR (Transformer-based OCR) by Microsoft uses a vision transformer encoder and text transformer decoder. Excellent for handwritten text.

**Models:** Available on Hugging Face
</description>

<installation>
```bash
pip install transformers torch pillow
```
</installation>

<basic_usage>
```python
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image
import requests

# Load model and processor
processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")

# Load image
image = Image.open("handwritten.jpg").convert("RGB")

# Process
pixel_values = processor(image, return_tensors="pt").pixel_values
generated_ids = model.generate(pixel_values)

# Decode
generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
print(generated_text)
```
</basic_usage>

<available_models>
```python
# Handwritten text
"microsoft/trocr-base-handwritten"
"microsoft/trocr-large-handwritten"

# Printed text
"microsoft/trocr-base-printed"
"microsoft/trocr-large-printed"

# Stage 1 (pre-trained, not fine-tuned)
"microsoft/trocr-base-stage1"
"microsoft/trocr-large-stage1"
```
</available_models>

<batch_processing>
```python
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image
import torch

processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-printed")
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-printed")

# Move to GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

def batch_ocr(image_paths, batch_size=8):
    results = []
    
    for i in range(0, len(image_paths), batch_size):
        batch_paths = image_paths[i:i+batch_size]
        images = [Image.open(p).convert("RGB") for p in batch_paths]
        
        pixel_values = processor(images, return_tensors="pt").pixel_values.to(device)
        generated_ids = model.generate(pixel_values)
        
        texts = processor.batch_decode(generated_ids, skip_special_tokens=True)
        results.extend(texts)
    
    return results

# Usage
texts = batch_ocr(['img1.jpg', 'img2.jpg', 'img3.jpg'])
```
</batch_processing>

<fine_tuning>
```python
from transformers import (
    TrOCRProcessor, 
    VisionEncoderDecoderModel,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments
)
from datasets import load_dataset

# Load processor and model
processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-stage1")
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-stage1")

# Configure for fine-tuning
model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
model.config.pad_token_id = processor.tokenizer.pad_token_id
model.config.vocab_size = model.config.decoder.vocab_size

# Training arguments
training_args = Seq2SeqTrainingArguments(
    output_dir="./trocr-finetuned",
    per_device_train_batch_size=8,
    predict_with_generate=True,
    num_train_epochs=5,
    learning_rate=2e-5,
    save_steps=500,
)

# Trainer
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    tokenizer=processor.tokenizer,
)

trainer.train()
```
</fine_tuning>
</trocr>

<surya>
<description>
Surya is a multilingual document OCR toolkit with excellent layout analysis and text recognition.

**Repository:** https://github.com/VikParuchuri/surya
</description>

<installation>
```bash
pip install surya-ocr

# With GPU support
pip install surya-ocr torch torchvision
```
</installation>

<basic_usage>
```python
from surya.ocr import run_ocr
from surya.model.detection import segformer
from surya.model.recognition.processor import RapiOCRProcessor
from PIL import Image

# Load models
det_processor, det_model = segformer.load_processor(), segformer.load_model()
rec_processor = RapiOCRProcessor()

# Load image
image = Image.open("document.png")

# Run OCR
predictions = run_ocr(
    [image],
    [["en"]],  # Languages per image
    det_model,
    det_processor,
    rec_processor
)

# Parse results
for page_pred in predictions:
    for text_line in page_pred.text_lines:
        print(f"{text_line.text} (confidence: {text_line.confidence:.2f})")
```
</basic_usage>
</surya>

<rapidocr>
<description>
RapidOCR is an ONNX-based OCR toolkit that runs PaddleOCR models without PaddlePaddle dependency. Great for deployment.

**Repository:** https://github.com/RapidAI/RapidOCR
</description>

<installation>
```bash
pip install rapidocr-onnxruntime

# For GPU
pip install rapidocr-onnxruntime onnxruntime-gpu
```
</installation>

<basic_usage>
```python
from rapidocr_onnxruntime import RapidOCR

# Initialize
ocr = RapidOCR()

# Run OCR
result, elapse = ocr("image.png")

# Parse results
# result: [[box, text, confidence], ...]
for line in result:
    box = line[0]
    text = line[1]
    confidence = line[2]
    print(f"{text}: {confidence:.2f}")
```
</basic_usage>
</rapidocr>

<comparison>
| Library | Best For | Speed | Accuracy | Training | Deployment |
|---------|----------|-------|----------|----------|------------|
| docTR | Documents | Medium | Excellent | Yes | Good |
| keras-ocr | Custom training | Slow | Good | Yes | Medium |
| TrOCR | Handwritten | Slow | Excellent | Yes | Good |
| Surya | Multilingual docs | Medium | Excellent | No | Good |
| RapidOCR | Edge deployment | Fast | Good | No | Excellent |
</comparison>

<selection_guide>
**Choose docTR when:**
- Building document processing pipelines
- Need flexible architecture choices
- Require both PyTorch and TensorFlow support

**Choose keras-ocr when:**
- Need end-to-end training capability
- Working with Keras/TensorFlow ecosystem
- Creating custom recognition models

**Choose TrOCR when:**
- Processing handwritten text
- Using Hugging Face ecosystem
- Need transformer-based accuracy

**Choose Surya when:**
- Working with multilingual documents
- Need layout analysis
- Want lightweight deployment

**Choose RapidOCR when:**
- Deploying to edge devices
- Need ONNX runtime compatibility
- Want PaddleOCR accuracy without PaddlePaddle
</selection_guide>
