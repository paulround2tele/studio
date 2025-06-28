// Test script to verify frontend login flow
console.log('Testing frontend login flow...');

// Test the login endpoint from the frontend perspective
async function testFrontendLogin() {
  try {
    console.log('Attempting login via frontend API...');
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'admin@domainflow.com',
        password: 'AdminPassword123!'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Array.from(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Login successful:', data);
      
      // Test session validation
      console.log('Testing session validation...');
      const meResponse = await fetch('http://localhost:3000/api/me', {
        credentials: 'include'
      });
      
      console.log('Me response status:', meResponse.status);
      if (meResponse.ok) {
        const meData = await meResponse.json();
        console.log('Session valid, user data:', meData);
      } else {
        console.log('Session validation failed');
      }
    } else {
      const errorText = await response.text();
      console.log('Login failed:', errorText);
    }
  } catch (error) {
    console.error('Error testing login:', error);
  }
}

testFrontendLogin();
