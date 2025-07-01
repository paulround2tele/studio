# Automated Campaign Testing with MCP Tools

This comprehensive automated test script uses MCP (Model Context Protocol) Playwright tools to perform end-to-end testing of the campaign management application.

## Overview

The test script [`automated-campaign-test.js`](automated-campaign-test.js) provides automated browser testing with the following capabilities:

- **Service Health Verification**: Checks frontend and backend service availability
- **Authentication Flow Testing**: Automated login with test credentials
- **Navigation Verification**: Tests dashboard and campaigns page access
- **Session Persistence**: Verifies user session maintains across page reloads
- **Visual Context Capture**: Screenshots and metadata at each test phase
- **Console Error Monitoring**: Detects TypeScript/JavaScript runtime errors
- **Comprehensive Reporting**: Detailed test reports with timing and results

## Prerequisites

1. **Running Services**: Ensure both frontend (localhost:3000) and backend (localhost:8080) are running
2. **Test User**: A test user with credentials `test@example.com` / `password123` must exist
3. **MCP Server**: The `studio-backend-context` MCP server must be available
4. **Node.js**: Version 14+ with access to required modules

## Test Configuration

The test behavior is controlled by [`test-config.json`](test-config.json):

```json
{
  "environment": {
    "frontendUrl": "http://localhost:3000",
    "backendUrl": "http://localhost:8080",
    "testCredentials": {
      "email": "test@example.com",
      "password": "password123"
    }
  },
  "timeouts": {
    "default": 30000,
    "navigation": 10000,
    "elementWait": 5000
  }
}
```

### Key Configuration Sections

#### Environment Settings
- **frontendUrl/backendUrl**: Service URLs for testing
- **testCredentials**: Login credentials for authentication tests

#### Selectors
- **login**: CSS selectors for login form elements
- **navigation**: Selectors for navigation links and buttons
- **dashboard/campaigns**: Page-specific element selectors

#### Test Phases
- **setup**: Service health verification
- **authentication**: Login flow testing
- **dashboard**: Dashboard navigation verification
- **campaigns**: Campaigns page functionality
- **session**: Session persistence testing
- **reporting**: Test report generation

## Usage

### Basic Execution

```bash
# Run the complete test suite
node automated-campaign-test.js
```

### Module Usage

```javascript
const { CampaignTestRunner, CONFIG } = require('./automated-campaign-test.js');

// Custom test execution
const runner = new CampaignTestRunner();
runner.runAllTests().then(report => {
  console.log('Test completed:', report.testExecution.status);
});
```

## Test Workflow

### Phase 1: Setup and Validation
- Creates test directories (`./test-screenshots`, `./test-reports`)
- Verifies frontend service health at `/api/health`
- Verifies backend service health at `/api/v2/health`
- Validates all required services are responding

### Phase 2: Authentication Flow
1. **Navigate to Login**: Loads `/login` page and captures visual context
2. **Form Interaction**: 
   - Clicks email input field
   - Types test email (`test@example.com`)
   - Clicks password input field  
   - Types test password (`password123`)
   - Submits login form
3. **Verification**: Confirms successful redirect to dashboard

### Phase 3: Dashboard Navigation
- Loads `/dashboard` page
- Captures visual context and metadata
- Verifies dashboard elements (header, sidebar, content)
- Validates authentication indicators

### Phase 4: Campaigns Page Testing
- Navigates to `/campaigns` page
- Tests page load and element detection
- Verifies campaign-specific functionality
- Captures screenshots of page state

### Phase 5: Session Persistence
- Tests navigation between multiple pages:
  - Dashboard → Campaigns → Dashboard
- Verifies session maintained across page reloads
- Monitors for authentication drops
- Validates consistent user state

### Phase 6: Reporting and Cleanup
- Generates comprehensive test reports
- Saves screenshots with timestamps
- Creates both JSON and text format reports
- Logs all console errors and warnings

## MCP Tool Integration

The script uses these MCP tools from `studio-backend-context`:

### `get_visual_context`
```javascript
await mcp.useMCPTool('get_visual_context', { 
  url: 'http://localhost:3000/login' 
});
```
- Captures page screenshots
- Extracts DOM metadata
- Maps UI elements to code

### `generate_ui_test_prompt_with_actions`
```javascript
await mcp.useMCPTool('generate_ui_test_prompt_with_actions', {
  url: 'http://localhost:3000/login',
  actions: [
    { action: 'click', selector: 'input[type="email"]' },
    { action: 'type', selector: 'input[type="email"]', text: 'test@example.com' }
  ]
});
```
- Executes UI interactions
- Captures action results
- Provides final state screenshots

### `browse_with_playwright`
```javascript
await mcp.useMCPTool('browse_with_playwright', { 
  url: 'http://localhost:3000/dashboard' 
});
```
- Basic page navigation
- Screenshot capture
- Page load verification

## Output and Reports

