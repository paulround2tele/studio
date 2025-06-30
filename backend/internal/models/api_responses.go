package models

// StandardAPIResponse is the consistent response wrapper for all API endpoints
type StandardAPIResponse struct {
	Status  string      `json:"status"` // "success" or "error"
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message"`
	Error   string      `json:"error,omitempty"`
}

// SuccessResponse creates a successful API response
func SuccessResponse(data interface{}, message string) StandardAPIResponse {
	return StandardAPIResponse{
		Status:  "success",
		Data:    data,
		Message: message,
	}
}

// StandardErrorResponse creates an error API response
func StandardErrorResponse(message string, err error) StandardAPIResponse {
	response := StandardAPIResponse{
		Status:  "error",
		Message: message,
	}
	if err != nil {
		response.Error = err.Error()
	}
	return response
}

// EmptySuccessResponse creates a successful response with no data
func EmptySuccessResponse(message string) StandardAPIResponse {
	return StandardAPIResponse{
		Status:  "success",
		Message: message,
	}
}
