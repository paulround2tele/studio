import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'fast-glob';

interface RepositoryContextArgs {
  focus: string;
  includeTests?: boolean;
}

interface FileContext {
  path: string;
  content: string;
  relevance: 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Repository Context Tool
 * 
 * Provides relevant file context based on current development focus.
 * Understands DomainFlow's architecture and suggests the most relevant files.
 */
export async function repositoryContextTool(
  args: RepositoryContextArgs,
  rootPath: string
) {
  const { focus, includeTests = false } = args;

  try {
    const contextFiles = await getRelevantFiles(focus, rootPath, includeTests);
    const fileContents = await Promise.all(
      contextFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(rootPath, file.path), 'utf-8');
          return {
            ...file,
            content: content.slice(0, 5000), // Limit content size
          };
        } catch (error) {
          return {
            ...file,
            content: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      })
    );

    const summary = generateContextSummary(focus, fileContents);

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to get repository context: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getRelevantFiles(
  focus: string,
  rootPath: string,
  includeTests: boolean
): Promise<FileContext[]> {
  const focusMap: Record<string, string[]> = {
    campaigns: [
      'src/lib/services/campaignServiceV2.ts',
      'src/components/campaigns/**/*.tsx',
      'backend/internal/handlers/campaign*.go',
      'backend/internal/models/campaign*.go',
      'backend/internal/services/campaign*.go',
    ],
    auth: [
      'src/lib/services/authService.ts',
      'src/contexts/AuthContext.tsx',
      'backend/internal/handlers/auth*.go',
      'backend/internal/middleware/auth.go',
      'backend/internal/models/user*.go',
      'backend/internal/services/auth*.go',
    ],
    websockets: [
      'src/lib/services/websocketService*.ts',
      'src/contexts/WebSocketStatusContext.tsx',
      'backend/internal/websocket/**/*.go',
    ],
    database: [
      'backend/database/schema.sql',
      'backend/database/production_schema_v3.sql',
      'backend/MIGRATIONS.md',
      'migrations/**/*.sql',
    ],
    api: [
      'src/lib/services/apiClient*.ts',
      'src/lib/services/enhancedApiClient.ts',
      'backend/internal/handlers/**/*.go',
      'backend/docs/swagger.json',
      'API_SPEC.md',
    ],
    types: [
      'src/lib/types.ts',
      'src/lib/schemas/**/*.ts',
      'backend/internal/models/**/*.go',
      'scripts/contract-sync/**/*.ts',
    ],
    testing: [
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.tsx',
      'jest.config.ts',
      'jest.setup.ts',
    ],
    build: [
      'package.json',
      'next.config.ts',
      'tsconfig.json',
      'backend/Makefile',
      'backend/go.mod',
      'scripts/**/*.ts',
      'scripts/**/*.js',
    ],
  };

  let patterns = focusMap[focus.toLowerCase()] || [];
  
  // Add test patterns if requested
  if (includeTests) {
    patterns.push(...(focusMap.testing || []));
  }

  // If focus not found in map, try to find relevant files by name
  if (patterns.length === 0) {
    patterns = [
      `**/*${focus}*.ts`,
      `**/*${focus}*.tsx`,
      `**/*${focus}*.go`,
      `**/components/**/*${focus}*/**/*.tsx`,
      `**/services/**/*${focus}*.ts`,
    ];
  }

  const foundFiles: string[] = [];
  for (const pattern of patterns) {
    try {
      const files = await glob(pattern, {
        cwd: rootPath,
        ignore: ['node_modules/**', 'dist/**', '.git/**', 'backend/vendor/**'],
      });
      foundFiles.push(...files);
    } catch (error) {
      // Continue if pattern fails
    }
  }

  // Remove duplicates and rank by relevance
  const uniqueFiles = [...new Set(foundFiles)];
  
  return uniqueFiles.map((filePath) => ({
    path: filePath,
    content: '',
    relevance: getFileRelevance(filePath, focus),
    description: getFileDescription(filePath, focus),
  })).sort((a, b) => {
    const relevanceOrder = { high: 0, medium: 1, low: 2 };
    return relevanceOrder[a.relevance] - relevanceOrder[b.relevance];
  }).slice(0, 15); // Limit to top 15 files
}

function getFileRelevance(filePath: string, focus: string): 'high' | 'medium' | 'low' {
  const fileName = path.basename(filePath).toLowerCase();
  const focusLower = focus.toLowerCase();

  // High relevance: exact matches or core files
  if (fileName.includes(focusLower) || 
      filePath.includes(`${focusLower}Service`) ||
      filePath.includes(`${focusLower}Context`) ||
      filePath.includes(`${focusLower}_`) ||
      filePath.includes(`${focusLower}.go`)) {
    return 'high';
  }

  // Medium relevance: related files
  if (filePath.includes('/services/') ||
      filePath.includes('/handlers/') ||
      filePath.includes('/models/') ||
      filePath.includes('/components/')) {
    return 'medium';
  }

  return 'low';
}

function getFileDescription(filePath: string, focus: string): string {
  const descriptions: Record<string, string> = {
    'campaignServiceV2.ts': 'V2 campaign management service with stateful operations',
    'AuthContext.tsx': 'Authentication context provider for React components',
    'authService.ts': 'Authentication service with token management',
    'websocketService.ts': 'WebSocket service for real-time communication',
    'WebSocketStatusContext.tsx': 'WebSocket connection status management',
    'apiClient.ts': 'Base HTTP client with authentication',
    'enhancedApiClient.ts': 'Enhanced API client with retry and circuit breaker',
    'schema.sql': 'Main database schema definition',
    'production_schema_v3.sql': 'Production-ready database schema v3',
    'types.ts': 'TypeScript type definitions and branded types',
    'swagger.json': 'OpenAPI specification for backend API',
    'API_SPEC.md': 'API documentation and specifications',
  };

  const fileName = path.basename(filePath);
  const knownDescription = descriptions[fileName];
  
  if (knownDescription) {
    return knownDescription;
  }

  // Generate description based on path
  if (filePath.includes('/handlers/')) {
    return `API handler for ${focus} operations`;
  } else if (filePath.includes('/services/')) {
    return `Service layer for ${focus} business logic`;
  } else if (filePath.includes('/models/')) {
    return `Data models for ${focus} entities`;
  } else if (filePath.includes('/components/')) {
    return `React components for ${focus} UI`;
  } else if (filePath.includes('/__tests__/')) {
    return `Tests for ${focus} functionality`;
  }

  return `${focus}-related file`;
}

function generateContextSummary(focus: string, files: FileContext[]): string {
  const highRelevanceFiles = files.filter(f => f.relevance === 'high');
  const mediumRelevanceFiles = files.filter(f => f.relevance === 'medium');

  let summary = `# DomainFlow Repository Context: ${focus}\n\n`;
  summary += `Found ${files.length} relevant files for development focus: **${focus}**\n\n`;

  if (highRelevanceFiles.length > 0) {
    summary += `## High Relevance Files\n\n`;
    for (const file of highRelevanceFiles) {
      summary += `### ${file.path}\n`;
      summary += `**Description**: ${file.description}\n\n`;
      summary += `\`\`\`${getFileExtension(file.path)}\n${file.content}\n\`\`\`\n\n`;
    }
  }

  if (mediumRelevanceFiles.length > 0) {
    summary += `## Medium Relevance Files\n\n`;
    for (const file of mediumRelevanceFiles.slice(0, 5)) {
      summary += `### ${file.path}\n`;
      summary += `**Description**: ${file.description}\n\n`;
      summary += `\`\`\`${getFileExtension(file.path)}\n${file.content.slice(0, 2000)}\n\`\`\`\n\n`;
    }
  }

  // Add architectural context
  summary += generateArchitecturalContext(focus);

  return summary;
}

function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath).slice(1);
  const extensionMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'tsx',
    'go': 'go',
    'sql': 'sql',
    'json': 'json',
    'md': 'markdown',
  };
  return extensionMap[ext] || ext;
}

