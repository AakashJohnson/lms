import sys
import os
import PyPDF2
from io import BytesIO
from docx2pdf import convert
import PyPDF2
import shutil
import json
import datetime
import pymongo
import re
from dotenv import load_dotenv
load_dotenv()
import win32com.client as win32


# Create parts of the PDF
def split_pdf(file_dir, pdf_file_now, page_limit, user_id, dest, source, file_name):

    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db     = client.get_database(os.getenv("DATABASE_NAME"))
    collection = db.get_collection("doc_lists")

    # Open the PDF file
    pdf = PyPDF2.PdfReader(file_dir+"/"+pdf_file_now)

    # Calculate the number of files needed to split the PDF
    page_count = len(pdf.pages)
    file_count = (page_count + page_limit - 1) // page_limit

    parts_name = []
    split_dir = file_dir.split('./uploads/')

    for i in range(file_count):
        parts_name.append("part_" + str(i))
        my_datetime = datetime.datetime.today()

        data = {
            "user_id": user_id, 
            "folder_name": split_dir[1], 
            "org_file_name": file_name, 
            "part_number": str(i), 
            "file_name": "part_" + str(i)+".docx", 
            "source": source,
            "dest": dest,
            "one_drive_path": "", 
            "status": "1", 
            "created_at": my_datetime.strftime("%Y/%m/%d %H:%M:%S"), 
            "updated_at": my_datetime.strftime("%Y/%m/%d %H:%M:%S")
        }

        result = collection.insert_one(data)
        # print(f"Inserted document with ID {result.inserted_id}")

    resultData = {
        "type": "success",
        "total_parts": file_count,
        "parts_name": parts_name,
        "file_dir": split_dir[1]
    }

    resultData_json = json.dumps(resultData)
    print(resultData)

    # Split the PDF into multiple files
    start = 0
    for i in range(file_count):
        split_pdf_n = PyPDF2.PdfWriter()
        end = min(page_count, start + page_limit)
        for j in range(start, end):
            split_pdf_n.add_page(pdf.pages[j])
            
            # Create a new folder according to the parts
            if not os.path.exists(file_dir+"/"+"part_" + str(i)):
                os.makedirs(file_dir+"/"+"part_" + str(i))

        with open(os.path.join(file_dir+"/"+"part_" + str(i), "part_" + str(i) + ".pdf"), "wb") as f:
            split_pdf_n.write(f)
        start = end


# Convert the Microsoft Word document to a PDF file
def convert_word_to_pdf(file_dir, word_file):
    pdf_file_pld = os.path.splitext(word_file)[0] + ".pdf"
    convert(file_dir+"/"+word_file, file_dir+"/"+pdf_file_pld)
    return pdf_file_pld

