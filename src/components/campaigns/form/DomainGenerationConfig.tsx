import React, { memo } from 'react';
import { Control } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Form values type using OpenAPI types directly
type CampaignSelectedType = import('@/lib/api-client/types').components['schemas']['CreateCampaignRequest']['campaignType'];
type DomainSourceSelectionMode = "none" | "upload" | "campaign_output";
type CampaignPhase = "domain_generation" | "dns_validation" | "http_keyword_validation" | "completed" | "idle";

interface CampaignFormValues {
  name: string;
  description?: string;
  selectedType: CampaignSelectedType;
  domainSourceSelectionMode: DomainSourceSelectionMode;
  sourceCampaignId?: string;
  sourcePhase?: CampaignPhase;
  uploadedDomainsFile?: File | null;
  uploadedDomainsContentCache?: string[];
  initialDomainsToProcessCount?: number;
  generationPattern: "prefix_variable" | "suffix_variable" | "both_variable" | "constant_only";
  constantPart: string;
  allowedCharSet: string;
  tldsInput: string;
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  maxDomainsToGenerate?: number;
  targetKeywordsInput?: string;
  scrapingRateLimitRequests?: number;
  scrapingRateLimitPer?: 'second' | 'minute';
  requiresJavaScriptRendering?: boolean;
  rotationIntervalSeconds: number;
  processingSpeedPerMinute: number;
  batchSize: number;
  retryAttempts: number;
  targetHttpPorts?: number[];
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode: 'none' | 'single' | 'rotate_active';
  assignedProxyId?: string;
  launchSequence?: boolean;
}

interface DomainGenerationConfigProps {
  control: Control<CampaignFormValues>;
  totalPossible: number;
  calculationDetails?: {
    pattern: string;
    charSetLength: number;
    prefixLength: number;
    suffixLength: number;
    tldCount: number;
    combinations: number;
  };
  calculationWarning?: string | null;
  isCalculationSafe: boolean;
  amount?: number; // Amount field value for remaining calculation
}

/**
 * Memoized domain generation configuration component
 * Prevents re-renders when form values haven't changed
 */
