import os
import subprocess
import shutil
import concurrent.futures

def replace_spaces_with_underscore(file_path):
    file_name = os.path.basename(file_path)
    new_file_name = file_name.replace(' ', '_')
    new_file_path = os.path.join(os.path.dirname(file_path), new_file_name)
    os.rename(file_path, new_file_path)
    return new_file_path


def main(directory):
    # Get a list of all files in the directory
    file_list = [f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))]
    
    for file_name in file_list:
        file_path = os.path.join(directory, file_name)
        
        if ' ' in file_name:
            new_file_path = replace_spaces_with_underscore(file_path)
            print(f"Renamed: {file_path} -> {new_file_path}")
        else:
            print(f"No spaces in filename: {file_name}")


def translate(source_files_list, source_files, languages, source_folder, destination_folder):
    command = [
        "DocumentTranslatorCmd",
        "translatedocuments",
        f"/documents:{','.join(source_files_list)}",
        f"/to:{','.join(languages)}"
    ]
    try:
        subprocess.run(command, check=True)
        print(f"Translation completed successfully.")

        # List all files in the directory
        all_files = os.listdir(source_folder)

        # Filter out files that are present in the ignore list
        filtered_files = [file for file in all_files if file not in source_files]

        for file in filtered_files:
            parts = file.split('.')
            os.makedirs(destination_folder+"/"+parts[0], exist_ok=True)
            source_file      = os.path.join(source_folder, file)
            destination_file = os.path.join(destination_folder+"/"+parts[0], file)
            shutil.move(source_file, destination_file)
            print(f"Moved {file} to {destination_folder+'/'+parts[0]} folder.")
           
    except subprocess.CalledProcessError as e:
        print(f"Translation to {languages} failed for {source_files_list}:", e)


if __name__ == "__main__":

    languages = ['bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa', 'ta', 'te', 'as', 'or', 'ur']
    source_folder = "D:/projects/doc-translation-backend-live/source"
    destination_folder = "D:/projects/doc-translation-backend-live/destination"
    main(source_folder)

    # Get a list of files in the source folder
    file_list = os.listdir(source_folder)

    # Create an empty list
    source_files_list = []
    source_files = []
    for file_name in file_list:
        source_path = source_folder+"/"+file_name
        source_files_list.append(source_path)
        source_files.append(file_name)
     
    # set python script path
    source_file_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'translator')
    os.chdir(source_file_path)

    # Create a ThreadPoolExecutor with the desired number of threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        executor.submit(translate, source_files_list,source_files, languages, source_folder, destination_folder)



        
