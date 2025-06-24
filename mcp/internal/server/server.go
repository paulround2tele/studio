package server

import (
	"database/sql"
	"log"
	"mcp/internal/config"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

// Server is the MCP server.
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
	s.routes()
	return s
}

// StartHTTPServer starts the Gin HTTP server.
func (s *Server) StartHTTPServer() {
	log.Println("Starting HTTP server on :8080")
	if err := s.Router.Run(":8080"); err != nil {
		log.Fatalf("could not start HTTP server: %v", err)
	}
}