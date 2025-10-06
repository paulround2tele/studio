#!/usr/bin/env tsx
/*
 * Enhanced audit script: analyzes each 'any' usage to determine if suitable types exist
 * or if new types need to be defined. Produces detailed recommendations for remediation.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface AnyUsageAnalysis {
  file: string;
  line: number;
  column: number;
  pattern: 'annotation' | 'cast';
  code: string;
  locationGroup: string;
  context?: string;
  // Enhanced analysis fields
  codeContext: string; // More context lines
  variableName?: string;
  dataOrigin: 'api-response' | 'redux-state' | 'event-handler' | 'form-data' | 'sse-event' | 'unknown';
  existingType?: string; // If a suitable type exists
  missingType?: string; // Recommended type name if missing
  backendSchemaChange?: string; // Required backend change
  recommendation: string;
  severity: 'high' | 'medium' | 'low'; // Priority for fixing
  domain: string; // Business domain (campaigns, domains, proxies, etc.)
}

interface EnhancedReport {
  generatedAt: string;
  root: string;
  total: number;
  byPattern: Record<string, number>;
  byLocationGroup: Record<string, number>;
  byDataOrigin: Record<string, number>;
  bySeverity: Record<string, number>;
  byDomain: Record<string, number>;
  analyses: AnyUsageAnalysis[];
  availableTypes: string[];
  recommendations: {
    immediate: string[];
    backendChanges: string[];
    regenerationSteps: string[];
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

// Load available types from generated API client
async function loadAvailableTypes(): Promise<string[]> {
  const types: string[] = [];
  try {
    // Load from models directory
    const modelsDir = path.join(REPO_ROOT, 'src/lib/api-client/models');
    const files = await fs.readdir(modelsDir);
    for (const file of files) {
      if (file.endsWith('.ts') && file !== 'index.ts') {
        const content = await fs.readFile(path.join(modelsDir, file), 'utf8');
        // Extract interface/type names
        const matches = content.match(/export\s+(?:interface|type|enum)\s+(\w+)/g);
        if (matches) {
          matches.forEach(match => {
            const name = match.replace(/export\s+(?:interface|type|enum)\s+/, '');
            types.push(name);
          });
        }
      }
    }

    // Also load from types.ts
    const typesFile = path.join(REPO_ROOT, 'src/lib/api-client/types.ts');
    const typesContent = await fs.readFile(typesFile, 'utf8');
    const componentMatches = typesContent.match(/^\s+(\w+):\s*{/gm);
    if (componentMatches) {
      componentMatches.forEach(match => {
        const name = match.replace(/^\s+(\w+):\s*{/, '$1');
        types.push(name);
      });
    }
  } catch (e) {
    console.error('Failed to load available types:', e);
  }
  return [...new Set(types)].sort();
}

// Analyze the context of an any usage
async function analyzeUsage(
  file: string, 
  line: number, 
  column: number,
  pattern: 'annotation' | 'cast',
  code: string,
  context: string | undefined,
  availableTypes: string[]
): Promise<AnyUsageAnalysis> {
  // Get more context lines
  const fullContent = await fs.readFile(path.join(REPO_ROOT, file), 'utf8');
  const lines = fullContent.split('\n');
  const contextStart = Math.max(0, line - 3);
  const contextEnd = Math.min(lines.length, line + 2);
  const codeContext = lines.slice(contextStart, contextEnd)
    .map((l, i) => `${contextStart + i + 1}: ${l}`)
    .join('\n');

  // Extract variable name if possible
  let variableName: string | undefined;
  const varMatch = code.match(/(?:const|let|var)\s+(\w+)/);
  if (varMatch) {
    variableName = varMatch[1];
  } else if (pattern === 'cast') {
    const castMatch = code.match(/(\w+)\s+as\s+any/);
    if (castMatch) {
      variableName = castMatch[1];
    }
  }

  // Determine data origin
  let dataOrigin: AnyUsageAnalysis['dataOrigin'] = 'unknown';
  if (code.includes('response') || code.includes('resp') || code.includes('.data')) {
    dataOrigin = 'api-response';
  } else if (code.includes('state') || code.includes('dispatch') || code.includes('useSelector')) {
    dataOrigin = 'redux-state';
  } else if (code.includes('event') || code.includes('evt') || code.includes('Event')) {
    dataOrigin = 'event-handler';
  } else if (code.includes('form') || code.includes('Form') || code.includes('field')) {
    dataOrigin = 'form-data';
  } else if (context?.includes('EventSource') || code.includes('SSE') || code.includes('sse')) {
    dataOrigin = 'sse-event';
  }

  // Determine business domain
  let domain = 'other';
  const fileLower = file.toLowerCase();
  if (fileLower.includes('campaign')) domain = 'campaigns';
  else if (fileLower.includes('domain')) domain = 'domains';
  else if (fileLower.includes('proxy') || fileLower.includes('proxies')) domain = 'proxies';
  else if (fileLower.includes('persona')) domain = 'personas';
  else if (fileLower.includes('keyword')) domain = 'keywords';
  else if (fileLower.includes('scoring')) domain = 'scoring';
  else if (fileLower.includes('bulk')) domain = 'bulk-operations';
  else if (fileLower.includes('sse') || fileLower.includes('event')) domain = 'sse-events';

  // Look for existing suitable types
  let existingType: string | undefined;
  let missingType: string | undefined;
  let backendSchemaChange: string | undefined;
  let recommendation = '';
  let severity: AnyUsageAnalysis['severity'] = 'medium';

  // Analysis based on context
  if (dataOrigin === 'api-response') {
    // Check if there are matching response types
    const responseTypes = availableTypes.filter(t => 
      t.includes('Response') && 
      (domain === 'campaigns' ? t.toLowerCase().includes('campaign') :
       domain === 'domains' ? t.toLowerCase().includes('domain') :
       domain === 'proxies' ? t.toLowerCase().includes('proxy') : true)
    );
    
    if (responseTypes.length > 0) {
      existingType = responseTypes[0]; // Take the first match
      recommendation = `Use existing type: ${existingType}`;
      severity = 'high';
    } else {
      missingType = `${domain.charAt(0).toUpperCase() + domain.slice(1)}Response`;
      backendSchemaChange = `Add OpenAPI schema for ${missingType}`;
      recommendation = `Missing API response type. Backend needs: ${missingType}`;
      severity = 'medium';
    }
  } else if (dataOrigin === 'sse-event') {
    // Check for SSE event types
    const sseTypes = availableTypes.filter(t => t.includes('Sse') || t.includes('Event'));
    if (sseTypes.length > 0) {
      existingType = 'CampaignSseEvent | CampaignSseEventPayload';
      recommendation = `Use existing SSE types: ${existingType}`;
      severity = 'high';
    } else {
      missingType = 'CampaignSseEventUnion';
      backendSchemaChange = 'Ensure SSE event schemas are properly referenced in OpenAPI';
      recommendation = 'Missing SSE event types. Check OpenAPI SSE schema generation';
      severity = 'medium';
    }
  } else if (dataOrigin === 'redux-state') {
    recommendation = 'Define typed interface for Redux state shape';
    missingType = `${variableName ? variableName.charAt(0).toUpperCase() + variableName.slice(1) : 'State'}Interface`;
    severity = 'medium';
  } else if (dataOrigin === 'event-handler') {
    recommendation = 'Use proper DOM event types (e.g., React.ChangeEvent<HTMLInputElement>)';
    existingType = 'React.ChangeEvent<HTMLElement> or similar DOM event type';
    severity = 'low';
  } else if (dataOrigin === 'form-data') {
    recommendation = 'Create form data interface or use react-hook-form typed forms';
    missingType = `${variableName ? variableName.charAt(0).toUpperCase() + variableName.slice(1) : 'Form'}Data`;
    severity = 'medium';
  } else {
    recommendation = 'Investigate data source and create appropriate type';
    severity = 'low';
  }

  return {
    file,
    line,
    column,
    pattern,
    code,
    locationGroup: classifyLocation(file),
    context,
    codeContext,
    variableName,
    dataOrigin,
    existingType,
    missingType,
    backendSchemaChange,
    recommendation,
    severity,
    domain
  };
}

function classifyLocation(file: string): string {
  if (file.startsWith('src/app/')) return 'app';
  if (file.startsWith('src/components/')) return 'components';
  if (file.startsWith('src/services/')) return 'services';
  if (file.startsWith('src/store/')) return 'store';
  if (file.startsWith('src/api/')) return 'api';
  return 'other';
}

// Reuse the scanning logic from the original script
const TARGET_DIRS = [
  'src/app',
  'src/components', 
  'src/services',
  'src/store',
  'src/lib',
  'src/api'
];

const EXCLUDE_PATTERNS = [
  'src/lib/api-client/', // generated
  '__tests__',
  '.test.',
  '.spec.',
  'stories/',
  '/__mocks__/'
];

async function listFiles(dir: string): Promise<string[]> {
  const abs = path.resolve(REPO_ROOT, dir);
  let entries: string[] = [];
  try {
    const dirents = await fs.readdir(abs, { withFileTypes: true });
    for (const d of dirents) {
      const full = path.join(abs, d.name);
      if (d.isDirectory()) {
        entries = entries.concat(await listFiles(path.relative(REPO_ROOT, full)));
      } else if (d.isFile() && /\.(t|j)sx?$/.test(d.name)) {
        const rel = path.relative(REPO_ROOT, full);
        if (!EXCLUDE_PATTERNS.some(p => rel.includes(p))) {
          entries.push(rel);
        }
      }
    }
  } catch (e) {
    // ignore missing directories
  }
  return entries;
}

async function scanFile(relPath: string): Promise<Array<{
  file: string;
  line: number;
  column: number;
  pattern: 'annotation' | 'cast';
  code: string;
  context?: string;
}>> {
  const abs = path.join(REPO_ROOT, relPath);
  const content = await fs.readFile(abs, 'utf8');
  const lines = content.split(/\r?\n/);
  const records: Array<{
    file: string;
    line: number;
    column: number;
    pattern: 'annotation' | 'cast';
    code: string;
    context?: string;
  }> = [];
  
  const annotationRegex = /: +any(\b|[^a-zA-Z0-9_])/g;
  const castRegex = /\bas +any\b/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;
    
    while ((match = annotationRegex.exec(line)) !== null) {
      records.push({
        file: relPath,
        line: i + 1,
        column: match.index + 1,
        pattern: 'annotation',
        code: line.trim(),
        context: lines[i - 1]?.trim()
      });
    }
    
    while ((match = castRegex.exec(line)) !== null) {
      records.push({
        file: relPath,
        line: i + 1,
        column: match.index + 1,
        pattern: 'cast',
        code: line.trim(),
        context: lines[i - 1]?.trim()
      });
    }
  }
  return records;
}

async function main() {
  console.error('Loading available types...');
  const availableTypes = await loadAvailableTypes();
  console.error(`Found ${availableTypes.length} available types`);
  
  console.error('Scanning files for any usage...');
  const allFilesArrays = await Promise.all(TARGET_DIRS.map(d => listFiles(d)));
  const files = Array.from(new Set(allFilesArrays.flat()));
  const usagesNested = await Promise.all(files.map(f => scanFile(f)));
  const usages = usagesNested.flat();
  
  console.error(`Analyzing ${usages.length} any usages...`);
  const analyses: AnyUsageAnalysis[] = [];
  
  for (const usage of usages) {
    const analysis = await analyzeUsage(
      usage.file,
      usage.line,
      usage.column,
      usage.pattern,
      usage.code,
      usage.context,
      availableTypes
    );
    analyses.push(analysis);
  }
  
  // Aggregate statistics
  const byPattern: Record<string, number> = { annotation: 0, cast: 0 };
  const byLocationGroup: Record<string, number> = {};
  const byDataOrigin: Record<string, number> = {};
  const bySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const byDomain: Record<string, number> = {};
  
  for (const analysis of analyses) {
    byPattern[analysis.pattern]++;
    byLocationGroup[analysis.locationGroup] = (byLocationGroup[analysis.locationGroup] || 0) + 1;
    byDataOrigin[analysis.dataOrigin] = (byDataOrigin[analysis.dataOrigin] || 0) + 1;
    bySeverity[analysis.severity]++;
    byDomain[analysis.domain] = (byDomain[analysis.domain] || 0) + 1;
  }
  
  // Generate recommendations
  const immediate: string[] = [];
  const backendChanges: string[] = [];
  const regenerationSteps: string[] = [];
  
  const highPriorityWithExisting = analyses.filter(a => a.severity === 'high' && a.existingType);
  if (highPriorityWithExisting.length > 0) {
    immediate.push(`${highPriorityWithExisting.length} high-priority fixes have existing types available`);
  }
  
  const missingApiTypes = analyses.filter(a => a.dataOrigin === 'api-response' && a.missingType);
  if (missingApiTypes.length > 0) {
    backendChanges.push(`${missingApiTypes.length} API responses need backend schema definitions`);
  }
  
  const sseIssues = analyses.filter(a => a.dataOrigin === 'sse-event');
  if (sseIssues.length > 0) {
    backendChanges.push(`${sseIssues.length} SSE events need proper OpenAPI schema generation`);
  }
  
  regenerationSteps.push('Run npm run gen:all after backend schema updates');
  regenerationSteps.push('Update imports to use generated types');
  regenerationSteps.push('Run npm run typecheck to validate changes');
  
  const report: EnhancedReport = {
    generatedAt: new Date().toISOString(),
    root: REPO_ROOT,
    total: analyses.length,
    byPattern,
    byLocationGroup,
    byDataOrigin,
    bySeverity,
    byDomain,
    analyses: analyses.sort((a, b) => {
      if (a.severity !== b.severity) {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.file.localeCompare(b.file) || a.line - b.line;
    }),
    availableTypes,
    recommendations: {
      immediate,
      backendChanges,
      regenerationSteps
    }
  };
  
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main().catch(err => {
  console.error('[enhanced-audit] Failed:', err);
  process.exit(1);
});