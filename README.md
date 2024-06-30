# Overview

Obsidian Similarity Toolkit is an experimental plugin for [Obsidian](https://obsidian.md/) that adds semantic embedding similarity calculation to your vault using a fully local embedding model, allowing nodes in your vault graph to be positioned according to their semantic similarity to each other, in addition to the various other dimensions (links, color groupings, tags) already present in the Obsidian graph. 

This is accomplished by creating embeddings for each of the files in your vault, composed of tokens that encode their meaning. The numerical similarity of these tokens attempts to represent, due to the training of the model, the semantic similarity between two tokens. In aggregate, the embeddings for an entire text (in this case, a note), can be used to calculate it's similarity to any other text encoded using the same embeddings. 

<img width="843" alt="Screenshot 2024-06-25 at 10 15 10" src="https://github.com/Jhgallas/obsidian-similarity/assets/77229674/a3e6836e-6648-48f7-966c-719f7588fab1">

Adding this to the Obsidian vault, and representing it in the graph entails the following core functionalities:

- **Instantiation of an embedding model:** The sample model being used in the current version of this plugin is [gte-base](https://huggingface.co/thenlper/gte-base), a lightweight model that uses around 500mb of memory. The GTE family of models, by Alibaba, perform incredibly well on the [MTEB (Massive Text Embedding Benchmark) leaderboard](https://huggingface.co/spaces/mteb/leaderboard) for text clustering for their size, and were chosen for this reason. Instantiation of the model is enormously simplified thanks to the SentenceTransformers library. The model is run fully locally apart from caching from HuggingFace, and no text information is sent to external servers. The goal is to extend this toolkit to use any other embedding model, be they local or run from an API.
- **Creation, storage, management, and updating of embeddings:** This is currently accomplished using direct storage in CSV format as a simple proof of concept, with the aim being to implement a lightweight local vector database in the future. Embeddings are updated whenever files are modified, on a ten second rolling buffer, and a set of automations running in the background attempt to keep the embeddings for your vault fully ready at all times.
- **Effective dimensionality reduction:** t-SNE (t-distributed Stochastic Neighbor Embedding) is used to perform dimensionality reduction from the 768 embedding dimensions employed by gte-base, down to two dimensions for plotting into the stock Obsidian Graph. This is the process that creates a position for each node's text according to it's similarity to the nodes around it. For more information, i highly recommend [How to Use t-SNE Effectively] (Wattenberg, et al., 2016). The method is configured according to those guidelines for usage in the general conditions of Obsidian vaults.
- **Incorporation of new node positions in the Obsidian Graph:** The core user-facing functionality of the plugin, currently consisting of a command that will reposition the nodes of any currently open graph using the embeddings.

And...

- [WORK IN PROGRESS] Other tools that leverage these same bases: Tools to help users who do not currently have an organization in their vaults, or have few links, to create these from scratch using the same similarity calculation

The main goal of creating this additional dimension of text similarity is to enchance the "reflective process" of using Obsidian for note-taking and organization (a "tool for thought" that is already widely used to that end), featuring a broad ecosystem of other plugins and tools that can be used together to aid in that practice. Typically, Obsidian users will organize the files in their vault by using folders, tags, or a combination of the two, and will create links between note files that are represented in the graph (many examples of this can be seen in the "share and showcase" section of the Obsidian Community). 

The obsidian graph is an organizational and reflective tool that provides a "bird's eye view" of the vault, allowing the user to survey the connections between notes, and the forms of organization they currently employ (if added to the graph via it's rules). The default layout of the nodes in the graph is force-directed to spread the nodes evenly, which this plugin replaces with it's attempt at organizing nodes by semantic similarity.

It is important to note that this tool is more effective with a larger number of notes, as the positioning of each node in the graph becomes relative to the others. While any number of notes will be embedded and positioned, the positions of notes become more expressive as your vault grows, and clear clusters should begin to form as commonalities become represented in the text.

This is an in-progress piece of software, which will improve and gain functionality as development continues.

# Examples of usage scenarios

### Finding emerging topics in your vault to create tags or groups

Let's say a user is interested in keeping an organization of their notes in tags, reflecting the main topics they write about. These topics should now be reflected as clusters of similar notes in the graph when the command is run. If they already have a rule in the graph to color the nodes according to their tags, the closeness or distance between the user organization of topics and the similarity organization should be well reflected by these color groupings and the emergent topic clusters. The grouping of notes by similarity will never perfectly reflect the groupings created by the user, and the aim is precisely for that distance itself to be a source of insight.

For example, a user might notice a distinct cluster of notes, featuring many different colors representing different tags. Since these tags were likely created over a long period, the user might not have realized that these notes could belong to the same group. This recognition can prompt the user to reflect on what this new potential grouping represents. For instance, they might discover that working notes from various projects, each tagged by project name, all relate to text processing software. This realization can inspire the user to create a new "text processing software" tag, prompting them to write more comprehensive notes on this topic in the future and link related notes from different projects. Or, they might decide that it actually represents two different groups, and keep two tags in that same cluster, but orthogonally add any of the notes to them.

<img width="500" alt="Finding groups" src="https://github.com/Jhgallas/obsidian-similarity/assets/77229674/cea60883-26b6-42f5-9ee5-ad14ddcdbe93">

> Example of a grouping with many different tags, but clear possible grouping, that lead to a reorganization and creating of topics around them

### Assess spread of links in topics by similarity

Another useful application is for a user interested in finding unexpected connections between different topics in their vault. Whether these topics are formally organized into tags or folders or not, the user should see them roughly reflected in the clusters after running the command. By hovering over the nodes with the most connections in each cluster, they can begin to see how far links from these generally clustered notes extend in terms of similarity.

For instance, a node that is very close to another cluster but not actually connected to it might serve as an excellent entry point. This situation invites the user to explore potential connections between this note and the notes now positioned around it. Such an observation can prompt the user to consider connections between two topics that might have previously seemed unrelated, thereby uncovering new pathways for thought and exploration within their vault.

<img width="500" alt="Finding connections" src="https://github.com/Jhgallas/obsidian-similarity/assets/77229674/c9e1dd9e-c4a2-413f-afc8-14b72d94fb7d">

> Example of two notes, placed very far away from their tag groupings - memory and retrieval (from a book reading) and breadth first search (from class notes). Clear relation of retrieval and very similar language on inspection - could lead to writing an interesting note!

### Limitations in vaults with very few notes

If a user is interested in using Obsidian, and potentially exploring the Obsidian Similarity Toolkit with a vault containing only a handful of notes, they may encounter some limitations. In this case, the similarity organization is likely to not be very expressive, as there are not enough notes for patterns to begin to form. The opposite might also be true, if among these few notes are several that are highly similar to each other. The resulting graph may show these notes "paired up" tightly together, without too clrear relation between clusters, which might not provide much new insight or reflection opportunities.

For example, if a user has just started using Obsidian and has only created notes on three different topics – "Daily Journal," "Project Ideas," and "Book Summaries" – the semantic similarity calculation might simply reflect these topics as three isolated clusters. While this does show the separation of topics, it doesn't offer much beyond what the user already knows from their initial categorization. 

<img width="500" alt="Few files" src="https://github.com/Jhgallas/obsidian-similarity/assets/77229674/f3ff539d-02a9-4519-9d51-08804bb330e8">

> Example with very few files, and only a couple of links. We can try to see patterns, but there are too few points for them to mean anything.

### Limitations in unstructured vaults 

Similarly, even if they have a solid amount of notes, such as if they have imported notes from another app, but these notes do not have any linking between them, or any tags or folders organization that can be added as rules, the utility of the Obsidian Similarity Toolkit may be limited. The plugin relies on existing structures to some extent to enhance its insights and to create meaningful visualizations in the graph.

For instance, a user might import tens of notes from a previous note-taking app, resulting in a vault with a significant amount of content but lacking any internal organization – no tags, folders, or links between notes. When the similarity organization is performed, the resulting graph may show clusters that are helpful to some extent, but it cannot help the user create connections between all notes, and the completely loose relation between clusters might make it very difficult to create any tags or groupings.

<img width="500" alt="No links" src="https://github.com/Jhgallas/obsidian-similarity/assets/77229674/fc291cad-6a2d-44d0-bf10-317dea217d06">

> Example of vault with no links or groupings - we can see some patterns, but hard to know where to start!

# Installation guide

As this is an experimental plugin involving Python code inside Obsidian, installation is completely manual for now. Download or clone this repository, and copy the resulting 'obsidian-similarity-toolkit' folder over to the .obsidian/plugins folder inside your vault. In detail:

- Ensure that you have Python >=3.10 installed on your operating system, and that it is added to PATH. 
  - On Mac OS and most Linux distros, this should be present by default
  - On Windows, Python is recommended to be installed and automatically added from the Microsoft Store
- Make sure that you have [Obsidian](https://obsidian.md/) installed and at least one vault created.
	- Make sure ["safe mode" is disabled in settings](https://help.obsidian.md/Extending+Obsidian/Plugin+security) on the Obsidian vault you wish to use.
- Download or clone this repository. If you are manually douwnloading, move the obsidian-similarity-toolkit folder to `[yourvault]/.obsidian/plugins`. If you prefer to clone, point git to that folder.
	- "Show hidden folders" might need to be enabled for .obsidian to appear.
	- If no plugins have been installed, you might need to create the 'plugins' folder.
- Re-open obsidian, and the plugin should be present under Community Plugins in settings.
- Enable the plugin to start the Python installation process.
- Once the plugin is enabled, it will automatically create the python environment and install necessary packages. Obsidian notifications will appear for each step of the process.
	- Package installation can take up to 10 minutes, especially on older machines.
- After the necessary packages have been installed, the plugin will begin to create embeddings for the notes currently in the vault.
	- If there are many notes in the vault, this process too might take some time. After initial embeddings are created, they will be automatically updated in the background.

## Usage

Once installation is complete, you can open the graph and run the 'Organize graph with similarity' command from the Obsidian command palette, accessed using Ctrl/Cmd + P. This should be the only command you need, and an automatic organization when the graph is opened is being worked on so that no commands are necessary. 

- If you have disabled the command pallete, it might need to be re-enabled in core plugin settings

https://github.com/Jhgallas/obsidian-similarity/assets/77229674/3f07ce5b-cf6f-4f95-be27-f4a9a44d97bb

For troubleshooting, an additional two commands are made available:

- "Manually re-calculate embeddings" will restart the embedding process for the entire vault.
- "Update embedding for current file" will recalculate embeddings for the currently opened file.

Hotkeys can be assigned to any of these commands via Obsidian settings, but should not be assigned by default by plugins.

As more basic functionalities are still in development, verbose logging has been kept in the plugin, which can be viwed from the Obsidian developer console (Ctrl + Shift + I / Cmd + Option + I)

Additionally, you might want to reduce the forces in the stock graph to near zero - in vaults with too many unconnected notes (orphans), having high forces can draw them to the center of the graph, even after running the organization command.


https://github.com/Jhgallas/obsidian-similarity/assets/77229674/c1909f8b-8967-43c0-a2f0-71975979fcc2



# Implementation details

The following Python packages will be downloaded and installed in the virtual environment:

```
dash==2.17.1
numpy>=1.23.2,<2.0
pandas==2.2.2
plotly==5.18.0
scikit_learn==1.3.2
sentence_transformers==2.7.0
```

The Python scripts responsible for generating embeddings and running t-SNE are stored in `.obsidian/plugins/obsidian-similarity-toolkit/Python`, and the virtual environment itself will be created in `Python/obsidiansimilarity`. 

Main plugin files are at the root of the  `obsidian-similarity-toolkit` folder, consisting of `main.js`, which is the compiled file created by the Obsidian plugin compilation process, as well as additional files needed for development. `main.ts` contains the uncompiled source code, which can be freely modified. For more information, see the Obsidian Sample Plugin repository

`gte-base` will be cached by SentenceTransformers when in use and released when no embeddings need to be created. Embeddings and plugin data are also stored directly in the plugin folder.

# For non Obsidian users

If you are not a user of Obsidian (or perhaps, are not so Knowledgeable in it's use), you might still be interested in this plugin as a general tool for quick and easy analysis of texts or markdown files by their similarity and in contrast to other forms of organization, or as general showcase of embedding similarity.

Obsidian is a Markdown based note-taking software, with an extensive set of features dedicated to maintaining a "personal knowledge base" of texts, consisting of a "vault", or folder, of .md files, as well as any attachments, plugins, and customizations. By putting other note titles between double brackets, [[like this]], notes in Obsidian can be linked. The Obsidian Graph is a representation of notes in the vault, where each note is rendered as a node, and the links between them as edges. Additional forms of organization used by users, such as tags of folders, can also be represented in the graph.

This folder-based structure and "plaintext" format mean that Obsidian is easy to pick up, especially if you are used to writing in markdown. However, it might be hard to master, which i hope this plugin can help with. :)

This also means that if you are interested in analyzing any collection of texts with links between them, and potentially creating forms of grouping and organization with whatever criteria you might be interested in, you can easily create a new Obsidian vault, convert and add your texts, and use this plugin as a similarity tool only. I will explore adding guide to convert texts to markdown while preserving links in the future.
