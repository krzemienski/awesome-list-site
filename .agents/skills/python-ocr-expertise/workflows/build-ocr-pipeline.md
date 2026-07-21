<objective>
Build a complete OCR pipeline from scratch, selecting the appropriate library, preprocessing techniques, and post-processing for your specific use case.
</objective>

<required_reading>
Read these references based on your needs:
1. `references/preprocessing.md` - Always read for preprocessing techniques
2. Library reference for your chosen engine:
   - `references/pytesseract.md` - For simple/legacy use cases
   - `references/paddleocr.md` - For best accuracy
   - `references/easyocr.md` - For quick setup with multilingual
</required_reading>

<process>

<step name="1. Define Requirements">
Answer these questions to guide library selection:

1. **Input Type:**
   - Scanned documents (high quality)
   - Photos (variable quality)
   - Screenshots
   - Handwritten text
   - Mixed (photos + screenshots)

2. **Languages:**
   - Single language (which?)
   - Multiple languages
   - Mixed in same document

3. **Output Needs:**
   - Plain text only
   - Text with positions/bounding boxes
   - Structured data (tables, forms)
   - Searchable PDF

4. **Performance Requirements:**
   - Real-time processing
   - Batch processing
   - Accuracy priority
   - Speed priority

5. **Environment:**
   - GPU available?
   - Memory constraints?
   - Deployment target (server, edge, cloud)?
</step>

<step name="2. Select OCR Library">
Based on requirements, choose your primary library:

```
Decision Tree:
├── Need best accuracy? → PaddleOCR
├── Quick setup + multilingual? → EasyOCR
├── Simple documents + legacy? → PyTesseract
├── Deep learning + custom training? → docTR or keras-ocr
├── Handwritten text? → TrOCR
├── Edge deployment? → RapidOCR (ONNX)
└── Document understanding? → PaddleOCR + PPStructure
```

**Quick Comparison:**
| Library | Accuracy | Speed | Setup | GPU | Best For |
|---------|----------|-------|-------|-----|----------|
| PaddleOCR | ★★★★★ | Fast | Easy | Yes | Production |
| EasyOCR | ★★★★ | Medium | Easy | Yes | Quick start |
| PyTesseract | ★★★ | Fast | Medium | No | Simple docs |
| docTR | ★★★★★ | Medium | Medium | Yes | Custom training |
| TrOCR | ★★★★★ | Slow | Hard | Yes | Handwritten |
</step>

<step name="3. Build Preprocessing Pipeline">
Create preprocessing based on your input type:

```python
import cv2
import numpy as np

class OCRPipeline:
    def __init__(self, ocr_engine='paddleocr', lang='en'):
        self.engine = ocr_engine
        self.lang = lang
        self._init_engine()
    
    def _init_engine(self):
        if self.engine == 'paddleocr':
            from paddleocr import PaddleOCR
            self.ocr = PaddleOCR(use_angle_cls=True, lang=self.lang)
        elif self.engine == 'easyocr':
            import easyocr
            self.ocr = easyocr.Reader([self.lang])
        elif self.engine == 'pytesseract':
            import pytesseract
            self.ocr = pytesseract
    
    def preprocess(self, image):
        """Standard preprocessing pipeline."""
        # Handle different input types
        if isinstance(image, str):
            img = cv2.imread(image)
        else:
            img = image.copy()
        
        # Grayscale
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Binarize
        _, binary = cv2.threshold(
            cv2.GaussianBlur(denoised, (5, 5), 0),
            0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        
        return binary
    
    def extract_text(self, image, preprocess=True):
        """Extract text from image."""
        if preprocess:
            image = self.preprocess(image)
        
        if self.engine == 'paddleocr':
            result = self.ocr.ocr(image, cls=True)
            return self._parse_paddleocr(result)
        elif self.engine == 'easyocr':
            result = self.ocr.readtext(image)
            return self._parse_easyocr(result)
        elif self.engine == 'pytesseract':
            return self.ocr.image_to_string(image)
    
    def _parse_paddleocr(self, result):
        """Parse PaddleOCR results."""
        texts = []
        for line in result[0]:
            text = line[1][0]
            confidence = line[1][1]
            bbox = line[0]
            texts.append({
                'text': text,
                'confidence': confidence,
                'bbox': bbox
            })
        return texts
    
    def _parse_easyocr(self, result):
        """Parse EasyOCR results."""
        texts = []
        for detection in result:
            texts.append({
                'text': detection[1],
                'confidence': detection[2],
                'bbox': detection[0]
            })
        return texts
```
</step>

