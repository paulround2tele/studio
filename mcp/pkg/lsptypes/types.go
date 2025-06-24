package lsptypes

import "encoding/json"

// LSPMessage represents a generic Language Server Protocol/JSON-RPC 2.0 message.
type LSPMessage struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      *int            `json:"id,omitempty"`
	Method  string          `json:"method,omitempty"`
	Params  json.RawMessage `json:"params,omitempty"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *LSPError       `json:"error,omitempty"`
}

// LSPError represents an error object in an LSP/JSON-RPC 2.0 message.
type LSPError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// InitializeParams represents the parameters for the 'initialize' request.
type InitializeParams struct {
	ProcessID        *int              `json:"processId"`
	RootPath         *string           `json:"rootPath,omitempty"`
	RootURI          *string           `json:"rootUri,omitempty"`
	Capabilities     json.RawMessage   `json:"capabilities"`
	WorkspaceFolders []WorkspaceFolder `json:"workspaceFolders,omitempty"`
}

// WorkspaceFolder represents a workspace folder
type WorkspaceFolder struct {
	URI  string `json:"uri"`
	Name string `json:"name"`
}

// InitializeResult represents the result for the 'initialize' request.
type InitializeResult struct {
	Capabilities ServerCapabilities `json:"capabilities"`
	ServerInfo   *ServerInfo        `json:"serverInfo,omitempty"`
}

// ServerCapabilities defines the capabilities of the language server.
type ServerCapabilities struct {
	TextDocumentSync       *int                   `json:"textDocumentSync,omitempty"` // 1 for full, 2 for incremental
	CompletionProvider     *CompletionOptions     `json:"completionProvider,omitempty"`
	HoverProvider          *bool                  `json:"hoverProvider,omitempty"`
	ExecuteCommandProvider *ExecuteCommandOptions `json:"executeCommandProvider,omitempty"`
	Experimental           interface{}            `json:"experimental,omitempty"`
}

// CompletionOptions defines completion capabilities
type CompletionOptions struct {
	TriggerCharacters []string `json:"triggerCharacters,omitempty"`
	ResolveProvider   *bool    `json:"resolveProvider,omitempty"`
}

// ExecuteCommandOptions defines command execution capabilities
type ExecuteCommandOptions struct {
	Commands []string `json:"commands"`
}

// ServerInfo provides information about the server.
type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
}

// TextDocumentItem represents a text document
type TextDocumentItem struct {
	URI        string `json:"uri"`
	LanguageID string `json:"languageId"`
	Version    int    `json:"version"`
	Text       string `json:"text"`
}

// TextDocumentIdentifier identifies a text document
type TextDocumentIdentifier struct {
	URI string `json:"uri"`
}

// Position represents a position in a text document
type Position struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

// Range represents a range in a text document
type Range struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}
