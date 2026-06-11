import requests
import json

def translate_sentence(sentence, target_languages, api_key):
    translations = {}

    for lang in target_languages:
        endpoint = f'https://api.cognitive.microsofttranslator.com/translate'
        params = {
            'api-version': '3.0',
            'to': lang
        }
        headers = {
            'Ocp-Apim-Subscription-Key': api_key,
             'Ocp-Apim-Subscription-Region': serviceRegion,
            'Content-Type': 'application/json'
        }
        body = [{
            'text': sentence
        }]
        
        response = requests.post(endpoint, params=params, headers=headers, json=body)
        
        # Updated handling of the response
        if response.status_code == 200:
            translation = response.json()[0]['translations'][0]['text']
            translations[lang] = translation
        else:
            print(f"Translation failed for {lang}. Status code: {response.status_code}")

    return translations

if __name__ == "__main__":
    input_sentence = "Hello, how are you?"
    target_languages = ["en-IN","hi-IN","te-IN","ta-IN","kn-IN","ml-IN","mr-IN","gu-IN","bn-IN","ur-IN",
                        "ru-RU" ,"es-ES" ,"zh-TW" ,"fr-BE" ,"ar-AE" ,"pt-PT" ,"de-AT" ,"ja-JP" ,"ko-KR" ,"it-IT" ,"tr-TR" ,"ms-MY" ]  # Add more languages as needed
    azure_api_key = "7f2623d635f944d7969e462d54f8c5cc"
    serviceRegion = "centralindia"
    translations = translate_sentence(input_sentence, target_languages, azure_api_key)

    # Define the file path where you want to export the JSON
    json_file_path = "translations.json"

    # Create a JSON file and write the translations to it
    with open(json_file_path, "w", encoding="utf-8") as json_file:
        json.dump(translations, json_file, ensure_ascii=False, indent=2)

    print(f"Translations exported to {json_file_path}")