const DomainGenerationConfig = memo<DomainGenerationConfigProps>(({
  control,
  totalPossible,
  calculationDetails,
  calculationWarning,
  isCalculationSafe,
  amount
}) => {
  
  // Calculate remaining domains
  const remainingDomains = amount && totalPossible > 0 ? Math.max(0, totalPossible - amount) : 0;
  return (
    <Card className="p-4 pt-2 border-dashed">
      <CardHeader className="p-2">
        <CardTitle className="text-base">Domain Generation Configuration</CardTitle>
        <CardDescription className="text-xs">Configure how domains will be generated.</CardDescription>
      </CardHeader>
      <CardContent className="p-2 space-y-4">
        <FormField control={control} name="generationPattern" render={({ field }) => (
          <FormItem>
            <FormLabel>Generation Pattern</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="prefix_variable">Prefix + Variable Characters (e.g., [aaa]constant.com)</SelectItem>
                <SelectItem value="suffix_variable">Variable Characters + Suffix (e.g., constant[aaa].com)</SelectItem>
                <SelectItem value="both_variable">Prefix + Variable + Suffix (e.g., [aaa]constant[bbb].com)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="constantPart" render={({ field }) => (
          <FormItem>
            <FormLabel>Constant Part</FormLabel>
            <FormControl>
              <Input placeholder="e.g., business, tech, shop" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="allowedCharSet" render={({ field }) => (
          <FormItem>
            <FormLabel>Allowed Character Set</FormLabel>
            <FormControl>
              <Input placeholder="e.g., abcdefghijklmnopqrstuvwxyz0123456789" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="tldsInput" render={({ field }) => (
          <FormItem>
            <FormLabel>TLDs</FormLabel>
            <Select onValueChange={(value) => {
              // Handle multiple selection by appending to existing value
              const currentValue = field.value || '';
              const existingTlds = currentValue.split(',').map(tld => tld.trim()).filter(tld => tld.length > 0);
              if (!existingTlds.includes(value)) {
                const newValue = existingTlds.length > 0 ? `${currentValue}, ${value}` : value;
                field.onChange(newValue);
              }
            }} value="">
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select TLDs" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-60">
                <SelectItem value=".com">.com</SelectItem>
                <SelectItem value=".net">.net</SelectItem>
                <SelectItem value=".org">.org</SelectItem>
                <SelectItem value=".io">.io</SelectItem>
                <SelectItem value=".co">.co</SelectItem>
                <SelectItem value=".uk">.uk</SelectItem>
                <SelectItem value=".de">.de</SelectItem>
                <SelectItem value=".fr">.fr</SelectItem>
                <SelectItem value=".ca">.ca</SelectItem>
                <SelectItem value=".au">.au</SelectItem>
                <SelectItem value=".in">.in</SelectItem>
                <SelectItem value=".cn">.cn</SelectItem>
                <SelectItem value=".jp">.jp</SelectItem>
                <SelectItem value=".br">.br</SelectItem>
                <SelectItem value=".ru">.ru</SelectItem>
                <SelectItem value=".mx">.mx</SelectItem>
                <SelectItem value=".es">.es</SelectItem>
                <SelectItem value=".it">.it</SelectItem>
                <SelectItem value=".nl">.nl</SelectItem>
                <SelectItem value=".se">.se</SelectItem>
                <SelectItem value=".no">.no</SelectItem>
                <SelectItem value=".fi">.fi</SelectItem>
                <SelectItem value=".dk">.dk</SelectItem>
                <SelectItem value=".pl">.pl</SelectItem>
                <SelectItem value=".cz">.cz</SelectItem>
                <SelectItem value=".be">.be</SelectItem>
                <SelectItem value=".ch">.ch</SelectItem>
                <SelectItem value=".at">.at</SelectItem>
                <SelectItem value=".pt">.pt</SelectItem>
                <SelectItem value=".gr">.gr</SelectItem>
                <SelectItem value=".hu">.hu</SelectItem>
                <SelectItem value=".ro">.ro</SelectItem>
                <SelectItem value=".bg">.bg</SelectItem>
                <SelectItem value=".hr">.hr</SelectItem>
                <SelectItem value=".si">.si</SelectItem>
                <SelectItem value=".sk">.sk</SelectItem>
                <SelectItem value=".lt">.lt</SelectItem>
                <SelectItem value=".lv">.lv</SelectItem>
                <SelectItem value=".ee">.ee</SelectItem>
                <SelectItem value=".is">.is</SelectItem>
                <SelectItem value=".ie">.ie</SelectItem>
                <SelectItem value=".lu">.lu</SelectItem>
                <SelectItem value=".mt">.mt</SelectItem>
                <SelectItem value=".cy">.cy</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-2">
              <Input
                placeholder="Selected TLDs (e.g., .com, .net, .org)"
                value={field.value || ''}
                onChange={field.onChange}
                className="text-sm"
              />
            </div>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={control} name="prefixVariableLength" render={({ field }) => (
            <FormItem>
              <FormLabel>Prefix Variable Length</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={control} name="suffixVariableLength" render={({ field }) => (
            <FormItem>
              <FormLabel>Suffix Variable Length</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={control} name="maxDomainsToGenerate" render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
              <Input type="number" min="1" placeholder="1000" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Performance-aware domain calculation display */}
        {totalPossible > 0 && (
          <div className={`p-3 rounded-md ${isCalculationSafe ? 'bg-muted' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="text-sm font-medium text-muted-foreground">Total Possible Combinations</div>
            <div className={`text-lg font-semibold ${!isCalculationSafe ? 'text-yellow-700' : ''}`}>
              {totalPossible.toLocaleString()} domains
            </div>
            {calculationDetails && (
              <div className="text-xs text-muted-foreground mt-1">
                Pattern: {calculationDetails.pattern} •
                Character set length: {calculationDetails.charSetLength} •
                {calculationDetails.pattern === 'prefix_variable' && `Prefix length: ${calculationDetails.prefixLength} • `}
                {calculationDetails.pattern === 'suffix_variable' && `Suffix length: ${calculationDetails.suffixLength} • `}
                {calculationDetails.pattern === 'both_variable' && `Prefix: ${calculationDetails.prefixLength}, Suffix: ${calculationDetails.suffixLength} • `}
                TLD count: {calculationDetails.tldCount}
              </div>
            )}
            {calculationWarning && (
              <div className="text-xs text-yellow-700 mt-2 font-medium">
                ⚠️ {calculationWarning}
              </div>
            )}
          </div>
        )}

        {/* Remaining Domains Section */}
        {totalPossible > 0 && amount && amount > 0 && (
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
            <div className="text-sm font-medium text-blue-700">Remaining Domains</div>
            <div className="text-lg font-semibold text-blue-800">
              {remainingDomains.toLocaleString()} domains
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Available after generating {amount.toLocaleString()} domains
            </div>
          </div>
        )}

        {/* Read-only total display for form compatibility */}
        <FormItem>
          <FormLabel>Total Possible Domains</FormLabel>
          <FormControl>
            <Input 
              value={totalPossible.toString()} 
              readOnly 
              placeholder="Calculated total domains"
              className={!isCalculationSafe ? 'border-yellow-300 bg-yellow-50' : ''}
            />
          </FormControl>
        </FormItem>
      </CardContent>
    </Card>
  );
});

DomainGenerationConfig.displayName = 'DomainGenerationConfig';

export default DomainGenerationConfig;