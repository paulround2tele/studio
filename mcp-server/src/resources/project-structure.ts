import * as fs from 'fs/promises';
import * as path from 'path';

interface ProjectStructureData {
  summary: string;
  architecture: ArchitectureOverview;
  directories: DirectoryStructure[];
  keyPatterns: DevelopmentPattern[];
  integrationPoints: IntegrationPoint[];
}

interface ArchitectureOverview {
  type: string;
  frontend: TechStack;
  backend: TechStack;
  database: TechStack;
  realtime: TechStack;
  deployment: string[];
}

interface TechStack {
  framework: string;
  language: string;
  version: string;
  keyLibraries: string[];
}

interface DirectoryStructure {
  path: string;
  type: 'frontend' | 'backend' | 'config' | 'documentation' | 'tooling';
  description: string;
  purpose: string;
  keyFiles: string[];
  patterns: string[];
}

interface DevelopmentPattern {
  name: string;
  category: 'architecture' | 'development' | 'testing' | 'deployment';
  description: string;
  examples: string[];
  location: string;
}

interface IntegrationPoint {
  name: string;
  type: 'api' | 'websocket' | 'database' | 'build' | 'testing';
  frontend: string;
  backend: string;
  description: string;
}

/**
 * Project Structure Resource
 * 
 * Provides comprehensive DomainFlow project structure and architecture overview.
 * Maps out development patterns and integration points.
 */
