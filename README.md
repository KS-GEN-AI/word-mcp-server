# Jira communication server MCP Server

Talk to Jira

This is a TypeScript-based MCP server that provides tools to interact with Jira. It demonstrates core MCP concepts by providing:

- Tools for executing JQL queries
- Tools for creating, editing, and deleting Jira tickets
- Tools for listing Jira projects and statuses

## Features

## Jira Tools

### `execute_jql`
- **Purpose**: Run a JQL query.
- **Parameters**: `jql`, `number_of_results` (default: 1).

### `get_only_ticket_name_and_description`
- **Purpose**: Fetch ticket name and description.
- **Parameters**: `jql`, `number_of_results` (default: 1).

### `create_ticket`
- **Purpose**: Create a Jira ticket.
- **Parameters**: `project.key`, `summary`, `description`, `issuetype.name`, `parent` (optional).

### `list_projects`
- **Purpose**: List Jira projects.
- **Parameters**: `number_of_results` (default: 1).

### `delete_ticket`
- **Purpose**: Delete a ticket.
- **Parameters**: `issueIdOrKey`.

### `edit_ticket`
- **Purpose**: Modify a ticket.
- **Parameters**: `issueIdOrKey`, `summary` (optional), `description` (optional), `labels` (optional), `parent` (optional).

### `get_all_statuses`
- **Purpose**: Retrieve all statuses.
- **Parameters**: `number_of_results` (default: 1).

### `assign_ticket`
- **Purpose**: Assign a ticket to a user.
- **Parameters**: `accountId`, `issueIdOrKey`.

### `query_assignable`
- **Purpose**: Find assignable users in a project.
- **Parameters**: `project_key`.

### `add_attachment`
- **Purpose**: Add an attachment to a ticket.
- **Parameters**: `issueIdOrKey`, `imageUrl`.

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
    "Jira communication server": {
      "command": "node",
      "args": [
        "/PATH_TO_THE_PROJECT/build/index.js"
      ],
      "env": {
        "JIRA_URL": "https://XXXXXXXX.atlassian.net",
        "JIRA_API_MAIL": "Your email",
        "JIRA_API_KEY": "KEY_FROM : https://id.atlassian.com/manage-profile/security/api-tokens"
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
