import * as fs from 'fs/promises';
import * as path from 'path';

interface BuildContextArgs {
  environment?: 'development' | 'production';
}

interface BuildInfo {
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  buildTools: string[];
  configurations: string[];
}

/**
 * Build Automation Tool
 * 
 * Provides build pipeline and deployment context.
 * Understands DomainFlow's build tools and configurations.
 */
export async function buildAutomationTool(
  args: BuildContextArgs,
  rootPath: string
) {
  const { environment = 'development' } = args;

  try {
    const frontendBuildInfo = await getFrontendBuildInfo(rootPath);
    const backendBuildInfo = await getBackendBuildInfo(rootPath);
    const deploymentInfo = await getDeploymentInfo(rootPath, environment);
    const scriptInfo = await getScriptInfo(rootPath);
    
    const summary = generateBuildSummary(
      environment,
      frontendBuildInfo,
      backendBuildInfo,
      deploymentInfo,
      scriptInfo
    );

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to get build context: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getFrontendBuildInfo(rootPath: string): Promise<BuildInfo> {
  try {
    const packageJsonPath = path.join(rootPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    const configurations = [];
    
    // Check for configuration files
    const configFiles = [
      'next.config.ts',
      'tsconfig.json',
      'tailwind.config.ts',
      'jest.config.ts',
      '.eslintrc.json',
      'postcss.config.js',
    ];
    
    for (const configFile of configFiles) {
      try {
        await fs.access(path.join(rootPath, configFile));
        configurations.push(configFile);
      } catch {
        // File doesn't exist
      }
    }

    return {
      scripts: packageJson.scripts || {},
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
      buildTools: identifyBuildTools(packageJson),
      configurations,
    };
  } catch (error) {
    throw new Error(`Failed to read frontend build info: ${error}`);
  }
}

async function getBackendBuildInfo(rootPath: string): Promise<BuildInfo> {
  try {
    const backendPath = path.join(rootPath, 'backend');
    
    // Read Go mod file
    const goModPath = path.join(backendPath, 'go.mod');
    const goMod = await fs.readFile(goModPath, 'utf-8');
    const dependencies = extractGoDependencies(goMod);
    
    // Read Makefile
    const makefilePath = path.join(backendPath, 'Makefile');
    const makefile = await fs.readFile(makefilePath, 'utf-8');
    const makeTargets = extractMakeTargets(makefile);
    
    const configurations = [];
    
    // Check for configuration files
    const configFiles = [
      'Makefile',
      'go.mod',
      'go.sum',
      '.golangci.yml',
      '.air.toml',
      'config.json',
      'config.example.json',
    ];
    
    for (const configFile of configFiles) {
      try {
        await fs.access(path.join(backendPath, configFile));
        configurations.push(configFile);
      } catch {
        // File doesn't exist
      }
    }

    return {
      scripts: makeTargets,
      dependencies,
      devDependencies: [],
      buildTools: ['Go', 'Make', 'Gin'],
      configurations,
    };
  } catch (error) {
    throw new Error(`Failed to read backend build info: ${error}`);
  }
}

async function getDeploymentInfo(rootPath: string, environment: string): Promise<string> {
  let deploymentInfo = '';

  // Check for deployment guides
  const deploymentFiles = [
    'DEPLOYMENT_GUIDE.md',
    'QUICK_START.md',
    'README.md',
    '.env.example',
    '.env.production.example',
  ];

  for (const file of deploymentFiles) {
    try {
      const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
      if (content.toLowerCase().includes('deploy') || 
          content.toLowerCase().includes('production') ||
          content.toLowerCase().includes('environment')) {
        deploymentInfo += `## ${file}\n\n`;
        deploymentInfo += extractRelevantDeploymentSection(content, environment);
        deploymentInfo += '\n\n';
      }
    } catch (error) {
      // Continue if file doesn't exist
    }
  }

  return deploymentInfo;
}

async function getScriptInfo(rootPath: string): Promise<string> {
  let scriptInfo = '';

  // Check scripts directory
  try {
    const scriptsPath = path.join(rootPath, 'scripts');
    const scriptFiles = await fs.readdir(scriptsPath);
    
    scriptInfo += `## Available Scripts\n\n`;
    for (const file of scriptFiles.slice(0, 10)) {
      if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.sh')) {
        const filePath = path.join(scriptsPath, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const description = extractScriptDescription(content);
          scriptInfo += `- **${file}**: ${description}\n`;
        } catch (error) {
          scriptInfo += `- **${file}**: Script file\n`;
        }
      }
    }
    scriptInfo += '\n';
  } catch (error) {
    // Scripts directory doesn't exist
  }

  return scriptInfo;
}

function identifyBuildTools(packageJson: any): string[] {
  const tools = [];
  
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check for specific tools
  if (dependencies.next) tools.push('Next.js');
  if (dependencies.typescript) tools.push('TypeScript');
  if (dependencies.tailwindcss) tools.push('Tailwind CSS');
  if (dependencies.jest) tools.push('Jest');
  if (dependencies.eslint) tools.push('ESLint');
  if (dependencies.postcss) tools.push('PostCSS');
  if (dependencies.webpack) tools.push('Webpack');
  if (dependencies.vite) tools.push('Vite');
  if (dependencies['@testing-library/react']) tools.push('React Testing Library');
  
  return tools;
}

function extractGoDependencies(goMod: string): string[] {
  const dependencies = [];
  const lines = goMod.split('\n');
  let inRequireBlock = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === 'require (') {
      inRequireBlock = true;
      continue;
    }
    
    if (trimmed === ')' && inRequireBlock) {
      inRequireBlock = false;
      continue;
    }
    
    if (inRequireBlock || (trimmed.startsWith('require ') && !trimmed.includes('('))) {
      const match = trimmed.match(/^(?:require\s+)?([^\s]+)\s+v?([^\s]+)/);
      if (match) {
        dependencies.push(match[1]);
      }
    }
  }
  
  return dependencies;
}

