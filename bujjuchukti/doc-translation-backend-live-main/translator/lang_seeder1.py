import requests
import uuid
import pymongo
# result = ["Hello India", "paragraph", "Game Changer", " Money bank", "Outside", "negative", "contains", "some text"]

client = pymongo.MongoClient("mongodb://localhost:27017/")
db     = client.get_database("doc_translation")
collection = db.get_collection("custom_dictionary")


# for k in result:
#     key = "7f2623d635f944d7969e462d54f8c5cc"
#     endpoint = "https://api.cognitive.microsofttranslator.com"

#     location = "centralindia"

#     path = '/translate'
#     constructed_url = endpoint + path

#     params = {
#         'api-version': '3.0',
#         'from': 'en',
#         'to': ['bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa', 'ta', 'te']
#     }

#     headers = {
#         'Ocp-Apim-Subscription-Key': key,
#         'Ocp-Apim-Subscription-Region': location,
#         'Content-type': 'application/json',
#         'X-ClientTraceId': str(uuid.uuid4())
#     }

#     body = [{
#         'text': k
#     }]

#     request = requests.post(constructed_url, params=params, headers=headers, json=body)
#     response = request.json()

#     for word in response:
#         record = {
#             "category": "Engineering", 
#             "word": k, 
#         }
#         for single_record in word["translations"]:
#             record[single_record["to"]+"_azure"] = single_record['text']
#             record[single_record["to"]+"_dictionary"] = ''.join(reversed(single_record['text']))
          


#     result = collection.insert_one(record)
#     print(result)

# ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import os
# languages = ['bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa', 'ta', 'te','as','or','ur']
languages = [ 'ml', 'mr', 'as']
dir_path = os.path.dirname(os.path.realpath(__file__))
os.chdir(dir_path)
os.system("DocumentTranslatorCmd setcredentials /reset:true")
os.system("DocumentTranslatorCmd setcredentials /APIkey:7f2623d635f944d7969e462d54f8c5cc /Region:centralindia /Cloud:Global")
os.system(("DocumentTranslatorCmd translatedocuments /documents:" +"C:/projects/baljeet_sir1/CSKarigarSRao_mIcrobiology20230620.docx"+ f" /from:en /to:{','.join(languages)}"))

# ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

# import pandas as pd

# # Read Excel file
# excel_file = "C:\\Users\\admin\\Downloads\\sample_db.xlsx"
# df = pd.read_excel(excel_file)

# # Insert data into the database
# for index, row in df.iterrows():

#     query_filter = {
#         'word': row['word'],
#         'category': row['category']
#     }

#     count = collection.count_documents(query_filter)

