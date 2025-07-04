#!/bin/bash
# Test complete authentication flow

echo "Testing login flow..."

# Step 1: Login and save cookies
echo "1. Performing login..."
curl -c test_cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d '{"email":"test@example.com","password":"password123"}' \
  http://localhost:8080/api/v2/auth/login > login_response.json

echo "Login response:"
cat login_response.json | jq .

# Step 2: Test session validation
echo "2. Testing session validation..."
curl -b test_cookies.txt http://localhost:8080/api/v2/me > me_response.json

echo "Me endpoint response:"
cat me_response.json | jq .

# Step 3: Test frontend with session
echo "3. Testing frontend with session cookie..."
echo "Cookies saved:"
cat test_cookies.txt

# Clean up
rm -f login_response.json me_response.json test_cookies.txt

echo "✅ Test complete"
