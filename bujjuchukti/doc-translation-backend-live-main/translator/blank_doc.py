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
import random
from docx import Document
from io import BytesIO
from dotenv import load_dotenv
load_dotenv()

####################################################### Translation Code ######################################################


dir_path = os.path.dirname(os.path.realpath(__file__))
atoken_path = dir_path.replace(r"\translator", "")

file_path = atoken_path+'/ACCESS_TOKEN.txt'  # Path to the file in the parent directory

try:
    with open(file_path, 'r') as file:
        file_content = file.read()
        access_token = file_content
except FileNotFoundError:
    print('File not found')
except IOError as e:
    print('An error occurred while reading the file:', str(e))


# Set folder ID
folder_id    = os.getenv("T2T_FOLDER_ID")
file_name    = "text2text.docx"

# Get current date and time
now = datetime.now()

# Format the date and time as a string without separators
datetime_str = now.strftime('%Y%m%d%H%M%S')

# Generate a random number string with 4 digits
random_number = str(random.randint(0, 9999)).zfill(4)

# Combine the datetime string and the random number
random_number_string = datetime_str + random_number

# ****************************************** Create Folder ****************************************** #
# Replace with the desired folder name and parent folder ID (optional)
folder_name = random_number_string
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

# # ****************************************** Upload doc in subfolder ****************************************** #

# Create a blank document using python-docx
document = Document()

# Save the document to a BytesIO object
docx_file_content = BytesIO()
document.save(docx_file_content)
docx_file_content.seek(0)

# Upload the file to OneDrive
url = f'https://graph.microsoft.com/v1.0/me/drive/items/{sub_folder_id}:/{file_name}:/content'
headers = CaseInsensitiveDict()
headers["Authorization"] = f"Bearer {access_token}"
headers["Content-Type"] = "application/octet-stream"
# headers["Content-Length"] = str(len(docx_file_content))

resp = requests.put(url, headers=headers, data=docx_file_content)

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

            soup = BeautifulSoup(response.content, 'html.parser')
            meta_refresh_tag = soup.find('noscript').find('meta', {'http-equiv': 'refresh'})
            if meta_refresh_tag:
                content = meta_refresh_tag.get('content')

                split_parts = content.split('0;url=')
                extracted_url = split_parts[1]

                resultData = {
                    "sub_folder_id": sub_folder_id,
                    "sub_folder_name": folder_name,
                    "file_name": file_name,
                    "extracted_url": extracted_url
                }

                resultData_json = json.dumps(resultData)
                print(resultData)

        except requests.exceptions.RequestException as error:
            print('An error occurred:', error)

    else:
        print(f"Error: {response.status_code} - {response.text}")

   
else:
    response_data = json.loads(resp.text)
    print(f"Failed to upload file: {response_data}")
