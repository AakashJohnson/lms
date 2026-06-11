import argparse
import os

from bs4 import BeautifulSoup
from win32com.client import constants
import win32com.client as win32
import re
import mammoth
import comtypes.client

import time
import psutil
from datetime import datetime
import signal
import shutil
import subprocess


################################# Process Kill Code ######################################


def findProcessIdByName(processName):
    '''
    Get a list of all the PIDs of a all the running process whose name contains
    the given string processName
    '''
    listOfProcessObjects = []
    #Iterate over the all the running process
    for proc in psutil.process_iter():
       try:
           pinfo = proc.as_dict(attrs=['pid', 'name', 'create_time'])
           # Check if process name contains the given name string.
           if processName.lower() in pinfo['name'].lower() :
               listOfProcessObjects.append(pinfo)
       except (psutil.NoSuchProcess, psutil.AccessDenied , psutil.ZombieProcess) :
           pass
    return listOfProcessObjects


listOfProcessIds = findProcessIdByName('WINWORD')
if len(listOfProcessIds) > 0:
   print('Process Exists | PID and other details are')
   for elem in listOfProcessIds:
       processID = elem['pid']
       processName = elem['name']
       processCreationTime =  time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(elem['create_time']))

       start = datetime.strptime(processCreationTime, '%Y-%m-%d %H:%M:%S')
       end = datetime.strptime(time.strftime('%Y-%m-%d %H:%M:%S'), '%Y-%m-%d %H:%M:%S')
        
       difference = end - start
        
       seconds = difference.total_seconds()
       # print('difference in seconds is:', seconds)
        
       minutes = seconds / 60
       # print('difference in minutes is:', minutes)
        
       hours = seconds / (60 * 60)
       # print('difference in hours is:', hours)
      
       if minutes > 30:
          print((processID ,processName, processCreationTime, time.strftime('%Y-%m-%d %H:%M:%S')), minutes)
          os.kill(int(processID), signal.SIGILL)

else :
   print('No Running Process found with given text')

folder_path = r"C:/Users/aicte/AppData/Local/Temp/3/gen_py"

if os.path.exists(folder_path):
    # remove the folder and its contents
    shutil.rmtree(folder_path)
####################################################### Translation Code ######################################################

dir_path = os.path.dirname(os.path.realpath(__file__))

my_parser = argparse.ArgumentParser()
my_parser.add_argument('--file', action='store', type=str, required=True)
my_parser.add_argument('--input_dir', action='store', type=str, required=True)
my_parser.add_argument('--from_language', action='store',
                       type=str, required=True)
my_parser.add_argument('--languages', action='append',  required=True)

args = my_parser.parse_args()

input_dir, filename = args.input_dir, args.file
languages = args.languages
to_languages = languages[0]
from_language = args.from_language

def docx_to_pdf(path):
    docx_file = path
    pdf_file = os.path.splitext(docx_file)[0] + ".pdf"

    word = win32.DispatchEx("Word.Application")
    word.Visible = False
    doc = word.Documents.Open(docx_file)

    doc.SaveAs(pdf_file, FileFormat=17)

    doc.Close()
    word.Quit()


def convert_to_HTML(src_path, dest_path, filename):
    # path = os.path.join(src_path, dest_path, filename)

    # if(not os.path.exists(dest_path)):
    #     os.makedirs(dest_path, exist_ok=True)

    # word = win32.DispatchEx('Word.Application')
    # doc = word.Documents.Open(path)
    # doc.Activate()

    # new_file_abs = os.path.join(dest_path, filename)

    # new_file_abs = re.sub(r'\.\w+$', '.html', new_file_abs)
    # # print(new_file_abs)
    # word.ActiveDocument.SaveAs(
    #     new_file_abs, FileFormat=8
    # )
    # doc.Close(False)

    with open(os.path.join(src_path, filename), "rb") as docx_file:
        result = mammoth.convert_to_html(docx_file)
    
    new_file_abs = os.path.join(dest_path, filename)

    new_file_abs = re.sub(r'\.\w+$', '.html', new_file_abs)
    with open(new_file_abs, "w", encoding="utf-8") as html_file:
        html_file.write(result.value)

    # input_file = os.path.join(src_path, filename)
    # new_file_abs = os.path.join(dest_path, filename)
    # new_file_abs = re.sub(r'\.\w+$', '.html', new_file_abs)
    # output_file = new_file_abs

    # pandoc_cmd = ['pandoc', '-s', input_file, '-o', output_file, '--extract-media='+dest_path, '-C', '--mathml']

    # subprocess.run(pandoc_cmd)

    # doc_path = os.path.join(src_path, filename)

    # word = comtypes.client.CreateObject("Word.Application")
    # doc = word.Documents.Open(doc_path)
    # html_path = os.path.splitext(doc_path)[0] + ".html"
    # doc.SaveAs(html_path, FileFormat=8, Encoding=65001)  
    # doc.Close()
    # word.Quit()

    # new_file_abs = os.path.join(dest_path, filename)
    # search_text1 = "charset=windows-1252"

    # replace_text = "charset=utf-8"

    # search_text2 = "charset=cp1252"
    # print(html_path)
    # with open(html_path, 'r') as file:
    #     data = file.read()
    #     data = data.replace(search_text1, replace_text)
    #     data = data.replace(search_text2, replace_text)

    # with open(html_path, 'w') as file:
    #     file.write(data)

    path_string = new_file_abs
    new=path_string.replace(".html",".docx")
    docx_to_pdf(new)


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


def clean_html(folder_path, filename, updated_folder_name):
    filepath = os.path.join(folder_path, filename)
    complete_url = f'./'

    try:
        with open(filepath, 'r', encoding='windows-1252') as f:
            html_file = f.read()

        soup = BeautifulSoup(html_file, features='html.parser')

        for img in soup.findAll('img'):
            img['src'] = complete_url + img['src']

        with open(filepath, 'w', encoding='windows-1252') as f:
            f.write(str(soup))

    except Exception as e:
        # # print(e.with_traceback())
        print(filepath, e)


originalname, ext = os.path.splitext(filename)

filename = save_as_docx(os.path.join(input_dir, filename))

try:
    docx_to_pdf(os.path.join(input_dir, filename))
except:
    print('An exception occurred')


os.chdir(dir_path)
os.system("DocumentTranslatorCmd setcredentials /reset:true")
os.system("DocumentTranslatorCmd setcredentials /APIkey:37d9984a024b4b468de99b4c0d01a44e /Region:centralindia /Cloud:Global")
os.system(("DocumentTranslatorCmd translatedocuments /documents:" +
           os.path.join(input_dir, filename) + f" /from:{from_language} /to:{','.join(languages)}"))

root, ext = os.path.splitext(filename)
html_file_name = root+"."+to_languages+ext
convert_to_HTML(input_dir, input_dir, html_file_name)

os.chdir(dir_path)
os.system(
    f"python clean.py --input_dir {input_dir} --folder {input_dir}")




