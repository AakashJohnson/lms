import argparse
import os
import time
import psutil
from datetime import datetime
import signal
import shutil
import requests
import win32com.client as win32
from requests.structures import CaseInsensitiveDict
import json
from bs4 import BeautifulSoup
import pymongo
from dotenv import load_dotenv
import urllib.parse
load_dotenv()

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
#    print('Process Exists | PID and other details are')
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
        #  print((processID ,processName, processCreationTime, time.strftime('%Y-%m-%d %H:%M:%S')), minutes)
          os.kill(int(processID), signal.SIGILL)

# else :
#    print('No Running Process found with given text')

folder_path = r"C:/Users/aicte/AppData/Local/Temp/3/gen_py"

if os.path.exists(folder_path):
    # remove the folder and its contents
    shutil.rmtree(folder_path)
####################################################### Translation Code ######################################################


dir_path = os.path.dirname(os.path.realpath(__file__))

my_parser = argparse.ArgumentParser()
my_parser.add_argument('--filename', action='store', type=str, required=True)
my_parser.add_argument('--input_dir', action='store', type=str, required=True)
my_parser.add_argument('--from_language', action='store',
                       type=str, required=True)
my_parser.add_argument('--languages', action='append',  required=True)

my_parser.add_argument('--trans_doc', action='append',  required=True)
my_parser.add_argument('--trans_doc_path', action='append',  required=True)
my_parser.add_argument('--file_dir', action='append',  required=True)

args = my_parser.parse_args()

filename = args.filename
input_dir = args.input_dir
languages = args.languages
to_languages = languages[0]
from_language = args.from_language

trans_doc = args.trans_doc
trans_doc_path = args.trans_doc_path
file_dir = args.file_dir

def docx_to_pdf(path):
    docx_file = path
    pdf_file = os.path.splitext(docx_file)[0] + ".pdf"

    word = win32.DispatchEx("Word.Application")
    word.Visible = False
    doc = word.Documents.Open(docx_file)

    doc.SaveAs(pdf_file, FileFormat=17)

    doc.Close()
    word.Quit()

filepath = os.path.join(input_dir, filename)

try:
    docx_to_pdf(os.path.join(input_dir, filename))
except:
    print('An exception occurred')

os.chdir(dir_path)
os.system("DocumentTranslatorCmd setcredentials /reset:true")
os.system("DocumentTranslatorCmd setcredentials /APIkey:37d9984a024b4b468de99b4c0d01a44e /Region:centralindia /Cloud:Global")
os.system(("DocumentTranslatorCmd translatedocuments /documents:" +
           os.path.join(input_dir, filepath) + f" /from:{from_language} /to:{','.join(languages)}"))


# ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

file_path = '../ACCESS_TOKEN.txt'  # Path to the file in the parent directory

try:
    with open(file_path, 'r') as file:
        file_content = file.read()
        access_token = file_content
except FileNotFoundError:
    print('File not found')
except IOError as e:
    print('An error occurred while reading the file:', str(e))


# Set folder ID
folder_id    = os.getenv("FOLDER_ID")

# Set the file path and name

# Define the relative path
relative_path = trans_doc_path[0]
# Get the absolute path
absolute_path = os.path.abspath(relative_path)
# Replace forward slashes with backslashes (for Windows file paths)
absolute_path = absolute_path.replace('/', '\\')
absolute_path = absolute_path.replace(r"\translator", "")

file_path = absolute_path
file_name = trans_doc[0]

# ****************************************** Create Folder ****************************************** #
# Replace with the desired folder name and parent folder ID (optional)
folder_name = file_dir[0]
parent_folder_id = folder_id

# Set the URL for the API endpoint
url = f"https://graph.microsoft.com/v1.0/me/drive/items/{parent_folder_id}/children"

headers = CaseInsensitiveDict()
headers["Authorization"] = f"Bearer {access_token}"
headers["Content-Type"] = "application/json"

data = {
    "name": folder_name,
    "folder": {}
}

# Make the API request to create the folder
response = requests.post(url, headers=headers, data=json.dumps(data))
sub_folder_id = response.json()["id"]

# ****************************************** Upload doc in subfolder ****************************************** #

# Read the file content
with open(file_path, 'rb') as f:
    file_content = f.read()

# Upload the file to OneDrive
url = f'https://graph.microsoft.com/v1.0/me/drive/items/{sub_folder_id}:/{file_name}:/content'
headers = CaseInsensitiveDict()
headers["Authorization"] = f"Bearer {access_token}"
headers["Content-Type"] = "application/octet-stream"
headers["Content-Length"] = str(len(file_content))

resp = requests.put(url, headers=headers, data=file_content)

if resp.status_code == 201:
    response_data = json.loads(resp.text)
    # print(f"File Id: {response_data['id']}")
    # print(f"File uploaded: {response_data['name']}")
    # print(f"Web URL: {response_data['webUrl']}")

    url_public = f'https://graph.microsoft.com/v1.0/me/drive/items/{response_data["id"]}/createLink'

    headers_public = CaseInsensitiveDict()
    headers_public["Authorization"] = f"Bearer {access_token}"
    headers_public["Content-Type"] = 'application/json'

    payload = {
        'type': 'edit',
        'scope': 'anonymous'
    }

    response = requests.post(url_public, headers=headers_public, json=payload)

    if response.status_code == 201:
        body = response.json()
        link = body['link']['webUrl']

        try:
            response = requests.get(link)
            response.raise_for_status()

            soup = str(BeautifulSoup(response.content, 'html.parser'))

            # Extract the app-argument value from the HTML
            start_index = soup.find('app-argument=')

            if start_index != -1:  # Check if the substring is found
                end_index = soup.find('"', start_index)
                app_argument_encoded = soup[int(start_index) + len('app-argument='):int(end_index)]

                # Decode the URL-encoded string
                app_argument_decoded = urllib.parse.unquote(app_argument_encoded)

                split_parts = app_argument_decoded.split(':ofe|u|')
                extracted_url = split_parts[1]
                
                client = pymongo.MongoClient("mongodb://localhost:27017/")
                db     = client.get_database(os.getenv("DATABASE_NAME"))
                collection = db.get_collection("doc_lists")

                print(extracted_url)

                data = {
                    "one_drive_path": extracted_url
                }
                
                collection.update_one(
                    {"folder_name": folder_name, "file_name": filename},
                    {"$set": data}
                )

            else:
                print("app-argument not found in the HTML content.")
            

            # soup = BeautifulSoup(response.content, 'html.parser')
            # meta_refresh_tag = soup.find('noscript').find('meta', {'http-equiv': 'refresh'})
            # if meta_refresh_tag:
            #     content = meta_refresh_tag.get('content')

            #     split_parts = content.split('0;url=')
            #     extracted_url = split_parts[1]

            #     client = pymongo.MongoClient("mongodb://localhost:27017/")
            #     db     = client.get_database(os.getenv("DATABASE_NAME"))
            #     collection = db.get_collection("doc_lists")

            #     print(extracted_url)

            #     data = {
            #         "one_drive_path": extracted_url
            #     }
                
            #     collection.update_one(
            #         {"folder_name": folder_name, "file_name": filename},
            #         {"$set": data}
            #     )

        except requests.exceptions.RequestException as error:
            print('An error occurred:', error)

    else:
        print(f"Error: {response.status_code} - {response.text}")

   
else:
    response_data = json.loads(resp.text)
    print(f"Failed to upload file: {response_data}")
