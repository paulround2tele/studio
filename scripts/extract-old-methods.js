const fs = require('fs');
const path = require('path');

// Extract all API method calls currently used in frontend code
function extractOldMethodCalls() {
  const methodCalls = new Set();
  const callLocations = [];
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Pattern 1: Direct API calls like "authApi.login(" or "proxiesApi.deleteProxy("
      const directCallMatches = content.matchAll(/(\w+Api)\.(\w+)\s*\(/g);
      for (const match of directCallMatches) {
        const [fullMatch, apiInstance, methodName] = match;
        const methodCall = `${apiInstance}.${methodName}`;
        methodCalls.add(methodCall);
        callLocations.push({
          file: path.relative(process.cwd(), filePath),
          method: methodCall,
          line: content.substring(0, match.index).split('\n').length
        });
      }
      
      // Pattern 2: Destructured calls like "const { login } = authApi"
      const destructuredMatches = content.matchAll(/const\s*{\s*([^}]+)\s*}\s*=\s*(\w+Api)/g);
      for (const match of destructuredMatches) {
        const [fullMatch, methods, apiInstance] = match;
        const methodList = methods.split(',').map(m => m.trim());
        for (const method of methodList) {
          const methodCall = `${apiInstance}.${method}`;
          methodCalls.add(methodCall);
          callLocations.push({
            file: path.relative(process.cwd(), filePath),
            method: methodCall,
            line: content.substring(0, match.index).split('\n').length,
            type: 'destructured'
          });
        }
      }
      
    } catch (err) {
      // Skip files that can't be read
    }
  }
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && 
          !entry.name.startsWith('.') && 
          entry.name !== 'node_modules' &&
          entry.name !== 'api-client') { // Skip generated API files
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        scanFile(fullPath);
      }
    }
  }
  
  // Scan src directory
  scanDirectory(path.join(process.cwd(), 'src'));
  
  return { methodCalls: Array.from(methodCalls).sort(), callLocations };
}

console.log('🔍 Extracting old method calls from frontend code...\n');

const { methodCalls, callLocations } = extractOldMethodCalls();

console.log('📋 Found the following API method calls:');
methodCalls.forEach(method => {
  console.log(`   ${method}`);
});

console.log(`\n📊 Total unique method calls: ${methodCalls.length}`);
console.log(`📊 Total call locations: ${callLocations.length}\n`);

console.log('📍 Call locations by file:');
const locationsByFile = {};
callLocations.forEach(loc => {
  if (!locationsByFile[loc.file]) {
    locationsByFile[loc.file] = [];
  }
  locationsByFile[loc.file].push(loc);
});

for (const [file, locations] of Object.entries(locationsByFile)) {
  console.log(`\n   ${file}:`);
  locations.forEach(loc => {
    const typeInfo = loc.type ? ` (${loc.type})` : '';
    console.log(`     Line ${loc.line}: ${loc.method}${typeInfo}`);
  });
}

// Save results to files
fs.writeFileSync('old-method-calls.json', JSON.stringify({ methodCalls, callLocations }, null, 2));

// Also save to readable text file
let textOutput = '🔍 OLD METHOD CALLS FOUND IN FRONTEND\n';
textOutput += '=====================================\n\n';
textOutput += '📋 Method calls:\n';
methodCalls.forEach(method => {
  textOutput += `   ${method}\n`;
});
textOutput += `\n📊 Total unique method calls: ${methodCalls.length}\n`;
textOutput += `📊 Total call locations: ${callLocations.length}\n\n`;
textOutput += '📍 Call locations by file:\n';
for (const [file, locations] of Object.entries(locationsByFile)) {
  textOutput += `\n   ${file}:\n`;
  locations.forEach(loc => {
    const typeInfo = loc.type ? ` (${loc.type})` : '';
    textOutput += `     Line ${loc.line}: ${loc.method}${typeInfo}\n`;
  });
}

fs.writeFileSync('old-method-calls.txt', textOutput);
console.log('\n💾 Results saved to old-method-calls.json and old-method-calls.txt');