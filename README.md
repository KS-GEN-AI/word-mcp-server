# Word Editing MCP Server

This server provides tools for interacting with Microsoft Word (.docx) files.

This is a TypeScript-based MCP server that provides tools to interact with Word files. It demonstrates core MCP concepts by providing:

- Tools for setting a working directory
- Tools for reading, modifying, and deleting Word files

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

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

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

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