#     if count == 0:
#         record = {
#             "word": row['word'] if pd.notnull(row['word']) else '',
#             "category": row['category'] if pd.notnull(row['category']) else '',
#             "as_azure": row['as_azure'] if pd.notnull(row['as_azure']) else '',
#             "as_dictionary": row['as_dictionary'] if pd.notnull(row['as_dictionary']) else '',
#             "bn_azure": row['bn_azure'] if pd.notnull(row['bn_azure']) else '',
#             "bn_dictionary": row['bn_dictionary'] if pd.notnull(row['bn_dictionary']) else '',
#             "en_azure": row['en_azure'] if pd.notnull(row['en_azure']) else '',
#             "en_dictionary": row['en_dictionary'] if pd.notnull(row['en_dictionary']) else '',
#             "gu_azure": row['gu_azure'] if pd.notnull(row['gu_azure']) else '', 
#             "gu_dictionary": row['gu_dictionary'] if pd.notnull(row['gu_dictionary']) else '',
#             "hi_azure": row['hi_azure'] if pd.notnull(row['hi_azure']) else '',
#             "hi_dictionary": row['hi_dictionary'] if pd.notnull(row['hi_dictionary']) else '',
#             "kn_azure": row['kn_azure'] if pd.notnull(row['kn_azure']) else '',
#             "kn_dictionary": row['kn_dictionary'] if pd.notnull(row['kn_dictionary']) else '',
#             "ml_azure": row['ml_azure'] if pd.notnull(row['ml_azure']) else '',
#             "ml_dictionary": row['ml_dictionary'] if pd.notnull(row['ml_dictionary']) else '',
#             "mr_azure": row['mr_azure'] if pd.notnull(row['mr_azure']) else '', 
#             "mr_dictionary": row['mr_dictionary'] if pd.notnull(row['mr_dictionary']) else '',
#             "or_azure": row['or_azure'] if pd.notnull(row['or_azure']) else '',
#             "or_dictionary": row['or_dictionary'] if pd.notnull(row['or_dictionary']) else '',
#             "pa_azure": row['pa_azure'] if pd.notnull(row['pa_azure']) else '',
#             "pa_dictionary": row['pa_dictionary'] if pd.notnull(row['pa_dictionary']) else '',
#             "ta_azure": row['ta_azure'] if pd.notnull(row['ta_azure']) else '',
#             "ta_dictionary": row['ta_dictionary'] if pd.notnull(row['ta_dictionary']) else '',
#             "te_azure": row['te_azure'] if pd.notnull(row['te_azure']) else '',
#             "te_dictionary": row['te_dictionary'] if pd.notnull(row['te_dictionary']) else '',
#             "ur_azure": row['ur_azure'] if pd.notnull(row['ur_azure']) else '',
#             "ur_dictionary": row['ur_dictionary'] if pd.notnull(row['ur_dictionary']) else '',
#             "ar_azure": row['ar_azure'] if pd.notnull(row['ar_azure']) else '',
#             "ar_dictionary": row['ar_dictionary'] if pd.notnull(row['ar_dictionary']) else '',
#             "zh_azure": row['zh_azure'] if pd.notnull(row['zh_azure']) else '',
#             "zh_dictionary": row['zh_dictionary'] if pd.notnull(row['zh_dictionary']) else '',
#             "fr_azure": row['fr_azure'] if pd.notnull(row['fr_azure']) else '',
#             "fr_dictionary": row['fr_dictionary'] if pd.notnull(row['fr_dictionary']) else '',
#             "de_azure": row['de_azure'] if pd.notnull(row['de_azure']) else '',
#             "de_dictionary": row['de_dictionary'] if pd.notnull(row['de_dictionary']) else '',
#             "it_azure": row['it_azure'] if pd.notnull(row['it_azure']) else '',
#             "it_dictionary": row['it_dictionary'] if pd.notnull(row['it_dictionary']) else '',
#             "ja_azure": row['ja_azure'] if pd.notnull(row['ja_azure']) else '',
#             "ja_dictionary": row['ja_dictionary'] if pd.notnull(row['ja_dictionary']) else '',
#             "ko_azure": row['ko_azure'] if pd.notnull(row['ko_azure']) else '',
#             "ko_dictionary": row['ko_dictionary'] if pd.notnull(row['ko_dictionary']) else '',
#             "ms_azure": row['ms_azure'] if pd.notnull(row['ms_azure']) else '',
#             "ms_dictionary": row['ms_dictionary'] if pd.notnull(row['ms_dictionary']) else '',
#             "fa_azure": row['fa_azure'] if pd.notnull(row['fa_azure']) else '',
#             "fa_dictionary": row['fa_dictionary'] if pd.notnull(row['fa_dictionary']) else '',
#             "pt_azure": row['pt_azure'] if pd.notnull(row['pt_azure']) else '',
#             "pt_dictionary": row['pt_dictionary'] if pd.notnull(row['pt_dictionary']) else '',
#             "ru_azure": row['ru_azure'] if pd.notnull(row['ru_azure']) else '',
#             "ru_dictionary": row['ru_dictionary'] if pd.notnull(row['ru_dictionary']) else '',
#             "es_azure": row['es_azure'] if pd.notnull(row['es_azure']) else '',
#             "es_dictionary": row['es_dictionary'] if pd.notnull(row['es_dictionary']) else '',
#             "tr_azure": row['tr_azure'] if pd.notnull(row['tr_azure']) else '',
#             "tr_dictionary": row['tr_dictionary'] if pd.notnull(row['tr_dictionary']) else '',
#             "vi_azure": row['vi_azure'] if pd.notnull(row['vi_azure']) else '',
#             "vi_dictionary": row['vi_dictionary'] if pd.notnull(row['vi_dictionary']) else '',
#             "th_azure": row['th_azure'] if pd.notnull(row['th_azure']) else '',
#             "th_dictionary": row['th_dictionary'] if pd.notnull(row['th_dictionary']) else '',
#             "he_azure": row['he_azure'] if pd.notnull(row['he_azure']) else '',
#             "he_dictionary": row['he_dictionary'] if pd.notnull(row['he_dictionary']) else '',
#             "sv_azure": row['sv_azure'] if pd.notnull(row['sv_azure']) else '',
#             "sv_dictionary": row['sv_dictionary'] if pd.notnull(row['sv_dictionary']) else '',
#             "nl_azure": row['nl_azure'] if pd.notnull(row['nl_azure']) else '',
#             "nl_dictionary": row['nl_dictionary'] if pd.notnull(row['nl_dictionary']) else '',
#             "ne_azure": row['ne_azure'] if pd.notnull(row['ne_azure']) else '',
#             "ne_dictionary": row['ne_dictionary'] if pd.notnull(row['ne_dictionary']) else ''
#         }
#         result = collection.insert_one(record)
#         # Check if insertion was successful
#         if result.inserted_id:
#             print("Document inserted successfully. ID:", result.inserted_id)
#         else:
#             print("Failed to insert document.")
#     else:
#         record = collection.find(query_filter)

