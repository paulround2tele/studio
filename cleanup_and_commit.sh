#!/bin/bash
cd /home/vboxuser/studio

# Delete the deprecated manually generated openapi.yaml
rm backend/docs/openapi.yaml

# Check git status
echo "Git status after deletion:"
git status

# Add the changes
echo "Adding changes to git..."
git add .

# Commit the changes
echo "Committing changes..."
git commit -m "Remove deprecated manually generated openapi.yaml

- Deleted backend/docs/openapi.yaml (manually maintained)
- Now using only swagger.yaml (swaggo auto-generated)
- Added missing campaign results endpoints annotations
- Complete API sync between Go backend, OpenAPI spec, and MCP server"

# Push the changes
echo "Pushing changes..."
git push

echo "✅ Successfully deleted deprecated openapi.yaml and pushed changes!"
