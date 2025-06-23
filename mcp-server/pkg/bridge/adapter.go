package bridge

import (
	"github.com/fntelecomllc/studio/mcp-server/internal/handlers"
)

// ConvertToolResult converts handlers.ToolResult to bridge.ToolResult
func ConvertToolResult(handlerResult *handlers.ToolResult) *ToolResult {
	if handlerResult == nil {
		return nil
	}

	bridgeContent := make([]ContentBlock, len(handlerResult.Content))
	for i, block := range handlerResult.Content {
		bridgeContent[i] = ContentBlock{
			Type: block.Type,
			Text: block.Text,
			Data: block.Data,
		}
	}

	return &ToolResult{
		Content: bridgeContent,
		IsError: handlerResult.IsError,
	}
}

// Enhanced ExecuteTool wrapper methods
func (b *MCPBridge) executeSnapshotTool() (*ToolResult, error) {
	result, err := b.handlers.GetSnapshot()
	if err != nil {
		return nil, err
	}
	return ConvertToolResult(result), nil
}

func (b *MCPBridge) executeChangeImpactTool(args map[string]interface{}) (*ToolResult, error) {
	result, err := b.handlers.GetChangeImpact(args)
	if err != nil {
		return nil, err
	}
	return ConvertToolResult(result), nil
}

func (b *MCPBridge) executeModelsTool(args map[string]interface{}) (*ToolResult, error) {
	result, err := b.handlers.GetModels(args)
	if err != nil {
		return nil, err
	}
	return ConvertToolResult(result), nil
}

func (b *MCPBridge) executeDatabaseSchemaTool() (*ToolResult, error) {
	result, err := b.handlers.GetDatabaseSchema()
	if err != nil {
		return nil, err
	}
	return ConvertToolResult(result), nil
}

func (b *MCPBridge) executeEndpointsTool(args map[string]interface{}) (*ToolResult, error) {
	result, err := b.handlers.GetEndpoints(args)
	if err != nil {
		return nil, err
	}
	return ConvertToolResult(result), nil
}

func (b *MCPBridge) executeCallGraphTool(args map[string]interface{}) (*ToolResult, error) {
	result, err := b.handlers.GetCallGraph(args)
	if err != nil {
		return nil, err
	}
	return ConvertToolResult(result), nil
}