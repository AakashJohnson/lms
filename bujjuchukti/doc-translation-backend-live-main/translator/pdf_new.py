import os

# 

languages = ['bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa', 'ta', 'te', 'as', 'or','ur', 'hi']

dir_path = os.path.dirname(os.path.realpath(__file__))

os.chdir(dir_path)

os.system("DocumentTranslatorCmd setcredentials /reset:true")

os.system("DocumentTranslatorCmd setcredentials /APIkey:7f2623d635f944d7969e462d54f8c5cc /Region:centralindia /Cloud:Global")

os.system(("DocumentTranslatorCmd translatedocuments /documents:" +"D:/projects/doc-translation-backend-live/translator/CSK_authored_BookPhysiology20072021.pdf"+ f" /from:en /to:{','.join(languages)}"))