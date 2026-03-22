<overview>
Image preprocessing is the single most important factor in OCR accuracy. Proper preprocessing can improve accuracy by 30-50% or more. This reference covers all essential techniques.

**Key Principle:** The goal is to make text as clear as possible while removing noise and distractions.
</overview>

<preprocessing_pipeline>
```python
import cv2
import numpy as np
from PIL import Image

class OCRPreprocessor:
    """
    Complete preprocessing pipeline for OCR.
    Apply steps based on your image quality and requirements.
    """
    
    def __init__(self, target_dpi=300):
        self.target_dpi = target_dpi
    
    def preprocess(self, image_path, 
                   grayscale=True,
                   denoise=True,
                   binarize=True,
                   deskew=True,
                   remove_borders=False):
        """
        Full preprocessing pipeline.
        
        Args:
            image_path: Path to input image
            grayscale: Convert to grayscale
            denoise: Apply noise removal
            binarize: Apply binarization
            deskew: Correct rotation
            remove_borders: Remove black borders
        
        Returns:
            Preprocessed image as numpy array
        """
        # Read image
        img = cv2.imread(image_path)
        
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Step 1: Resize for consistent DPI
        img = self.resize_to_dpi(img)
        
        # Step 2: Grayscale conversion
        if grayscale:
            img = self.to_grayscale(img)
        
        # Step 3: Noise removal
        if denoise:
            img = self.denoise(img)
        
        # Step 4: Binarization
        if binarize:
            img = self.binarize(img)
        
        # Step 5: Deskewing
        if deskew:
            img = self.deskew(img)
        
        # Step 6: Border removal
        if remove_borders:
            img = self.remove_borders(img)
        
        return img
    
    def resize_to_dpi(self, img, current_dpi=72):
        """Resize image to target DPI."""
        scale = self.target_dpi / current_dpi
        new_size = (int(img.shape[1] * scale), int(img.shape[0] * scale))
        return cv2.resize(img, new_size, interpolation=cv2.INTER_CUBIC)
    
    def to_grayscale(self, img):
        """Convert to grayscale."""
        if len(img.shape) == 3:
            return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return img
    
    def denoise(self, img):
        """Remove noise while preserving edges."""
        # Non-local means denoising (best quality)
        if len(img.shape) == 2:
            return cv2.fastNlMeansDenoising(img, None, 10, 7, 21)
        return cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
    
    def binarize(self, img, method='otsu'):
        """
        Convert to binary (black and white).
        
        Methods:
        - 'otsu': Otsu's automatic thresholding
        - 'adaptive': Adaptive thresholding for uneven lighting
        - 'sauvola': Sauvola binarization (best for documents)
        """
        if len(img.shape) == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        if method == 'otsu':
            # Apply Gaussian blur first
            blur = cv2.GaussianBlur(img, (5, 5), 0)
            _, binary = cv2.threshold(blur, 0, 255, 
                                      cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        elif method == 'adaptive':
            binary = cv2.adaptiveThreshold(
                img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
        elif method == 'sauvola':
            binary = self._sauvola_threshold(img)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        return binary
    
    def _sauvola_threshold(self, img, window_size=25, k=0.2):
        """Sauvola local binarization."""
        img = img.astype(np.float64)
        
        # Calculate local mean and std
        kernel = np.ones((window_size, window_size)) / (window_size ** 2)
        mean = cv2.filter2D(img, -1, kernel)
        mean_sq = cv2.filter2D(img ** 2, -1, kernel)
        std = np.sqrt(mean_sq - mean ** 2)
        
        # Sauvola formula
        threshold = mean * (1 + k * (std / 128 - 1))
        binary = (img > threshold).astype(np.uint8) * 255
        
        return binary
    
    def deskew(self, img):
        """Correct image rotation."""
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        
        # Find coordinates of all non-zero pixels
        coords = np.column_stack(np.where(gray > 0))
        
        if len(coords) == 0:
            return img
        
        # Get rotation angle
        angle = cv2.minAreaRect(coords)[-1]
        
        # Adjust angle
        if angle < -45:
            angle = 90 + angle
        elif angle > 45:
            angle = angle - 90
        
        # Skip if angle is very small
        if abs(angle) < 0.5:
            return img
        
        # Rotate image
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            img, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        
        return rotated
    
    def remove_borders(self, img):
        """Remove black borders from scanned documents."""
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        
        # Find contours
        contours, _ = cv2.findContours(
            gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return img
        
        # Get bounding box of largest contour
        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)
        
        # Add small margin
        margin = 10
        x = max(0, x - margin)
        y = max(0, y - margin)
        w = min(img.shape[1] - x, w + 2 * margin)
        h = min(img.shape[0] - y, h + 2 * margin)
        
        return img[y:y+h, x:x+w]
```
</preprocessing_pipeline>

