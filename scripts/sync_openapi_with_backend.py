#!/usr/bin/env python3
"""
Script to update openapi.yaml to match Go backend routes.
Removes endpoints and fields not present in Go backend (e.g., /api/v2/auth/permissions, permissions array in user response).
"""
import yaml
import re

OPENAPI_PATH = "backend/docs/openapi.yaml"

# List of endpoints to remove (not present in Go backend)
REMOVE_ENDPOINTS = [
    "/api/v2/auth/permissions",
]

# Remove 'permissions' from user response schemas
REMOVE_USER_FIELDS = ["permissions", "roles"]


def load_yaml(path):
    with open(path, "r") as f:
        return yaml.safe_load(f)

def save_yaml(data, path):
    with open(path, "w") as f:
        yaml.dump(data, f, sort_keys=False, allow_unicode=True)

def remove_paths(openapi):
    paths = openapi.get("paths", {})
    for ep in REMOVE_ENDPOINTS:
        if ep in paths:
            print(f"Removing endpoint: {ep}")
            del paths[ep]
    openapi["paths"] = paths

def remove_user_fields(openapi):
    # Remove from all schemas that look like user
    components = openapi.get("components", {})
    schemas = components.get("schemas", {})
    for schema_name, schema in schemas.items():
        if not isinstance(schema, dict):
            continue
        if "properties" in schema:
            for field in REMOVE_USER_FIELDS:
                if field in schema["properties"]:
                    print(f"Removing field '{field}' from schema '{schema_name}'")
                    del schema["properties"][field]
    components["schemas"] = schemas
    openapi["components"] = components

def main():
    openapi = load_yaml(OPENAPI_PATH)
    remove_paths(openapi)
    remove_user_fields(openapi)
    save_yaml(openapi, OPENAPI_PATH)
    print("openapi.yaml updated to match Go backend.")

if __name__ == "__main__":
    main()