function generateArchitecturalContext(focus: string): string {
  const architecturalContexts: Record<string, string> = {
    campaigns: `
## Campaign Architecture Context

DomainFlow uses a **V2 stateful campaign management system** with the following key concepts:

- **Campaign Types**: Generation, DNS validation, HTTP keyword validation
- **State Management**: Sequential pipeline with closed-loop architecture
- **Real-time Updates**: WebSocket integration for live campaign status
- **Type Safety**: SafeBigInt for int64 fields, UUID branded types
- **API Structure**: RESTful endpoints with comprehensive validation

**Key Integration Points**:
- Frontend: \`campaignServiceV2.ts\` handles all campaign operations
- Backend: Go handlers with Gin framework and PostgreSQL storage
- WebSocket: Real-time campaign progress and status updates
`,
    auth: `
## Authentication Architecture Context

DomainFlow implements **session-based authentication** with the following features:

- **Session Management**: HTTP-only cookies with secure fingerprinting
- **Permission System**: Role-based access control with granular permissions
- **Token Management**: Bearer token with API key fallback
- **Security**: Advanced fingerprinting and validation
- **Multi-Factor Authentication**: Built-in MFA support

**Key Integration Points**:
- Frontend: \`AuthContext.tsx\` provides authentication state
- Backend: Session middleware with comprehensive validation
- API: Bearer token authentication for API access
`,
    websockets: `
## WebSocket Architecture Context

DomainFlow uses **real-time WebSocket communication** for:

- **Campaign Updates**: Live progress and status notifications
- **System Monitoring**: Connection health and diagnostics
- **User Notifications**: Real-time alerts and messages
- **State Synchronization**: Keep frontend in sync with backend state

**Key Integration Points**:
- Frontend: \`websocketService.ts\` manages connections and message routing
- Backend: Gorilla WebSocket with standardized message types
- Context: \`WebSocketStatusContext.tsx\` tracks connection health
`,
    database: `
## Database Architecture Context

DomainFlow uses **PostgreSQL** with the following schema design:

- **Production Schema v3**: Complete production-ready schema with optimizations
- **Type Safety**: Perfect alignment between PostgreSQL, Go, and TypeScript
- **Performance**: Optimized indexes, triggers, and constraints
- **Security**: Session-based authentication with audit logging
- **Migrations**: Consolidated schema approach for simplified deployment

**Key Integration Points**:
- Schema: \`production_schema_v3.sql\` for production deployments
- Development: \`schema.sql\` for local development
- Migrations: Located in \`migrations/\` directory
`,
  };

  return architecturalContexts[focus.toLowerCase()] || '';
}