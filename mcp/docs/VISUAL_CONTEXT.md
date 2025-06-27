# Visual Context API

The MCP server can provide Figma Dev Mode style context for UI auditing.

## Endpoints

- `/tools/get_latest_screenshot` – return the last Playwright screenshot. Pass `{"base64": true}` to receive base64 encoded data.
- `/tools/get_ui_metadata` – parse the previously captured HTML and return UI component metadata and text content.
- `/tools/get_ui_code_map` – map discovered components to React source files.
- `/tools/get_visual_context` – run Playwright for a URL and return a combined payload with screenshot, metadata and code mapping.
- `/tools/generate_ui_test_prompt` – crawl a local URL and generate a markdown prompt with a screenshot for UI tests.

## Payload Structure

The `get_visual_context` tool returns a payload similar to:

```makefile
TOOL: screenshot -> img://ui-context.png
TOOL: metadata -> [...]
TOOL: code-connect -> [...]
TOOL: content -> {...}
```

## Usage Example

Invoke via JSON-RPC:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {"tool": "get_visual_context", "arguments": {"url": "http://localhost:3000"}}
}
```

To generate a UI test prompt:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {"tool": "generate_ui_test_prompt", "arguments": {"url": "http://localhost:3000/dashboard"}}
}
```

Feed the JSON result into Claude Sonnet 4 along with the screenshot path to perform visual review or generate code.
