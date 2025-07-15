const fs = require('fs');
const path = require('path');

// Extract all available methods from generated API files
function extractNewMethodNames() {
  const apiMethodsMap = {};
  const apiDir = path.join(process.cwd(), 'src/lib/api-client/apis');
  
  const apiFiles = fs.readdirSync(apiDir).filter(file => file.endsWith('.ts'));
  
  for (const file of apiFiles) {
    const filePath = path.join(apiDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract class name
    const classMatch = content.match(/export class (\w+)/);
    if (!classMatch) continue;
    
    const apiClass = classMatch[1];
    
    // Extract all public methods with their signatures
    const methodMatches = content.matchAll(/public (\w+)\s*\([^)]*\)/g);
    const methods = Array.from(methodMatches).map(match => match[1]);
    
    apiMethodsMap[apiClass] = methods.sort();
  }
  
  return apiMethodsMap;
}

console.log('🔍 Extracting new method names from generated API files...\n');

const newMethods = extractNewMethodNames();

console.log('📋 Available methods by API class:\n');

for (const [apiClass, methods] of Object.entries(newMethods)) {
  console.log(`${apiClass}:`);
  methods.forEach(method => {
    console.log(`   ${method}`);
  });
  console.log('');
}

// Save results to file
fs.writeFileSync('new-method-names.json', JSON.stringify(newMethods, null, 2));

// Also save to readable text file
let textOutput = '🔍 NEW METHOD NAMES FROM GENERATED API FILES\n';
textOutput += '===========================================\n\n';
textOutput += '📋 Available methods by API class:\n\n';

for (const [apiClass, methods] of Object.entries(newMethods)) {
  textOutput += `${apiClass}:\n`;
  methods.forEach(method => {
    textOutput += `   ${method}\n`;
  });
  textOutput += '\n';
}

fs.writeFileSync('new-method-names.txt', textOutput);
console.log('💾 Results saved to new-method-names.json and new-method-names.txt');

// Now create mapping for the problematic methods found in old-method-calls.json
console.log('\n🔍 Creating mappings for problematic methods...\n');

const oldMethodsData = JSON.parse(fs.readFileSync('old-method-calls.json', 'utf8'));
const mappings = {};

// Check each old method call against available new methods
for (const oldMethodCall of oldMethodsData.methodCalls) {
  const [apiInstance, methodName] = oldMethodCall.split('.');
  
  // Convert instance name to class name (e.g., proxiesApi -> ProxiesApi)
  const apiClass = apiInstance.charAt(0).toUpperCase() + apiInstance.slice(1);
  
  if (newMethods[apiClass]) {
    const availableMethods = newMethods[apiClass];
    
    // Check if method exists as-is
    if (availableMethods.includes(methodName)) {
      console.log(`✅ ${oldMethodCall} - exists as-is`);
      continue;
    }
    
    // Check if method exists with Gin suffix
    const ginMethod = methodName + 'Gin';
    if (availableMethods.includes(ginMethod)) {
      mappings[oldMethodCall] = `${apiInstance}.${ginMethod}`;
      console.log(`🔄 ${oldMethodCall} → ${apiInstance}.${ginMethod}`);
      continue;
    }
    
    // Check for other possible mappings
    const possibleMethods = availableMethods.filter(m => 
      m.toLowerCase().includes(methodName.toLowerCase()) ||
      methodName.toLowerCase().includes(m.toLowerCase())
    );
    
    if (possibleMethods.length > 0) {
      console.log(`❓ ${oldMethodCall} - possible matches: ${possibleMethods.join(', ')}`);
    } else {
      console.log(`❌ ${oldMethodCall} - no match found in ${apiClass}`);
      console.log(`   Available methods: ${availableMethods.join(', ')}`);
    }
  } else {
    console.log(`❌ ${oldMethodCall} - API class ${apiClass} not found`);
  }
}

// Save mappings
fs.writeFileSync('method-mappings.json', JSON.stringify(mappings, null, 2));
console.log(`\n💾 Found ${Object.keys(mappings).length} method mappings saved to method-mappings.json`);

console.log('\n📋 Mappings to apply:');
for (const [oldMethod, newMethod] of Object.entries(mappings)) {
  console.log(`   ${oldMethod} → ${newMethod}`);
}