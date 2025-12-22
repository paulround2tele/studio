/**
 * Phase Configuration Display Component
 * Displays domain discovery config, DNS/HTTP personas, and keyword sets
 * used in a campaign - allows users to view config after creation
 */

'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Globe, Server, Search, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Interfaces matching actual backend response structure
interface DomainGenerationConfig {
  patternType?: string;
  numDomainsToGenerate?: number;
  tld?: string;
  constantString?: string;
  characterSet?: string;
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  variableLength?: number;
  batchSize?: number;
  offsetStart?: number;
}

interface DnsValidationConfig {
  name?: string;
  personaIds?: string[];
  timeout?: number;
  maxRetries?: number;
  batchSize?: number;
  validation_types?: string[];
}

interface HttpKeywordValidationConfig {
  name?: string;
  personaIds?: string[];
  keywordSetIds?: string[];
  keywords?: string[];
  adHocKeywords?: string[];
  enrichmentEnabled?: boolean;
  microCrawlEnabled?: boolean;
  microCrawlMaxPages?: number;
  microCrawlByteBudget?: number;
}

interface PhaseConfigDisplayProps {
  configs?: Record<string, unknown>;
  configsPresent?: Record<string, boolean>;
  className?: string;
  defaultExpanded?: boolean;
}

interface ConfigSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  isEmpty?: boolean;
}

function ConfigSection({ title, icon, children, defaultExpanded = false, isEmpty = false }: ConfigSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  if (isEmpty) {
    return (
      <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 text-gray-500">
          {icon}
          <span className="font-medium">{title}</span>
          <Badge variant="secondary" className="ml-auto text-xs">Not Configured</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        {icon}
        <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
        <Badge variant="outline" className="ml-auto text-xs">Configured</Badge>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t bg-gray-50/50 dark:bg-gray-800/30">
          {children}
        </div>
      )}
    </div>
  );
}

function ConfigRow({ label, value, type = 'text' }: { label: string; value: unknown; type?: 'text' | 'list' | 'number' | 'boolean' }) {
  if (value === undefined || value === null || value === '') return null;

  const renderValue = () => {
    if (type === 'list' && Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400 italic">None</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 10).map((item, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {String(item)}
            </Badge>
          ))}
          {value.length > 10 && (
            <Badge variant="outline" className="text-xs">
              +{value.length - 10} more
            </Badge>
          )}
        </div>
      );
    }
    if (type === 'number') {
      return <span className="font-mono">{Number(value).toLocaleString()}</span>;
    }
    if (type === 'boolean') {
      return <Badge variant={value ? 'default' : 'secondary'} className="text-xs">{value ? 'Yes' : 'No'}</Badge>;
    }
    return <span>{String(value)}</span>;
  };

  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="text-sm text-gray-900 dark:text-gray-100 text-right">
        {renderValue()}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PhaseConfigDisplay({ 
  configs,
  configsPresent,
  className,
  defaultExpanded = true 
}: PhaseConfigDisplayProps) {
  // Type-safe extraction of configs - matching actual backend structure
  const domainGen = (configs?.domain_generation || {}) as DomainGenerationConfig;
  const dnsValidation = (configs?.dns_validation || {}) as DnsValidationConfig;
  const httpValidation = (configs?.http_keyword_validation || {}) as HttpKeywordValidationConfig;

  const hasDomainGen = configsPresent?.domain_generation ?? Object.keys(domainGen).length > 0;
  const hasDns = configsPresent?.dns_validation ?? Object.keys(dnsValidation).length > 0;
  const hasHttp = configsPresent?.http_keyword_validation ?? Object.keys(httpValidation).length > 0;

  const hasAnyConfig = hasDomainGen || hasDns || hasHttp;

  if (!hasAnyConfig) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Phase Configurations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No phase configurations recorded for this campaign
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Phase Configurations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Domain Generation Config */}
        <ConfigSection
          title="Domain Discovery"
          icon={<Globe className="w-4 h-4 text-blue-500" />}
          defaultExpanded={defaultExpanded}
          isEmpty={!hasDomainGen}
        >
          <div className="space-y-1">
            <ConfigRow label="Pattern Type" value={domainGen.patternType} />
            <ConfigRow label="Domains to Generate" value={domainGen.numDomainsToGenerate} type="number" />
            <ConfigRow label="TLD" value={domainGen.tld} />
            <ConfigRow label="Constant String" value={domainGen.constantString} />
            <ConfigRow label="Character Set" value={domainGen.characterSet} />
            <ConfigRow label="Prefix Variable Length" value={domainGen.prefixVariableLength} type="number" />
            <ConfigRow label="Suffix Variable Length" value={domainGen.suffixVariableLength} type="number" />
            <ConfigRow label="Variable Length" value={domainGen.variableLength} type="number" />
            <ConfigRow label="Batch Size" value={domainGen.batchSize} type="number" />
            <ConfigRow label="Offset Start" value={domainGen.offsetStart} type="number" />
          </div>
        </ConfigSection>

        {/* DNS Validation Config */}
        <ConfigSection
          title="DNS Validation"
          icon={<Server className="w-4 h-4 text-green-500" />}
          defaultExpanded={defaultExpanded}
          isEmpty={!hasDns}
        >
          <div className="space-y-1">
            <ConfigRow label="Persona IDs" value={dnsValidation.personaIds} type="list" />
            <ConfigRow label="Timeout (s)" value={dnsValidation.timeout} type="number" />
            <ConfigRow label="Max Retries" value={dnsValidation.maxRetries} type="number" />
            <ConfigRow label="Batch Size" value={dnsValidation.batchSize} type="number" />
            <ConfigRow label="Validation Types" value={dnsValidation.validation_types} type="list" />
          </div>
        </ConfigSection>

        {/* HTTP Keyword Validation Config */}
        <ConfigSection
          title="HTTP Keyword Validation"
          icon={<Search className="w-4 h-4 text-purple-500" />}
          defaultExpanded={defaultExpanded}
          isEmpty={!hasHttp}
        >
          <div className="space-y-1">
            <ConfigRow label="Persona IDs" value={httpValidation.personaIds} type="list" />
            <ConfigRow label="Keyword Set IDs" value={httpValidation.keywordSetIds} type="list" />
            <ConfigRow label="Keywords" value={httpValidation.keywords} type="list" />
            <ConfigRow label="Ad-hoc Keywords" value={httpValidation.adHocKeywords} type="list" />
            <ConfigRow label="Enrichment Enabled" value={httpValidation.enrichmentEnabled} type="boolean" />
            <ConfigRow label="Micro Crawl Enabled" value={httpValidation.microCrawlEnabled} type="boolean" />
            <ConfigRow label="Micro Crawl Max Pages" value={httpValidation.microCrawlMaxPages} type="number" />
            <ConfigRow label="Micro Crawl Byte Budget" value={httpValidation.microCrawlByteBudget ? formatBytes(httpValidation.microCrawlByteBudget) : undefined} />
          </div>
        </ConfigSection>
      </CardContent>
    </Card>
  );
}

export default PhaseConfigDisplay;