#         # Define the filter for the document to update
#         filter = {'_id': record[0]['_id']}  # Assuming '_id' is the unique identifier of the document

#         # Define the update operation
#         update = {'$set': {
#             "as_azure": row['as_azure'] if pd.notnull(row['as_azure']) else '',
#             "as_dictionary": row['as_dictionary'] if pd.notnull(row['as_dictionary']) else '',
#             "bn_azure": row['bn_azure'] if pd.notnull(row['bn_azure']) else '',
#             "bn_dictionary": row['bn_dictionary'] if pd.notnull(row['bn_dictionary']) else '',
#             "en_azure": row['en_azure'] if pd.notnull(row['en_azure']) else '',
#             "en_dictionary": row['en_dictionary'] if pd.notnull(row['en_dictionary']) else '',
#             "gu_azure": row['gu_azure'] if pd.notnull(row['gu_azure']) else '', 
#             "gu_dictionary": row['gu_dictionary'] if pd.notnull(row['gu_dictionary']) else '',
#             "hi_azure": row['hi_azure'] if pd.notnull(row['hi_azure']) else '',
#             "hi_dictionary": row['hi_dictionary'] if pd.notnull(row['hi_dictionary']) else '',
#             "kn_azure": row['kn_azure'] if pd.notnull(row['kn_azure']) else '',
#             "kn_dictionary": row['kn_dictionary'] if pd.notnull(row['kn_dictionary']) else '',
#             "ml_azure": row['ml_azure'] if pd.notnull(row['ml_azure']) else '',
#             "ml_dictionary": row['ml_dictionary'] if pd.notnull(row['ml_dictionary']) else '',
#             "mr_azure": row['mr_azure'] if pd.notnull(row['mr_azure']) else '', 
#             "mr_dictionary": row['mr_dictionary'] if pd.notnull(row['mr_dictionary']) else '',
#             "or_azure": row['or_azure'] if pd.notnull(row['or_azure']) else '',
#             "or_dictionary": row['or_dictionary'] if pd.notnull(row['or_dictionary']) else '',
#             "pa_azure": row['pa_azure'] if pd.notnull(row['pa_azure']) else '',
#             "pa_dictionary": row['pa_dictionary'] if pd.notnull(row['pa_dictionary']) else '',
#             "ta_azure": row['ta_azure'] if pd.notnull(row['ta_azure']) else '',
#             "ta_dictionary": row['ta_dictionary'] if pd.notnull(row['ta_dictionary']) else '',
#             "te_azure": row['te_azure'] if pd.notnull(row['te_azure']) else '',
#             "te_dictionary": row['te_dictionary'] if pd.notnull(row['te_dictionary']) else '',
#             "ur_azure": row['ur_azure'] if pd.notnull(row['ur_azure']) else '',
#             "ur_dictionary": row['ur_dictionary'] if pd.notnull(row['ur_dictionary']) else '',
#             "ar_azure": row['ar_azure'] if pd.notnull(row['ar_azure']) else '',
#             "ar_dictionary": row['ar_dictionary'] if pd.notnull(row['ar_dictionary']) else '',
#             "zh_azure": row['zh_azure'] if pd.notnull(row['zh_azure']) else '',
#             "zh_dictionary": row['zh_dictionary'] if pd.notnull(row['zh_dictionary']) else '',
#             "fr_azure": row['fr_azure'] if pd.notnull(row['fr_azure']) else '',
#             "fr_dictionary": row['fr_dictionary'] if pd.notnull(row['fr_dictionary']) else '',
#             "de_azure": row['de_azure'] if pd.notnull(row['de_azure']) else '',
#             "de_dictionary": row['de_dictionary'] if pd.notnull(row['de_dictionary']) else '',
#             "it_azure": row['it_azure'] if pd.notnull(row['it_azure']) else '',
#             "it_dictionary": row['it_dictionary'] if pd.notnull(row['it_dictionary']) else '',
#             "ja_azure": row['ja_azure'] if pd.notnull(row['ja_azure']) else '',
#             "ja_dictionary": row['ja_dictionary'] if pd.notnull(row['ja_dictionary']) else '',
#             "ko_azure": row['ko_azure'] if pd.notnull(row['ko_azure']) else '',
#             "ko_dictionary": row['ko_dictionary'] if pd.notnull(row['ko_dictionary']) else '',
#             "ms_azure": row['ms_azure'] if pd.notnull(row['ms_azure']) else '',
#             "ms_dictionary": row['ms_dictionary'] if pd.notnull(row['ms_dictionary']) else '',
#             "fa_azure": row['fa_azure'] if pd.notnull(row['fa_azure']) else '',
#             "fa_dictionary": row['fa_dictionary'] if pd.notnull(row['fa_dictionary']) else '',
#             "pt_azure": row['pt_azure'] if pd.notnull(row['pt_azure']) else '',
#             "pt_dictionary": row['pt_dictionary'] if pd.notnull(row['pt_dictionary']) else '',
#             "ru_azure": row['ru_azure'] if pd.notnull(row['ru_azure']) else '',
#             "ru_dictionary": row['ru_dictionary'] if pd.notnull(row['ru_dictionary']) else '',
#             "es_azure": row['es_azure'] if pd.notnull(row['es_azure']) else '',
#             "es_dictionary": row['es_dictionary'] if pd.notnull(row['es_dictionary']) else '',
#             "tr_azure": row['tr_azure'] if pd.notnull(row['tr_azure']) else '',
#             "tr_dictionary": row['tr_dictionary'] if pd.notnull(row['tr_dictionary']) else '',
#             "vi_azure": row['vi_azure'] if pd.notnull(row['vi_azure']) else '',
#             "vi_dictionary": row['vi_dictionary'] if pd.notnull(row['vi_dictionary']) else '',
#             "th_azure": row['th_azure'] if pd.notnull(row['th_azure']) else '',
#             "th_dictionary": row['th_dictionary'] if pd.notnull(row['th_dictionary']) else '',
#             "he_azure": row['he_azure'] if pd.notnull(row['he_azure']) else '',
#             "he_dictionary": row['he_dictionary'] if pd.notnull(row['he_dictionary']) else '',
#             "sv_azure": row['sv_azure'] if pd.notnull(row['sv_azure']) else '',
#             "sv_dictionary": row['sv_dictionary'] if pd.notnull(row['sv_dictionary']) else '',
#             "nl_azure": row['nl_azure'] if pd.notnull(row['nl_azure']) else '',
#             "nl_dictionary": row['nl_dictionary'] if pd.notnull(row['nl_dictionary']) else '',
#             "ne_azure": row['ne_azure'] if pd.notnull(row['ne_azure']) else '',
#             "ne_dictionary": row['ne_dictionary'] if pd.notnull(row['ne_dictionary']) else ''
#         }}  # Specify the fields and their new values

#         # Execute the update query
#         result = collection.update_one(filter, update)

#         # Check if the update was successful
#         if result.modified_count > 0:
#             print("Update successful.")
#         else:
#             print("No documents were modified.")
    
   





   