function extractMakeTargets(makefile: string): Record<string, string> {
  const targets: Record<string, string> = {};
  const lines = makefile.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const targetMatch = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):(?:\s+(.*))?$/);
    
    if (targetMatch) {
      const targetName = targetMatch[1];
      let description = targetMatch[2] || '';
      
      // Check if previous line has a comment
      if (i > 0) {
        const prevLine = lines[i - 1].trim();
        if (prevLine.startsWith('#')) {
          description = prevLine.replace(/^#\s*/, '') + (description ? ` - ${description}` : '');
        }
      }
      
      targets[targetName] = description || 'Make target';
    }
  }
  
  return targets;
}

function extractRelevantDeploymentSection(content: string, environment: string): string {
  const lines = content.split('\n');
  const relevantLines = [];
  let inRelevantSection = false;
  
  for (const line of lines) {
    // Check for section headers related to deployment or environment
    if (line.match(/^#+\s*(deploy|production|development|setup|install|build|start)/i)) {
      inRelevantSection = true;
      relevantLines.push(line);
      continue;
    }
    
    // Check if we've moved to a different section
    if (line.match(/^#+\s/) && inRelevantSection) {
      if (!line.toLowerCase().includes(environment) && 
          !line.toLowerCase().includes('deploy') &&
          !line.toLowerCase().includes('setup')) {
        inRelevantSection = false;
        continue;
      }
    }
    
    if (inRelevantSection && relevantLines.length < 50) {
      relevantLines.push(line);
    }
  }
  
  return relevantLines.join('\n').slice(0, 2000); // Limit to 2000 chars
}

function extractScriptDescription(content: string): string {
  const lines = content.split('\n');
  
  // Look for comments at the beginning of the file
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      const comment = trimmed.replace(/^[\/\/#]\s*/, '');
      if (comment.length > 10 && !comment.includes('!')) {
        return comment.slice(0, 100);
      }
    }
  }
  
  // Look for package.json description if it's a JS file
  if (content.includes('"description"')) {
    const descMatch = content.match(/"description":\s*"([^"]+)"/);
    if (descMatch) {
      return descMatch[1];
    }
  }
  
  return 'Build or utility script';
}

function generateBuildSummary(
  environment: string,
  frontendBuildInfo: BuildInfo,
  backendBuildInfo: BuildInfo,
  deploymentInfo: string,
  scriptInfo: string
): string {
  let summary = `# Build & Deployment Context: ${environment}\n\n`;
  
  summary += `Complete build pipeline information for DomainFlow **${environment}** environment\n\n`;

  // Frontend build information
  summary += `## Frontend Build (Next.js)\n\n`;
  summary += `**Build Tools**: ${frontendBuildInfo.buildTools.join(', ')}\n\n`;
  
  summary += `### Key Scripts\n\n`;
  const keyScripts = ['dev', 'build', 'start', 'lint', 'test', 'typecheck'];
  for (const script of keyScripts) {
    if (frontendBuildInfo.scripts[script]) {
      summary += `- **${script}**: \`${frontendBuildInfo.scripts[script]}\`\n`;
    }
  }
  summary += '\n';
  
  summary += `### Configuration Files\n\n`;
  for (const config of frontendBuildInfo.configurations) {
    summary += `- \`${config}\`\n`;
  }
  summary += '\n';

  // Backend build information
  summary += `## Backend Build (Go)\n\n`;
  summary += `**Build Tools**: ${backendBuildInfo.buildTools.join(', ')}\n\n`;
  
  summary += `### Make Targets\n\n`;
  for (const [target, description] of Object.entries(backendBuildInfo.scripts)) {
    summary += `- **${target}**: ${description}\n`;
  }
  summary += '\n';
  
  summary += `### Key Dependencies\n\n`;
  const keyDeps = backendBuildInfo.dependencies.filter(dep => 
    dep.includes('gin') || dep.includes('postgres') || dep.includes('websocket') || 
    dep.includes('uuid') || dep.includes('crypto') || dep.includes('cors')
  );
  for (const dep of keyDeps.slice(0, 10)) {
    summary += `- \`${dep}\`\n`;
  }
  summary += '\n';

  // Deployment workflow
  summary += `## Deployment Workflow\n\n`;
  summary += generateDeploymentWorkflow(environment);

  // Script information
  if (scriptInfo) {
    summary += scriptInfo;
  }

  // Deployment guides
  if (deploymentInfo) {
    summary += `## Deployment Documentation\n\n`;
    summary += deploymentInfo;
  }

  // Environment-specific considerations
  summary += generateEnvironmentConsiderations(environment);

  return summary;
}

function generateDeploymentWorkflow(environment: string): string {
  if (environment === 'production') {
    return `
### Production Deployment

1. **Database Setup**:
   \`\`\`bash
   # Deploy production schema
   psql "postgres://username:password@host:5432/domainflow_production" < backend/database/production_schema_v3.sql
   \`\`\`

2. **Backend Deployment**:
   \`\`\`bash
   cd backend
   make build
   make run
   \`\`\`

3. **Frontend Deployment**:
   \`\`\`bash
   npm run generate:schemas
   npm run build
   npm start
   \`\`\`

4. **Environment Configuration**:
   - Copy \`.env.production.example\` to \`.env.production\`
   - Configure database connection strings
   - Set session secrets and security keys
   - Configure CORS origins for production domains

5. **Verification**:
   - Test API endpoints at \`/api/v2/\`
   - Verify WebSocket connection
   - Check authentication flow
   - Validate database connections
`;
  } else {
    return `
### Development Setup

1. **Database Setup**:
   \`\`\`bash
   createdb domainflow_dev
   psql domainflow_dev < backend/database/schema.sql
   \`\`\`

2. **Backend Development**:
   \`\`\`bash
   cd backend
   make run
   \`\`\`

3. **Frontend Development**:
   \`\`\`bash
   npm install
   npm run dev
   \`\`\`

4. **Development Tools**:
   - Hot reloading with Next.js Turbo
   - Go air for backend hot reloading
   - TypeScript watch mode
   - Jest testing in watch mode

5. **Development Workflow**:
   - Contract sync: \`npm run generate:schemas\`
   - Type checking: \`npm run typecheck\`
   - Linting: \`npm run lint\`
   - Testing: \`npm run test\`
`;
  }
}

function generateEnvironmentConsiderations(environment: string): string {
  const considerations: Record<string, string> = {
    development: `
## Development Environment Considerations

### Performance
- Use Next.js Turbo mode for faster builds
- Enable TypeScript incremental compilation
- Use Jest watch mode for continuous testing
- Hot module replacement for rapid iteration

### Debugging
- Source maps enabled for debugging
- Development-only error boundaries
- Verbose logging and error reporting
- Browser dev tools integration

### Security
- Relaxed CORS for local development
- Development API keys and secrets
- Local SSL certificates for HTTPS testing
- Session security appropriate for development

### Type Safety
- Strict TypeScript configuration
- Runtime validation in development
- Contract alignment verification
- Branded type checking enabled
`,
    production: `
## Production Environment Considerations

### Performance
- Optimized Next.js build with static generation
- Minified and compressed assets
- CDN integration for static assets
- Database connection pooling

### Security
- Strict CORS configuration
- Production API keys and secrets
- Secure session configuration
- HTTPS-only cookie settings
- Security headers enabled

### Monitoring
- Error tracking and reporting
- Performance monitoring
- Database query optimization
- WebSocket connection monitoring

### Scalability
- Horizontal scaling configuration
- Load balancer integration
- Database read replicas
- Caching strategies enabled

### Backup & Recovery
- Automated database backups
- Configuration backup procedures
- Disaster recovery planning
- Rollback procedures documented
`
  };

  return considerations[environment] || '';
}