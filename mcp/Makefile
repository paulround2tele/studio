.PHONY: build run test fmt clean help

# Build the MCP server
build:
	go build -o bin/mcp-server ./cmd/mcp-server

# Run the MCP server directly
run:
	go run ./cmd/mcp-server

# Run tests
test:
	go test ./...

# Format Go code
fmt:
	gofmt -w $(shell find . -name '*.go' -not -path './vendor/*')

# Remove built binaries
clean:
	rm -f bin/mcp-server

.DEFAULT_GOAL := help

help:
	@echo "Available targets:"
	@echo "  build - Build the MCP server binary"
	@echo "  run   - Run the MCP server"
	@echo "  test  - Run Go tests"
	@echo "  fmt   - Format Go code"
	@echo "  clean - Remove built binaries"
