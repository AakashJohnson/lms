import os
import win32com.client as win32
import logging

logging.basicConfig(level=logging.DEBUG)

def save_as_docx(file_path):
    try:
       
        word_app = win32.Dispatch('Word.Application')
        word_app.Visible = False
       
        doc = word_app.Documents.Open(file_path)
        logging.debug("Activating document")
        doc.Activate()
        # ... Your code to save the document as DOCX
        logging.debug("Closing document")
        doc.Close(False)
        logging.debug("Quitting Word Application")
        word_app.Quit()
    except Exception as e:
        logging.error(f"An error occurred: {e}")

input_dir = "E:/Work/translation-independent-server-master/translator/"
filename = "JANCH.en.docx"
save_as_docx(os.path.join(input_dir, filename))
