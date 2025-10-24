#!/bin/bash

# Fix KeywordSet usages in keyword-sets/page.tsx
sed -i 's/useState<KeywordSet\[\]>/useState<LocalKeywordSet[]>/g' src/app/keyword-sets/page.tsx

# Fix Persona usages in personas/page.tsx
sed -i 's/: Persona\[\]/: LocalPersona[]/g' src/app/personas/page.tsx
sed -i 's/(personas: Persona\[/(personas: LocalPersona[/g' src/app/personas/page.tsx

# Fix Persona and Proxy usages in CampaignDashboard.tsx
sed -i 's/httpPersonas: Persona\[/httpPersonas: LocalPersona[/g' src/components/campaigns/CampaignDashboard.tsx
sed -i 's/dnsPersonas: Persona\[/dnsPersonas: LocalPersona[/g' src/components/campaigns/CampaignDashboard.tsx
sed -i 's/proxies: Proxy\[/proxies: LocalProxy[/g' src/components/campaigns/CampaignDashboard.tsx

# Fix Persona and Proxy usages in PersonaAssignmentSection.tsx
sed -i 's/ | Persona\[\]/ | LocalPersona[]/g' src/components/campaigns/sections/PersonaAssignmentSection.tsx
sed -i 's/proxies?: Proxy\[\]/proxies?: LocalProxy[]/g' src/components/campaigns/sections/PersonaAssignmentSection.tsx
sed -i 's/ as Proxy\[\]/ as LocalProxy[]/g' src/components/campaigns/sections/PersonaAssignmentSection.tsx
sed -i 's/(p: Proxy)/(p: LocalProxy)/g' src/components/campaigns/sections/PersonaAssignmentSection.tsx

echo "Fixed type usages"
