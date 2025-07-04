// Debug login authentication flow
// Run this in browser console to test the login
console.log('Testing login flow...');

fetch('http://localhost:8080/api/v2/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', [...response.headers.entries()]);
  return response.json();
})
.then(data => {
  console.log('Response data:', data);
  console.log('User data:', data.data?.user);
  console.log('Session ID:', data.data?.sessionId);
})
.catch(error => {
  console.error('Login error:', error);
});
