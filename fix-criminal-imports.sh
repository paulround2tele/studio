#!/bin/bash

# SYSTEMATIC CRIMINAL WRAPPER ELIMINATION SCRIPT
# Replace all amateur bridge imports with professional generated types

echo "=== OBLITERATING CRIMINAL WRAPPER IMPORTS ==="

# Replace CampaignViewModel with Campaign
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/CampaignViewModel/Campaign/g'

# Replace types-bridge imports with direct model imports
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i "s|from '@/lib/api-client/types-bridge'|from '@/lib/api-client/models'|g"

# Replace professional-types imports with direct model imports  
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i "s|from '@/lib/api-client/professional-types'|from '@/lib/api-client/models'|g"

# Replace client-bridge imports with direct API imports
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i "s|from '@/lib/api-client/client-bridge'|from '@/lib/api-client/apis'|g"

echo "=== CRIMINAL WRAPPER IMPORTS OBLITERATED ==="
echo "Next: Fix specific type mismatches manually"
