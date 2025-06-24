package utils

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// GetClientIP extracts the real client IP address from the request.
// This function handles X-Forwarded-For, X-Real-IP headers and falls back to RemoteAddr.
// Priority order:
//  1. X-Forwarded-For (first IP if multiple)
//  2. X-Real-IP
//  3. gin.Context.ClientIP() (which handles RemoteAddr)
func GetClientIP(c *gin.Context) string {
	// Check for forwarded IP first
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		// Take the first IP if multiple are present (leftmost is original client)
		ips := strings.Split(forwarded, ",")
		clientIP := strings.TrimSpace(ips[0])
		if clientIP != "" {
			return clientIP
		}
	}

	// Check for real IP header (commonly used by some proxy setups)
	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" {
		return strings.TrimSpace(realIP)
	}

	// Fall back to Gin's built-in method which handles RemoteAddr
	return c.ClientIP()
}
