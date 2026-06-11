import os
# 'bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa', 'as', 'or','ur', 'ta', 'te'
languages = ['hi']
dir_path = os.path.dirname(os.path.realpath(__file__))
os.chdir(dir_path)
os.system("DocumentTranslatorCmd setcredentials /reset:true")
os.system("DocumentTranslatorCmd setcredentials /APIkey:37d9984a024b4b468de99b4c0d01a44e /Region:centralindia /Cloud:Global")
os.system(("DocumentTranslatorCmd translatedocuments /documents:" +"C:/Users/aicte/Work/translation-independent-server-master/translator/test_PDF.pdf"+ f" /from:en /to:{','.join(languages)}"))
