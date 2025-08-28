//go:build legacy_gin
// +build legacy_gin

// File: backend/internal/api/middleware.go
package api

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// GinAPIKeyAuthMiddleware provides API Key authentication for Gin handlers.
func GinAPIKeyAuthMiddleware(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next() // Proceed to the next handler for OPTIONS requests
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Printf("Gin Auth Error: Missing Authorization header from %s for %s %s", c.Request.RemoteAddr, c.Request.Method, c.Request.RequestURI)
			respondWithErrorGin(c, http.StatusUnauthorized, "Authorization header required")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			log.Printf("Gin Auth Error: Invalid Authorization header format from %s for %s %s", c.Request.RemoteAddr, c.Request.Method, c.Request.RequestURI)
			respondWithErrorGin(c, http.StatusUnauthorized, "Invalid Authorization header format")
			c.Abort()
			return
		}

		if parts[1] != apiKey {
			log.Printf("Gin Auth Error: Invalid API Key provided by %s for %s %s", c.Request.RemoteAddr, c.Request.Method, c.Request.RequestURI)
			respondWithErrorGin(c, http.StatusUnauthorized, "Invalid API Key")
			c.Abort()
			return
		}
		c.Next() // Proceed to the next handler
	}
}
