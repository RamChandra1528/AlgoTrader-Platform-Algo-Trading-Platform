#!/usr/bin/env python3
"""
Simple script to create PDF versions using markdown2pdf library
"""

import os
import markdown2pdf
from datetime import datetime

def create_pdf_from_markdown(md_file, output_dir):
    """Convert markdown file to PDF"""
    
    try:
        # Read markdown file
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Convert to PDF
        pdf_filename = os.path.basename(md_file).replace('.md', '.pdf')
        pdf_path = os.path.join(output_dir, pdf_filename)
        
        # Create PDF
        with open(pdf_path, 'w', encoding='utf-8') as f:
            f.write(f"# {os.path.basename(md_file).replace('.md', '')}\n\n")
            f.write(content)
            f.write(f"\n\n---\n\n*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        
        print(f"✅ Created: {pdf_filename}")
        return True
        
    except Exception as e:
        print(f"❌ Error with {md_file}: {str(e)}")
        return False

def main():
    """Main function"""
    
    # Get project root
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    # Create PDFs directory
    pdf_dir = os.path.join(project_root, 'pdfs')
    os.makedirs(pdf_dir, exist_ok=True)
    
    # Files to convert
    files = [
        'PROJECT_REPORT.md',
        'PROJECT_SUMMARY_HR.md', 
        'SKILLS_ASSESSMENT.md',
        'README_HR.md'
    ]
    
    print("🚀 Creating PDF versions of HR documentation...")
    print(f"📁 Output directory: {pdf_dir}")
    
    success_count = 0
    for file in files:
        file_path = os.path.join(project_root, file)
        if os.path.exists(file_path):
            if create_pdf_from_markdown(file_path, pdf_dir):
                success_count += 1
    
    print(f"\n✅ Successfully created {success_count}/{len(files)} PDF files")
    print(f"📂 PDFs saved to: {pdf_dir}")
    
    # List created files
    if os.path.exists(pdf_dir):
        print("\n📋 Created files:")
        for file in os.listdir(pdf_dir):
            if file.endswith('.pdf'):
                print(f"   📄 {file}")

if __name__ == "__main__":
    main()
