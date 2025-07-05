# Domainflow Test Suite

This directory contains comprehensive test automation scripts for the Domainflow application.

## Enhanced Test Suite

### `domainflow-test-suite.js`

The main enhanced test automation script that provides comprehensive testing capabilities:

#### Features

- **Complete Campaign Workflow Testing**
  - Automated login with session validation
  - Campaign navigation and functionality testing
  - New campaign creation with form validation
  - Campaign results retrieval and verification
  - Bulk campaign operations and deletion testing

- **Comprehensive Logging System**
  - Frontend Next.js server logs capture (port 3000)
  - Backend Go API server logs capture (port 8080)
  - Browser console logs and network traffic monitoring
  - Timestamped log files for debugging
  - Screenshot capture at key testing phases

- **Advanced Features**
  - Real-time WebSocket monitoring for campaign updates
  - Performance metrics and memory usage tracking
  - Network request/response validation with retry logic
  - Error scenario testing and edge case validation
  - Responsive design testing across multiple viewports

- **Structured Output**
  - Detailed test reports with pass/fail status
  - Error summaries with actionable debugging information
  - Performance baseline comparisons
  - Screenshots organized by test phase

#### Usage

```bash
# Basic test run
npm run test:suite

# Headless mode (for CI/CD)
npm run test:suite:headless

# Debug mode with devtools
npm run test:suite:debug

# Full test with server log capture
npm run test:suite:full

# Custom options
node domainflow-test-suite.js [options]
```

#### Command Line Options

- `--headless` - Run browser in headless mode
- `--debug` - Enable debug mode with devtools
- `--capture-logs` - Capture server logs during testing
- `--skip-server-start` - Skip starting servers (use existing ones)
- `--max-campaigns=N` - Maximum campaigns to test (default: 5)
- `--timeout=N` - Default timeout in milliseconds (default: 30000)

#### Environment Variables

- `TEST_USERNAME` - Override test username (default: admin@fntel.com)
- `TEST_PASSWORD` - Override test password (default: admin123)
- `HEADLESS=true` - Force headless mode

#### Output Structure

```
test-automation/
├── logs/                    # Test execution logs
├── reports/                 # Comprehensive test reports (JSON)
├── screenshots/            # Screenshots captured during testing
├── server-logs/            # Frontend and backend server logs
├── performance/            # Performance metrics and data
└── test-automation/        # Legacy output directory
```

#### Test Phases

1. **Initialization** - Environment setup and server management
2. **Authentication** - Login flow and session validation
3. **Campaign Navigation** - Campaigns page functionality
4. **Campaign Creation** - New campaign workflow testing
5. **Campaign Results** - Results retrieval and validation
6. **Bulk Operations** - Multi-campaign operations and deletion
7. **Error Scenarios** - Error handling and edge cases
8. **Responsive Design** - Multi-viewport testing
9. **Report Generation** - Comprehensive report compilation

#### Integration with Existing Infrastructure

The enhanced test suite builds upon and extends the existing test automation infrastructure:

- Uses the same Puppeteer configuration and browser setup
- Maintains compatibility with existing [`comprehensive-browser-test.js`](comprehensive-browser-test.js)
- Extends [`campaign-flow-debugger.js`](campaign-flow-debugger.js) capabilities
- Leverages existing package.json dependencies

## Legacy Scripts

### `comprehensive-browser-test.js`
Original comprehensive browser testing script with advanced debugging capabilities.

### `campaign-flow-debugger.js`
Specialized script for debugging campaign workflows and React infinite loops.

## Prerequisites

- Node.js and npm installed
- Puppeteer dependencies
- Domainflow frontend running on port 3000
- Domainflow backend running on port 8080

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application servers (if not already running):
   ```bash
   # In separate terminals:
   # Frontend: npm run dev (from project root)
   # Backend: ./bin/apiserver (from backend directory)
   ```

3. Run the enhanced test suite:
   ```bash
   npm run test:suite
   ```

## Test Results

Test results are automatically saved to multiple formats:

- **JSON Reports**: Detailed test data in `reports/`
- **Screenshots**: Visual captures in `screenshots/`
- **Logs**: Execution logs in `logs/`
- **Performance Data**: Metrics in `performance/`
- **Console Output**: Real-time summary during execution

## Troubleshooting

- Ensure both frontend and backend servers are running
- Check that test credentials are valid
- Use `--debug` mode for detailed debugging
- Review server logs in `server-logs/` for backend issues
- Check screenshots in `screenshots/` for UI state verification

## Contributing

When extending the test suite:

1. Follow the existing class structure and naming conventions
2. Add comprehensive logging for new test phases
3. Include screenshot capture for visual verification
4. Update documentation and test phase descriptions
5. Ensure backward compatibility with existing infrastructure