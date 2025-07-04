package jsonrpc

import (
	"context"
	"fmt"
)

// Interactive tool handlers

// callRunTerminalCommand implements the run_terminal_command tool
func (s *JSONRPCServer) callRunTerminalCommand(_ context.Context, args map[string]interface{}) (interface{}, error) {
	command, ok := args["command"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: command parameter is required and must be a string",
				},
			},
		}, nil
	}

	// Use current working directory as default
	workingDir := "."
	if wd, exists := args["workingDir"].(string); exists {
		workingDir = wd
	}

	result, err := s.bridge.RunTerminalCommand(command, workingDir)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error running terminal command: %v\nStdout: %s\nStderr: %s",
						err, result.Stdout, result.Stderr),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Command executed successfully.\nOutput: %s\nExit Code: %d",
					result.Stdout, result.ExitCode),
			},
		},
	}, nil
}

// callApplyCodeChange implements the apply_code_change tool
func (s *JSONRPCServer) callApplyCodeChange(_ context.Context, args map[string]interface{}) (interface{}, error) {
	diff, ok := args["diff"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error: diff parameter is required and must be a string",
				},
			},
		}, nil
	}

	stdout, stderr, err := s.bridge.ApplyCodeChange(diff)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error applying code change: %v\nStdout: %s\nStderr: %s",
						err, stdout, stderr),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Code change applied successfully.\nOutput: %s", stdout),
			},
		},
	}, nil
}
