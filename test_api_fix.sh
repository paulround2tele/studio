#!/bin/bash
echo "=== Testing Fixed API Analysis Tools ==="
echo
cd /home/vboxuser/studio
export STUDIO_BACKEND_PATH="/home/vboxuser/studio/backend"

echo "1. Testing get_routes:"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_routes", "arguments": {}}}' | /home/vboxuser/studio/mcp/bin/mcp-server -allow-terminal -allow-mutation 2>/dev/null | tail -1

echo
echo "2. Testing get_api_schema:"
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_api_schema", "arguments": {}}}' | /home/vboxuser/studio/mcp/bin/mcp-server -allow-terminal -allow-mutation 2>/dev/null | tail -1
