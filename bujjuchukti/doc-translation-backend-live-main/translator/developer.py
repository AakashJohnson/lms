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


# 'bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa',
import os
# languages = [ 'ta', 'te', 'as', 'or', 'ur','brx']
languages = ['hi']
dir_path = os.path.dirname(os.path.realpath(__file__))
os.chdir(dir_path)
os.system("DocumentTranslatorCmd setcredentials /reset:true")
os.system("DocumentTranslatorCmd setcredentials /APIkey:45142e265a704932a3ac2a3ecd05996a /Region:centralindia /Cloud:Global")
os.system(("DocumentTranslatorCmd translatedocuments /documents:" +"E:/Work/output.docx"+ f" /to:{','.join(languages)}"))


