#!/bin/bash
cd /home/vboxuser/studio
export STUDIO_BACKEND_PATH="/home/vboxuser/studio/backend"
echo '{"method": "tools/call", "params": {"name": "get_api_schema", "arguments": {}}}' | /home/vboxuser/studio/mcp/bin/mcp-server -allow-terminal -allow-mutation
