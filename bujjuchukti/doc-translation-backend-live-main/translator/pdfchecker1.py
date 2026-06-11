import os
# 
languages = ['te', 'bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa', 'as', 'or','ur', 'ta']
dir_path = os.path.dirname(os.path.realpath(__file__))
os.chdir(dir_path)
os.system("DocumentTranslatorCmd setcredentials /reset:true")
os.system("DocumentTranslatorCmd setcredentials /APIkey:37d9984a024b4b468de99b4c0d01a44e /Region:centralindia /Cloud:Global")
os.system(("DocumentTranslatorCmd translatedocuments /documents:" +"C:/Users/aicte/Work/translation-independent-server-master/translator/1234.pdf"+ f" /from:hi /to:{','.join(languages)}"))
