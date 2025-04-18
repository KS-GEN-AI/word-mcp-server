# Word Editing MCP Server

This server provides tools for interacting with Microsoft Word (.docx) files and converting them to PDF with precise formatting.

This is a TypeScript-based MCP server that provides tools to interact with Word files. It demonstrates core MCP concepts by providing:

- Tools for setting a working directory
- Tools for reading, modifying, and deleting Word files
- Tools for converting Word files to PDF (with full formatting)

## Features

## Word Tools

### `set_target_folder`
- **Purpose**: Set the working folder for Word/file operations. Mandatory before other Word tools.
- **Parameters**: `folder` (absolute or relative path).

### `get_target_folder`
- **Purpose**: Get the current working folder.
- **Parameters**: None.

### `get_current_working_directory`
- **Purpose**: Get the process current working directory.
- **Parameters**: None.

### `list_files_in_target`
- **Purpose**: List files in the current target folder.
- **Parameters**: None.

### `read_word_content`
- **Purpose**: Read the text content of a Word (.docx) file.
- **Parameters**: `fileName` (relative to target folder).

### `replace_word_words`
- **Purpose**: Replace words in a Word (.docx) file and save as a new file.
- **Parameters**: `fileName` (input file), `outputFileName` (output file), `replacements` (array of {from, to}).

### `delete_word_file`
- **Purpose**: Delete a Word (.docx) file in the target folder.
- **Parameters**: `fileName` (relative to target folder).

### `word_to_pdf`
- **Purpose**: Convert a Word (.docx) file to PDF, preserving all formatting and images. Requires LibreOffice installed.
- **Parameters**: `fileName` (input .docx), `outputFileName` (output .pdf)
- **Note**: This uses LibreOffice in headless mode for professional-quality conversion. If LibreOffice is not installed, see the installation section below.

## Installation complète

Installe les dépendances Node.js :
```bash
npm install
```

Installe LibreOffice (pour la conversion Word → PDF) :
```bash
npm run install-libreoffice
```

Compile le serveur :
```bash
npm run build
```

Pour le développement avec auto-rebuild :
```bash
npm run watch
```

## Utilisation avec Claude Desktop

Ajoute la config suivante dans :

Sur MacOS : `~/Library/Application Support/Claude/claude_desktop_config.json`
Sur Windows : `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "Word Editing Server": {
      "command": "node",
      "args": [
        "/PATH_TO_THE_PROJECT/build/index.js"
      ],
      "env": {
      }
    }
  }
}
```

## Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
