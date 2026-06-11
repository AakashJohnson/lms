import argparse
import requests
import os
import json
import sys
from docxcompose.composer import Composer
from docx import Document as Document_compose
from requests.structures import CaseInsensitiveDict
from dotenv import load_dotenv
load_dotenv()

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


def get_folder_id(folder_path, access_token):
    try:
        url = f'https://graph.microsoft.com/v1.0/me/drive/root:/{folder_path}'

        headers = {
            'Authorization': f'Bearer {access_token}'
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()

        return data['id']

    except requests.exceptions.RequestException as e:
        print('Error retrieving folder ID:', e)


def combine_all_docx(filename_master,files_list, destination_path, merged_file_name):
    number_of_sections=len(files_list)
    master = Document_compose(filename_master)
    composer = Composer(master)
    for i in range(0, number_of_sections):
        doc_temp = Document_compose(files_list[i])
        composer.append(doc_temp)
    composer.save(destination_path+merged_file_name)

    # Iterate over the files in the folder
    for file_name in os.listdir(destination_path):
        file_path = os.path.join(destination_path, file_name)
        
        # Check if the file is not the one to keep
        if file_name != merged_file_name:
            # Delete the file
            os.remove(file_path)
            # print(f"Deleted file: {file_name}")

    resultData = {
        "type": "success",
        "msg": "File merged.",
        "path": destination_path+merged_file_name
    }

    resultData_json = json.dumps(resultData)
    print(resultData_json)



access_dir_path  = os.path.dirname(os.path.realpath(__file__))
access_file_path = access_dir_path.split('translator')
access_token_file_path = access_file_path[0]+'ACCESS_TOKEN.txt' 


my_parser = argparse.ArgumentParser()
my_parser.add_argument('--file_dir', action='append',  required=True)
my_parser.add_argument('--file_name', action='append',  required=True)

args = my_parser.parse_args()

folder_name = args.file_dir[0]
merged_file_name = args.file_name[0]

# folder_name = "1685441065702_59082818"
# merged_file_name = "file_navneet.docx"
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

    # Usage example
    folder_path = 'AicteDocuments/'+folder_name+'/'  
    folder_id = get_folder_id(folder_path, access_token)
    # # print('Folder ID:', folder_id)


    # # Usage example
    folder_id = folder_id
    files = get_files_in_folder(folder_id, access_token)


    files_list=[]
    for index,file in enumerate(files, start=0):
        dir_path  = os.path.dirname(os.path.realpath(__file__))
        split_dir = dir_path.split('translator')
        destination_path = split_dir[0]+"uploads"+"\\"+folder_name+"\\"+"merged\\"

        # Create the folder
        if not os.path.exists(destination_path):
            os.makedirs(destination_path)
        
        files_list.append(destination_path+"part_"+str(index)+".docx")
        download_file_from_onedrive(file, access_token, destination_path+"part_"+str(index)+".docx")
        

    # Merge the file
    filename_master = files_list[0]

    # Check if the length of the list is greater than 0
    if len(files_list) > 1:
        files_list.pop(0)

    combine_all_docx(filename_master, files_list, destination_path, merged_file_name)    

except IndexError:
    resultData = {
        "type": "error",
        "msg": "No argument provided."
    }
    resultData_json = json.dumps(resultData)
    print(resultData_json)


