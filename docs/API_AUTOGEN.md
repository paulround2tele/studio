# API Autogeneration Pipeline

This repo no longer tolerates manual YAML acrobatics. Use the automated pipeline to bundle, validate, parity-check, and generate clients.

## One-shot run

- npm run api:autogen

Pipeline steps:
- Bundle modular spec -> backend/openapi/dist/openapi.yaml
- Validate with kin-openapi and Redocly (errors block, warnings allowed)
- Dump Gin routes via backend/dump_routes.go
- Check strict parity against bundled paths (fails on diff)
- Generate:
  - TypeScript types (openapi-typescript) -> src/lib/api-client/types.ts
  - typescript-axios client -> src/lib/api-client
  - Static docs -> src/lib/api-client/docs

## CI suggestion

Run these in CI:
- npm run api:bundle
- npm run api:validate-bundle
- bash -lc 'cd backend && go run ./dump_routes.go | tee routes.dump.txt'
- npm run api:check-routes
- npm run gen:types
- npm run gen:clients
- npm run gen:docs

Any route mismatch will fail the build.

## Notes

- The Redocly localhost server URL warning is tolerated. You can change it if you need zero warnings.
- If Gin routes change, the autogen script re-dumps before checking. Keep dump_routes.go in sync with router registrations.
