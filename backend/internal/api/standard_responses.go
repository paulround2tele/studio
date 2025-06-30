package api

import (
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// respondWithStandardJSON sends a standardized JSON response
func respondWithStandardJSON(c *gin.Context, statusCode int, response models.StandardAPIResponse) {
	c.JSON(statusCode, response)
}

// respondWithStandardSuccess sends a standardized success response
func respondWithStandardSuccess(c *gin.Context, statusCode int, data interface{}, message string) {
	response := models.SuccessResponse(data, message)
	c.JSON(statusCode, response)
}

// respondWithStandardError sends a standardized error response
func respondWithStandardError(c *gin.Context, statusCode int, message string, err error) {
	response := models.StandardErrorResponse(message, err)
	c.JSON(statusCode, response)
}
