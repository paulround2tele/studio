// PROFESSIONAL DIAGNOSTIC TOOL: Campaign Response Format Analysis
// Purpose: Capture and analyze the exact backend response format to fix validation logic

// Professional logging utility
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(data && { data })
  };
  
  console[level](`[CAMPAIGN_DIAGNOSTIC] ${JSON.stringify(logEntry, null, 2)}`);
  return logEntry;
};

// Fetch backend response directly using the same API client
const diagnoseCampaignResponse = async () => {
  log('info', 'Starting campaign response diagnostic');
  
  try {
    // Get the API client instance from the page
    const { apiClient } = await import('/src/lib/api-client/client.js');
    
    log('info', 'API client loaded successfully');
    
    // Make the same API call as the campaigns page
    log('info', 'Making listCampaigns API call...');
    const response = await apiClient.listCampaigns();
    
    // Comprehensive response analysis
    const analysis = {
      // Basic response structure
      responseReceived: !!response,
      responseType: typeof response,
      responseConstructor: response?.constructor?.name,
      isNull: response === null,
      isUndefined: response === undefined,
      
      // Object structure analysis
      ...(response && typeof response === 'object' && {
        isArray: Array.isArray(response),
        objectKeys: Object.keys(response),
        objectKeysCount: Object.keys(response).length,
        hasOwnProperties: Object.getOwnPropertyNames(response),
        isEmptyObject: Object.keys(response).length === 0,
        
        // Check for common response patterns
        hasStatus: 'status' in response,
        statusValue: response.status,
        hasData: 'data' in response,
        dataType: response.data ? typeof response.data : null,
        dataIsArray: response.data ? Array.isArray(response.data) : false,
        dataLength: response.data && Array.isArray(response.data) ? response.data.length : null,
        
        // Check for alternative fields
        hasCampaigns: 'campaigns' in response,
        campaignsType: response.campaigns ? typeof response.campaigns : null,
        campaignsIsArray: response.campaigns ? Array.isArray(response.campaigns) : false,
        
        hasResults: 'results' in response,
        resultsType: response.results ? typeof response.results : null,
        
        hasItems: 'items' in response,
        itemsType: response.items ? typeof response.items : null,
        
        // Raw response for inspection
        rawResponse: response,
        
        // Sample data inspection
        ...(response.data && Array.isArray(response.data) && response.data.length > 0 && {
          sampleDataItem: {
            keys: Object.keys(response.data[0]),
            values: response.data[0]
          }
        }),
        
        ...(response.campaigns && Array.isArray(response.campaigns) && response.campaigns.length > 0 && {
          sampleCampaignItem: {
            keys: Object.keys(response.campaigns[0]),
            values: response.campaigns[0]
          }
        })
      }),
      
      // Array analysis (if response is direct array)
      ...(Array.isArray(response) && {
        arrayLength: response.length,
        sampleArrayItem: response.length > 0 ? {
          keys: Object.keys(response[0]),
          values: response[0]
        } : null
      })
    };
    
    log('info', 'Response analysis completed', analysis);
    
    // Validation test against current frontend logic
    log('info', 'Testing against current frontend validation logic...');
    
    let validationResult = 'FAILED';
    let detectedFormat = 'UNKNOWN';
    
    // Test each validation path from the frontend code
    if (response && typeof response === 'object' && Object.keys(response).length === 0) {
      validationResult = 'PASSED';
      detectedFormat = 'EMPTY_OBJECT';
    }
    else if (response && typeof response === 'object' && 'status' in response && response.status === 'success' && 'data' in response && Array.isArray(response.data)) {
      validationResult = 'PASSED';
      detectedFormat = 'STANDARD_BACKEND';
    }
    else if (Array.isArray(response)) {
      validationResult = 'PASSED';
      detectedFormat = 'DIRECT_ARRAY';
    }
    else if (response && typeof response === 'object' && 'campaigns' in response && Array.isArray(response.campaigns)) {
      validationResult = 'PASSED';
      detectedFormat = 'WRAPPED_CAMPAIGNS';
    }
    else if (response && typeof response === 'object') {
      const possibleDataKeys = ['data', 'campaigns', 'results', 'items'];
      for (const key of possibleDataKeys) {
        if (key in response && Array.isArray(response[key])) {
          validationResult = 'PASSED';
          detectedFormat = `NESTED_${key.toUpperCase()}`;
          break;
        }
      }
    }
    
    const validationTest = {
      currentValidationResult: validationResult,
      detectedFormat,
      willPassFrontendValidation: validationResult === 'PASSED',
      reasonForFailure: validationResult === 'FAILED' ? 'Response format does not match any expected pattern' : null
    };
    
    log('info', 'Validation test completed', validationTest);
    
    // Recommendations
    const recommendations = [];
    
    if (validationResult === 'FAILED') {
      recommendations.push('Frontend validation logic needs to be updated to handle this response format');
      
      if (response && typeof response === 'object') {
        const keys = Object.keys(response);
        if (keys.length > 0) {
          recommendations.push(`Consider adding validation for response with keys: ${keys.join(', ')}`);
        }
      }
    }
    
    if (response && typeof response === 'object' && Object.keys(response).length === 0) {
      recommendations.push('Empty response may indicate no campaigns exist or authentication issue');
    }
    
    log('info', 'Diagnostic complete', { recommendations });
    
    return {
      analysis,
      validationTest,
      recommendations,
      rawResponse: response
    };
    
  } catch (error) {
    log('error', 'Diagnostic failed', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: error.constructor.name
    });
    
    throw error;
  }
};

// Execute diagnostic
log('info', 'Initializing campaign response diagnostic tool');
diagnoseCampaignResponse()
  .then(result => {
    log('info', 'DIAGNOSTIC COMPLETED SUCCESSFULLY');
    
    // Summary report
    console.log('\n' + '='.repeat(80));
    console.log('CAMPAIGN RESPONSE DIAGNOSTIC SUMMARY');
    console.log('='.repeat(80));
    console.log(`Response Format: ${result.validationTest.detectedFormat}`);
    console.log(`Frontend Validation: ${result.validationTest.currentValidationResult}`);
    console.log(`Will Work: ${result.validationTest.willPassFrontendValidation ? 'YES' : 'NO'}`);
    
    if (result.recommendations.length > 0) {
      console.log('\nRECOMMENDATIONS:');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('\nFull diagnostic data available in console logs above.');
    console.log('='.repeat(80));
    
    return result;
  })
  .catch(error => {
    log('error', 'DIAGNOSTIC FAILED WITH ERROR', {
      message: error.message,
      stack: error.stack
    });
  });