<specific_techniques>
<grayscale>
```python
import cv2

def to_grayscale(img):
    """
    Convert to grayscale using different methods.
    """
    # Standard conversion (recommended)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Alternative: Luminance-preserving
    gray_lum = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[:,:,0]
    
    # Alternative: Maximum of channels (for colored text)
    gray_max = np.max(img, axis=2)
    
    return gray
```
</grayscale>

<noise_removal>
```python
import cv2
import numpy as np

def remove_noise(img, method='nlm'):
    """
    Remove noise from image.
    
    Methods:
    - 'gaussian': Gaussian blur (fast, may blur text)
    - 'median': Median filter (good for salt-and-pepper noise)
    - 'bilateral': Bilateral filter (preserves edges)
    - 'nlm': Non-local means (best quality, slower)
    - 'morph': Morphological operations
    """
    if method == 'gaussian':
        return cv2.GaussianBlur(img, (5, 5), 0)
    
    elif method == 'median':
        return cv2.medianBlur(img, 3)
    
    elif method == 'bilateral':
        return cv2.bilateralFilter(img, 9, 75, 75)
    
    elif method == 'nlm':
        if len(img.shape) == 2:
            return cv2.fastNlMeansDenoising(img, None, 10, 7, 21)
        return cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
    
    elif method == 'morph':
        kernel = np.ones((1, 1), np.uint8)
        img = cv2.dilate(img, kernel, iterations=1)
        img = cv2.erode(img, kernel, iterations=1)
        return cv2.morphologyEx(img, cv2.MORPH_CLOSE, kernel)
    
    raise ValueError(f"Unknown method: {method}")
```
</noise_removal>

<binarization>
```python
import cv2
import numpy as np

def binarize_image(img, method='otsu'):
    """
    Convert image to binary (black and white).
    
    Methods:
    - 'simple': Simple threshold
    - 'otsu': Otsu's automatic threshold
    - 'adaptive_mean': Adaptive threshold (mean)
    - 'adaptive_gaussian': Adaptive threshold (Gaussian)
    - 'sauvola': Sauvola local threshold
    """
    if len(img.shape) == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    if method == 'simple':
        _, binary = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)
    
    elif method == 'otsu':
        blur = cv2.GaussianBlur(img, (5, 5), 0)
        _, binary = cv2.threshold(blur, 0, 255, 
                                  cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    elif method == 'adaptive_mean':
        binary = cv2.adaptiveThreshold(
            img, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
    
    elif method == 'adaptive_gaussian':
        binary = cv2.adaptiveThreshold(
            img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
    
    elif method == 'sauvola':
        # See sauvola implementation above
        pass
    
    return binary

# Inverse binarization (for dark backgrounds)
def binarize_inverse(img):
    """For light text on dark background."""
    if len(img.shape) == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(img, 0, 255, 
                              cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return binary
```
</binarization>

