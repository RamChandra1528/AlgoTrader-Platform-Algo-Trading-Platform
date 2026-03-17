#!/usr/bin/env python3
"""
Script to generate PDF versions of HR documentation reports
"""

import os
import markdown
import pdfkit
from datetime import datetime

def convert_markdown_to_pdf(md_file_path, output_dir):
    """Convert markdown file to PDF"""
    
    # Read markdown content
    with open(md_file_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Convert markdown to HTML
    html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
    
    # Add CSS styling for professional PDF
    css_style = """
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 24px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 28px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            font-size: 22px;
            border-bottom: 1px solid #3498db;
            padding-bottom: 5px;
        }
        h3 {
            font-size: 18px;
        }
        code {
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border: 1px solid #e9ecef;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 20px;
            background-color: #f8f9fa;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #3498db;
            color: white;
        }
        .star-rating {
            color: #f39c12;
            font-size: 18px;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 10px;
            border-radius: 5px;
            border-left: 4px solid #f39c12;
        }
        .project-structure {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        .metrics {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        .metric-card {
            background-color: #e3f2fd;
            border: 1px solid #3498db;
            border-radius: 5px;
            padding: 15px;
            margin: 10px;
            flex: 1;
            min-width: 200px;
        }
        .page-break {
            page-break-before: always;
        }
    </style>
    """
    
    # Combine HTML with CSS
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{os.path.basename(md_file_path).replace('.md', '')}</title>
        {css_style}
    </head>
    <body>
        {html_content}
        <div style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
            Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </div>
    </body>
    </html>
    """
    
    # Generate PDF filename
    pdf_filename = os.path.basename(md_file_path).replace('.md', '.pdf')
    pdf_path = os.path.join(output_dir, pdf_filename)
    
    # PDF options
    options = {
        'page-size': 'A4',
        'margin-top': '0.75in',
        'margin-right': '0.75in',
        'margin-bottom': '0.75in',
        'margin-left': '0.75in',
        'encoding': "UTF-8",
        'no-outline': None,
        'enable-local-file-access': None
    }
    
    try:
        # Convert HTML to PDF
        pdfkit.from_string(full_html, pdf_path, options=options)
        print(f"✅ PDF generated: {pdf_path}")
        return True
    except Exception as e:
        print(f"❌ Error generating PDF for {md_file_path}: {str(e)}")
        return False

def main():
    """Main function to generate all PDFs"""
    
    # Get current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    # Create PDF output directory
    pdf_dir = os.path.join(project_root, 'pdfs')
    os.makedirs(pdf_dir, exist_ok=True)
    
    # List of markdown files to convert
    md_files = [
        'PROJECT_REPORT.md',
        'PROJECT_SUMMARY_HR.md', 
        'SKILLS_ASSESSMENT.md',
        'README_HR.md'
    ]
    
    print("🚀 Generating PDF versions of HR documentation...")
    print(f"📁 Output directory: {pdf_dir}")
    print("-" * 50)
    
    success_count = 0
    
    for md_file in md_files:
        md_path = os.path.join(project_root, md_file)
        
        if os.path.exists(md_path):
            if convert_markdown_to_pdf(md_path, pdf_dir):
                success_count += 1
        else:
            print(f"❌ Failed to process: {md_file}")
    else:
        print(f"❌ File not found: {md_file}")
    
    print("-" * 50)
    print(f"✅ Successfully generated {success_count}/{len(md_files)} PDF files")
    
    # List generated PDFs
    print("\n📋 Generated PDF files:")
    for file in os.listdir(pdf_dir):
        if file.endswith('.pdf'):
            print(f"   📄 {file}")
    
    print(f"\n📂 PDFs saved to: {pdf_dir}")
    print("\n💡 Tip: You can now submit these professional PDF documents to HR!")

if __name__ == "__main__":
    main()
