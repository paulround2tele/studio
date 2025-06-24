#!/bin/bash
cd /home/vboxuser/studio
export STUDIO_BACKEND_PATH="/home/vboxuser/studio/backend"
echo '{"method": "tools/call", "params": {"name": "apply_code_change", "arguments": {"diff": "--- a/test_final.txt\n+++ b/test_final.txt\n@@ -1,3 +1,4 @@\n line 1\n line 2\n+another new line\n line 3"}}}' | /home/vboxuser/studio/mcp/bin/mcp-server -allow-terminal -allow-mutation
