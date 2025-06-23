import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'fast-glob';

interface CodebaseIndex {
  summary: string;
  structure: ProjectStructure;
  keyFiles: KeyFile[];
  metrics: CodebaseMetrics;
}

interface ProjectStructure {
  frontend: DirectoryInfo;
  backend: DirectoryInfo;
  database: DirectoryInfo;
  scripts: DirectoryInfo;
  docs: DirectoryInfo;
}

interface DirectoryInfo {
  path: string;
  description: string;
  keyFiles: string[];
  subdirectories: string[];
}

interface KeyFile {
  path: string;
  type: 'config' | 'service' | 'component' | 'model' | 'schema' | 'test' | 'doc';
  importance: 'critical' | 'high' | 'medium';
  description: string;
}

interface CodebaseMetrics {
  totalFiles: number;
  totalLines: number;
  typescriptFiles: number;
  goFiles: number;
  testFiles: number;
  configFiles: number;
}

/**
 * Codebase Indexer Resource
 * 
 * Provides a comprehensive index of the DomainFlow codebase structure.
 * Maps out the architecture and key components for navigation.
 */
export async function codebaseIndexer(rootPath: string) {
  try {
    const index = await buildCodebaseIndex(rootPath);
    const indexJson = JSON.stringify(index, null, 2);

    return {
      contents: [
        {
          type: 'text',
          text: indexJson,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to index codebase: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function buildCodebaseIndex(rootPath: string): Promise<CodebaseIndex> {
  const structure = await analyzeProjectStructure(rootPath);
  const keyFiles = await identifyKeyFiles(rootPath);
  const metrics = await calculateCodebaseMetrics(rootPath);
  const summary = generateCodebaseSummary(structure, keyFiles, metrics);

  return {
    summary,
    structure,
    keyFiles,
    metrics,
  };
}

async function analyzeProjectStructure(rootPath: string): Promise<ProjectStructure> {
  const structure: ProjectStructure = {
    frontend: await analyzeFrontendStructure(rootPath),
    backend: await analyzeBackendStructure(rootPath),
    database: await analyzeDatabaseStructure(rootPath),
    scripts: await analyzeScriptsStructure(rootPath),
    docs: await analyzeDocsStructure(rootPath),
  };

  return structure;
}

async function analyzeFrontendStructure(rootPath: string): Promise<DirectoryInfo> {
  const frontendPath = path.join(rootPath, 'src');
  const subdirs: string[] = [];
  const keyFiles: string[] = [];

  try {
    const entries = await fs.readdir(frontendPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        subdirs.push(entry.name);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        keyFiles.push(entry.name);
      }
    }
  } catch (error) {
    // Frontend directory might not exist or be accessible
  }

  return {
    path: 'src/',
    description: 'Next.js 15.3.3 frontend with TypeScript, services, components, and contexts',
    keyFiles: keyFiles.slice(0, 10),
    subdirectories: subdirs,
  };
}

async function analyzeBackendStructure(rootPath: string): Promise<DirectoryInfo> {
  const backendPath = path.join(rootPath, 'backend');
  const subdirs: string[] = [];
  const keyFiles: string[] = [];

  try {
    const entries = await fs.readdir(backendPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        subdirs.push(entry.name);
      } else if (entry.name.endsWith('.go') || entry.name === 'Makefile' || entry.name.includes('config')) {
        keyFiles.push(entry.name);
      }
    }
  } catch (error) {
    // Backend directory might not exist
  }

  return {
    path: 'backend/',
    description: 'Go backend with Gin framework, PostgreSQL, and WebSocket support',
    keyFiles: keyFiles.slice(0, 10),
    subdirectories: subdirs,
  };
}

async function analyzeDatabaseStructure(rootPath: string): Promise<DirectoryInfo> {
  const dbPath = path.join(rootPath, 'backend/database');
  const keyFiles: string[] = [];

  try {
    const entries = await fs.readdir(dbPath);
    keyFiles.push(...entries.filter(f => f.endsWith('.sql')));
  } catch (error) {
    // Database directory might not exist
  }

  // Also check migrations
  try {
    const migrationsPath = path.join(rootPath, 'migrations');
    const migrationEntries = await fs.readdir(migrationsPath, { withFileTypes: true });
    for (const entry of migrationEntries) {
      if (entry.isDirectory()) {
        keyFiles.push(`migrations/${entry.name}/`);
      }
    }
  } catch (error) {
    // Migrations directory might not exist
  }

  return {
    path: 'backend/database/ & migrations/',
    description: 'PostgreSQL schema, migrations, and database configuration',
    keyFiles: keyFiles.slice(0, 10),
    subdirectories: ['migrations/'],
  };
}

async function analyzeScriptsStructure(rootPath: string): Promise<DirectoryInfo> {
  const scriptsPath = path.join(rootPath, 'scripts');
  const subdirs: string[] = [];
  const keyFiles: string[] = [];

  try {
    const entries = await fs.readdir(scriptsPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        subdirs.push(entry.name);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.sh')) {
        keyFiles.push(entry.name);
      }
    }
  } catch (error) {
    // Scripts directory might not exist
  }

  return {
    path: 'scripts/',
    description: 'Build scripts, contract sync, and automation tools',
    keyFiles: keyFiles.slice(0, 10),
    subdirectories: subdirs,
  };
}

async function analyzeDocsStructure(rootPath: string): Promise<DirectoryInfo> {
  const docsPath = path.join(rootPath, 'docs');
  const keyFiles: string[] = [];

  try {
    const entries = await fs.readdir(docsPath);
    keyFiles.push(...entries.filter(f => f.endsWith('.md')));
  } catch (error) {
    // Docs directory might not exist
  }

  // Also check root-level docs
  try {
    const rootEntries = await fs.readdir(rootPath);
    const rootDocs = rootEntries.filter(f => 
      f.endsWith('.md') && f !== 'README.md'
    );
    keyFiles.unshift('README.md', ...rootDocs.slice(0, 5));
  } catch (error) {
    // Root directory might not be accessible
  }

  return {
    path: 'docs/ & root documentation',
    description: 'Project documentation, API specs, and guides',
    keyFiles: keyFiles.slice(0, 10),
    subdirectories: [],
  };
}

async function identifyKeyFiles(rootPath: string): Promise<KeyFile[]> {
  const keyFiles: KeyFile[] = [];

  // Critical configuration files
  const criticalConfigs = [
    { path: 'package.json', type: 'config' as const, description: 'Frontend dependencies and scripts' },
    { path: 'next.config.ts', type: 'config' as const, description: 'Next.js configuration and optimizations' },
    { path: 'tsconfig.json', type: 'config' as const, description: 'TypeScript compiler configuration' },
    { path: 'backend/go.mod', type: 'config' as const, description: 'Go module dependencies' },
    { path: 'backend/Makefile', type: 'config' as const, description: 'Backend build and run commands' },
    { path: 'backend/config.json', type: 'config' as const, description: 'Backend runtime configuration' },
  ];

  for (const config of criticalConfigs) {
    try {
      await fs.access(path.join(rootPath, config.path));
      keyFiles.push({
        ...config,
        importance: 'critical',
      });
    } catch (error) {
      // File doesn't exist
    }
  }

  // High importance service files
  const importantServices = [
    { path: 'src/lib/services/campaignServiceV2.ts', type: 'service' as const, description: 'V2 campaign management service' },
    { path: 'src/lib/services/authService.ts', type: 'service' as const, description: 'Authentication service' },
    { path: 'src/lib/services/websocketService.ts', type: 'service' as const, description: 'WebSocket service for real-time updates' },
    { path: 'src/lib/services/apiClient.ts', type: 'service' as const, description: 'Base HTTP API client' },
    { path: 'src/contexts/AuthContext.tsx', type: 'component' as const, description: 'Authentication context provider' },
    { path: 'src/lib/types.ts', type: 'model' as const, description: 'TypeScript type definitions and branded types' },
  ];

  for (const service of importantServices) {
    try {
      await fs.access(path.join(rootPath, service.path));
      keyFiles.push({
        ...service,
        importance: 'high',
      });
    } catch (error) {
      // File doesn't exist
    }
  }

  // Database schema files
  const schemaFiles = [
    { path: 'backend/database/schema.sql', type: 'schema' as const, description: 'Development database schema' },
    { path: 'backend/database/production_schema_v3.sql', type: 'schema' as const, description: 'Production database schema v3' },
    { path: 'API_SPEC.md', type: 'doc' as const, description: 'API documentation and endpoints' },
  ];

  for (const schema of schemaFiles) {
    try {
      await fs.access(path.join(rootPath, schema.path));
      keyFiles.push({
        ...schema,
        importance: 'high',
      });
    } catch (error) {
      // File doesn't exist
    }
  }

  // Find additional service and component files
  try {
    const serviceFiles = await glob('src/lib/services/*.ts', { cwd: rootPath });
    const componentFiles = await glob('src/components/**/*.tsx', { cwd: rootPath });
    
    for (const file of [...serviceFiles, ...componentFiles].slice(0, 15)) {
      if (!keyFiles.some(kf => kf.path === file)) {
        keyFiles.push({
          path: file,
          type: file.includes('/services/') ? 'service' : 'component',
          importance: 'medium',
          description: generateFileDescription(file),
        });
      }
    }
  } catch (error) {
    // Continue if glob fails
  }

  return keyFiles.sort((a, b) => {
    const importanceOrder = { critical: 0, high: 1, medium: 2 };
    return importanceOrder[a.importance] - importanceOrder[b.importance];
  });
}

async function calculateCodebaseMetrics(rootPath: string): Promise<CodebaseMetrics> {
  const metrics: CodebaseMetrics = {
    totalFiles: 0,
    totalLines: 0,
    typescriptFiles: 0,
    goFiles: 0,
    testFiles: 0,
    configFiles: 0,
  };

  try {
    // Count TypeScript files
    const tsFiles = await glob('src/**/*.{ts,tsx}', { 
      cwd: rootPath,
      ignore: ['node_modules/**', 'dist/**', '.next/**']
    });
    metrics.typescriptFiles = tsFiles.length;
    metrics.totalFiles += tsFiles.length;

    // Count Go files
    const goFiles = await glob('backend/**/*.go', { 
      cwd: rootPath,
      ignore: ['vendor/**']
    });
    metrics.goFiles = goFiles.length;
    metrics.totalFiles += goFiles.length;

    // Count test files
    const testFiles = await glob('**/*.{test,spec}.{ts,tsx,go}', { 
      cwd: rootPath,
      ignore: ['node_modules/**', 'vendor/**']
    });
    metrics.testFiles = testFiles.length;

    // Count config files
    const configFiles = await glob('**/*.{json,yaml,yml,toml,config.js,config.ts}', { 
      cwd: rootPath,
      ignore: ['node_modules/**', 'vendor/**', '.git/**']
    });
    metrics.configFiles = configFiles.length;

    // Estimate lines of code for key files
    const keyFiles = [...tsFiles.slice(0, 20), ...goFiles.slice(0, 20)];
    for (const file of keyFiles) {
      try {
        const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
        metrics.totalLines += content.split('\n').length;
      } catch (error) {
        // Continue if file can't be read
      }
    }

    // Extrapolate total lines
    metrics.totalLines = Math.round(metrics.totalLines * (metrics.totalFiles / keyFiles.length));
  } catch (error) {
    // Use fallback metrics if analysis fails
    metrics.totalFiles = 100;
    metrics.totalLines = 10000;
  }

  return metrics;
}

function generateFileDescription(filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  
  if (filePath.includes('/services/')) {
    return `Service layer for ${fileName} operations`;
  } else if (filePath.includes('/components/')) {
    return `React component for ${fileName} UI`;
  } else if (filePath.includes('/contexts/')) {
    return `React context for ${fileName} state management`;
  } else if (filePath.includes('/hooks/')) {
    return `Custom React hook for ${fileName}`;
  } else if (filePath.includes('/utils/')) {
    return `Utility functions for ${fileName}`;
  } else if (filePath.includes('/__tests__/')) {
    return `Tests for ${fileName}`;
  }
  
  return `${fileName} implementation`;
}

function generateCodebaseSummary(
  structure: ProjectStructure,
  keyFiles: KeyFile[],
  metrics: CodebaseMetrics
): string {
  return `
# DomainFlow Codebase Index

## Project Overview
DomainFlow is an advanced domain generation and validation platform with a Next.js frontend and Go backend.

## Architecture Summary
- **Frontend**: Next.js 15.3.3 with TypeScript, modern React patterns
- **Backend**: Go with Gin framework, PostgreSQL database
- **Real-time**: WebSocket integration for live updates
- **Type Safety**: Branded types (SafeBigInt, UUID, ISODateString)
- **Contract Alignment**: Synchronized Go and TypeScript types

## Codebase Metrics
- Total Files: ${metrics.totalFiles}
- Estimated Lines: ${metrics.totalLines.toLocaleString()}
- TypeScript Files: ${metrics.typescriptFiles}
- Go Files: ${metrics.goFiles}
- Test Files: ${metrics.testFiles}
- Config Files: ${metrics.configFiles}

## Key Components
### Critical Infrastructure
${keyFiles.filter(f => f.importance === 'critical').map(f => `- ${f.path}: ${f.description}`).join('\n')}

### Core Services
${keyFiles.filter(f => f.importance === 'high' && f.type === 'service').map(f => `- ${f.path}: ${f.description}`).join('\n')}

### Database & Schema
${keyFiles.filter(f => f.type === 'schema').map(f => `- ${f.path}: ${f.description}`).join('\n')}

## Directory Structure
- **${structure.frontend.path}**: ${structure.frontend.description}
- **${structure.backend.path}**: ${structure.backend.description}
- **${structure.database.path}**: ${structure.database.description}
- **${structure.scripts.path}**: ${structure.scripts.description}
- **${structure.docs.path}**: ${structure.docs.description}

## Development Focus Areas
1. **Campaign Management**: V2 stateful campaign system with real-time updates
2. **Authentication**: Session-based auth with role-based access control
3. **WebSocket Integration**: Real-time communication and status updates
4. **Type Safety**: Contract alignment between Go and TypeScript
5. **Testing**: Comprehensive unit, integration, and E2E test coverage
`.trim();
}