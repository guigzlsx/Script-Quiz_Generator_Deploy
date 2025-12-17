#!/usr/bin/env python3
"""
OCR Helper - Extracts text from PDF using pytesseract and pdf2image
Usage: python ocr_helper.py <pdf_path>
"""
import sys
import json
from pathlib import Path

try:
    from pdf2image import convert_from_path
    import pytesseract
    from PIL import Image
except ImportError:
    print(json.dumps({
        "error": "Missing dependencies. Install with: pip install pdf2image pytesseract pillow",
        "success": False
    }))
    sys.exit(1)

def extract_text_from_pdf_ocr(pdf_path):
    """Extract text from PDF using OCR"""
    try:
        # Convert PDF pages to images
        images = convert_from_path(pdf_path, dpi=300)
        
        all_text = []
        for i, image in enumerate(images):
            # Perform OCR on each page
            text = pytesseract.image_to_string(image, lang='fra+eng')
            all_text.append(f"--- Page {i+1} ---\n{text}")
        
        full_text = "\n\n".join(all_text)
        
        return {
            "success": True,
            "text": full_text,
            "pages": len(images),
            "characters": len(full_text)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ocr_helper.py <pdf_path>", "success": False}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(json.dumps({"error": f"File not found: {pdf_path}", "success": False}))
        sys.exit(1)
    
    result = extract_text_from_pdf_ocr(pdf_path)
    print(json.dumps(result, ensure_ascii=False))
