Summary

The backend exposes an OpenAPI specification at /api/openapi.yaml, served as a static file in cmd/apiserver/main.go:

router.StaticFile("/api/openapi.yaml", "./docs/openapi.yaml")
log.Println("Registered OpenAPI 3.0 specification route under /api/openapi.yaml")

The specification file exists at backend/docs/openapi.yaml and declares openapi: 3.0.3. However, this file only defines eight API paths (e.g., /ping, /api/v2/auth/login, /api/v2/auth/logout, etc.). The corresponding JSON version lists just three paths (/auth/login, /auth/me, /campaigns). Thus the OpenAPI 3.0 specification covers only a small subset of the available backend endpoints.

A stub for contract testing (internal/apicontracttester/api_contract_tester.go) notes that full OpenAPI validation requires additional dependencies and is not implemented:

IMPORTANT: This package is a stub implementation...
go get github.com/getkin/kin-openapi/openapi3
go get github.com/getkin/kin-openapi/openapi3filter

Several leftover artifacts from the prior gin‑swagger setup remain:

Old Swagger files (swagger.yaml.old, swagger.json.old, docs.go.old) are still in backend/docs

package.json contains a script that runs swag init and then converts the resulting Swagger spec with swagger2openapi

The CI contract validation script scripts/validate-contracts.sh also calls swag init before converting to OpenAPI

These scripts imply reliance on Swagger tooling even though the codebase no longer includes swaggo annotations.

Some documentation (e.g., mcp/internal/server/bridge.go) still references gin-swagger and Swagger 2.0 detection logic.

Conclusion

OpenAPI 3.0 is only partially implemented in the Go backend:

The served specification documents only a few endpoints.

The contract-testing tool lacks real OpenAPI validation.

Build scripts still depend on swaggo-generated Swagger output.

Legacy Swagger files and references remain in the repository.

The project would benefit from completing the OpenAPI 3.0 migration, removing leftover Swagger artifacts, and ensuring all endpoints are documented in the new specification.