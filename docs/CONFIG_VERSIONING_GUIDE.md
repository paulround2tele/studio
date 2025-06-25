# Configuration Versioning and Deployment Checks

This guide describes how DomainFlow manages configuration files across environments and how to prevent drift during deployments.

## Versioned Configuration Directory

Configuration files are stored under a dedicated `config/` directory with an environment and version suffix. Example:

```
config/
  dev-1.0.json
  staging-1.0.json
  prod-1.0.json
```

Each file conforms to the schema defined in `backend/internal/config/config_schema.json`.

## Update Process

1. **Create a New Version**
   - Copy the previous environment file and increment the version number.
   - Update values as needed for the new release.
2. **Validate**
   - Run `go run ./cmd/apiserver-no-db` or `make run-no-db` and ensure `ValidateConfigBytes` reports no errors.
   - CI pipelines should call the Go unit tests to validate configuration before allowing a deploy.
3. **Commit**
   - Commit the new file along with any related code changes.
   - Tag the release to link configuration versions with application versions.

## Deployment Enforcement

Deployment scripts must load the configuration using `config.Load()` which now performs schema validation. If validation fails, deployment should abort.

Regular checks comparing the deployed configuration version with the repository ensure that stale configs are detected early, preventing drift across environments.
