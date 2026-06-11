import os
import docx2pdf

# Replace 'input_folder' with the path to the folder containing DOCX files.
input_folder = 'C:/Users/AICTE/Music/doc_to_pdf'

# Get a list of all DOCX files in the folder.
docx_files = [os.path.join(input_folder, filename) for filename in os.listdir(input_folder) if filename.endswith('.docx')]

# Convert each DOCX file to PDF.
for docx_file in docx_files:
    docx2pdf.convert(docx_file)
