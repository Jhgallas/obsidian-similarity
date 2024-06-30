import os
import sys
import pandas as pd
from sentence_transformers import SentenceTransformer

def find_md_files(directory):
    """ Generator to find all markdown files in the specified directory and subdirectories, ignoring '.obsidian' folder. """
    for root, dirs, files in os.walk(directory):
        # Skip any directories that contain '.obsidian'
        if '.obsidian' in root:
            continue
        for file in files:
            if file.endswith('.md'):
                yield os.path.join(root, file)

def generate_embeddings(model, file_path):
    """ Read the content of the file and generate embeddings. """
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    return model.encode(content)

def main():
    directory = sys.argv[1]  # Use the first command-line argument as the directory
    single_file = sys.argv[2] if len(sys.argv) > 2 else None  # Optionally, a second argument for a single file
    model = SentenceTransformer('thenlper/gte-base')

    if single_file:
        files = [single_file]  # Process only the specified single file
    else:
        files = find_md_files(directory)  # Process all Markdown files in the directory

    for md_file in files:
        # Remove the base directory path from the file path
        clean_path = os.path.relpath(md_file, directory)
        embeddings = generate_embeddings(model, md_file)
        df = pd.DataFrame([{'file': clean_path, 'embedding': embeddings.tolist()}])
        print(df.to_csv(index=False, header=False), flush=True)  # Print each file's DataFrame as a CSV string without headers

if __name__ == "__main__":
    main()