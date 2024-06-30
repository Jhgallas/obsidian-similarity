import subprocess
import sys
import os

def create_virtual_env():
    base_path = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(base_path, "obsidiansimilarity")
    if not os.path.exists(env_path):
        print("Creating virtual environment...")
        subprocess.check_call([sys.executable, "-m", "venv", env_path])
        print("Virtual environment created.")
    
    python_executable = os.path.join(env_path, 'bin', 'python') if os.name != 'nt' else os.path.join(env_path, 'Scripts', 'python.exe')
    if not os.path.exists(python_executable):
        print("Failed to create a virtual environment.")
        sys.exit(1)
    
    return python_executable

def install(package, python_executable):
    try:
        subprocess.run([python_executable, "-m", "pip", "install", package], check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        print(f"Installed or updated package: {package}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to install {package}: {e.stdout}")
        sys.exit(1)

def main(requirements_path):
    python_executable = create_virtual_env()
    with open(requirements_path, 'r') as f:
        for line in f:
            package = line.strip()
            if package:
                install(package, python_executable)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: check_requirements.py <path_to_requirements_file>")
        sys.exit(1)
    requirements_path = sys.argv[1]
    main(requirements_path)