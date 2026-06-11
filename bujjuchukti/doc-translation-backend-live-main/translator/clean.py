import os
import argparse
import os


from bs4 import BeautifulSoup
from win32com.client import constants
import win32com.client as win32

import argparse

my_parser = argparse.ArgumentParser()
my_parser.add_argument('--input_dir', action='store', type=str, required=True)
my_parser.add_argument('--folder', action='store', type=str, required=True)

args = my_parser.parse_args()
external_path, folder_path = args.input_dir, args.folder
# external_path = r"C:\Users\Aniket\Documents\var"
# folder_path = r"var_translated_1626075785"


def clean_html(folder_path, filename, updated_folder_name):
    filepath = os.path.join(folder_path, filename)
    complete_url = f'/{updated_folder_name}/'
    print(filepath)
    try:
        with open(filepath, 'r') as f:
            html_file = f.read()

        soup = BeautifulSoup(html_file, features='html.parser')

        for img in soup.findAll('img'):
            img['src'] = complete_url + img['src']

        with open(filepath, 'wb') as f:
            f.write(soup.encode('cp1252'))

    except Exception as e:
        # print(e.with_traceback())
        print(filepath, e)


complete_path = external_path
for file in os.listdir(complete_path):
    if(file.endswith(".html")):
        clean_html(complete_path, file, folder_path)
