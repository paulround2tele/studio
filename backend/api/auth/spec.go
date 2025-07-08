package auth

import (
	"reflect"
	
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/utils"
)

// AddAuthPaths adds authentication-related paths to the OpenAPI specification
func AddAuthPaths(spec *openapi3.T) {
	addAuthSchemas(spec)
	addLoginPath(spec)
	addLogoutPath(spec)
	addRefreshPath(spec)
	addMePath(spec)
	addChangePasswordPath(spec)
}

// addLoginPath adds the login endpoint
func addLoginPath(spec *openapi3.T) {
	loginOp := &openapi3.Operation{
		OperationID: "login",
		Summary:     "User login",
		Description: "Authenticates a user and creates a session",
		Tags:        []string{"Auth"},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/LoginRequest",
						},
					},
				},
			},
		},
	}

	// Add responses
	loginOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Login successful"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/LoginResponse",
				},
			},
		},
	})

	loginOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	loginOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	loginOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/auth/login", &openapi3.PathItem{
		Post: loginOp,
	})
}

// addLogoutPath adds the logout endpoint
func addLogoutPath(spec *openapi3.T) {
	logoutOp := &openapi3.Operation{
		OperationID: "logout",
		Summary:     "User logout",
		Description: "Invalidates the current session and clears session cookie",
		Tags:        []string{"Auth"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}

	logoutOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Logout successful"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/StandardAPIResponse",
				},
			},
		},
	})

	logoutOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/auth/logout", &openapi3.PathItem{
		Post: logoutOp,
	})
}

// addRefreshPath adds the refresh session endpoint
func addRefreshPath(spec *openapi3.T) {
	refreshOp := &openapi3.Operation{
		OperationID: "refreshSession",
		Summary:     "Refresh session",
		Description: "Refreshes the current session",
		Tags:        []string{"Auth"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}

	refreshOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Session refreshed successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/RefreshResponse",
				},
			},
		},
	})

	refreshOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	refreshOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/auth/refresh", &openapi3.PathItem{
		Post: refreshOp,
	})
}

// addMePath adds the current user endpoint
func addMePath(spec *openapi3.T) {
	meOp := &openapi3.Operation{
		OperationID: "getCurrentUser",
		Summary:     "Get current user",
		Description: "Returns information about the currently authenticated user",
		Tags:        []string{"Auth"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}

	meOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Current user information"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/User",
				},
			},
		},
	})

	meOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	meOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/me", &openapi3.PathItem{
		Get: meOp,
	})
}

// addChangePasswordPath adds the change password endpoint
func addChangePasswordPath(spec *openapi3.T) {
	changePasswordOp := &openapi3.Operation{
		OperationID: "changePassword",
		Summary:     "Change password",
		Description: "Changes the password for the currently authenticated user",
		Tags:        []string{"Auth"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/ChangePasswordRequest",
						},
					},
				},
			},
		},
	}

	changePasswordOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Password changed successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/StandardAPIResponse",
				},
			},
		},
	})

	changePasswordOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	changePasswordOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	changePasswordOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/change-password", &openapi3.PathItem{
		Post: changePasswordOp,
	})
}

// addAuthSchemas adds authentication-related schemas
func addAuthSchemas(spec *openapi3.T) {
	// LoginRequest schema
	spec.Components.Schemas["LoginRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Login credentials",
			Required:    []string{"email", "password"},
			Properties: map[string]*openapi3.SchemaRef{
				"email": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "email",
						Description: "User email address",
					},
				},
				"password": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   6,
						Description: "User password (minimum 6 characters)",
					},
				},
				"rememberMe": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether to remember the user session",
					},
				},
				"captchaToken": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "CAPTCHA token for bot protection",
					},
				},
			},
		},
	}

	// LoginResponse schema
	spec.Components.Schemas["LoginResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Login response",
			Properties: map[string]*openapi3.SchemaRef{
				"user": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/User"},
						},
					},
				},
				"sessionId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Session identifier",
					},
				},
				"expiresAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Session expiration time",
					},
				},
			},
		},
	}

	// RefreshResponse schema
	spec.Components.Schemas["RefreshResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Session refresh response",
			Properties: map[string]*openapi3.SchemaRef{
				"sessionId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "New session identifier",
					},
				},
				"expiresAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "New session expiration time",
					},
				},
			},
		},
	}

	// ChangePasswordRequest schema
	spec.Components.Schemas["ChangePasswordRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Password change request",
			Required:    []string{"currentPassword", "newPassword"},
			Properties: map[string]*openapi3.SchemaRef{
				"currentPassword": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Current password",
					},
				},
				"newPassword": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   12,
						Description: "New password (minimum 12 characters)",
					},
				},
			},
		},
	}

	// Auto-generate User schema from Go struct
	utils.AddStructSchema(spec, reflect.TypeOf(models.User{}), "User")
}