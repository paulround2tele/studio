#!/usr/bin/env ts-node
/*
 * Audit script: scans the codebase for ': any' annotations and 'as any' casts
 * producing a structured JSON report to stdout. Designed to be stable in CI.
 *
 * Classification Heuristics (basic, can be extended):
 *  - location: path category (app, components, services, store, api, other)
 *  - pattern: 'annotation' (": any") or 'cast' ("as any")
 *  - context: preceding line trimmed (for quick triage) if available
 */
import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface AnyUsageRecord {
  file: string;
  line: number;
  column: number;
  pattern: 'annotation' | 'cast';
  code: string;
  locationGroup: string; // coarse grouping for dashboards
  context?: string;
}

interface Report {
  generatedAt: string;
  root: string;
  total: number;
  byPattern: Record<string, number>;
  byLocationGroup: Record<string, number>;
  usages: AnyUsageRecord[];
  notes: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Workspace root (adjusted: script resides in scripts/type-audit/)
const REPO_ROOT = path.resolve(__dirname, '../..');

// Directories to scan (limit to production source sets)
const TARGET_DIRS = [
  'src/app',
  'src/components',
  'src/services',
  'src/store',
  'src/lib',
  'src/api'
];

// Exclusions (generated, tests, storybook, etc.)
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

function classifyLocation(file: string): string {
  if (file.startsWith('src/app/')) return 'app';
  if (file.startsWith('src/components/')) return 'components';
  if (file.startsWith('src/services/')) return 'services';
  if (file.startsWith('src/store/')) return 'store';
  if (file.startsWith('src/api/')) return 'api';
  return 'other';
}

async function scanFile(relPath: string): Promise<AnyUsageRecord[]> {
  const abs = path.join(REPO_ROOT, relPath);
  const content = await fs.readFile(abs, 'utf8');
  const lines = content.split(/\r?\n/);
  const records: AnyUsageRecord[] = [];
  const annotationRegex = /: +any(\b|[^a-zA-Z0-9_])/g; // matches ": any" possibly followed by punctuation
  const castRegex = /\bas +any\b/g; // matches "as any"
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
        locationGroup: classifyLocation(relPath),
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
        locationGroup: classifyLocation(relPath),
        context: lines[i - 1]?.trim()
      });
    }
  }
  return records;
}

async function main() {
  const allFilesArrays = await Promise.all(TARGET_DIRS.map(d => listFiles(d)));
  const files = Array.from(new Set(allFilesArrays.flat()));
  const usagesNested = await Promise.all(files.map(f => scanFile(f)));
  const usages = usagesNested.flat().sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  const byPattern: Record<string, number> = { annotation: 0, cast: 0 };
  const byLocationGroup: Record<string, number> = {};
  for (const u of usages) {
    byPattern[u.pattern]++; // counts
    byLocationGroup[u.locationGroup] = (byLocationGroup[u.locationGroup] || 0) + 1;
  }
  const report: Report = {
    generatedAt: new Date().toISOString(),
    root: REPO_ROOT,
    total: usages.length,
    byPattern,
    byLocationGroup,
    usages,
    notes: [
      'Remove or justify each any. Prefer concrete generated model types or generics.',
      'Use unknown + narrow only for truly dynamic untyped external data.'
    ]
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  // Non-zero exit if we want CI gating via separate script; here we always 0 to allow baseline capture.
}

main().catch(err => {
  console.error('[scan-any] Failed:', err);
  process.exit(1);
});
