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
load_dotenv()

# Function to get all files inside a folder in OneDrive
def get_files_in_folder(folder_id, access_token):
    try:
        url = f'https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}/children'

        headers = CaseInsensitiveDict()
        headers["Authorization"] = f"Bearer {access_token}"

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()

        files = []
        for item in data['value']:
            if item['file']:
                files.append(item['id'])

        return files

    except requests.exceptions.RequestException as e:
        print('Error retrieving files:', e)


# Function to download a file from OneDrive
def download_file_from_onedrive(file_id, access_token, destination_path):
    try:
        url = f'https://graph.microsoft.com/v1.0/me/drive/items/{file_id}/content'

        headers = {
            'Authorization': f'Bearer {access_token}'
        }

        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()

        with open(destination_path, 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)

        # print('File downloaded successfully.')
    except requests.exceptions.RequestException as e:
        print('File download failed:', e)


access_dir_path = os.path.dirname(os.path.realpath(__file__))

my_parser = argparse.ArgumentParser()
my_parser.add_argument('--languages', action='append',  required=True)
my_parser.add_argument('--sub_folder_id', action='append',  required=True)
my_parser.add_argument('--sub_folder_name', action='append',  required=True)

args = my_parser.parse_args()
languages = args.languages
to_languages = languages
sub_folder_id = args.sub_folder_id[0]
sub_folder_name = args.sub_folder_name[0]

access_file_path = access_dir_path.split('translator')
access_token_file_path = access_file_path[0]+'ACCESS_TOKEN.txt' 

access_token = ""
try:
    with open(access_token_file_path, 'r') as file:
        file_content = file.read()
        access_token = file_content
except FileNotFoundError:
    print('File not found')
except IOError as e:
    print('An error occurred while reading the file:', str(e))


try:
    files = get_files_in_folder(sub_folder_id, access_token)

    files_list=[]
    for index,file in enumerate(files, start=0): # type: ignore
        if index == 0:
            dir_path  = os.path.dirname(os.path.realpath(__file__))
            split_dir = dir_path.split('translator')
            destination_path = split_dir[0]+"uploads"+"\\text2text\\"+sub_folder_name+"\\"

            # Create the folder
            if not os.path.exists(destination_path):
                os.makedirs(destination_path)
            
            download_file_from_onedrive(file, access_token, destination_path+"text2text.docx")
            
            if os.path.exists(destination_path+"text2text.docx"):
                dir_path = os.path.dirname(os.path.realpath(__file__))
                os.chdir(dir_path)
                os.system("DocumentTranslatorCmd setcredentials /reset:true")
                os.system("DocumentTranslatorCmd setcredentials /APIkey:37d9984a024b4b468de99b4c0d01a44e /Region:centralindia /Cloud:Global")
                os.system(("DocumentTranslatorCmd translatedocuments /documents:" +destination_path+"text2text.docx"+ f" /to:{','.join(to_languages)}"))

                # Delete & rename file after translation
                # os.remove(destination_path+"text2text.docx")
                # os.rename(destination_path+"text2text."+to_languages[0]+".docx", destination_path+"text2text.docx")

                # API URL for uploading the file
                url = f'https://graph.microsoft.com/v1.0/me/drive/items/{sub_folder_id}:/'+'text2text.'+to_languages[0]+'.docx'+':/content'

                headers = CaseInsensitiveDict()
                headers["Authorization"] = f"Bearer {access_token}"
                headers["Content-Type"] = "application/octet-stream"
            
                # Read the file content
                with open(destination_path+"text2text."+to_languages[0]+".docx", 'rb') as file:
                    file_content = file.read()

                # Make the PUT request to upload the file
                resp = requests.put(url, headers=headers, data=file_content)

                if resp.status_code == 201:
                    response_data = json.loads(resp.text)
            
                    url_public = f'https://graph.microsoft.com/v1.0/me/drive/items/{response_data["id"]}/createLink'

                    headers_public = CaseInsensitiveDict()
                    headers_public["Authorization"] = f"Bearer {access_token}"
                    headers_public["Content-Type"] = 'application/json'

                    payload = {
                        'type': 'edit',
                        'scope': 'anonymous'
                    }

                    response2 = requests.post(url_public, headers=headers_public, json=payload)

                    if response2.status_code == 201:
                        body = response2.json()
                        link = body['link']['webUrl']

                        try:
                            response2 = requests.get(link)
                            response2.raise_for_status()

                            soup = BeautifulSoup(response2.content, 'html.parser')
                            meta_refresh_tag = soup.find('noscript').find('meta', {'http-equiv': 'refresh'})
                            if meta_refresh_tag:
                                content = meta_refresh_tag.get('content')

                                split_parts = content.split('0;url=')
                                extracted_url = split_parts[1]

                                resultData = {
                                    "type": "success",
                                    "path": extracted_url
                                }
                                resultData_json = json.dumps(resultData)
                                print(resultData_json)

                        except requests.exceptions.RequestException as error:
                            print('An error occurred:', error)

                    else:
                        print(f"Error: {response2.status_code} - {response2.text}")

                else:
                        response_data = json.loads(resp.text)
                        print(f"Failed to upload file: {response_data}")

            else:
                resultData = {
                    "type": "error",
                    "msg": "File does not exist for translation."
                }
                resultData_json = json.dumps(resultData)
                print(resultData_json)


except IndexError:
    resultData = {
        "type": "error",
        "msg": "No argument provided."
    }
    resultData_json = json.dumps(resultData)
    print(resultData_json)