<deskewing>
```python
import cv2
import numpy as np
from scipy.ndimage import interpolation as inter

def deskew_hough(img):
    """Deskew using Hough line detection."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # Edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    
    # Hough transform
    lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)
    
    if lines is None:
        return img
    
    # Calculate average angle
    angles = []
    for line in lines[:10]:  # Use first 10 lines
        rho, theta = line[0]
        angle = (theta * 180 / np.pi) - 90
        if abs(angle) < 45:  # Only near-horizontal lines
            angles.append(angle)
    
    if not angles:
        return img
    
    avg_angle = np.mean(angles)
    
    # Rotate
    (h, w) = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, avg_angle, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h), 
                             borderMode=cv2.BORDER_REPLICATE)
    
    return rotated

def deskew_projection(img):
    """Deskew using projection profile."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # Invert for projection
    _, binary = cv2.threshold(gray, 0, 255, 
                              cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    def find_score(arr, angle):
        data = inter.rotate(arr, angle, reshape=False, order=0)
        hist = np.sum(data, axis=1)
        score = np.sum((hist[1:] - hist[:-1]) ** 2)
        return score
    
    # Search for best angle
    angles = np.arange(-10, 10, 0.5)
    scores = [find_score(binary, a) for a in angles]
    best_angle = angles[np.argmax(scores)]
    
    # Rotate
    (h, w) = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, best_angle, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h), 
                             borderMode=cv2.BORDER_REPLICATE)
    
    return rotated
```
</deskewing>

<morphological_operations>
```python
import cv2
import numpy as np

def morphological_cleanup(img):
    """
    Use morphological operations to clean up text.
    """
    if len(img.shape) == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Kernel for morphological operations
    kernel = np.ones((2, 2), np.uint8)
    
    # Erosion - shrinks white regions
    # Use for: Separating touching characters
    eroded = cv2.erode(img, kernel, iterations=1)
    
    # Dilation - expands white regions
    # Use for: Filling gaps in characters
    dilated = cv2.dilate(img, kernel, iterations=1)
    
    # Opening - erosion followed by dilation
    # Use for: Removing small white noise
    opened = cv2.morphologyEx(img, cv2.MORPH_OPEN, kernel)
    
    # Closing - dilation followed by erosion
    # Use for: Filling small holes in characters
    closed = cv2.morphologyEx(img, cv2.MORPH_CLOSE, kernel)
    
    # Gradient - difference between dilation and erosion
    # Use for: Edge detection
    gradient = cv2.morphologyEx(img, cv2.MORPH_GRADIENT, kernel)
    
    # Top Hat - difference between input and opening
    # Use for: Extracting small bright elements
    tophat = cv2.morphologyEx(img, cv2.MORPH_TOPHAT, kernel)
    
    # Black Hat - difference between closing and input
    # Use for: Extracting small dark elements
    blackhat = cv2.morphologyEx(img, cv2.MORPH_BLACKHAT, kernel)
    
    return closed  # Default: closing is most useful for OCR

def thicken_text(img, iterations=1):
    """Make thin text thicker for better recognition."""
    kernel = np.ones((2, 2), np.uint8)
    return cv2.dilate(img, kernel, iterations=iterations)

def thin_text(img, iterations=1):
    """Make thick text thinner to separate characters."""
    kernel = np.ones((2, 2), np.uint8)
    return cv2.erode(img, kernel, iterations=iterations)
```
</morphological_operations>

<contrast_enhancement>
```python
import cv2
import numpy as np

def enhance_contrast(img, method='clahe'):
    """
    Enhance contrast for better OCR.
    
    Methods:
    - 'histogram': Histogram equalization
    - 'clahe': Adaptive histogram equalization
    - 'stretch': Linear contrast stretch
    """
    if len(img.shape) == 3:
        # Convert to LAB and enhance L channel
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        if method == 'clahe':
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
        elif method == 'histogram':
            l = cv2.equalizeHist(l)
        
        lab = cv2.merge([l, a, b])
        return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    
    else:
        if method == 'clahe':
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            return clahe.apply(img)
        elif method == 'histogram':
            return cv2.equalizeHist(img)
        elif method == 'stretch':
            p2, p98 = np.percentile(img, (2, 98))
            return cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
    
    return img

def unsharp_mask(img, kernel_size=(5, 5), sigma=1.0, amount=1.0, threshold=0):
    """
    Sharpen image using unsharp mask.
    """
    blurred = cv2.GaussianBlur(img, kernel_size, sigma)
    sharpened = float(amount + 1) * img - float(amount) * blurred
    sharpened = np.maximum(sharpened, 0)
    sharpened = np.minimum(sharpened, 255)
    sharpened = sharpened.astype(np.uint8)
    
    if threshold > 0:
        low_contrast_mask = np.abs(img - blurred) < threshold
        np.copyto(sharpened, img, where=low_contrast_mask)
    
    return sharpened
```
</contrast_enhancement>
</specific_techniques>

