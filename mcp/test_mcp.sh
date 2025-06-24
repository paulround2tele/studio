#!/bin/bash

# Test MCP server with multiple requests in one session
cd /home/vboxuser/studio/mcp

{
    echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
    echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
    echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_database_schema","arguments":{}}}'
} | ./bin/mcp-server
