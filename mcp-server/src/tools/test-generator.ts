import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'fast-glob';

interface TestContextArgs {
  testType: 'unit' | 'integration' | 'e2e';
  component?: string;
}

interface TestPattern {
  name: string;
  description: string;
  example: string;
  filePath: string;
}

/**
 * Test Generator Tool
 * 
 * Provides test patterns and existing test structures.
 * Understands DomainFlow's testing conventions and patterns.
 */
export async function testGeneratorTool(
  args: TestContextArgs,
  rootPath: string
) {
  const { testType, component } = args;

  try {
    const existingTests = await findExistingTests(rootPath, testType, component);
    const testPatterns = await getTestPatterns(rootPath, testType, component);
    const testingSetup = await getTestingSetup(rootPath);
    
    const summary = generateTestingSummary(testType, component, existingTests, testPatterns, testingSetup);

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to get test context: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function findExistingTests(
  rootPath: string,
  testType: 'unit' | 'integration' | 'e2e',
  component?: string
): Promise<TestPattern[]> {
  const testPatterns: TestPattern[] = [];
  
  let searchPatterns: string[] = [];
  
  switch (testType) {
    case 'unit':
      searchPatterns = [
        'src/**/__tests__/**/*.test.ts',
        'src/**/__tests__/**/*.test.tsx',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ];
      break;
    case 'integration':
      searchPatterns = [
        'src/**/__tests__/**/*.integration.test.ts',
        'src/**/__tests__/**/*.integration.test.tsx',
        'tests/integration/**/*.test.ts',
      ];
      break;
    case 'e2e':
      searchPatterns = [
        'tests/e2e/**/*.test.ts',
        'cypress/**/*.spec.ts',
        'playwright/**/*.spec.ts',
      ];
      break;
  }

  if (component) {
    searchPatterns = searchPatterns.map(pattern => 
      pattern.replace('**', `**/*${component}*`)
    );
  }

  for (const pattern of searchPatterns) {
    try {
      const files = await glob(pattern, { cwd: rootPath });
      
      for (const file of files.slice(0, 10)) { // Limit to 10 files
        try {
          const content = await fs.readFile(path.join(rootPath, file), 'utf-8');
          const testPattern = analyzeTestFile(file, content);
          testPatterns.push(testPattern);
        } catch (error) {
          // Continue if file can't be read
        }
      }
    } catch (error) {
      // Continue if pattern fails
    }
  }

  return testPatterns;
}

async function getTestPatterns(
  rootPath: string,
  testType: 'unit' | 'integration' | 'e2e',
  component?: string
): Promise<string[]> {
  const patterns: string[] = [];

  // Add DomainFlow-specific test patterns
  patterns.push(...getDomainFlowTestPatterns(testType, component));
  
  // Add general testing best practices
  patterns.push(...getGeneralTestPatterns(testType));

  return patterns;
}

async function getTestingSetup(rootPath: string): Promise<string> {
  let setup = '';

  // Read Jest configuration
  try {
    const jestConfig = await fs.readFile(path.join(rootPath, 'jest.config.ts'), 'utf-8');
    setup += `## Jest Configuration\n\n\`\`\`typescript\n${jestConfig}\n\`\`\`\n\n`;
  } catch (error) {
    // Continue if Jest config doesn't exist
  }

  // Read Jest setup
  try {
    const jestSetup = await fs.readFile(path.join(rootPath, 'jest.setup.ts'), 'utf-8');
    setup += `## Jest Setup\n\n\`\`\`typescript\n${jestSetup}\n\`\`\`\n\n`;
  } catch (error) {
    // Continue if Jest setup doesn't exist
  }

  // Read test utilities
  try {
    const testUtilsPath = path.join(rootPath, 'src/tests');
    const testUtilsFiles = await fs.readdir(testUtilsPath);
    
    for (const file of testUtilsFiles.slice(0, 3)) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = await fs.readFile(path.join(testUtilsPath, file), 'utf-8');
        setup += `## Test Utilities: ${file}\n\n\`\`\`typescript\n${content.slice(0, 1000)}\n\`\`\`\n\n`;
      }
    }
  } catch (error) {
    // Continue if test utils don't exist
  }

  return setup;
}