<step name="4. Add Error Handling">
```python
class RobustOCRPipeline(OCRPipeline):
    def __init__(self, *args, min_confidence=0.5, **kwargs):
        super().__init__(*args, **kwargs)
        self.min_confidence = min_confidence
    
    def extract_text(self, image, preprocess=True):
        try:
            # Validate input
            if isinstance(image, str):
                if not os.path.exists(image):
                    raise FileNotFoundError(f"Image not found: {image}")
                img = cv2.imread(image)
                if img is None:
                    raise ValueError(f"Could not read image: {image}")
            else:
                img = image
            
            # Check image size
            h, w = img.shape[:2]
            if h < 10 or w < 10:
                raise ValueError("Image too small for OCR")
            
            # Run OCR
            results = super().extract_text(img, preprocess)
            
            # Filter by confidence
            filtered = [r for r in results 
                       if r['confidence'] >= self.min_confidence]
            
            return {
                'success': True,
                'results': filtered,
                'total_detected': len(results),
                'filtered_count': len(filtered)
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'results': []
            }
```
</step>

<step name="5. Add Post-processing">
```python
import re
from spellchecker import SpellChecker

class OCRPostProcessor:
    def __init__(self, lang='en'):
        self.spell = SpellChecker(language=lang)
    
    def clean_text(self, text):
        """Basic text cleaning."""
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Fix common OCR errors
        replacements = {
            '|': 'l',      # Pipe to lowercase L
            '0': 'O',      # Zero to O (context-dependent)
            '1': 'l',      # One to lowercase L (context-dependent)
            'rn': 'm',     # Common OCR error
            'vv': 'w',     # Common OCR error
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        return text
    
    def correct_spelling(self, text, threshold=0.8):
        """Correct obvious spelling errors."""
        words = text.split()
        corrected = []
        
        for word in words:
            # Skip short words and numbers
            if len(word) < 3 or word.isdigit():
                corrected.append(word)
                continue
            
            # Check if misspelled
            if word.lower() not in self.spell:
                correction = self.spell.correction(word.lower())
                if correction and correction != word.lower():
                    corrected.append(correction)
                else:
                    corrected.append(word)
            else:
                corrected.append(word)
        
        return ' '.join(corrected)
    
    def extract_structured(self, results, patterns):
        """Extract structured data using regex patterns."""
        extracted = {}
        full_text = ' '.join([r['text'] for r in results])
        
        for name, pattern in patterns.items():
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                extracted[name] = match.group(1) if match.groups() else match.group(0)
        
        return extracted

# Example usage
patterns = {
    'email': r'[\w\.-]+@[\w\.-]+\.\w+',
    'phone': r'\+?[\d\s\-\(\)]{10,}',
    'date': r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}',
    'amount': r'\$[\d,]+\.?\d*',
}
```
</step>