<recipes>
<recipe name="Scanned Document">
```python
def preprocess_scanned_document(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    
    # Binarize with Otsu
    _, binary = cv2.threshold(denoised, 0, 255, 
                              cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Deskew
    deskewed = deskew_hough(binary)
    
    return deskewed
```
</recipe>

<recipe name="Receipt/Invoice">
```python
def preprocess_receipt(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Adaptive threshold for uneven lighting (common in receipts)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 10
    )
    
    # Morphological closing to connect broken characters
    kernel = np.ones((1, 1), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    
    return cleaned
```
</recipe>

<recipe name="Low Quality Photo">
```python
def preprocess_photo(image_path):
    img = cv2.imread(image_path)
    
    # Resize for consistent size
    img = resize_to_dpi(img, target_dpi=300)
    
    # Enhance contrast
    enhanced = enhance_contrast(img, method='clahe')
    
    # Convert to grayscale
    gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
    
    # Sharpen
    sharpened = unsharp_mask(gray)
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(sharpened, None, 10, 7, 21)
    
    # Binarize
    _, binary = cv2.threshold(denoised, 0, 255, 
                              cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binary
```
</recipe>

<recipe name="Handwritten Text">
```python
def preprocess_handwritten(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Enhance contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Denoise
    denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
    
    # Adaptive binarization
    binary = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 15, 4
    )
    
    # Thin slightly to separate connected characters
    kernel = np.ones((1, 1), np.uint8)
    thinned = cv2.erode(binary, kernel, iterations=1)
    
    return thinned
```
</recipe>
</recipes>

<best_practices>
1. **Always start with grayscale** - Color rarely helps OCR
2. **Match binarization to content** - Otsu for clean docs, adaptive for photos
3. **Denoise before binarization** - Noise becomes permanent after binarization
4. **Deskew before other processing** - Rotation affects all subsequent steps
5. **Target 300 DPI** - Most OCR engines expect this resolution
6. **Test different methods** - No single approach works for all images
7. **Visualize intermediate steps** - Debug by viewing each stage
8. **Preserve original** - Never overwrite the source image
</best_practices>

<quality_assessment>
```python
def assess_image_quality(img):
    """
    Assess image quality for OCR readiness.
    Returns score 0-100 and recommendations.
    """
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    score = 100
    recommendations = []
    
    # Check resolution
    if gray.shape[0] < 300 or gray.shape[1] < 300:
        score -= 20
        recommendations.append("Increase resolution (target: 300 DPI)")
    
    # Check contrast
    contrast = gray.std()
    if contrast < 30:
        score -= 20
        recommendations.append("Enhance contrast (low variation detected)")
    
    # Check noise level (using Laplacian variance)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var < 100:
        score -= 15
        recommendations.append("Image may be blurry (low sharpness)")
    
    # Check for skew
    coords = np.column_stack(np.where(gray > 127))
    if len(coords) > 100:
        angle = abs(cv2.minAreaRect(coords)[-1])
        if angle > 5 and angle < 85:
            score -= 10
            recommendations.append(f"Deskew needed (angle: {angle:.1f}°)")
    
    return {
        'score': max(0, score),
        'recommendations': recommendations,
        'metrics': {
            'resolution': gray.shape,
            'contrast': contrast,
            'sharpness': laplacian_var
        }
    }
```
</quality_assessment>
