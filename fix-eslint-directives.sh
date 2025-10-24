#!/bin/bash

# Remove unused eslint-disable directives

# memoization.ts
sed -i '13d' src/lib/utils/memoization.ts
sed -i '62d' src/lib/utils/memoization.ts

# phaseEnumAudit.ts  
sed -i '21d' src/lib/utils/phaseEnumAudit.ts
sed -i '29d' src/lib/utils/phaseEnumAudit.ts

# authCookieCache.ts
sed -i '9d' src/server/authCookieCache.ts

# toRtkError.test.ts
sed -i '3d' src/tests/pipeline/toRtkError.test.ts

echo "Removed unused eslint-disable directives"
