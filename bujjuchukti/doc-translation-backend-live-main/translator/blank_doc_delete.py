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
import shutil
from dotenv import load_dotenv
load_dotenv()

access_dir_path = os.path.dirname(os.path.realpath(__file__))

my_parser = argparse.ArgumentParser()
my_parser.add_argument('--sub_folder_id', action='append',  required=True)
my_parser.add_argument('--sub_folder_name', action='append',  required=True)

args = my_parser.parse_args()
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

    # Replace with the file ID or path of the file to delete
    file_id = sub_folder_id
   
    # Construct the request URL
    url = f'https://graph.microsoft.com/v1.0/me/drive/items/{file_id}'

    headers = CaseInsensitiveDict()
    headers["Authorization"] = f"Bearer {access_token}"

    # Make the DELETE request to delete the file
    response = requests.delete(url, headers=headers)

    # Check the response status
    if response.status_code == 204: 
        dir_path  = os.path.dirname(os.path.realpath(__file__))
        split_dir = dir_path.split('translator')
        destination_path = split_dir[0]+"uploads"+"\\text2text\\"+sub_folder_name
        shutil.rmtree(destination_path)
        resultData = {
                "type": "success",
                "msg": 'File deleted successfully.'
        }
        resultData_json = json.dumps(resultData)
        print(resultData_json)
        
    else:
        resultData = {
            "type": "error",
            "msg": "Failed to delete the file"
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
