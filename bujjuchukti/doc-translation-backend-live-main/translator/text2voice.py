from gtts import gTTS
import os
import sys
import json
import uuid
import time

# 'Punjabi': 'pa',
# # 'Assamese': 'as',
# # 'Odia': 'or',

# indian_languages = {
#         'Bengali': 'bn',
#         'Gujarati': 'gu',
#         'Hindi': 'hi',
#         'Kannada': 'kn',
#         'Malayalam': 'ml',
#         'Marathi': 'mr',
#         'Punjabi': 'pa',
#         'Tamil': 'ta',
#         'Telugu': 'te',
#         # 'Assamese': 'as',
#         # 'Odia': 'or',
#         'Urdu': 'ur'
# }

def text_to_speech(text, dest_path, lang='en'):
    # Generate a random filename
    random_filename = str(uuid.uuid4()) + '.mp3'
    # Concatenate folder path with random filename
    file_path = os.path.join(dest_path, random_filename)

    tts = gTTS(text=text, lang=lang, slow=False)
    tts.save(file_path)

    return random_filename


if __name__ == "__main__":
    try:
        # Extract text and language from command-line arguments
        text = sys.argv[2]
        lang = sys.argv[4] if len(sys.argv) > 2 else 'en'

        # Get the current working directory
        current_directory = os.getcwd()
        # Specify the project folder name
        project_folder = 'uploads'
        # Construct the project path
        dest_path = os.path.join(current_directory, project_folder, "text2voice").replace('\\', '/')

        # Convert text to speech
        audio_file = text_to_speech(text, dest_path, lang)

        # Play the audio file
        # os.system(f"start {audio_file}")

        time.sleep(5)  
        resultData = {
                "audio_file": audio_file
            }
        resultData_json = json.dumps(resultData)
        print(resultData_json)

    except Exception as e:
        # If any exception occurs, return a JSON response with the error message
        error_response = {
            "error": str(e)
        }
        print(json.dumps(error_response))