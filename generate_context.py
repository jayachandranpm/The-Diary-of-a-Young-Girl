import pypdf
import json
import os

pdf_path = "/Users/jaya-20646/CRM Agent/Anne's Diary/website/assets/document.pdf"
output_path = "/Users/jaya-20646/CRM Agent/Anne's Diary/website/assets/context.js"

try:
    print(f"Reading {pdf_path}...")
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    # Extract first 20 pages
    max_pages = min(len(reader.pages), 20)
    for i in range(max_pages):
        page_text = reader.pages[i].extract_text()
        if page_text:
            text += page_text + "\n"
    
    js_content = f"window.extractedPDFContext = {json.dumps(text)};"
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print("Context generated successfully.")
except Exception as e:
    print(f"Error: {e}")
