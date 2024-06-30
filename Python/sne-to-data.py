import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import json
import sys
import io  # Import io to handle encoding

def load_data(filename):
    """ Loads embeddings and filenames from a CSV file without headers. """
    df = pd.read_csv(filename, header=None, names=['file', 'embedding'])
    embeddings = list(df['embedding'].apply(eval))  # Convert string representations back to lists
    filenames = df['file'].tolist()
    return np.array(embeddings), filenames

def apply_pca(X, n_components=2):
    """ Applies PCA to reduce dimensions. """
    pca = PCA(n_components=n_components)
    return pca.fit_transform(X)

def apply_tsne(X, n_components, perplexity, learning_rate):
    """ Applies t-SNE to reduce dimensions. """
    tsne = TSNE(n_components=n_components, perplexity=perplexity, learning_rate=learning_rate)
    return tsne.fit_transform(X)

def main(csv_path):
    embeddings, filenames = load_data(csv_path)
    
    # Apply t-SNE
    X_tsne = apply_tsne(embeddings, n_components=2, perplexity=10, learning_rate=200)

    # Create DataFrame for plotting
    df = pd.DataFrame(X_tsne, columns=['Dimension 1', 'Dimension 2'])
    df['filename'] = filenames

    # Multiply positions by 100
    df['Dimension 1'] *= 100
    df['Dimension 2'] *= 100

    # Prepare JSON data
    df_to_save = df[['filename', 'Dimension 1', 'Dimension 2']].copy()
    df_to_save.rename(columns={'filename': 'id', 'Dimension 1': 'x', 'Dimension 2': 'y'}, inplace=True)
    json_data = {"nodePositions": df_to_save.to_dict(orient='records')}
    
    # Output JSON data to stdout with UTF-8 encoding
    with io.open(sys.stdout.fileno(), 'w', encoding='utf8', closefd=False) as stdout:
        stdout.write(json.dumps(json_data, ensure_ascii=False, indent=4))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sne-to-data.py <path_to_embeddings.csv>")
        sys.exit(1)
    csv_path = sys.argv[1]
    main(csv_path)