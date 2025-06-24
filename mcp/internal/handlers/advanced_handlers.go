package handlers

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"mcp/internal/models"
	"mcp/internal/utils"
	"net/http"
	"os/exec"
	"time"

	"github.com/gin-gonic/gin"
)

// GetReferencesHandler handles requests to find all references to a function or type.
func GetReferencesHandler(c *gin.Context) {
	var req models.GetReferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// For now, we use a simple text search. A more advanced implementation
	// would use AST parsing to find actual code references.
	results, err := utils.SearchFiles("backend", req.Identifier)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}

// GetChangeImpactHandler handles requests to analyze the impact of a change.
func GetChangeImpactHandler(c *gin.Context) {
	identifier := c.Query("identifier")
	if identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "identifier query parameter is required"})
		return
	}

	// This is a simplified implementation. A real implementation would
	// use the file and line to find the function name via an AST.
	// For now, we assume the client will provide the function name.
	results, err := utils.SearchFiles("backend", identifier)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}

// SnapshotHandler handles requests to create a git stash snapshot.
func SnapshotHandler(c *gin.Context) {
	// This command creates a new stash with a message.
	// The output of "git stash show -p" would be the stash ID.
	// A simpler approach for now is to just return a success message.
	cmd := exec.Command("git", "-C", "backend", "stash", "push", "-m", "mcp-snapshot-"+time.Now().Format(time.RFC3339))
	var out, errOut bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errOut

	err := cmd.Run()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  err.Error(),
			"stderr": errOut.String(),
		})
		return
	}

	// Parsing the stash ID is complex, so we'll return a generic success message.
	c.JSON(http.StatusOK, models.SnapshotResponse{
		StashID: "Not implemented", // Placeholder
		Message: "Snapshot created successfully.",
	})
}

// ContractDriftCheckHandler handles requests to check for API contract drift.
func ContractDriftCheckHandler(c *gin.Context) {
	// This is a simplified implementation. A real-world version would
	// perform a deep comparison of the two JSON structures.
	schemaFromFile, err := ioutil.ReadFile("backend/docs/openapi.json")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not read openapi.json: " + err.Error()})
		return
	}

	generatedSchema, err := utils.GetApiSchema()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate schema: " + err.Error()})
		return
	}

	generatedSchemaBytes, err := json.Marshal(generatedSchema)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not marshal generated schema: " + err.Error()})
		return
	}

	// Simple string comparison for drift detection
	drift := !bytes.Equal(schemaFromFile, generatedSchemaBytes)
	details := []string{}
	if drift {
		details = append(details, "Contract drift detected. The generated schema does not match openapi.json.")
	}

	c.JSON(http.StatusOK, models.ContractDriftCheckResponse{
		Drift:   drift,
		Details: details,
	})
}
