package handlers

import (
	"bytes"
	"mcp/internal/config"
	"mcp/internal/models"
	"net/http"
	"os/exec"

	"github.com/gin-gonic/gin"
)

// RunTerminalCommandHandler handles requests to execute a terminal command.
func RunTerminalCommandHandler(c *gin.Context) {
	if !config.Flags.AllowTerminal {
		c.JSON(http.StatusForbidden, gin.H{"error": "Terminal access is disabled."})
		return
	}

	var req models.RunTerminalCommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cmd := exec.Command("sh", "-c", req.Command)
	var out, errOut bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errOut

	err := cmd.Run()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  err.Error(),
			"stdout": out.String(),
			"stderr": errOut.String(),
		})
		return
	}

	c.JSON(http.StatusOK, models.RunTerminalCommandResponse{
		Stdout: out.String(),
		Stderr: errOut.String(),
	})
}

// ApplyCodeChangeHandler handles requests to apply a diff to a file.
func ApplyCodeChangeHandler(c *gin.Context) {
	if !config.Flags.AllowMutation {
		c.JSON(http.StatusForbidden, gin.H{"error": "Code mutation is disabled."})
		return
	}

	var req models.ApplyCodeChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// The filename is specified inside the diff.
	// -p0 tells patch not to strip any path prefixes. This is correct for our diff format.
	cmd := exec.Command("patch", "-p0")
	cmd.Dir = "." // Run from the git root directory
	cmd.Stdin = bytes.NewBufferString(req.Diff)
	var out, errOut bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errOut

	err := cmd.Run()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  err.Error(),
			"stdout": out.String(),
			"stderr": errOut.String(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Patch applied successfully",
		"stdout":  out.String(),
	})
}
