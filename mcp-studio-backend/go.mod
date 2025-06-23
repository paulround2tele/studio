module github.com/fntelecomllc/studio/mcp-studio-backend

go 1.23.0

require (
	github.com/fntelecomllc/studio/backend v0.0.0
	github.com/jmoiron/sqlx v1.4.0
	github.com/lib/pq v1.10.9
)

require github.com/google/uuid v1.6.0 // indirect

// Local backend dependency
replace github.com/fntelecomllc/studio/backend => ../backend
