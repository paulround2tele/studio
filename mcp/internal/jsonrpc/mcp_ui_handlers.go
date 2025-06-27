package jsonrpc

import (
	"context"
	"encoding/json"
	"fmt"

	"mcp/internal/models"
)

// UI context tool handlers

func (s *JSONRPCServer) callGetLatestScreenshot(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	toBase64, _ := args["base64"].(bool)
	shot, err := s.bridge.GetLatestScreenshot(toBase64)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	data, _ := json.Marshal(shot)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(data))}},
	}, nil
}

func (s *JSONRPCServer) callGetUIMetadata(ctx context.Context) (interface{}, error) {
	comps, content, err := s.bridge.GetUIMetadata()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	payload := struct {
		Components []models.UIComponent `json:"components"`
		Content    []models.UIContent   `json:"content"`
	}{comps, content}
	b, _ := json.Marshal(payload)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(b))}},
	}, nil
}

func (s *JSONRPCServer) callGetUICodeMap(ctx context.Context) (interface{}, error) {
	comps, _, err := s.bridge.GetUIMetadata()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	mapping, err := s.bridge.GetUICodeMap(comps)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	data, _ := json.Marshal(mapping)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(data))}},
	}, nil
}

func (s *JSONRPCServer) callGetVisualContext(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	url, ok := args["url"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": "url parameter required"}},
		}, nil
	}
	payload, err := s.bridge.GetVisualContext(url)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	b, _ := json.Marshal(payload)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(b))}},
	}, nil
}