function analyzeTestFile(filePath: string, content: string): TestPattern {
  const fileName = path.basename(filePath);
  const testName = fileName.replace(/\.(test|spec)\.(ts|tsx)$/, '');
  
  // Extract the first describe block or test name
  const describeMatch = content.match(/describe\(['"`]([^'"`]+)['"`]/);
  const testMatch = content.match(/it\(['"`]([^'"`]+)['"`]/);
  
  const description = describeMatch ? describeMatch[1] : 
                     testMatch ? testMatch[1] : 
                     `Tests for ${testName}`;

  // Extract a representative test example
  const example = extractTestExample(content);

  return {
    name: testName,
    description,
    example,
    filePath,
  };
}

function extractTestExample(content: string): string {
  // Find first complete test case
  const testRegex = /it\(['"`]([^'"`]+)['"`][^{]*{((?:[^{}]|{[^{}]*})*)}(?:\s*\)|;)/s;
  const match = content.match(testRegex);
  
  if (match) {
    return `it('${match[1]}', ${match[0].includes('async') ? 'async ' : ''}() => {${match[2]}}`;
  }

  // Fallback to first few lines of first test
  const lines = content.split('\n');
  const testStartIndex = lines.findIndex(line => line.trim().startsWith('it('));
  
  if (testStartIndex !== -1) {
    return lines.slice(testStartIndex, testStartIndex + 10).join('\n');
  }

  return content.slice(0, 500);
}

function getDomainFlowTestPatterns(
  testType: 'unit' | 'integration' | 'e2e',
  component?: string
): string[] {
  const patterns: string[] = [];

  switch (testType) {
    case 'unit':
      patterns.push(...getUnitTestPatterns(component));
      break;
    case 'integration':
      patterns.push(...getIntegrationTestPatterns(component));
      break;
    case 'e2e':
      patterns.push(...getE2ETestPatterns(component));
      break;
  }

  return patterns;
}

function getUnitTestPatterns(component?: string): string[] {
  const patterns = [
    `// DomainFlow Unit Test Pattern - Service Testing
import { ${component || 'Service'}Service } from '@/lib/services/${component || 'service'}Service';
import { mockApiClient } from '@/tests/mocks/apiClient';

describe('${component || 'Service'}Service', () => {
  let service: ${component || 'Service'}Service;

  beforeEach(() => {
    service = new ${component || 'Service'}Service(mockApiClient);
  });

  it('should handle successful API responses', async () => {
    const mockResponse = { id: 'test-id', status: 'success' };
    mockApiClient.get.mockResolvedValue({ data: mockResponse });

    const result = await service.get('test-id');

    expect(result).toEqual(mockResponse);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/v2/${component || 'service'}/test-id');
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API Error');
    mockApiClient.get.mockRejectedValue(mockError);

    await expect(service.get('test-id')).rejects.toThrow('API Error');
  });
});`,

    `// DomainFlow Unit Test Pattern - Component Testing
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ${component || 'Component'} } from '@/components/${component || 'component'}/${component || 'Component'}';
import { AuthProvider } from '@/contexts/AuthContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  );
};

describe('${component || 'Component'}', () => {
  it('should render correctly', () => {
    renderWithProviders(<${component || 'Component'} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const mockOnClick = jest.fn();
    renderWithProviders(<${component || 'Component'} onClick={mockOnClick} />);

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(mockOnClick).toHaveBeenCalled();
    });
  });
});`,

    `// DomainFlow Unit Test Pattern - Type Safety Testing
import { validateSafeBigInt, validateUUID } from '@/lib/utils/runtime-validators';
import { ${component || 'Type'} } from '@/lib/types';

describe('${component || 'Type'} Validation', () => {
  it('should validate SafeBigInt fields correctly', () => {
    const validBigInt = BigInt('9007199254740991');
    expect(validateSafeBigInt(validBigInt)).toBe(true);
    expect(validateSafeBigInt('invalid')).toBe(false);
  });

  it('should validate UUID fields correctly', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    expect(validateUUID(validUUID)).toBe(true);
    expect(validateUUID('invalid-uuid')).toBe(false);
  });
});`
  ];

  return patterns;
}

function getIntegrationTestPatterns(component?: string): string[] {
  const patterns = [
    `// DomainFlow Integration Test Pattern - API Integration
import { ${component || 'Service'}Service } from '@/lib/services/${component || 'service'}Service';
import { apiClient } from '@/lib/services/apiClient';
import { setupTestServer } from '@/tests/setup/testServer';

describe('${component || 'Service'} Integration Tests', () => {
  beforeAll(() => {
    setupTestServer();
  });

  it('should integrate with real API endpoints', async () => {
    const service = new ${component || 'Service'}Service(apiClient);
    
    // Mock the actual API response
    const mockData = {
      id: 'test-id',
      name: 'Test ${component || 'Entity'}',
      status: 'active'
    };

    const result = await service.create(mockData);
    
    expect(result).toMatchObject({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
      name: 'Test ${component || 'Entity'}',
      status: 'active'
    });
  });
});`,

    `// DomainFlow Integration Test Pattern - WebSocket Integration
import { websocketService } from '@/lib/services/websocketService';
import { waitForWebSocketConnection } from '@/tests/utils/websocket';

describe('${component || 'Component'} WebSocket Integration', () => {
  beforeEach(async () => {
    await waitForWebSocketConnection();
  });

  it('should receive real-time updates', async () => {
    const messagePromise = new Promise((resolve) => {
      websocketService.subscribe('${component || 'component'}_update', resolve);
    });

    // Trigger an update
    await websocketService.send({
      type: '${component || 'component'}_action',
      payload: { id: 'test-id' }
    });

    const message = await messagePromise;
    expect(message).toMatchObject({
      type: '${component || 'component'}_update',
      payload: expect.any(Object)
    });
  });
});`
  ];

  return patterns;
}

function getE2ETestPatterns(component?: string): string[] {
  const patterns = [
    `// DomainFlow E2E Test Pattern - User Workflow
import { test, expect } from '@playwright/test';

test.describe('${component || 'Feature'} E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@domainflow.local');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete ${component || 'feature'} workflow', async ({ page }) => {
    // Navigate to ${component || 'feature'} page
    await page.click('[data-testid="${component || 'feature'}-nav"]');
    await expect(page).toHaveURL('/${component || 'feature'}');

    // Perform ${component || 'feature'} actions
    await page.click('[data-testid="create-${component || 'feature'}"]');
    await page.fill('[data-testid="${component || 'feature'}-name"]', 'Test ${component || 'Feature'}');
    await page.click('[data-testid="save-${component || 'feature'}"]');

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="${component || 'feature'}-list"]')).toContainText('Test ${component || 'Feature'}');
  });
});`
  ];

  return patterns;
}

function getGeneralTestPatterns(testType: 'unit' | 'integration' | 'e2e'): string[] {
  const generalPatterns: Record<string, string[]> = {
    unit: [
      '// Use describe blocks to group related tests',
      '// Use beforeEach/afterEach for setup/cleanup',
      '// Mock external dependencies',
      '// Test both success and error cases',
      '// Use descriptive test names that explain the behavior',
    ],
    integration: [
      '// Test real interactions between components',
      '// Use minimal mocking, prefer real implementations',
      '// Test data flow through multiple layers',
      '// Verify side effects and state changes',
      '// Test error propagation across boundaries',
    ],
    e2e: [
      '// Test complete user workflows',
      '// Use page object pattern for reusability',
      '// Test critical business paths',
      '// Verify UI interactions and feedback',
      '// Test across different browsers/devices',
    ]
  };

  return generalPatterns[testType] || [];
}

function generateTestingSummary(
  testType: 'unit' | 'integration' | 'e2e',
  component: string | undefined,
  existingTests: TestPattern[],
  testPatterns: string[],
  testingSetup: string
): string {
  let summary = `# Testing Context: ${testType}${component ? ` - ${component}` : ''}\n\n`;
  
  summary += `Found ${existingTests.length} existing ${testType} tests${component ? ` for ${component}` : ''}\n\n`;

  // Testing setup
  if (testingSetup) {
    summary += `## Testing Setup\n\n${testingSetup}`;
  }

  // Existing tests
  if (existingTests.length > 0) {
    summary += `## Existing Test Examples\n\n`;
    for (const test of existingTests.slice(0, 5)) {
      summary += `### ${test.name}\n`;
      summary += `**File**: \`${test.filePath}\`\n`;
      summary += `**Description**: ${test.description}\n\n`;
      summary += `\`\`\`typescript\n${test.example.slice(0, 1000)}\n\`\`\`\n\n`;
    }
  }

  // Test patterns
  summary += `## Recommended Test Patterns\n\n`;
  for (const pattern of testPatterns) {
    if (pattern.startsWith('//')) {
      summary += `${pattern}\n`;
    } else {
      summary += `\`\`\`typescript\n${pattern}\n\`\`\`\n\n`;
    }
  }

  // DomainFlow-specific testing guidance
  summary += generateDomainFlowTestingGuidance(testType);

  return summary;
}

