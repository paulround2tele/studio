# Implementation Details

This document describes the technical implementation of the MCP server.

## Architecture

The MCP server is a standard Go HTTP server built using the `net/http` package. It follows a simple architecture:

*   **`main.go`**: The entry point of the application. It initializes and starts the server.
*   **`server` package**: Contains the server struct and route definitions. It uses `http.ServeMux` for routing.
*   **`handlers` package**: Contains the HTTP handler functions for each tool endpoint. These handlers are responsible for parsing requests, calling the appropriate analyzer functions, and writing the JSON response.
*   **`analyzer` package**: Contains the core logic for parsing and analyzing the source code and database schema. It uses the Go `go/parser` and `go/ast` packages for AST parsing and regular expressions for SQL parsing.
*   **`models` package**: Defines the data structures used throughout the application, such as `Table`, `Route`, and `Handler`.

## Analysis Techniques

### AST Parsing

The server uses Go's native Abstract Syntax Tree (AST) parsing capabilities to analyze the Go source code. The `go/parser` package is used to parse Go files into an AST, and the `go/ast` package is used to inspect the tree.

This approach is used for:

*   **Finding Structs (`get_models`)**: It traverses the AST to find `ast.TypeSpec` nodes that represent struct types.
*   **Finding Routes (`get_routes`)**: It looks for calls to router methods like `HandleFunc` to identify the registered routes and their corresponding handlers.
*   **Finding Handlers (`get_handlers`)**: It identifies functions that have the signature of an `http.HandlerFunc`.
*   **Finding Interfaces (`get_interfaces`)**: It looks for `ast.InterfaceType` nodes to identify interface definitions.

### SQL Parsing

For database schema analysis (`get_database_schema`), the server uses regular expressions to parse `schema.sql` files. It looks for `CREATE TABLE` statements to identify tables and then parses the column definitions within those statements.

This method is simple and effective for the current requirements but could be replaced with a more robust SQL parsing library in the future if more complex SQL analysis is needed.

## Key Tool Implementations

### `get_routes`

The `get_routes` tool works by parsing the `main.go` file of the target application. It builds an AST of the file and then traverses it, looking for function calls on a router variable (e.g., `s.Router.HandleFunc(...)`). When it finds such a call, it extracts the HTTP method, path, and handler function name from the arguments of the call.

### `find_implementations`

The `find_implementations` tool is currently a simplified implementation. It identifies all the interfaces in the codebase. To find implementations, it would need to be extended to:

1.  Parse all Go files in the project.
2.  For each struct, get the list of methods associated with it.
3.  Compare the method set of each struct with the method set of the target interface.
4.  If a struct has all the methods of the interface, it is considered an implementation.

A full implementation of this would require more advanced type checking, which is not yet implemented.

## Advanced Tool Implementations

### `get_change_impact`
The `get_change_impact` tool is designed to help developers understand the potential blast radius of a code change. The current implementation is simplified and uses a text-based search to find references to a given identifier (e.g., a function or type name). A more advanced implementation would involve building a complete Abstract Syntax Tree (AST) and performing static analysis to trace dependencies.

### `run_terminal_command`
The `run_terminal_command` tool provides the ability to execute arbitrary shell commands. For security, this feature is disabled by default and must be explicitly enabled with the `--allow-terminal` command-line flag. The handler uses the `os/exec` package to execute the command and captures the `stdout` and `stderr` streams, which are returned to the client in the JSON response.