<step name="6. Create Complete Pipeline">
```python
import cv2
import os
from typing import Union, List, Dict, Any
import numpy as np

class ProductionOCRPipeline:
    """
    Production-ready OCR pipeline with preprocessing,
    multi-engine support, and post-processing.
    """
    
    def __init__(
        self,
        engine: str = 'paddleocr',
        lang: str = 'en',
        use_gpu: bool = True,
        min_confidence: float = 0.5,
        enable_preprocessing: bool = True,
        enable_postprocessing: bool = True
    ):
        self.engine_name = engine
        self.lang = lang
        self.use_gpu = use_gpu
        self.min_confidence = min_confidence
        self.enable_preprocessing = enable_preprocessing
        self.enable_postprocessing = enable_postprocessing
        
        self._init_engine()
        self._init_postprocessor()
    
    def _init_engine(self):
        """Initialize OCR engine."""
        if self.engine_name == 'paddleocr':
            from paddleocr import PaddleOCR
            self.engine = PaddleOCR(
                use_angle_cls=True,
                lang=self.lang,
                use_gpu=self.use_gpu,
                show_log=False
            )
        elif self.engine_name == 'easyocr':
            import easyocr
            self.engine = easyocr.Reader(
                [self.lang],
                gpu=self.use_gpu
            )
        elif self.engine_name == 'pytesseract':
            import pytesseract
            self.engine = pytesseract
    
    def _init_postprocessor(self):
        """Initialize post-processor."""
        if self.enable_postprocessing:
            self.postprocessor = OCRPostProcessor(self.lang)
    
    def process(self, image: Union[str, np.ndarray]) -> Dict[str, Any]:
        """
        Process image through complete OCR pipeline.
        
        Args:
            image: Image path or numpy array
            
        Returns:
            Dictionary with results, text, and metadata
        """
        # Load image
        if isinstance(image, str):
            img = cv2.imread(image)
            if img is None:
                return {'success': False, 'error': f'Could not read: {image}'}
        else:
            img = image.copy()
        
        # Preprocess
        if self.enable_preprocessing:
            processed = self._preprocess(img)
        else:
            processed = img
        
        # Run OCR
        raw_results = self._run_ocr(processed)
        
        # Filter by confidence
        filtered = [r for r in raw_results 
                   if r['confidence'] >= self.min_confidence]
        
        # Combine text
        full_text = ' '.join([r['text'] for r in filtered])
        
        # Post-process
        if self.enable_postprocessing and full_text:
            cleaned_text = self.postprocessor.clean_text(full_text)
        else:
            cleaned_text = full_text
        
        return {
            'success': True,
            'text': cleaned_text,
            'results': filtered,
            'raw_results': raw_results,
            'stats': {
                'total_detected': len(raw_results),
                'above_threshold': len(filtered),
                'avg_confidence': np.mean([r['confidence'] for r in filtered]) if filtered else 0
            }
        }
    
    def _preprocess(self, img: np.ndarray) -> np.ndarray:
        """Apply preprocessing pipeline."""
        # Grayscale
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Binarize
        blur = cv2.GaussianBlur(denoised, (5, 5), 0)
        _, binary = cv2.threshold(blur, 0, 255, 
                                  cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return binary
    
    def _run_ocr(self, img: np.ndarray) -> List[Dict]:
        """Run OCR engine and parse results."""
        if self.engine_name == 'paddleocr':
            result = self.engine.ocr(img, cls=True)
            if result[0] is None:
                return []
            return [
                {
                    'text': line[1][0],
                    'confidence': line[1][1],
                    'bbox': line[0]
                }
                for line in result[0]
            ]
        
        elif self.engine_name == 'easyocr':
            result = self.engine.readtext(img)
            return [
                {
                    'text': det[1],
                    'confidence': det[2],
                    'bbox': det[0]
                }
                for det in result
            ]
        
        elif self.engine_name == 'pytesseract':
            data = self.engine.image_to_data(
                img, output_type=self.engine.Output.DICT
            )
            results = []
            for i in range(len(data['text'])):
                if data['text'][i].strip():
                    results.append({
                        'text': data['text'][i],
                        'confidence': float(data['conf'][i]) / 100,
                        'bbox': [
                            [data['left'][i], data['top'][i]],
                            [data['left'][i] + data['width'][i], data['top'][i]],
                            [data['left'][i] + data['width'][i], data['top'][i] + data['height'][i]],
                            [data['left'][i], data['top'][i] + data['height'][i]]
                        ]
                    })
            return results
    
    def batch_process(self, images: List[Union[str, np.ndarray]]) -> List[Dict]:
        """Process multiple images."""
        return [self.process(img) for img in images]


# Usage example
if __name__ == '__main__':
    # Initialize pipeline
    pipeline = ProductionOCRPipeline(
        engine='paddleocr',
        lang='en',
        use_gpu=True,
        min_confidence=0.6
    )
    
    # Process single image
    result = pipeline.process('document.png')
    print(f"Extracted text: {result['text']}")
    print(f"Confidence: {result['stats']['avg_confidence']:.2f}")
    
    # Process batch
    images = ['doc1.png', 'doc2.png', 'doc3.png']
    results = pipeline.batch_process(images)
```
</step>

</process>

<success_criteria>
Your OCR pipeline is complete when:
- [ ] Appropriate library selected for use case
- [ ] Preprocessing pipeline handles input quality issues
- [ ] Error handling covers common failure modes
- [ ] Post-processing cleans up OCR errors
- [ ] Confidence filtering removes unreliable results
- [ ] Performance meets requirements (speed/accuracy tradeoff)
- [ ] Code is modular and maintainable
- [ ] Tested on representative sample of real data
</success_criteria>

<common_pitfalls>
- **DON'T** skip preprocessing - it's crucial for accuracy
- **DON'T** use raw OCR output without filtering by confidence
- **DON'T** assume one library works for all inputs
- **DON'T** ignore image resolution (target 300 DPI)
- **DO** test on worst-case inputs, not just clean samples
- **DO** consider multi-engine validation for critical applications
- **DO** log confidence scores for quality monitoring
</common_pitfalls>
