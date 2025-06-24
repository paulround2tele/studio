# Quickstart Guide

This guide provides step-by-step instructions to get the MCP server up and running.

## Prerequisites

*   Go 1.18 or later installed.
*   Access to the codebase of the target project you want to analyze.

## 1. Build the Server

Navigate to the `cmd/mcpserver` directory and build the server:

```bash
cd mcp/cmd/mcpserver
go build
```

This will create an executable file named `mcpserver` (or `mcpserver.exe` on Windows).

## 2. Configure the Server

The server is configured via command-line flags. You can enable potentially dangerous operations by using the following flags:

*   `--allow-terminal`: Allows the server to execute terminal commands via the `/tools/run_terminal_command` endpoint.
*   `--allow-mutation`: Allows the server to modify files on disk via the `/tools/apply_code_change` endpoint.

**Example:**
```bash
./mcpserver --allow-terminal --allow-mutation
```

## 3. Run the Server

From the `mcp/cmd/mcpserver` directory, run the executable:

```bash
./mcpserver
```

You should see a log message indicating that the server has started:

```
2024/01/01 12:00:00 Starting server on :8080
```

## 4. Connect to GitHub Copilot

To connect the MCP server to GitHub Copilot, you need to edit your Copilot configuration file. This file is typically located at `~/.copilot/config.json`.

Add the following entry to the `servers` section of the JSON file:

```json
{
  "servers": {
    "my-mcp-server": {
      "url": "http://localhost:8080"
    }
  }
}
```

Replace `"my-mcp-server"` with a name of your choice. After saving the file, GitHub Copilot will be able to connect to your local MCP server and use the provided tools.