def split_docx(file_dir, file, page_limit, user_id, dest, source, file_name):

    # Open the Word document
    word = win32.gencache.EnsureDispatch('Word.Application')
      
    doc_path = file_dir + "/" + file
  
    doc  = word.Documents.Open(os.path.abspath(doc_path))
    path = os.path.abspath(file_dir)

    # Get the VBA project in the Word document
    vbproject = doc.VBProject

    # Add a new VBA module to the project
    module_name = 'SplitDocumentIntoParts()'
    module = vbproject.VBComponents.Add(1)

    vba_code = """
    Sub SplitDocumentIntoParts(path)
        Dim i As Long
        Dim n As Long
        Dim doc As Document
        Dim newDoc As Document
        Dim remainderDoc As Document
        Dim pageCount As Long
    
        Set doc = ActiveDocument
        n = 10 ' Change this to the desired number of pages per part

        ' Add a blank page to the end of the document
        Dim lastPar As Paragraph
        Set lastPar = doc.Content.Paragraphs(doc.Content.Paragraphs.Count)
        lastPar.Range.InsertBreak Type:=wdPageBreak

        ' Determine the number of pages in the document
        pageCount = doc.Range.ComputeStatistics(wdStatisticPages)
        ' print pageCount

        For i = 1 To pageCount Step n
            If i + (n-1) <= pageCount Then
                ' Create a new document for each part
                Set newDoc = Documents.Add
                
                ' Create an instance of the file system object
                Set objFSO = CreateObject("Scripting.FileSystemObject")
                newpath = path & "//" & "part_" & Int((i - 1) / n) & "//"
                objFSO.CreateFolder(newpath)

                newDoc.Range.FormattedText = doc.Range( _
                    Start:=doc.Range.GoTo(What:=wdGoToPage, Which:=wdGoToAbsolute, Count:=i).Start, _
                    End:=doc.Range.GoTo(What:=wdGoToPage, Which:=wdGoToAbsolute, Count:=i + (n-1)).End _
                ).FormattedText
                newDoc.SaveAs2 FileName:=newpath & "part_" & Int((i - 1) / n) & ".docx", FileFormat:=wdFormatXMLDocument
                newDoc.Close
            Else
                ' Save any remaining pages into a separate document
                Set remainderDoc = Documents.Add

                ' Create an instance of the file system object
                Set objFSO = CreateObject("Scripting.FileSystemObject")
                newpath = path & "//" & "part_" & Int(pageCount / n) & "//"
                objFSO.CreateFolder(newpath)

                remainderDoc.Range.FormattedText = doc.Range( _
                    Start:=doc.Range.GoTo(What:=wdGoToPage, Which:=wdGoToAbsolute, Count:=i).Start, _
                    End:=doc.Range.GoTo(What:=wdGoToPage, Which:=wdGoToAbsolute, Count:=pageCount).End _
                ).FormattedText
                remainderDoc.SaveAs2 FileName:=newpath & "part_" & Int(pageCount / n) & ".docx", FileFormat:=wdFormatXMLDocument
                remainderDoc.Close
            End If
        Next i
        
    End Sub

    """
    module.CodeModule.AddFromString(vba_code)
    word.Run('SplitDocumentIntoParts', path)

    # Save and close the Word document
    doc.Save()
    doc.Close()

    # Quit Word
    word.Quit()

    # Insert into DB
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db     = client.get_database(os.getenv("DATABASE_NAME"))
    collection = db.get_collection("doc_lists")

    total_dirs = count_directories(file_dir)
    # print("Total directories: ", total_dirs)

    parts_name = []
    first_mongo_id = ''
    split_dir = file_dir.split('./uploads/')
    
    for i in range(total_dirs):
        parts_name.append("part_" + str(i))
        my_datetime = datetime.datetime.today()

        data = {
            "user_id": user_id, 
            "folder_name": split_dir[1], 
            "org_file_name": file_name, 
            "part_number": str(i), 
            "file_name": "part_" + str(i)+".docx", 
            "source": source,
            "dest": dest,
            "one_drive_path": "", 
            "status": "1", 
            "created_at": my_datetime.strftime("%Y/%m/%d %H:%M:%S"), 
            "updated_at": my_datetime.strftime("%Y/%m/%d %H:%M:%S")
        }

        result = collection.insert_one(data)
        if(i==0):
            first_mongo_id = result.inserted_id
            # print(f"Inserted document with ID {result.inserted_id}")


    resultData = {
        "type": "success",
        "total_parts": total_dirs,
        "parts_name": parts_name,
        "file_dir": split_dir[1],
        "first_mongo_id": str(first_mongo_id)
    }

    resultData_json = json.dumps(resultData)
    print(resultData)

def count_directories(path):
    total = 0
    for root, dirs, files in os.walk(path):
        total += len(dirs)
    return total


def save_as_docx(path):
    word = win32.DispatchEx('Word.Application')
    doc = word.Documents.Open(path)
    doc.Activate()
    new_file_abs = os.path.abspath(path)
    new_file_abs = re.sub(r'\.\w+$', '.docx', new_file_abs)

    word.ActiveDocument.SaveAs(
        new_file_abs, FileFormat=12
    )
    doc.Close(False)
    return new_file_abs

# Get the command-line arguments passed to the script
args = sys.argv

folder_path = r"C:/Users/aicte/AppData/Local/Temp/3/gen_py"

if os.path.exists(folder_path):
    # remove the folder and its contents
    shutil.rmtree(folder_path)

folder_path2 = r"C:/Users/admin/AppData/Local/Temp/3/gen_py"

if os.path.exists(folder_path2):
    # remove the folder and its contents
    shutil.rmtree(folder_path2)



if sys.argv[1] == "docx" or sys.argv[1] == "pdf":

    if sys.argv[1] == "docx":
    
        for file in os.listdir(sys.argv[2]):
            if file.endswith(".docx"):
                split_docx(sys.argv[2], file, 10, sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])

    else:

        for file in os.listdir(sys.argv[2]):
            if file.endswith(".pdf"):
                doc_path = os.path.abspath(sys.argv[2]+"/"+file)
                doc_file = save_as_docx(doc_path)
                split_docx(sys.argv[2], doc_file, 10, sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])

else:
    # use shutil.rmtree() to delete the directory and its contents recursively
    shutil.rmtree(sys.argv[2])

    # check if the directory still exists
    if os.path.exists(sys.argv[2]):
        resultData = {
            "type": "error",
            "error_msg": "Failed to delete directory {sys.argv[2]}"
        }
        resultData_json = json.dumps(resultData)
        print(resultData_json)
    else:
        # print(f"Directory {sys.argv[2]} deleted successfully")
        resultData = {
            "type": "error",
            "error_msg": "Invalid file format. Please provide docx or pdf only."
        }
        resultData_json = json.dumps(resultData)
        print(resultData_json)