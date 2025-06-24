package server

import (
	"database/sql"
	"mcp/internal/config"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

// Server represents the MCP server with database and bridge access.
// Note: This struct is kept for compatibility but the actual MCP server
// now runs as JSON-RPC 2.0 over stdio, not HTTP.
type Server struct {
	Router *gin.Engine
	DB     *sql.DB
	Bridge *Bridge
}

// NewServer creates a new MCP server but does not start it.
func NewServer() *Server {
	router := gin.Default()

	db, err := sql.Open("postgres", config.Flags.DbUrl)
	if err != nil {
		panic(err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		panic(err)
	}

	s := &Server{
		Router: router,
		DB:     db,
		Bridge: NewBridge(db, cwd),
	}
	return s
}
