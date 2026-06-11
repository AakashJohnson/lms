import argparse
import requests
import os
import json
import sys
import docx
import pymongo
from docxcompose.composer import Composer
from docx import Document as Document_compose
from requests.structures import CaseInsensitiveDict
from dotenv import load_dotenv
load_dotenv()

sys.stdin.reconfigure(encoding='utf-8') # type: ignore
sys.stdout.reconfigure(encoding='utf-8') # type: ignore

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
def get_files_in_folder(folder_id, access_token, file_name):
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
                if item['name']==file_name:
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


# Function to upload the modified content to a docx file on OneDrive
def upload_modified_content(access_token, item_id, modified_content):
    # Endpoint URL to update the content of a file
    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}/content"

    # Set the Authorization header with the access token
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/octet-stream",
    }

    # Send a PUT request to update the file content
    response = requests.put(url, headers=headers, data=modified_content)

    if response.status_code == 200:
        return "200"
    else:
        return response.status_code
    



access_dir_path  = os.path.dirname(os.path.realpath(__file__))
access_file_path = access_dir_path.split('translator')
access_token_file_path = access_file_path[0]+'ACCESS_TOKEN.txt' 


my_parser = argparse.ArgumentParser()
my_parser.add_argument('--file_dir', action='append',  required=True)
my_parser.add_argument('--file_name', action='append',  required=True)
my_parser.add_argument('--language', action='append',  required=True)
my_parser.add_argument('--category', action='append',  required=True)

args = my_parser.parse_args()

folder_name = args.file_dir[0]
file_name   = args.file_name[0]
language    = args.language[0]
category    = args.category[0]

part_name  = file_name.split('.') 
part_array = part_name[0].split('_') 

# DB connection
client = pymongo.MongoClient("mongodb://localhost:27017/")
db     = client.get_database(os.getenv("DATABASE_NAME"))
collection = db.get_collection("custom_dictionary")
doc_collection = db.get_collection("doc_lists")

query = {
        "category": category
}

# Count the number of documents returned by the query
num_records = collection.count_documents(query)

doc_query = {
        "folder_name": folder_name,
        "part_number": part_array[1]
}

# Count the number of documents returned by the query
doc_num_records = doc_collection.count_documents(doc_query)

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
    # print('Folder ID:', folder_id)


    # # Usage example
    folder_id = folder_id
    files = get_files_in_folder(folder_id, access_token, file_name)

    files_list=[]
    for index,file in enumerate(files, start=0): # type: ignore
        dir_path  = os.path.dirname(os.path.realpath(__file__))
        split_dir = dir_path.split('translator')
        file_name_array = file_name.split('.')
        destination_path = split_dir[0]+"uploads"+"\\"+folder_name+"\\"+file_name_array[0]+"\\"

        # Create the folder
        if not os.path.exists(destination_path):
            os.makedirs(destination_path)
        
        files_list.append(destination_path+file_name)
        download_file_from_onedrive(file, access_token, destination_path+file_name)
        
        # Read docx file
        doc = docx.Document(destination_path+file_name)

        if num_records > 0 and doc_num_records > 0 :
           
            # DB find query
            data = collection.find(query)
            doc_data = doc_collection.find(doc_query)

            for document in data:
                # document_str = str(document).encode("utf-8", errors='replace').decode("utf-8")
                azure_word      = document.get(language+'_azure', '').strip().lower()
                dictionary_word = document.get(language+'_dictionary', '').strip().lower()
                                                         
                if azure_word != dictionary_word:
                    for paragraph in doc.paragraphs:
                        if azure_word in paragraph.text:

                            filter = {'_id': doc_data[0]['_id']}

                            update_doc = {'$set': {
                                "dictionary_category": category
                            }}  # Specify the fields and their new values

                            # Execute the update query
                            doc_result = doc_collection.update_one(filter, update_doc)

                            # Old Method
                            myarray = paragraph.text.split()
                            for i, value in enumerate(myarray):  
                                if value == azure_word and len(value) == len(azure_word):
                                    myarray[i] = dictionary_word
                                    # print(value+" >> "+azure_word+" >> "+dictionary_word)

                            paragraph.text = ' '.join(myarray)

                            # New Method
                            # updated_paragraph = paragraph.text.replace(azure_word, dictionary_word)
                            # paragraph.text = ' '.join(updated_paragraph)
                    
                    
            doc.save(destination_path+file_name)

        # Read the file content
        with open(destination_path+file_name, 'rb') as f:
            onedrive_file_content = f.read()
            
        # update latest doc on one drive
        result = upload_modified_content(access_token, file, onedrive_file_content)
       
        if result == "200":
            resultData = {
                "type": "success",
                "msg": "Custom Dictionary Applied"
            }
            resultData_json = json.dumps(resultData)
            print(resultData_json)
        else:
            resultData = {
                "type": "error",
                "msg": "Error Occured"
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