### Directory Structure
```
./test-screenshots/          # Screenshots from each test phase
./test-reports/              # JSON and text reports
./test-logs/                # Detailed execution logs
```

### Report Contents

#### JSON Report (`test-report-TIMESTAMP.json`)
```json
{
  "testExecution": {
    "startTime": "2025-01-07T12:30:00.000Z",
    "endTime": "2025-01-07T12:35:00.000Z", 
    "duration": "300s",
    "status": "PASSED"
  },
  "summary": {
    "totalSteps": 45,
    "screenshots": 12,
    "errors": 0,
    "consoleErrors": 0
  },
  "screenshots": [...],
  "detailedResults": [...]
}
```

#### Text Summary (`test-summary-TIMESTAMP.txt`)
- Human-readable test results
- Phase-by-phase execution summary
- Error details and console output
- Screenshot inventory

## Error Handling

### Automatic Retries
- Failed actions retry up to 3 times
- 5-second delay between retry attempts
- Configurable retry behavior in `test-config.json`

### Error Categories
- **Critical Errors**: Service unavailable, authentication failure
- **Non-Critical Errors**: Element not found, timing issues
- **Console Errors**: TypeScript compilation, runtime warnings

### Failure Recovery
- Tests continue on non-critical errors
- Detailed error logging with stack traces
- Screenshot capture at failure points
- Graceful test termination

## Customization

### Adding New Test Phases
```javascript
// In test-config.json
"testPhases": [
  {
    "name": "custom_phase",
    "description": "Custom test functionality",
    "enabled": true
  }
]
```

### Custom Selectors
```json
"selectors": {
  "customPage": {
    "primaryButton": ".custom-btn-primary",
    "dataTable": ".data-table tbody tr"
  }
}
```

### Extended Timeouts
```json
"timeouts": {
  "slowOperation": 60000,
  "customWait": 15000
}
```

## Troubleshooting

### Common Issues

#### Services Not Running
```bash
# Error: Health check failed: ECONNREFUSED
# Solution: Start frontend and backend services
npm run dev              # Frontend
go run cmd/apiserver/main.go  # Backend
```

#### Authentication Failures
```bash
# Error: Authentication verification failed
# Solution: Verify test user exists with correct credentials
# Check: test@example.com / password123
```

#### MCP Server Unavailable
```bash
# Error: MCP tool failed
# Solution: Ensure studio-backend-context server is running
# Check MCP server configuration
```

#### Element Selectors Not Found
- Update selectors in `test-config.json`
- Use browser dev tools to find correct CSS selectors
- Add fallback selectors for robustness

### Debug Mode
```javascript
// Enable verbose logging
const CONFIG = require('./test-config.json');
CONFIG.logging.level = 'debug';
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Automated UI Tests
on: [push, pull_request]
jobs:
  ui-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start Services
        run: |
          npm run dev &
          go run backend/cmd/apiserver/main.go &
      - name: Run UI Tests
        run: node automated-campaign-test.js
      - name: Upload Reports
        uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: ./test-reports/
```

## Best Practices

1. **Service Verification**: Always verify services before testing
2. **Screenshot Documentation**: Capture visual context at key points
3. **Error Monitoring**: Watch for console errors during execution
4. **Session Management**: Test authentication persistence
5. **Cleanup**: Ensure proper test environment cleanup

## Contributing

To extend the test script:

1. **Add Test Phases**: Extend the `CampaignTestRunner` class
2. **Custom MCP Tools**: Add new tool integrations in `MCPTestAutomation`
3. **Enhanced Reporting**: Extend `TestReporter` for additional formats
4. **New Assertions**: Add verification methods to tester classes

## Example Output

```
╔══════════════════════════════════════════════════════════════╗
║                  CAMPAIGN AUTOMATION TEST                     ║
║                     Using MCP Tools                          ║
╚══════════════════════════════════════════════════════════════╝

[2025-01-07T12:30:00.000Z] [INFO] [setup] Starting service health verification
[2025-01-07T12:30:02.000Z] [SUCCESS] [setup] All services are healthy
[2025-01-07T12:30:05.000Z] [INFO] [authentication] Starting authentication flow test
[2025-01-07T12:30:15.000Z] [SUCCESS] [authentication] Authentication successful - Dashboard loaded
[2025-01-07T12:30:20.000Z] [SUCCESS] [dashboard] Dashboard elements verification passed
[2025-01-07T12:30:30.000Z] [SUCCESS] [campaigns] Campaigns page navigation completed
[2025-01-07T12:30:45.000Z] [SUCCESS] [session] Session persistence test passed

╔══════════════════════════════════════════════════════════════╗
║                     TEST COMPLETED                           ║
║  Status: PASSED                                              ║
║  Duration: 45s                                               ║
║  Screenshots: 8                                              ║
╚══════════════════════════════════════════════════════════════╝
```

This automated testing framework provides comprehensive coverage of the campaign application's core functionality while leveraging MCP tools for robust browser automation and visual verification.