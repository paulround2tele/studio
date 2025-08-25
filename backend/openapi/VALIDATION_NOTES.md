Why this spec exists and how it will be validated

- Spec is authored from handlers under backend/internal/api. The old swagger.yaml/json are gone; docs.go is swaggo-only and 3.0-ish.
- We will validate with kin-openapi against OpenAPI 3.1.0 and refuse to generate servers/clients until it’s clean.
- Envelope-first: Every response is APIResponse with success/data/error/metadata/requestId. Data is untyped here and refined per endpoint during migration.
- Cookie auth: cookieAuth (domainflow_session). No bearer. SSE endpoints return text/event-stream.
- Next steps:
  1) Add precise response data shapes per endpoint group (personas, proxies, keyword-sets, campaigns) by reading the DTOs in response_models.go and models/*.
  2) Add error response components with examples per common failure paths.
  3) Run validation and tighten schemas (no additionalProperties where not needed).
  4) After spec is green, wire oapi-codegen v2 (chi server, strict-server, models) and replace gin.
