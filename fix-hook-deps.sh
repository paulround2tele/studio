#!/bin/bash

# Fix React Hook dependency array warnings

# useCampaignSSE.ts - add dispatch
sed -i '413,414s/\], \[/], [dispatch, /' src/hooks/useCampaignSSE.ts

# useCachedAuth.tsx - add authApi dependencies  
sed -i '147s/], \[/], [authApi, /' src/lib/hooks/useCachedAuth.tsx
sed -i '280s/], \[/], [authApi, /' src/lib/hooks/useCachedAuth.tsx
sed -i '300s/], \[/], [authApi, router, /' src/lib/hooks/useCachedAuth.tsx

# useSSEFallback.ts - add triggerFallback and startFallbackPolling
sed -i '70s/], \[/], [triggerFallback, /' src/hooks/useSSEFallback.ts
sed -i '96s/], \[/], [startFallbackPolling, /' src/hooks/useSSEFallback.ts

# useInfiniteScroll.ts - wrap currentItems in useMemo
sed -i '85s/], \[/], [data.length, /' src/lib/hooks/useInfiniteScroll.ts

echo "Fixed hook dependencies"
