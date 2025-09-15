# ADR-0001: API Source of Truth Policy

## Status

Accepted

## Context

The DomainFlow platform currently maintains multiple sources of API contract definitions and generated client code. This leads to potential inconsistencies, manual synchronization issues, and confusion about which source is authoritative for API changes.

Current state:
- OpenAPI specifications are modular and located under `backend/openapi/`
- Generated TypeScript client code is in `src/lib/api-client/`
- Manual edits to generated client code have been occurring
- Contract sync validation exists but runs separately from the main development workflow

## Decision

We establish a **spec-first** approach as the single Source of Truth (SoT) for all API contracts:

1. **Authoritative Source**: Raw OpenAPI specification files under `backend/openapi/src/` (or similar modular structure)
2. **Generated Artifacts**: All client code, types, and documentation are generated from the bundled specification
3. **No Manual Edits**: Generated client code (`src/lib/api-client/`) must not be manually edited
4. **Automated Validation**: Contract alignment validation is integrated into the pre-commit workflow
5. **Bundle Process**: Modular specs are bundled into `backend/openapi/dist/openapi.yaml` before generation

## Consequences

### Positive
- Single authoritative source eliminates ambiguity
- Automated generation ensures consistency between backend and frontend
- Pre-commit hooks prevent manual edits to generated code
- Contract validation catches misalignments early
- Supports modular OpenAPI specification development

### Negative
- Requires discipline to make changes only in the source specifications
- Generated code cannot be customized without changing the source spec
- Additional tooling complexity for bundling and validation

### Neutral
- Migration path preserves existing npm scripts for generation
- Existing contract sync validation logic is preserved but integrated

## Action Items

1. Ensure all API changes go through the OpenAPI specification first
2. Maintain the existing npm script workflow for generation (`api:regen:quick`)
3. Remove the standalone `git_push.sh` script that encourages independent client commits
4. Integrate contract sync validation into the main pre-commit hook
5. Document the spec-first workflow for all team members

## Implementation Notes

- The pre-commit hook will continue to block manual edits to generated client code
- Contract validation will run automatically when relevant files are changed
- The bundling process remains controlled by existing npm scripts
- Future improvements may unify contract sync logic directly into the Husky hook

## References

- Existing contract sync scripts: `scripts/contract-sync/`
- OpenAPI specification location: `backend/openapi/`
- Generated client location: `src/lib/api-client/`
- Related documentation: `backend/openapi/INVENTORY.md`