package state

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
)

// GetCampaignStatesTool provides campaign state information
type GetCampaignStatesTool struct {
	backendPath string
}

func NewGetCampaignStatesTool(backendPath string) *GetCampaignStatesTool {
	return &GetCampaignStatesTool{backendPath: backendPath}
}

func (t *GetCampaignStatesTool) Name() string {
	return "get_campaign_states"
}

func (t *GetCampaignStatesTool) Description() string {
	return "Return campaign state machine transitions and rules"
}

func (t *GetCampaignStatesTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetCampaignStatesTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	stateInfo, err := t.analyzeCampaignStates()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing campaign states: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(stateInfo, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetCampaignStatesTool) analyzeCampaignStates() (map[string]interface{}, error) {
	// Parse the state machine file
	stateMachinePath := filepath.Join(t.backendPath, "internal", "services", "campaign_state_machine.go")
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, stateMachinePath, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse state machine file: %w", err)
	}

	stateInfo := map[string]interface{}{
		"states": []string{},
		"transitions": map[string][]string{},
		"terminal_states": []string{},
		"hooks": map[string]interface{}{
			"pre_hooks": []string{},
			"post_hooks": []string{},
		},
	}

	// Look for state definitions and transitions
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.CompositeLit:
			// Look for state machine initialization
			if t.isStateTransitionMap(x) {
				t.extractTransitions(x, stateInfo)
			}
		case *ast.GenDecl:
			if x.Tok == token.CONST {
				t.extractStateConstants(x, stateInfo)
			}
		}
		return true
	})

	return stateInfo, nil
}

func (t *GetCampaignStatesTool) isStateTransitionMap(lit *ast.CompositeLit) bool {
	// Check if this looks like a state transition map
	for _, elt := range lit.Elts {
		if kv, ok := elt.(*ast.KeyValueExpr); ok {
			if ident, ok := kv.Key.(*ast.Ident); ok {
				if strings.Contains(ident.Name, "Status") {
					return true
				}
			}
		}
	}
	return false
}

func (t *GetCampaignStatesTool) extractTransitions(lit *ast.CompositeLit, stateInfo map[string]interface{}) {
	transitions := stateInfo["transitions"].(map[string][]string)
	
	for _, elt := range lit.Elts {
		if kv, ok := elt.(*ast.KeyValueExpr); ok {
			var fromState string
			if ident, ok := kv.Key.(*ast.Ident); ok {
				fromState = ident.Name
			}
			
			if compositeLit, ok := kv.Value.(*ast.CompositeLit); ok {
				var toStates []string
				for _, valueElt := range compositeLit.Elts {
					if ident, ok := valueElt.(*ast.Ident); ok {
						toStates = append(toStates, ident.Name)
					}
				}
				
				if fromState != "" {
					transitions[fromState] = toStates
					
					// If no transitions, it's a terminal state
					if len(toStates) == 0 {
						terminalStates := stateInfo["terminal_states"].([]string)
						stateInfo["terminal_states"] = append(terminalStates, fromState)
					}
				}
			}
		}
	}
}

func (t *GetCampaignStatesTool) extractStateConstants(decl *ast.GenDecl, stateInfo map[string]interface{}) {
	states := stateInfo["states"].([]string)
	
	for _, spec := range decl.Specs {
		if valueSpec, ok := spec.(*ast.ValueSpec); ok {
			for _, name := range valueSpec.Names {
				if strings.Contains(name.Name, "Status") {
					states = append(states, name.Name)
				}
			}
		}
	}
	
	stateInfo["states"] = states
}

// GetStateMachinesTool provides general state machine information
type GetStateMachinesTool struct {
	backendPath string
}

func NewGetStateMachinesTool(backendPath string) *GetStateMachinesTool {
	return &GetStateMachinesTool{backendPath: backendPath}
}

func (t *GetStateMachinesTool) Name() string {
	return "get_state_machines"
}

func (t *GetStateMachinesTool) Description() string {
	return "Return state machine definitions and transition rules"
}

func (t *GetStateMachinesTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetStateMachinesTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	stateMachines, err := t.analyzeStateMachines()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing state machines: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(stateMachines, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetStateMachinesTool) analyzeStateMachines() (map[string]interface{}, error) {
	// Analyze all state machines in the codebase
	stateMachines := map[string]interface{}{
		"campaign_state_machine": map[string]interface{}{
			"file": "internal/services/campaign_state_machine.go",
			"description": "Manages campaign lifecycle state transitions",
			"features": []string{
				"ValidateTransition",
				"GetValidTransitions", 
				"IsTerminalState",
				"Pre/Post hooks",
				"Thread-safe operations",
			},
		},
		"patterns": []map[string]interface{}{
			{
				"name": "State Validation",
				"description": "All transitions are validated before execution",
				"implementation": "ValidateTransition method",
			},
			{
				"name": "Hook System",
				"description": "Pre and post hooks for state transitions",
				"implementation": "AddPreHook/AddPostHook methods",
			},
			{
				"name": "Thread Safety",
				"description": "Mutex-protected state operations",
				"implementation": "sync.RWMutex in state machine",
			},
		},
		"best_practices": []string{
			"All state transitions go through validation",
			"Hooks allow for side effects and logging",
			"Terminal states prevent further transitions",
			"Thread-safe concurrent access",
		},
	}

	return stateMachines, nil
}