#!/bin/bash

# Generate OpenAPI 3.0 spec using ogen
echo "Generating OpenAPI 3.0 specification with ogen..."

cd backend

# Install ogen if not already installed
go install github.com/ogen-go/ogen/cmd/ogen@latest

# Create ogen configuration
cat > ogen.yml << EOF
# OpenAPI 3.0 generation configuration for ogen
package: api
clean: true
target: docs
debug: false
EOF

# Generate the OpenAPI spec from code annotations
# For now, we'll use swag to generate the basic spec and then convert it
swag init -g cmd/apiserver/main.go -o docs --parseDependency --parseInternal

# Convert the swagger.json to openapi.yaml
if [ -f "docs/swagger.json" ]; then
    # Convert JSON to YAML and update to OpenAPI 3.0 format
    python3 -c "
import json
import yaml

with open('docs/swagger.json', 'r') as f:
    data = json.load(f)

# Update to OpenAPI 3.0 format
data['openapi'] = '3.0.0'
if 'swagger' in data:
    del data['swagger']

# Update components structure
if 'definitions' in data:
    data['components'] = {'schemas': data['definitions']}
    del data['definitions']

# Update paths to use OpenAPI 3.0 structure
for path, methods in data.get('paths', {}).items():
    for method, spec in methods.items():
        if isinstance(spec, dict):
            # Add operationId from existing @ID annotations
            if 'summary' in spec and not spec.get('operationId'):
                # Generate operationId from summary
                operation_id = spec['summary'].lower().replace(' ', '_').replace('-', '_')
                spec['operationId'] = operation_id

with open('docs/openapi.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
"
    echo "OpenAPI 3.0 spec generated at docs/openapi.yaml"
else
    echo "Error: swagger.json not found"
    exit 1
fi

echo "OpenAPI generation complete!"