function generateDomainFlowTestingGuidance(testType: 'unit' | 'integration' | 'e2e'): string {
  const guidance: Record<string, string> = {
    unit: `
## DomainFlow Unit Testing Guidelines

### Type Safety Testing
- Always test SafeBigInt conversions and validations
- Verify UUID branded type handling
- Test ISODateString formatting and parsing
- Validate enum constraints and union types

### Service Layer Testing
- Mock API clients consistently
- Test error handling and retry logic
- Verify request/response transformations
- Test circuit breaker behavior

### Component Testing
- Use testing-library for React components
- Test accessibility and keyboard navigation
- Verify loading states and error boundaries
- Test WebSocket connection states

### Validation Testing
- Test runtime validators thoroughly
- Verify schema validation with invalid data
- Test form validation and error messages
- Ensure type guards work correctly
`,
    integration: `
## DomainFlow Integration Testing Guidelines

### API Integration
- Test real HTTP endpoints with test server
- Verify request/response contract alignment
- Test authentication and authorization flows
- Validate WebSocket message handling

### State Management
- Test optimistic updates and rollbacks
- Verify race condition prevention
- Test state synchronization across components
- Validate cache invalidation strategies

### Error Handling
- Test network failure scenarios
- Verify graceful degradation
- Test error boundary integration
- Validate user error feedback

### Performance
- Test request deduplication
- Verify caching strategies
- Test bundle loading and code splitting
- Validate memory leak prevention
`,
    e2e: `
## DomainFlow E2E Testing Guidelines

### User Workflows
- Test complete campaign creation and management
- Verify authentication and session handling
- Test real-time updates and WebSocket features
- Validate responsive design across devices

### Business Critical Paths
- Test domain generation workflows
- Verify DNS and HTTP validation processes
- Test user management and permissions
- Validate data export and reporting

### Error Scenarios
- Test network disconnection handling
- Verify invalid input handling
- Test session expiration scenarios
- Validate error recovery mechanisms

### Performance Validation
- Test page load times and Core Web Vitals
- Verify smooth animations and transitions
- Test large dataset handling
- Validate search and filtering performance
`
  };

  return guidance[testType] || '';
}