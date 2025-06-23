/**
 * Debugging Assistance Prompts
 * 
 * Specialized prompts for DomainFlow-specific debugging and troubleshooting.
 * Provides context-aware guidance for common issues and debugging patterns.
 */
export async function debuggingPrompts(issue: string) {
  const prompts = getDebuggingPrompts();
  const selectedPrompt = prompts[issue.toLowerCase()] || prompts.general;

  return {
    description: `Debugging assistance for: ${issue}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: selectedPrompt,
        },
      },
    ],
  };
}

function getDebuggingPrompts(): Record<string, string> {
  return {
    websocket: `
# WebSocket Debugging Guide

You are debugging DomainFlow's WebSocket connectivity issues. Here's the debugging context:

## Common WebSocket Issues

### 1. Connection Problems
**Symptoms**: WebSocket fails to connect or frequently disconnects

**Debugging Steps**:
\`\`\`typescript
// Check WebSocket status
const { status, isOperationallyConnected } = useWebSocketStatus();
console.log('WebSocket status:', status);
console.log('Operationally connected:', isOperationallyConnected());

// Check connection details
const connections = websocketService.getConnections();
console.log('Active connections:', connections);

// Test connection manually
const testResult = await websocketService.testConnection();
console.log('Connection test result:', testResult);
\`\`\`

**Common Causes**:
- Network connectivity issues
- Server not running on ws://localhost:8080/ws
- Authentication problems
- Firewall or proxy blocking WebSocket

**Solutions**:
1. Verify backend server is running
2. Check network console for WebSocket errors
3. Validate authentication token
4. Test with direct WebSocket connection

### 2. Message Handling Issues
**Symptoms**: Messages not being received or processed

**Debugging Steps**:
\`\`\`typescript
// Enable WebSocket logging
import { logWebSocket } from '@/lib/utils/logger';
logWebSocket.setLevel('debug');

// Check message handlers
const handlers = websocketService.getHandlers();
console.log('Registered handlers:', handlers);

// Monitor incoming messages
websocketService.onMessage((message) => {
  console.log('Received message:', message);
});

// Check if messages are being sent
websocketService.send({
  type: 'test_message',
  payload: { test: true }
});
\`\`\`

**Common Causes**:
- Message handler not registered
- Incorrect message format
- Authentication expired
- Message routing issues

### 3. Performance Issues
**Symptoms**: Slow message delivery or high memory usage

**Debugging Steps**:
\`\`\`typescript
// Monitor connection performance
const metrics = websocketService.getMetrics();
console.log('WebSocket metrics:', {
  messagesSent: metrics.messagesSent,
  messagesReceived: metrics.messagesReceived,
  averageLatency: metrics.averageLatency,
  connectionUptime: metrics.connectionUptime
});

// Check for memory leaks
const memoryUsage = performance.memory;
console.log('Memory usage:', memoryUsage);
\`\`\`

## Diagnostic Tools

### 1. WebSocket Status Component
\`\`\`typescript
const WebSocketDebugger: React.FC = () => {
  const { status, testConnection } = useWebSocketStatus();
  
  return (
    <div className="debug-panel">
      <h3>WebSocket Status: {status.overallStatus}</h3>
      <div>Active Connections: {Object.keys(status.connections).length}</div>
      <button onClick={testConnection}>Test Connection</button>
      {status.lastTestResult && (
        <div>
          Last Test: {status.lastTestResult.success ? 'Success' : 'Failed'}
          {status.lastTestResult.error && <div>Error: {status.lastTestResult.error}</div>}
        </div>
      )}
    </div>
  );
};
\`\`\`

### 2. Message Logger
\`\`\`typescript
const useWebSocketLogger = () => {
  useEffect(() => {
    const unsubscribe = websocketService.onMessage((message) => {
      console.group('WebSocket Message');
      console.log('Type:', message.type);
      console.log('Payload:', message.payload);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    });

    return unsubscribe;
  }, []);
};
\`\`\`

## Environment-Specific Issues

### Development Environment
- Check if backend is running on correct port (8080)
- Verify CORS settings allow WebSocket connections
- Check if authentication is properly configured

### Production Environment
- Verify WebSocket URL uses wss:// for HTTPS sites
- Check load balancer WebSocket support
- Verify SSL certificate includes WebSocket domain

Focus on connection status, message flow, and performance metrics.
`,

    api: `
# API Debugging Guide

You are debugging DomainFlow's API connectivity issues. Here's the debugging context:

## Common API Issues

### 1. Authentication Problems
**Symptoms**: 401 errors, authentication required messages

**Debugging Steps**:
\`\`\`typescript
// Check authentication status
const { isAuthenticated, user } = useAuth();
console.log('Is authenticated:', isAuthenticated);
console.log('Current user:', user);

// Check session validity
const sessionInfo = await authService.validateSession();
console.log('Session info:', sessionInfo);

// Check API client configuration
console.log('API client base URL:', apiClient.defaults.baseURL);
console.log('API client headers:', apiClient.defaults.headers);

// Test authentication endpoint
try {
  const response = await apiClient.get('/api/v2/auth/session');
  console.log('Session validation response:', response.data);
} catch (error) {
  console.error('Session validation error:', error);
}
\`\`\`

**Common Causes**:
- Session expired
- Invalid or missing authentication token
- CORS issues
- Server authentication middleware problems

### 2. Network Connectivity
**Symptoms**: Network errors, timeout errors

**Debugging Steps**:
\`\`\`typescript
// Test basic connectivity
const testConnectivity = async () => {
  try {
    const response = await fetch('/api/v2/health');
    console.log('Health check:', response.status);
  } catch (error) {
    console.error('Connectivity error:', error);
  }
};

// Check enhanced API client status
const { circuitBreakerStatus, retryCount } = enhancedApiClient.getStatus();
console.log('Circuit breaker status:', circuitBreakerStatus);
console.log('Retry count:', retryCount);

// Monitor request timing
const startTime = performance.now();
await apiClient.get('/api/v2/campaigns');
const endTime = performance.now();
console.log(\`Request took \${endTime - startTime} milliseconds\`);
\`\`\`

**Common Causes**:
- Server not running
- Network connectivity issues
- Firewall blocking requests
- DNS resolution problems

### 3. Data Validation Issues
**Symptoms**: 400 errors, validation failures

**Debugging Steps**:
\`\`\`typescript
// Check request data validation
const validateRequestData = (data: any) => {
  console.log('Request data:', JSON.stringify(data, null, 2));
  
  // Check for SafeBigInt issues
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'bigint') {
      console.log(\`BigInt field \${key}:\`, value.toString());
    }
    if (key.includes('Id') && typeof value === 'string') {
      console.log(\`UUID field \${key}:\`, validateUUID(value));
    }
  });
};

// Test API contract alignment
const testContractAlignment = async () => {
  try {
    const response = await apiClient.get('/api/v2/campaigns/123');
    console.log('Response structure:', Object.keys(response.data));
    
    // Validate response types
    if (response.data.id && !validateUUID(response.data.id)) {
      console.warn('Invalid UUID in response');
    }
  } catch (error) {
    console.error('Contract validation error:', error);
  }
};
\`\`\`

## Enhanced API Client Debugging

### 1. Circuit Breaker Issues
**Symptoms**: Requests failing with circuit breaker open

**Debugging**:
\`\`\`typescript
// Check circuit breaker status
const status = enhancedApiClient.getCircuitBreakerStatus();
console.log('Circuit breaker:', {
  state: status.state, // 'closed', 'open', 'half-open'
  failures: status.failures,
  lastFailure: status.lastFailure,
  nextAttempt: status.nextAttempt
});

// Reset circuit breaker if needed
if (status.state === 'open') {
  enhancedApiClient.resetCircuitBreaker();
}
\`\`\`

### 2. Retry Logic Issues
**Symptoms**: Requests not retrying or retrying too many times

**Debugging**:
\`\`\`typescript
// Monitor retry attempts
enhancedApiClient.onRetry((attempt, error) => {
  console.log(\`Retry attempt \${attempt}:\`, error.message);
});

// Check retry configuration
const config = enhancedApiClient.getRetryConfig();
console.log('Retry config:', {
  maxAttempts: config.maxAttempts,
  delay: config.delay,
  backoffFactor: config.backoffFactor
});
\`\`\`

## Response Validation

### 1. Type Safety Issues
**Debugging Steps**:
\`\`\`typescript
// Validate API response structure
const validateApiResponse = (response: any, expectedSchema: any) => {
  console.log('Response validation:');
  console.log('Expected schema:', expectedSchema);
  console.log('Actual response:', response);
  
  // Check for type mismatches
  Object.entries(expectedSchema).forEach(([key, expectedType]) => {
    const actualValue = response[key];
    const actualType = typeof actualValue;
    
    if (actualType !== expectedType) {
      console.warn(\`Type mismatch for \${key}: expected \${expectedType}, got \${actualType}\`);
    }
  });
};

// Test SafeBigInt conversion
const testSafeBigIntConversion = (value: any) => {
  try {
    const safeBigInt = SafeBigInt(value);
    console.log('SafeBigInt conversion successful:', safeBigInt);
  } catch (error) {
    console.error('SafeBigInt conversion failed:', error);
  }
};
\`\`\`

## Performance Debugging

### 1. Request Performance
\`\`\`typescript
// Monitor API performance
const performanceMonitor = {
  requests: new Map(),
  
  startRequest(url: string) {
    this.requests.set(url, performance.now());
  },
  
  endRequest(url: string) {
    const startTime = this.requests.get(url);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(\`API request \${url} took \${duration.toFixed(2)}ms\`);
      this.requests.delete(url);
    }
  }
};

// Add to API client interceptors
apiClient.interceptors.request.use((config) => {
  performanceMonitor.startRequest(config.url);
  return config;
});

apiClient.interceptors.response.use((response) => {
  performanceMonitor.endRequest(response.config.url);
  return response;
});
\`\`\`

Focus on authentication, network connectivity, and data validation.
`,

    database: `
# Database Connection Debugging Guide

You are debugging DomainFlow's database connectivity issues. Here's the debugging context:

## Common Database Issues

### 1. Connection Problems
**Symptoms**: Database connection errors, timeout issues

**Backend Debugging (Go)**:
\`\`\`go
// Test database connection
func testDatabaseConnection() {
    db, err := sql.Open("postgres", connectionString)
    if err != nil {
        log.Printf("Failed to open database: %v", err)
        return
    }
    defer db.Close()

    // Test connection
    if err := db.Ping(); err != nil {
        log.Printf("Failed to ping database: %v", err)
        return
    }

    log.Println("Database connection successful")

    // Test query
    var version string
    err = db.QueryRow("SELECT version()").Scan(&version)
    if err != nil {
        log.Printf("Failed to query database: %v", err)
        return
    }

    log.Printf("PostgreSQL version: %s", version)
}
\`\`\`

**Check Connection Configuration**:
\`\`\`go
// Verify connection string
connectionString := fmt.Sprintf(
    "postgres://%s:%s@%s:%d/%s?sslmode=%s",
    config.DB.User,
    config.DB.Password,
    config.DB.Host,
    config.DB.Port,
    config.DB.Name,
    config.DB.SSLMode,
)
log.Printf("Connection string: %s", connectionString)
\`\`\`

**Common Causes**:
- PostgreSQL server not running
- Incorrect database credentials
- Network connectivity issues
- Database doesn't exist
- SSL configuration problems

### 2. Schema Issues
**Symptoms**: Table doesn't exist, column not found

**Debugging Steps**:
\`\`\`sql
-- Check if database exists
SELECT datname FROM pg_database WHERE datname = 'domainflow_dev';

-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check table structure
\\d campaigns

-- Verify schema version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;
\`\`\`

**Check Schema Deployment**:
\`\`\`bash
# Verify schema files
ls -la backend/database/
cat backend/database/schema.sql | head -20

# Check migration status
psql domainflow_dev -c "SELECT * FROM schema_migrations;"

# Re-run schema if needed
psql domainflow_dev < backend/database/schema.sql
\`\`\`

### 3. Data Type Issues
**Symptoms**: Type conversion errors, SafeBigInt issues

**Debugging SQL Types**:
\`\`\`sql
-- Check column types
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'campaigns';

-- Test data type conversions
SELECT id, pg_typeof(id) FROM campaigns LIMIT 1;
SELECT user_id, pg_typeof(user_id) FROM campaigns LIMIT 1;
\`\`\`

**Go Type Mapping Verification**:
\`\`\`go
// Verify struct field mapping
type Campaign struct {
    ID        int64     \`json:"id" db:"id"\`           // Maps to BIGINT
    UserID    int64     \`json:"userId" db:"user_id"\`  // Maps to BIGINT
    Name      string    \`json:"name" db:"name"\`       // Maps to TEXT
    CreatedAt time.Time \`json:"createdAt" db:"created_at"\` // Maps to TIMESTAMP
}

// Test data retrieval
func debugCampaignData(db *sql.DB) {
    var campaign Campaign
    err := db.QueryRow("SELECT id, user_id, name, created_at FROM campaigns LIMIT 1").
        Scan(&campaign.ID, &campaign.UserID, &campaign.Name, &campaign.CreatedAt)
    
    if err != nil {
        log.Printf("Failed to scan campaign: %v", err)
        return
    }
    
    log.Printf("Campaign data: %+v", campaign)
}
\`\`\`

## Migration Issues

### 1. Migration Failures
**Debugging Steps**:
\`\`\`bash
# Check current schema version
psql domainflow_dev -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# List all applied migrations
psql domainflow_dev -c "SELECT * FROM schema_migrations ORDER BY version;"

# Check for migration errors
tail -f /var/log/postgresql/postgresql-*.log

# Re-run specific migration
psql domainflow_dev < migrations/001_initial_schema.sql
\`\`\`

### 2. Schema Validation
**Backend Validation**:
\`\`\`go
// Validate expected tables exist
func validateSchemaIntegrity(db *sql.DB) error {
    requiredTables := []string{"users", "campaigns", "personas", "sessions"}
    
    for _, table := range requiredTables {
        var exists bool
        err := db.QueryRow(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
            table,
        ).Scan(&exists)
        
        if err != nil || !exists {
            return fmt.Errorf("required table %s missing", table)
        }
    }
    
    return nil
}
\`\`\`

### 3. Production vs Development Schema
**Check Schema Differences**:
\`\`\`bash
# Compare development and production schemas
pg_dump --schema-only domainflow_dev > dev_schema.sql
pg_dump --schema-only domainflow_prod > prod_schema.sql
diff dev_schema.sql prod_schema.sql

# Use production schema for consistency
psql domainflow_dev < backend/database/production_schema_v3.sql
\`\`\`

## Performance Issues

### 1. Slow Queries
**Debugging Steps**:
\`\`\`sql
-- Enable query logging
SET log_statement = 'all';
SET log_min_duration_statement = 1000; -- Log queries > 1 second

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM campaigns WHERE user_id = 123;
\`\`\`

### 2. Connection Pool Issues
**Go Connection Pool Debugging**:
\`\`\`go
// Monitor connection pool stats
stats := db.Stats()
log.Printf("Database pool stats: %+v", stats)

// Check for connection leaks
if stats.OpenConnections > stats.MaxOpenConns * 0.8 {
    log.Warning("High connection usage detected")
}
\`\`\`

Focus on connection verification, schema validation, and performance monitoring.
`,

    type_safety: `
# Type Safety Debugging Guide

You are debugging DomainFlow's type safety issues. Here's the debugging context:

## SafeBigInt Issues

### 1. JavaScript Number Precision Loss
**Symptoms**: Large integers becoming inaccurate, precision errors

**Debugging Steps**:
\`\`\`typescript
// Test number precision
const testPrecision = (value: number) => {
  console.log('Original number:', value);
  console.log('JSON parsed:', JSON.parse(JSON.stringify(value)));
  console.log('Are they equal?', value === JSON.parse(JSON.stringify(value)));
  
  // Check if value exceeds safe integer range
  console.log('Is safe integer?', Number.isSafeInteger(value));
  console.log('Max safe integer:', Number.MAX_SAFE_INTEGER);
};

// Test with large values
testPrecision(9007199254740991); // Safe
testPrecision(9007199254740992); // Unsafe

// Debug SafeBigInt conversion
const debugSafeBigInt = (value: any) => {
  try {
    const safeBigInt = SafeBigInt(value);
    console.log('SafeBigInt conversion successful:', safeBigInt);
    console.log('String representation:', safeBigInt.toString());
    console.log('Number value (if safe):', Number(safeBigInt));
  } catch (error) {
    console.error('SafeBigInt conversion failed:', error);
  }
};
\`\`\`

**Common Causes**:
- Receiving int64 values from Go backend as JavaScript numbers
- JSON serialization losing precision
- Database returning BIGINT as number instead of string

**Solutions**:
\`\`\`typescript
// Ensure backend sends int64 as strings
interface CampaignResponse {
  id: string;        // Will be converted to SafeBigInt
  userId: string;    // Will be converted to SafeBigInt
  name: string;
  createdAt: string; // ISO date string
}

// Convert API responses
const convertApiResponse = (response: CampaignResponse) => ({
  id: SafeBigInt(response.id),
  userId: SafeBigInt(response.userId),
  name: response.name,
  createdAt: ISODateString(response.createdAt)
});
\`\`\`

### 2. SafeBigInt Display Issues
**Symptoms**: UI showing [object Object] or scientific notation

**Debugging & Solutions**:
\`\`\`typescript
// Create SafeBigInt display component
const SafeBigIntDisplay: React.FC<{ value: SafeBigInt }> = ({ value }) => {
  const displayValue = useMemo(() => {
    try {
      // Format for display
      return Number(value).toLocaleString();
    } catch (error) {
      // Fallback to string representation
      return value.toString();
    }
  }, [value]);

  return <span title={value.toString()}>{displayValue}</span>;
};

// Debug display issues
const debugSafeBigIntDisplay = (value: SafeBigInt) => {
  console.log('SafeBigInt value:', value);
  console.log('String representation:', value.toString());
  console.log('Number conversion (if safe):', 
    Number(value) <= Number.MAX_SAFE_INTEGER ? Number(value) : 'Too large for number');
  console.log('Locale string:', Number(value).toLocaleString());
};
\`\`\`

## UUID Type Issues

### 1. UUID Validation Problems
**Symptoms**: Invalid UUID errors, type mismatches

**Debugging Steps**:
\`\`\`typescript
// Test UUID validation
const debugUUID = (value: any) => {
  console.log('Testing UUID:', value);
  console.log('Type:', typeof value);
  console.log('Is valid UUID?', validateUUID(value));
  
  // Check UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  console.log('Matches regex?', uuidRegex.test(value));
  
  // Try to create UUID
  try {
    const uuid = UUID(value);
    console.log('UUID creation successful:', uuid);
  } catch (error) {
    console.error('UUID creation failed:', error);
  }
};

// Common UUID issues
debugUUID('123e4567-e89b-12d3-a456-426614174000'); // Valid
debugUUID('invalid-uuid');                          // Invalid
debugUUID('123E4567-E89B-12D3-A456-426614174000'); // Valid (case insensitive)
\`\`\`

**Common Causes**:
- Invalid UUID format from API
- Case sensitivity issues
- Null or undefined values
- Wrong data type (number instead of string)

### 2. UUID Generation Issues
**Debugging Steps**:
\`\`\`typescript
// Test UUID generation
const testUUIDGeneration = () => {
  // Check if crypto is available
  if (typeof crypto === 'undefined') {
    console.error('Crypto not available for UUID generation');
    return;
  }

  // Generate UUIDs
  for (let i = 0; i < 5; i++) {
    const uuid = generateUUID();
    console.log(\`Generated UUID \${i + 1}:\`, uuid);
    console.log('Is valid?', validateUUID(uuid));
  }
};
\`\`\`

## ISODateString Issues

### 1. Date Format Problems
**Symptoms**: Invalid date errors, timezone issues

**Debugging Steps**:
\`\`\`typescript
// Test date string validation
const debugISODate = (value: any) => {
  console.log('Testing date string:', value);
  console.log('Type:', typeof value);
  
  // Check if it's a valid ISO string
  const date = new Date(value);
  console.log('Parsed date:', date);
  console.log('Is valid date?', !isNaN(date.getTime()));
  console.log('ISO string:', date.toISOString());
  
  // Try to create ISODateString
  try {
    const isoDateString = ISODateString(value);
    console.log('ISODateString creation successful:', isoDateString);
  } catch (error) {
    console.error('ISODateString creation failed:', error);
  }
};

// Test various date formats
debugISODate('2023-12-25T10:30:00Z');           // Valid ISO
debugISODate('2023-12-25T10:30:00.000Z');       // Valid with milliseconds
debugISODate('2023-12-25 10:30:00');            // Invalid format
debugISODate(new Date().toISOString());         // Valid current date
\`\`\`

### 2. Timezone Handling
**Debugging Steps**:
\`\`\`typescript
// Debug timezone issues
const debugTimezone = (isoString: string) => {
  const date = new Date(isoString);
  
  console.log('Original ISO string:', isoString);
  console.log('Local date:', date.toString());
  console.log('UTC date:', date.toUTCString());
  console.log('Local timezone offset:', date.getTimezoneOffset());
  console.log('Back to ISO:', date.toISOString());
  
  // Check for timezone data loss
  if (date.toISOString() !== isoString) {
    console.warn('Timezone information may have been lost');
  }
};
\`\`\`

## Contract Alignment Issues

### 1. Go to TypeScript Conversion
**Debugging Steps**:
\`\`\`typescript
// Verify contract sync
const debugContractAlignment = async () => {
  // Check if contract sync is up to date
  const lastSync = localStorage.getItem('lastContractSync');
  console.log('Last contract sync:', lastSync);
  
  // Test API response structure
  try {
    const response = await apiClient.get('/api/v2/campaigns/test-id');
    console.log('API response structure:', Object.keys(response.data));
    
    // Validate each field type
    const data = response.data;
    console.log('Field type validation:');
    console.log('- id (should be string for SafeBigInt):', typeof data.id);
    console.log('- userId (should be string):', typeof data.userId);
    console.log('- createdAt (should be string):', typeof data.createdAt);
    
  } catch (error) {
    console.error('Contract validation error:', error);
  }
};

// Run contract sync if needed
const runContractSync = () => {
  console.log('Running contract sync...');
  // This would typically be: npm run generate:schemas
};
\`\`\`

### 2. Runtime Validation Failures
**Debugging Steps**:
\`\`\`typescript
// Debug validation failures
const debugValidation = (data: any, validators: Record<string, Function>) => {
  console.log('Validating data:', data);
  
  Object.entries(validators).forEach(([field, validator]) => {
    const value = data[field];
    const isValid = validator(value);
    
    console.log(\`Field \${field}:\`, {
      value,
      type: typeof value,
      isValid,
      validator: validator.name
    });
    
    if (!isValid) {
      console.warn(\`Validation failed for \${field}\`);
    }
  });
};

// Usage
debugValidation(campaignData, {
  id: validateUUID,
  userId: validateSafeBigInt,
  name: validateNonEmptyString,
  createdAt: (v) => !isNaN(new Date(v).getTime())
});
\`\`\`

Focus on branded type validation, API contract alignment, and runtime type checking.
`,

    performance: `
# Performance Debugging Guide

You are debugging DomainFlow's performance issues. Here's the debugging context:

## Frontend Performance Issues

### 1. Slow Page Loads
**Symptoms**: Long initial load times, poor Core Web Vitals

**Debugging Steps**:
\`\`\`typescript
// Monitor Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const measureWebVitals = () => {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
};

// Bundle analysis
import { analyzeBundleChunks, getBundleMetrics } from '@/lib/utils/dynamic-imports';

const debugBundlePerformance = async () => {
  const metrics = getBundleMetrics();
  console.log('Bundle metrics:', metrics);
  
  const chunks = await analyzeBundleChunks();
  console.log('Bundle chunks:', chunks);
  
  // Check for large chunks
  const largeChunks = chunks?.filter(chunk => chunk.size > 100 * 1024); // > 100KB
  if (largeChunks?.length > 0) {
    console.warn('Large chunks detected:', largeChunks);
  }
};

// Network performance
const debugNetworkPerformance = () => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  console.log('Navigation timing:', {
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    totalTime: navigation.loadEventEnd - navigation.fetchStart
  });
  
  // Slow resources
  const slowResources = resources.filter(r => r.duration > 1000);
  console.log('Slow resources (>1s):', slowResources.map(r => ({
    name: r.name,
    duration: r.duration,
    size: r.transferSize
  })));
};
\`\`\`

### 2. React Performance Issues
**Symptoms**: Slow renders, laggy interactions

**Debugging Steps**:
\`\`\`typescript
// Component render profiling
import { Profiler } from 'react';

const onRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
  console.log('Profiler:', {
    component: id,
    phase,
    actualDuration,
    baseDuration,
    renderTime: actualDuration - baseDuration
  });
  
  if (actualDuration > 16) { // > 1 frame at 60fps
    console.warn(\`Slow render detected for \${id}: \${actualDuration}ms\`);
  }
};

// Wrap components for profiling
<Profiler id="CampaignList" onRender={onRenderCallback}>
  <CampaignList />
</Profiler>

// Memory usage monitoring
const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory usage:', {
      used: \`\${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB\`,
      total: \`\${Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB\`,
      limit: \`\${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB\`
    });
  }
};

// State update performance
const debugStateUpdates = () => {
  const [updateCount, setUpdateCount] = useState(0);
  const renderTimeRef = useRef(performance.now());
  
  useEffect(() => {
    const renderTime = performance.now() - renderTimeRef.current;
    console.log(\`State update \${updateCount} render time: \${renderTime}ms\`);
    renderTimeRef.current = performance.now();
  });
  
  return { updateCount, setUpdateCount };
};
\`\`\`

### 3. WebSocket Performance
**Symptoms**: High memory usage, message processing delays

**Debugging Steps**:
\`\`\`typescript
// WebSocket message rate monitoring
const monitorWebSocketPerformance = () => {
  let messageCount = 0;
  let lastReset = Date.now();
  
  const unsubscribe = websocketService.onMessage((message) => {
    messageCount++;
    
    // Check message rate every minute
    const now = Date.now();
    if (now - lastReset > 60000) {
      const messagesPerMinute = messageCount;
      console.log(\`WebSocket messages per minute: \${messagesPerMinute}\`);
      
      if (messagesPerMinute > 100) {
        console.warn('High WebSocket message rate detected');
      }
      
      messageCount = 0;
      lastReset = now;
    }
  });
  
  return unsubscribe;
};

// Message processing time
const measureMessageProcessing = () => {
  websocketService.onMessage((message) => {
    const startTime = performance.now();
    
    // Process message
    handleWebSocketMessage(message);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    if (processingTime > 10) { // > 10ms
      console.warn(\`Slow message processing: \${processingTime}ms for type \${message.type}\`);
    }
  });
};
\`\`\`

## Backend Performance Issues

### 1. Database Query Performance
**Symptoms**: Slow API responses, database timeouts

**Go Debugging**:
\`\`\`go
// Database query timing
func debugDatabaseQuery(db *sql.DB, query string, args ...interface{}) {
    start := time.Now()
    
    rows, err := db.Query(query, args...)
    if err != nil {
        log.Printf("Query failed: %v", err)
        return
    }
    defer rows.Close()
    
    duration := time.Since(start)
    log.Printf("Query executed in %v: %s", duration, query)
    
    if duration > 100*time.Millisecond {
        log.Printf("WARNING: Slow query detected: %v", duration)
    }
}

// Connection pool monitoring
func monitorConnectionPool(db *sql.DB) {
    stats := db.Stats()
    log.Printf("DB Pool Stats: %+v", stats)
    
    if stats.OpenConnections > stats.MaxOpenConns*8/10 {
        log.Printf("WARNING: High connection pool usage: %d/%d", 
            stats.OpenConnections, stats.MaxOpenConns)
    }
}
\`\`\`

### 2. API Response Time
**Go Debugging**:
\`\`\`go
// Middleware for request timing
func RequestTimingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        c.Next()
        
        duration := time.Since(start)
        log.Printf("Request %s %s completed in %v", 
            c.Request.Method, c.Request.URL.Path, duration)
        
        if duration > 1*time.Second {
            log.Printf("WARNING: Slow request: %v", duration)
        }
    }
}

// Memory usage monitoring
func monitorMemoryUsage() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    log.Printf("Memory Stats: Alloc=%d KB, TotalAlloc=%d KB, Sys=%d KB, NumGC=%d",
        bToKb(m.Alloc), bToKb(m.TotalAlloc), bToKb(m.Sys), m.NumGC)
}

func bToKb(b uint64) uint64 {
    return b / 1024
}
\`\`\`

### 3. WebSocket Performance
**Go Debugging**:
\`\`\`go
// WebSocket connection monitoring
type WebSocketMetrics struct {
    ActiveConnections int
    MessagesSent     int64
    MessagesReceived int64
    BytesSent        int64
    BytesReceived    int64
    LastActivity     time.Time
}

func (m *WebSocketMetrics) RecordMessage(messageType string, size int, sent bool) {
    if sent {
        m.MessagesSent++
        m.BytesSent += int64(size)
    } else {
        m.MessagesReceived++
        m.BytesReceived += int64(size)
    }
    m.LastActivity = time.Now()
}

// Monitor WebSocket performance
func monitorWebSocketPerformance(metrics *WebSocketMetrics) {
    ticker := time.NewTicker(1 * time.Minute)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            log.Printf("WebSocket Metrics: Connections=%d, Sent=%d, Received=%d",
                metrics.ActiveConnections, metrics.MessagesSent, metrics.MessagesReceived)
        }
    }
}
\`\`\`

## Optimization Strategies

### 1. Frontend Optimizations
- Code splitting and lazy loading
- Component memoization with React.memo
- Virtual scrolling for large lists
- Request deduplication and caching
- Bundle size optimization

### 2. Backend Optimizations
- Database query optimization and indexing
- Connection pooling configuration
- Response compression
- Caching strategies
- Background job processing

Focus on measuring before optimizing, identifying bottlenecks, and monitoring key metrics.
`,

    general: `
# General Debugging Guide

You are debugging issues in DomainFlow. Here's the general debugging context:

## Debugging Methodology

### 1. Problem Identification
**Steps to identify issues**:
\`\`\`typescript
// Check application state
const debugApplicationState = () => {
  console.log('=== DomainFlow Debug Information ===');
  
  // Authentication state
  const { isAuthenticated, user } = useAuth();
  console.log('Authentication:', { isAuthenticated, user: user?.email });
  
  // WebSocket status
  const { status } = useWebSocketStatus();
  console.log('WebSocket:', status.overallStatus);
  
  // Network connectivity
  console.log('Online status:', navigator.onLine);
  
  // Performance timing
  const navigation = performance.getEntriesByType('navigation')[0];
  console.log('Page load time:', navigation ? navigation.loadEventEnd - navigation.fetchStart : 'N/A');
  
  // Error boundary state
  console.log('Error boundary triggered:', window.__DOMAINFLOW_ERROR_COUNT__ || 0);
};

// Call on page load or when issues occur
debugApplicationState();
\`\`\`

### 2. Console Debugging
**Enable detailed logging**:
\`\`\`typescript
// Enable debug mode
localStorage.setItem('debug', 'domainflow:*');

// Component debug logging
const useDebugLog = (componentName: string) => {
  const log = (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(\`[\${componentName}] \${message}\`, data);
    }
  };
  
  return log;
};

// Usage
const CampaignList: React.FC = () => {
  const debugLog = useDebugLog('CampaignList');
  
  useEffect(() => {
    debugLog('Component mounted');
    return () => debugLog('Component unmounted');
  }, []);
  
  const handleCampaignCreate = () => {
    debugLog('Creating campaign', { data: formData });
  };
};
\`\`\`

### 3. Network Debugging
**Monitor API calls**:
\`\`\`typescript
// API call debugger
const debugApiCalls = () => {
  // Intercept all fetch requests
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    console.log('API Request:', { url, method: options?.method || 'GET' });
    
    const start = performance.now();
    try {
      const response = await originalFetch(...args);
      const duration = performance.now() - start;
      
      console.log('API Response:', {
        url,
        status: response.status,
        duration: \`\${duration.toFixed(2)}ms\`
      });
      
      return response;
    } catch (error) {
      console.error('API Error:', { url, error });
      throw error;
    }
  };
};

// Enable on debug mode
if (process.env.NODE_ENV === 'development') {
  debugApiCalls();
}
\`\`\`

## Common Issue Patterns

### 1. Authentication Issues
**Quick diagnosis**:
\`\`\`typescript
const diagnoseAuthIssues = async () => {
  console.log('=== Authentication Diagnosis ===');
  
  // Check session
  try {
    const response = await fetch('/api/v2/auth/session');
    console.log('Session check:', response.status);
  } catch (error) {
    console.error('Session check failed:', error);
  }
  
  // Check localStorage
  const authData = localStorage.getItem('auth');
  console.log('Auth localStorage:', authData ? 'Present' : 'Missing');
  
  // Check cookies
  const cookies = document.cookie;
  console.log('Session cookie:', cookies.includes('session') ? 'Present' : 'Missing');
};
\`\`\`

### 2. WebSocket Issues
**Quick diagnosis**:
\`\`\`typescript
const diagnoseWebSocketIssues = () => {
  console.log('=== WebSocket Diagnosis ===');
  
  // Test WebSocket connection
  const ws = new WebSocket('ws://localhost:8080/ws');
  
  ws.onopen = () => {
    console.log('WebSocket connection test: SUCCESS');
    ws.close();
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket connection test: FAILED', error);
  };
  
  ws.onclose = (event) => {
    console.log('WebSocket closed:', { code: event.code, reason: event.reason });
  };
};
\`\`\`

### 3. Type Safety Issues
**Quick diagnosis**:
\`\`\`typescript
const diagnoseTypeSafetyIssues = (data: any) => {
  console.log('=== Type Safety Diagnosis ===');
  console.log('Data structure:', data);
  
  // Check for SafeBigInt issues
  Object.entries(data).forEach(([key, value]) => {
    if (key.includes('Id') || key.includes('id')) {
      console.log(\`\${key}: type=\${typeof value}, value=\${value}\`);
      
      if (typeof value === 'number' && value > Number.MAX_SAFE_INTEGER) {
        console.warn(\`Potential precision loss in \${key}\`);
      }
    }
  });
  
  // Check for UUID format
  const uuidFields = Object.entries(data).filter(([key]) => 
    key.toLowerCase().includes('id') && typeof data[key] === 'string'
  );
  
  uuidFields.forEach(([key, value]) => {
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value as string);
    console.log(\`\${key} UUID validation:\`, isValidUUID);
  });
};
\`\`\`

## Debugging Tools

### 1. Browser DevTools
- **Network tab**: Monitor API calls and WebSocket connections
- **Console**: Check for JavaScript errors and warnings
- **Application tab**: Inspect localStorage, cookies, and service workers
- **Performance tab**: Profile React components and identify bottlenecks
- **Elements tab**: Debug CSS and DOM issues

### 2. React DevTools
- **Components**: Inspect component props and state
- **Profiler**: Measure component render performance
- **Hooks**: Debug custom hooks and state management

### 3. Backend Debugging (Go)
\`\`\`go
// Enable debug logging
log.SetLevel(log.DebugLevel)

// Debug middleware
func DebugMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Log request details
        log.Printf("Request: %s %s", c.Request.Method, c.Request.URL.Path)
        log.Printf("Headers: %v", c.Request.Header)
        
        c.Next()
        
        // Log response details
        log.Printf("Response: %d", c.Writer.Status())
    }
}
\`\`\`

## Error Handling Best Practices

### 1. Error Boundaries
\`\`\`typescript
const ErrorBoundary: React.FC = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError) {
    return <ErrorFallback onReset={() => setHasError(false)} />;
  }
  
  return <>{children}</>;
};
\`\`\`

### 2. Graceful Degradation
- Handle network failures gracefully
- Provide offline functionality where possible
- Show appropriate loading and error states
- Implement retry mechanisms

Focus on systematic diagnosis, detailed logging, and reproducing issues consistently.
`
  };
}