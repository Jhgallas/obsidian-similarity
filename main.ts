import { App, Plugin, PluginSettingTab, Setting, FileSystemAdapter, Notice, TFile } from 'obsidian';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';

interface NodePosition {
    id: string;
    x: number;
    y: number;
}

interface MyPluginSettings {
    nodePositions: NodePosition[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    nodePositions: [],
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    pythonCommand: string;
    ongoingBuffer: Set<string> = new Set();
    reloadBuffer: Set<string> = new Set();
    ongoingTimeouts: Map<string, NodeJS.Timeout> = new Map();

    async onload() {
        this.setPythonCommand();
        await this.loadSettings();
        this.addCommands();
        await this.checkPythonRequirements();
        await this.runTokenizerScriptOnLoad();

        // Listen for file modifications
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file instanceof TFile) {
                    console.log(`File modified: ${file.path}`);
                    this.addToOngoingBuffer(file.path);
                    this.addToReloadBuffer(file.path);
                }
            })
        );

        // Listen for file renames and moves
        this.registerEvent(
            this.app.vault.on('rename', (file, oldPath) => {
                if (file instanceof TFile) {
                    console.log(`File moved or renamed from ${oldPath} to ${file.path}`);
                    this.addToOngoingBuffer(file.path);
                    this.addToReloadBuffer(file.path);
                }
            })
        );
    }

    addToOngoingBuffer(filePath: string) {
        if (!this.ongoingBuffer.has(filePath)) {
            this.ongoingBuffer.add(filePath);
            const timeout = setTimeout(() => {
                this.updateSingleFile(filePath);
                this.ongoingBuffer.delete(filePath);
                this.ongoingTimeouts.delete(filePath);
            }, 10000);  // 10 seconds delay
            this.ongoingTimeouts.set(filePath, timeout);
        }
    }

    addToReloadBuffer(filePath: string) {
        if (!this.reloadBuffer.has(filePath)) {
            this.reloadBuffer.add(filePath);
        }
    }

    async runTokenizerScriptOnLoad() {
        const adapter = this.app.vault.adapter;
        let basePath = '';
        if (adapter instanceof FileSystemAdapter) {
            basePath = adapter.getBasePath();
        }

        const envPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'Python', 'obsidiansimilarity');
        const flagPath = path.join(envPath, 'setup_complete.flag');

        try {
            await fs.access(flagPath);
            await this.runTokenizerScript();  // Run tokenizer script if setup is complete
        } catch (error) {
            console.error("Tokenizer script cannot run: Environment setup is not complete.");
            new Notice("Tokenizer script cannot run: Please ensure all packages are installed.");
        }
    }

	setPythonCommand() {
        // Determine the Python command based on the platform
        this.pythonCommand = navigator.platform.startsWith('Win') ? 'python' : 'python3';
        console.log("Using Python command:", this.pythonCommand);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

	async checkPythonRequirements() {
		const adapter = this.app.vault.adapter;
		let basePath = '';
		if (adapter instanceof FileSystemAdapter) {
			basePath = adapter.getBasePath();
		}
	
		const envPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'Python', 'obsidiansimilarity');
		const requirementsPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'Python', 'requirements.txt');
		const flagPath = path.join(envPath, 'setup_complete.flag');
	
		// Check if the setup complete flag exists
		try {
			await fs.access(flagPath);
			console.log("Environment setup is already complete.");
			return;
		} catch (error) {
			console.log("Environment setup is not complete. Starting setup...");
		}

		// Creating a notice with a duration of 10 minutes (600000 milliseconds)
		const notice = new Notice("Setting up Python environment for Obsidian Similarity Toolkit. Please wait...", 600000);

		let environmentCreated = false;
		try {
			await fs.stat(envPath);
			console.log("Virtual environment already exists.");
		} catch (error) {
			if (error.code === 'ENOENT') {
				console.log("Virtual environment not found, attempting to create one...");
				try {
					const createEnvProcess = spawn(this.pythonCommand, ['-m', 'venv', envPath]);
					await new Promise((resolve, reject) => {
						createEnvProcess.on('close', (code) => {
							if (code === 0) {
								console.log("Virtual environment created successfully.");
								new Notice("Environment folder succesfully created.");
								environmentCreated = true;
								resolve(code);
							} else {
								console.error(`Failed to create virtual environment with exit code: ${code}`);
								new Notice("Failed to create virtual environment. Please check your Python installation.");
								reject(new Error(`Failed to create virtual environment with code ${code}`));
							}
						});
					});
				} catch (error) {
					console.error("Error during virtual environment creation:", error);
					new Notice("Failed to create virtual environment. Please check your Python installation.");
					return;
				}
			} else {
				console.error("Error checking virtual environment:", error);
				new Notice("Error checking virtual environment. Please check your permissions and file system.");
				return;
			}
		}
	
		if (environmentCreated) {
			let pythonExecutable = path.join(envPath, navigator.platform.startsWith('Win') ? 'Scripts\\python.exe' : 'bin/python3');
			const installCmd = spawn(pythonExecutable, ['-m', 'pip', 'install', '-r', requirementsPath]);
	
			installCmd.stdout.on('data', (data) => {
				console.log(data.toString());
			});
	
			installCmd.stderr.on('data', (data) => {
				const errorOutput = data.toString();
				console.error(`stderr: ${errorOutput}`);
				new Notice(`Error during package installation: ${errorOutput}`);
			});
	
			await new Promise((resolve, reject) => {
				installCmd.on('close', (code) => {
					if (code === 0) {
						console.log("All packages installed successfully.");
						new Notice("All packages installed successfully.");
						resolve();
					} else {
						console.error(`Failed to install packages with code ${code}`);
						new Notice(`Failed to install packages. Please check the installation logs.`);
						reject(new Error(`Failed to install packages with code ${code}`));
					}
				});
			});
	
			// After all packages are installed successfully
			try {
				await fs.writeFile(path.join(envPath, 'setup_complete.flag'), 'Setup complete');
				new Notice("Environment setup is complete.");
				// Hide the notice after 1 second (1000 milliseconds)
				setTimeout(() => notice.hide(), 1000);
			} catch (error) {
				console.error("Failed to create setup complete flag file:", error);
				new Notice("Failed to create setup complete flag file. Please check your permissions and file system.");
			}
		} else {
			console.log("Skipping package installation as the virtual environment already exists.");
		}
	}

	addCommands() {

		this.addCommand({
			id: 'similarity-graph-position',
			name: 'Organize graph with similarity',
			callback: async () => {  // Make the callback async to use await
				const notice = new Notice("Organizing graph based on similarity...", 60000); // Notice shown during the operation only
	
				console.log("Attempting to run T-SNE and restore node positions...");
				await this.runGraphTsne();  // Awaits the completion of T-SNE processing
	
				const graphLeaf = this.findGraphLeaf();
				if (graphLeaf) {
					console.log("Graph leaf found, restoring data...");
					this.restoreGraphData(graphLeaf);
				} else {
					console.log("No graph leaf found or multiple leaves present.");
					new Notice('Graph view must be singular and active');
				}
	
				notice.hide();
			}
		}); 

		this.addCommand({
			id: 'manual-run-embeddings',
			name: 'Manually re-calculate embeddings',
			callback: () => this.runTokenizerScript()
		});

		this.addCommand({
			id: 'update-single-file',
			name: 'Update embedding for current file',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice("No file is currently active.");
					return;
				}
				this.updateSingleFile(activeFile.path);
			}
		});
    }

    findGraphLeaf(): any {
        let graphLeaves = this.app.workspace.getLeavesOfType('graph');
        console.log(`Found ${graphLeaves.length} graph leaves.`);
        if (graphLeaves.length === 1) {
            return graphLeaves[0];
        }
        return null;
    }

    restoreGraphData(graphLeaf: any) {
        if (!graphLeaf) {
            console.log("No graph leaf provided to restoreGraphData.");
            return;
        }

        const nodePositions: NodePosition[] = this.settings.nodePositions;
        if (nodePositions.length === 0) {
            console.log("No node positions available in settings.");
            return;
        }

        nodePositions.forEach((node) => {
            console.log(`Restoring position for node ${node.id}: (${node.x}, ${node.y})`);
            graphLeaf.view.renderer.worker.postMessage({
                forceNode: {
                    id: node.id,
                    x: node.x,
                    y: node.y
                }
            });
        });

        // Force a redraw here
        graphLeaf.view.renderer.worker.postMessage({
            run: true,
            alpha: 0.1
        });
        console.log("Redraw triggered.");
    }

	async runTokenizerScript() {
		let adapter = this.app.vault.adapter;
		let basePath = '';
		if (adapter instanceof FileSystemAdapter) {
			basePath = adapter.getBasePath();
		}
	
		const envPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'Python', 'obsidiansimilarity');
		const flagPath = path.join(envPath, 'setup_complete.flag');
		const csvPath = path.join('.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'embeddings.csv'); // Keep the original path as requested
	
		try {
			await fs.access(flagPath);
		} catch (error) {
			console.error("Environment setup is not complete. Please ensure all packages are installed.");
			new Notice("Environment setup is not complete. Please ensure all packages are installed.");
			return;
		}
	
		const pythonExecutable = path.join(envPath, navigator.platform.startsWith('Win') ? 'Scripts\\python.exe' : 'bin/python3');
		const scriptPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'Python', 'tokenizer.py');
	
		// Attempt to read the CSV to determine if it exists
		let notice;
		try {
			await this.app.vault.adapter.read(csvPath);
			notice = new Notice("Vault embeddings will be updated"); 
		} catch (error) {
			notice = new Notice("Creating initial embeddings for vault", 600000);
		}
	
		const process = spawn(pythonExecutable, [scriptPath, basePath]);
	
		let csvContent = '';
		process.stdout.on('data', (data) => {
			csvContent += data.toString();
		});
	
		process.stderr.on('data', (data) => {
			console.error(`stderr: ${data}`);
		});
	
		process.on('close', (code) => {
			if (code !== 0) {
				console.error(`Process exited with code ${code}`);
				new Notice('Error running tokenizer script.');
			} else {
				csvContent = csvContent.trim();
				const lines = csvContent.split('\n').filter(line => line.trim() !== '');
				const updatedCsvContent = lines.join('\n');
	
				this.app.vault.adapter.write(csvPath, updatedCsvContent).then(() => {
					console.log("Vault embeddings updated successfully");
					new Notice('Vault embeddings updated successfully.');
					// Process each file in the reload buffer
					this.reloadBuffer.forEach(filePath => {
						this.updateSingleFile(filePath);
					});
					this.reloadBuffer.clear();  // Clears the buffer after processing
				}).catch((writeError) => {
					console.error(`Error writing embeddings file: ${writeError}`);
					new Notice(`Error writing embeddings file: ${writeError}`);
				});
			}
	
			// Correct method to hide the notice
			notice.hide();
		});
	}

	async runGraphTsne(): Promise<void> {
		let adapter = this.app.vault.adapter;
		let basePath = '';
		if (adapter instanceof FileSystemAdapter) {
			basePath = adapter.getBasePath();
		}
	
		const envPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'Python', 'obsidiansimilarity');
		const scriptPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'Python', 'sne-to-data.py');
		const csvPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'embeddings.csv');
	
		const pythonExecutable = path.join(envPath, navigator.platform.startsWith('Win') ? 'Scripts\\python.exe' : 'bin/python3');
	
		const process = spawn(pythonExecutable, [scriptPath, csvPath]);
	
		let output = '';
		process.stdout.on('data', (data) => {
			output += data.toString();
		});
	
		process.stderr.on('data', (data) => {
			console.error(`stderr: ${data}`);
		});
	
		return new Promise<void>((resolve, reject) => {
			process.on('close', (code) => {
				if (code !== 0) {
					console.error(`Process exited with code ${code}`);
					new Notice('Error running T-SNE script.');
					reject(`Process exited with code ${code}`);
				} else {
					try {
						const result = JSON.parse(output);
						this.settings.nodePositions = result.nodePositions;
						this.saveSettings();
						new Notice('Node positions updated according to T-SNE');
						resolve();  // Explicitly resolving with no value, error if not
					} catch (error) {
						console.error('Failed to parse output:', error);
						new Notice('Failed to update node positions.');
						reject(error);
					}
				}
			});
		});
	}

	async updateSingleFile(filePath: string) {
		const adapter = this.app.vault.adapter;
		let basePath = '';
		if (adapter instanceof FileSystemAdapter) {
			basePath = adapter.getBasePath();
		}
	
		const absoluteFilePath = path.join(basePath, filePath);
	
		const scriptPath = path.join(basePath, '.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'Python', 'tokenizer.py');
	
		// Spawn the Python process with the absolute file path
		const process = spawn(this.pythonCommand, [scriptPath, absoluteFilePath]);
	
		process.stderr.on('data', (data) => {
			console.error(`stderr: ${data}`);
		});
	
		process.on('close', async (code) => {
			if (code !== 0) {
				console.error(`Process exited with code ${code}`);
				new Notice('Error updating embedding.');
				return;
			}
	
			let newEmbedding = '';
			process.stdout.on('data', (data) => {
				newEmbedding += data.toString();
			});
	
			// Read the current CSV, update it, and write back
			const csvPath = path.join('.obsidian', 'plugins', 'obsidian-similarity-toolkit', 'embeddings.csv');
			let csvContent = await this.app.vault.adapter.read(csvPath);
			let lines = csvContent.split('\n');
			const index = lines.findIndex(line => line.startsWith(filePath + ','));
	
			if (index !== -1) {
				lines.splice(index, 1);  // Remove the old embedding
			}
			lines.push(newEmbedding.trim()); 
	
			const updatedCsvContent = lines.filter(line => line.trim() !== '').join('\n');
			await this.app.vault.adapter.write(csvPath, updatedCsvContent);
			console.log(`Updated embeddings for ${filePath}`);
		});
	}
	
}