export async function projectStructure(rootPath: string) {
  try {
    const structureData = await analyzeProjectStructure(rootPath);
    const structureJson = JSON.stringify(structureData, null, 2);

    return {
      contents: [
        {
          type: 'text',
          text: structureJson,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to analyze project structure: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function analyzeProjectStructure(rootPath: string): Promise<ProjectStructureData> {
  const architecture = await analyzeArchitecture(rootPath);
  const directories = await analyzeDirectories(rootPath);
  const keyPatterns = await identifyDevelopmentPatterns(rootPath);
  const integrationPoints = await mapIntegrationPoints(rootPath);
  const summary = generateStructureSummary(architecture, directories, keyPatterns);

  return {
    summary,
    architecture,
    directories,
    keyPatterns,
    integrationPoints,
  };
}

async function analyzeArchitecture(rootPath: string): Promise<ArchitectureOverview> {
  // Analyze frontend
  const packageJsonPath = path.join(rootPath, 'package.json');
  let frontend: TechStack = {
    framework: 'Next.js',
    language: 'TypeScript',
    version: '15.3.3',
    keyLibraries: [],
  };

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    frontend.keyLibraries = [
      deps.next ? 'Next.js' : '',
      deps.react ? 'React' : '',
      deps.typescript ? 'TypeScript' : '',
      deps.tailwindcss ? 'Tailwind CSS' : '',
      deps['@tanstack/react-query'] ? 'React Query' : '',
      deps.zod ? 'Zod' : '',
      deps.zustand ? 'Zustand' : '',
    ].filter(Boolean);
  } catch (error) {
    // Use defaults if package.json can't be read
  }

  // Analyze backend
  const goModPath = path.join(rootPath, 'backend/go.mod');
  let backend: TechStack = {
    framework: 'Gin',
    language: 'Go',
    version: '1.21+',
    keyLibraries: [],
  };

  try {
    const goMod = await fs.readFile(goModPath, 'utf-8');
    const goVersion = goMod.match(/^go\s+([^\s]+)/m);
    if (goVersion) {
      backend.version = goVersion[1];
    }

    backend.keyLibraries = [
      goMod.includes('gin-gonic/gin') ? 'Gin' : '',
      goMod.includes('jackc/pgx') ? 'pgx (PostgreSQL)' : '',
      goMod.includes('gorilla/websocket') ? 'Gorilla WebSocket' : '',
      goMod.includes('google/uuid') ? 'UUID' : '',
      goMod.includes('golang-jwt/jwt') ? 'JWT' : '',
    ].filter(Boolean);
  } catch (error) {
    // Use defaults if go.mod can't be read
  }

  return {
    type: 'Full-stack web application with real-time features',
    frontend,
    backend,
    database: {
      framework: 'PostgreSQL',
      language: 'SQL',
      version: '13+',
      keyLibraries: ['Connection pooling', 'Migrations', 'Schema versioning'],
    },
    realtime: {
      framework: 'WebSocket',
      language: 'TypeScript/Go',
      version: 'RFC 6455',
      keyLibraries: ['Gorilla WebSocket', 'Native WebSocket API'],
    },
    deployment: ['Docker', 'Make', 'npm scripts', 'PostgreSQL'],
  };
}

async function analyzeDirectories(rootPath: string): Promise<DirectoryStructure[]> {
  const directories: DirectoryStructure[] = [];

  // Analyze main directories
  const mainDirs = [
    { path: 'src', type: 'frontend' as const },
    { path: 'backend', type: 'backend' as const },
    { path: 'scripts', type: 'tooling' as const },
    { path: 'docs', type: 'documentation' as const },
    { path: 'migrations', type: 'backend' as const },
    { path: '.vscode', type: 'config' as const },
  ];

  for (const dir of mainDirs) {
    try {
      await fs.access(path.join(rootPath, dir.path));
      const structure = await analyzeDirectory(rootPath, dir.path, dir.type);
      directories.push(structure);
    } catch (error) {
      // Directory doesn't exist
    }
  }

  // Analyze src subdirectories
  try {
    const srcPath = path.join(rootPath, 'src');
    const srcEntries = await fs.readdir(srcPath, { withFileTypes: true });
    
    for (const entry of srcEntries) {
      if (entry.isDirectory()) {
        const structure = await analyzeDirectory(rootPath, `src/${entry.name}`, 'frontend');
        directories.push(structure);
      }
    }
  } catch (error) {
    // src directory might not exist
  }

  // Analyze backend subdirectories
  try {
    const backendPath = path.join(rootPath, 'backend');
    const backendEntries = await fs.readdir(backendPath, { withFileTypes: true });
    
    for (const entry of backendEntries) {
      if (entry.isDirectory()) {
        const structure = await analyzeDirectory(rootPath, `backend/${entry.name}`, 'backend');
        directories.push(structure);
      }
    }
  } catch (error) {
    // backend directory might not exist
  }

  return directories;
}

async function analyzeDirectory(
  rootPath: string,
  dirPath: string,
  type: DirectoryStructure['type']
): Promise<DirectoryStructure> {
  const fullPath = path.join(rootPath, dirPath);
  const keyFiles: string[] = [];
  const patterns: string[] = [];

  try {
    const entries = await fs.readdir(fullPath);
    
    // Identify key files
    const importantFiles = entries.filter(entry => 
      entry.endsWith('.ts') || 
      entry.endsWith('.tsx') || 
      entry.endsWith('.go') ||
      entry.endsWith('.json') ||
      entry.endsWith('.md') ||
      entry === 'Makefile' ||
      entry.includes('config')
    );
    
    keyFiles.push(...importantFiles.slice(0, 10));

    // Identify patterns based on directory type and content
    patterns.push(...identifyDirectoryPatterns(dirPath, entries));
  } catch (error) {
    // Directory might not be accessible
  }

  return {
    path: dirPath,
    type,
    description: getDirectoryDescription(dirPath),
    purpose: getDirectoryPurpose(dirPath),
    keyFiles,
    patterns,
  };
}

function identifyDirectoryPatterns(dirPath: string, entries: string[]): string[] {
  const patterns: string[] = [];

  // Common patterns
  if (entries.some(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx'))) {
    patterns.push('Testing pattern with Jest');
  }
  
  if (entries.some(f => f.includes('Service'))) {
    patterns.push('Service layer pattern');
  }
  
  if (entries.some(f => f.includes('Context'))) {
    patterns.push('React Context pattern');
  }

  // Directory-specific patterns
  if (dirPath.includes('components')) {
    patterns.push('React component architecture', 'Reusable UI components');
  } else if (dirPath.includes('services')) {
    patterns.push('Service layer pattern', 'API client architecture');
  } else if (dirPath.includes('contexts')) {
    patterns.push('React Context for state management');
  } else if (dirPath.includes('hooks')) {
    patterns.push('Custom React hooks');
  } else if (dirPath.includes('utils')) {
    patterns.push('Utility functions', 'Helper modules');
  } else if (dirPath.includes('handlers')) {
    patterns.push('HTTP request handlers', 'REST API endpoints');
  } else if (dirPath.includes('models')) {
    patterns.push('Data models', 'Struct definitions');
  } else if (dirPath.includes('middleware')) {
    patterns.push('HTTP middleware', 'Request/response processing');
  }

  return patterns;
}

function getDirectoryDescription(dirPath: string): string {
  const descriptions: Record<string, string> = {
    'src': 'Next.js frontend source code with TypeScript',
    'src/app': 'Next.js App Router pages and layouts',
    'src/components': 'Reusable React components',
    'src/lib': 'Core libraries and utilities',
    'src/lib/services': 'API services and business logic',
    'src/lib/utils': 'Utility functions and helpers',
    'src/contexts': 'React Context providers for state management',
    'src/hooks': 'Custom React hooks',
    'src/types': 'TypeScript type definitions',
    'backend': 'Go backend with Gin framework',
    'backend/internal': 'Internal Go packages',
    'backend/internal/handlers': 'HTTP request handlers',
    'backend/internal/models': 'Data models and structs',
    'backend/internal/services': 'Business logic services',
    'backend/internal/middleware': 'HTTP middleware',
    'backend/database': 'Database schema and migrations',
    'scripts': 'Build and automation scripts',
    'docs': 'Project documentation',
    'migrations': 'Database migration files',
    '.vscode': 'VS Code configuration',
  };

  return descriptions[dirPath] || `${dirPath} directory`;
}

function getDirectoryPurpose(dirPath: string): string {
  const purposes: Record<string, string> = {
    'src': 'Contains all frontend source code and assets',
    'src/components': 'Houses reusable UI components with proper separation of concerns',
    'src/lib/services': 'Encapsulates API communication and business logic',
    'src/contexts': 'Manages global application state with React Context',
    'backend': 'Contains all server-side logic and API endpoints',
    'backend/internal/handlers': 'Processes HTTP requests and responses',
    'backend/internal/models': 'Defines data structures and validation',
    'backend/database': 'Manages database schema and structure',
    'scripts': 'Automates build, test, and deployment processes',
    'docs': 'Documents architecture, APIs, and usage guidelines',
  };

  return purposes[dirPath] || 'Supports project development and organization';
}

async function identifyDevelopmentPatterns(rootPath: string): Promise<DevelopmentPattern[]> {
  const patterns: DevelopmentPattern[] = [];

  // Architecture patterns
  patterns.push({
    name: 'Service Layer Architecture',
    category: 'architecture',
    description: 'Separation of API communication from UI components',
    examples: ['campaignServiceV2.ts', 'authService.ts', 'websocketService.ts'],
    location: 'src/lib/services/',
  });

  patterns.push({
    name: 'Context Provider Pattern',
    category: 'architecture',
    description: 'React Context for global state management',
    examples: ['AuthContext.tsx', 'WebSocketStatusContext.tsx'],
    location: 'src/contexts/',
  });

  patterns.push({
    name: 'Branded Types Pattern',
    category: 'development',
    description: 'Type-safe branded types for critical data (UUID, SafeBigInt)',
    examples: ['UUID', 'SafeBigInt', 'ISODateString'],
    location: 'src/lib/types.ts',
  });

  // Development patterns
  patterns.push({
    name: 'Contract Sync Pattern',
    category: 'development',
    description: 'Automated synchronization between Go and TypeScript types',
    examples: ['extract-go-contracts.ts', 'generate-zod-schemas.js'],
    location: 'scripts/',
  });

  patterns.push({
    name: 'Runtime Validation Pattern',
    category: 'development',
    description: 'Type-safe runtime validation with custom validators',
    examples: ['validateUUID', 'validateSafeBigInt', 'validateEmail'],
    location: 'src/lib/utils/runtime-validators.ts',
  });

  // Testing patterns
  patterns.push({
    name: 'Component Testing Pattern',
    category: 'testing',
    description: 'React Testing Library with custom render utilities',
    examples: ['render with providers', 'accessibility testing', 'user interaction testing'],
    location: 'src/**/__tests__/',
  });

  patterns.push({
    name: 'API Testing Pattern',
    category: 'testing',
    description: 'Service layer testing with mocked API clients',
    examples: ['mockApiClient', 'error handling tests', 'response validation'],
    location: 'src/lib/services/__tests__/',
  });

  // Deployment patterns
  patterns.push({
    name: 'Build Pipeline Pattern',
    category: 'deployment',
    description: 'Coordinated frontend and backend build process',
    examples: ['npm run build', 'make build', 'schema generation'],
    location: 'package.json, backend/Makefile',
  });

  return patterns;
}

async function mapIntegrationPoints(rootPath: string): Promise<IntegrationPoint[]> {
  const integrationPoints: IntegrationPoint[] = [];

  // API Integration
  integrationPoints.push({
    name: 'REST API Communication',
    type: 'api',
    frontend: 'apiClient.ts, enhancedApiClient.ts',
    backend: 'internal/handlers/, Gin routes',
    description: 'HTTP API communication with retry logic and circuit breaker',
  });

  integrationPoints.push({
    name: 'Authentication Flow',
    type: 'api',
    frontend: 'AuthContext.tsx, authService.ts',
    backend: 'internal/middleware/auth.go',
    description: 'Session-based authentication with HTTP-only cookies',
  });

  // WebSocket Integration
  integrationPoints.push({
    name: 'Real-time Communication',
    type: 'websocket',
    frontend: 'websocketService.ts, WebSocketStatusContext.tsx',
    backend: 'internal/websocket/',
    description: 'Bidirectional real-time communication for live updates',
  });

  // Database Integration
  integrationPoints.push({
    name: 'Database Operations',
    type: 'database',
    frontend: 'Type definitions from Go models',
    backend: 'internal/models/, pgx driver',
    description: 'PostgreSQL operations with type-safe models',
  });

  integrationPoints.push({
    name: 'Schema Synchronization',
    type: 'database',
    frontend: 'Generated TypeScript types',
    backend: 'Go struct definitions',
    description: 'Automated sync between database schema and application types',
  });

  // Build Integration
  integrationPoints.push({
    name: 'Contract Generation',
    type: 'build',
    frontend: 'TypeScript type generation',
    backend: 'Go model extraction',
    description: 'Automated generation of TypeScript types from Go models',
  });

  integrationPoints.push({
    name: 'Development Workflow',
    type: 'build',
    frontend: 'npm run dev (Next.js)',
    backend: 'make run (Go with air)',
    description: 'Hot reloading development environment for both frontend and backend',
  });

  // Testing Integration
  integrationPoints.push({
    name: 'End-to-End Testing',
    type: 'testing',
    frontend: 'Jest, React Testing Library',
    backend: 'Go testing package',
    description: 'Comprehensive testing strategy covering UI, API, and integration',
  });

  return integrationPoints;
}

function generateStructureSummary(
  architecture: ArchitectureOverview,
  directories: DirectoryStructure[],
  patterns: DevelopmentPattern[]
): string {
  return `
# DomainFlow Project Structure

## Architecture Overview
**Type**: ${architecture.type}

### Frontend Stack
- **Framework**: ${architecture.frontend.framework} ${architecture.frontend.version}
- **Language**: ${architecture.frontend.language}
- **Key Libraries**: ${architecture.frontend.keyLibraries.join(', ')}

### Backend Stack
- **Framework**: ${architecture.backend.framework}
- **Language**: ${architecture.backend.language} ${architecture.backend.version}
- **Key Libraries**: ${architecture.backend.keyLibraries.join(', ')}

### Database & Real-time
- **Database**: ${architecture.database.framework} ${architecture.database.version}
- **Real-time**: ${architecture.realtime.framework}

## Project Organization
**Total Directories**: ${directories.length}

### Core Directories
${directories.filter(d => ['src', 'backend', 'scripts'].includes(d.path))
  .map(d => `- **${d.path}**: ${d.description}`).join('\n')}

### Development Patterns
**Architecture Patterns**: ${patterns.filter(p => p.category === 'architecture').length}
**Development Patterns**: ${patterns.filter(p => p.category === 'development').length}
**Testing Patterns**: ${patterns.filter(p => p.category === 'testing').length}
**Deployment Patterns**: ${patterns.filter(p => p.category === 'deployment').length}

## Key Features
1. **Type Safety**: Branded types (UUID, SafeBigInt) with runtime validation
2. **Contract Alignment**: Automated sync between Go and TypeScript
3. **Real-time Updates**: WebSocket integration for live data
4. **Modular Architecture**: Clean separation of concerns
5. **Comprehensive Testing**: Unit, integration, and E2E testing
6. **Development Experience**: Hot reloading and automated tooling

## Integration Points
- REST API with enhanced error handling
- WebSocket for real-time communication
- PostgreSQL with type-safe models
- Automated build and deployment pipeline
- Cross-platform testing strategy

This structure enables rapid development while maintaining type safety and code quality.
`.trim();
}