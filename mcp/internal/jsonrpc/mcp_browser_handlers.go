package jsonrpc

import (
	"context"
	"fmt"
	"mcp/internal/models"
)

// Browser tool handlers

// callBrowseWithPlaywright implements the browse_with_playwright tool
func (s *JSONRPCServer) callBrowseWithPlaywright(_ context.Context, args map[string]interface{}) (interface{}, error) {
	url, ok := args["url"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: url parameter is required and must be a string"},
			},
		}, nil
	}

	result, err := s.bridge.BrowseWithPlaywright(url)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error running Playwright: %v", err)},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": fmt.Sprintf("Fetched %s - screenshot saved to %s", result.URL, result.Screenshot)},
		},
	}, nil
}

// callBrowseWithPlaywrightIncremental implements the browse_with_playwright_incremental tool
func (s *JSONRPCServer) callBrowseWithPlaywrightIncremental(_ context.Context, args map[string]interface{}) (interface{}, error) {
	url, ok := args["url"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: url parameter is required and must be a string"},
			},
		}, nil
	}

	result, err := s.bridge.BrowseWithPlaywrightIncremental(url)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error running incremental Playwright: %v", err)},
			},
		}, nil
	}

	responseText := fmt.Sprintf("Incremental browse result - Type: %s, Session: %s, Token savings: %d",
		result.Type, result.SessionID, result.TokenSavings)
	
	if result.Type == "initial" {
		responseText += fmt.Sprintf(", Full capture - URL: %s", result.URL)
	} else {
		responseText += fmt.Sprintf(", Delta capture - %d regions", len(result.Regions))
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": responseText},
		},
	}, nil
}

// callProcessUIActionIncremental implements the process_ui_action_incremental tool
func (s *JSONRPCServer) callProcessUIActionIncremental(_ context.Context, args map[string]interface{}) (interface{}, error) {
	sessionID, ok := args["sessionId"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: sessionId parameter is required and must be a string"},
			},
		}, nil
	}

	if _, ok := args["action"].(string); !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: action parameter is required and must be a string"},
			},
		}, nil
	}

	// Build UIAction from parameters
	action := s.buildUIActionFromArgs(args)
	
	// URL is optional for UI actions - use empty string if not provided
	url, _ := args["url"].(string)
	
	result, err := s.bridge.ProcessUIActionIncremental(sessionID, url, action)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error processing incremental action: %v", err)},
			},
		}, nil
	}

	responseText := fmt.Sprintf("Action processed - Type: %s, Success: %t, Token savings: %d, Regions: %d",
		result.ActionType, result.Success, result.TokenSavings, len(result.Regions))

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": responseText},
		},
	}, nil
}

// callGetIncrementalUIState implements the get_incremental_ui_state tool
func (s *JSONRPCServer) callGetIncrementalUIState(_ context.Context, args map[string]interface{}) (interface{}, error) {
	sessionID, ok := args["sessionId"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: sessionId parameter is required and must be a string"},
			},
		}, nil
	}

	state, err := s.bridge.GetIncrementalUIState(sessionID)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error getting UI state: %v", err)},
			},
		}, nil
	}

	responseText := fmt.Sprintf("Session state - ID: %s, URL: %s, Mode: %s, Changes: %d, Bytes saved: %d",
		state.SessionID, state.StartURL, state.Mode, state.TotalChanges, state.BytesSaved)

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": responseText},
		},
	}, nil
}

// callSetStreamingMode implements the set_streaming_mode tool
func (s *JSONRPCServer) callSetStreamingMode(_ context.Context, args map[string]interface{}) (interface{}, error) {
	sessionID, ok := args["sessionId"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: sessionId parameter is required and must be a string"},
			},
		}, nil
	}

	modeStr, ok := args["mode"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: mode parameter is required and must be a string"},
			},
		}, nil
	}

	var mode models.StreamingMode
	switch modeStr {
	case "full":
		mode = models.StreamingModeFull
	case "incremental":
		mode = models.StreamingModeIncremental
	case "adaptive":
		mode = models.StreamingModeAdaptive
	default:
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: mode must be 'full', 'incremental', or 'adaptive'"},
			},
		}, nil
	}

	err := s.bridge.SetStreamingMode(sessionID, mode)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error setting streaming mode: %v", err)},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": fmt.Sprintf("Streaming mode set to '%s' for session %s", modeStr, sessionID)},
		},
	}, nil
}

// callGetStreamStats implements the get_stream_stats tool
func (s *JSONRPCServer) callGetStreamStats(_ context.Context, args map[string]interface{}) (interface{}, error) {
	sessionID, _ := args["sessionId"].(string) // Optional parameter
	
	stats, err := s.bridge.GetStreamStats(sessionID)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error getting stream stats: %v", err)},
			},
		}, nil
	}

	responseText := fmt.Sprintf("Stream stats - Session: %s, Mode: %s, Deltas: %d, Tokens saved: %d, Compression: %.2f, Duration: %s",
		stats.SessionID, stats.StreamingMode, stats.TotalDeltas, stats.TokensSaved, stats.CompressionRatio, stats.SessionDuration)

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": responseText},
		},
	}, nil
}

// callCleanupIncrementalSession implements the cleanup_incremental_session tool
func (s *JSONRPCServer) callCleanupIncrementalSession(_ context.Context, args map[string]interface{}) (interface{}, error) {
	sessionID, ok := args["sessionId"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: sessionId parameter is required and must be a string"},
			},
		}, nil
	}

	err := s.bridge.CleanupIncrementalSession(sessionID)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error cleaning up session: %v", err)},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": fmt.Sprintf("Session %s cleaned up successfully", sessionID)},
		},
	}, nil
}

// callGetIncrementalDebugInfo implements the get_incremental_debug_info tool
func (s *JSONRPCServer) callGetIncrementalDebugInfo(_ context.Context, args map[string]interface{}) (interface{}, error) {
	sessionID, ok := args["sessionId"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": "Error: sessionId parameter is required and must be a string"},
			},
		}, nil
	}

	debug, err := s.bridge.GetIncrementalDebugInfo(sessionID)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{"type": "text", "text": fmt.Sprintf("Error getting debug info: %v", err)},
			},
		}, nil
	}

	responseText := fmt.Sprintf("Debug info for session %s: %+v", sessionID, debug)

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{"type": "text", "text": responseText},
		},
	}, nil
}

// buildUIActionFromArgs constructs a UIAction from MCP arguments
func (s *JSONRPCServer) buildUIActionFromArgs(args map[string]interface{}) models.UIAction {
	action := models.UIAction{}
	
	if actionType, ok := args["action"].(string); ok {
		action.Action = actionType
	}
	
	if selector, ok := args["selector"].(string); ok {
		action.Selector = selector
	}
	
	if text, ok := args["text"].(string); ok {
		action.Text = text
	}
	
	if url, ok := args["url"].(string); ok {
		action.URL = url
	}
	
	if timeout, ok := args["timeout"].(float64); ok {
		action.Timeout = int(timeout)
	}
	
	// Coordinate support
	if x, ok := args["x"].(float64); ok {
		action.X = &x
	}
	
	if y, ok := args["y"].(float64); ok {
		action.Y = &y
	}
	
	if toX, ok := args["toX"].(float64); ok {
		action.ToX = &toX
	}
	
	if toY, ok := args["toY"].(float64); ok {
		action.ToY = &toY
	}
	
	return action
}
