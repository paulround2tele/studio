#!/bin/bash

echo "Testing login with correct credentials..."
echo "Testing admin@domainflow.com / AdminPassword123!"

curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@domainflow.com","password":"AdminPassword123!"}' \
  -c cookies.txt \
  http://localhost:8080/api/v2/auth/login

echo -e "\n\nTesting dev@domainflow.com / DevPassword123!"

curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@domainflow.com","password":"DevPassword123!"}' \
  -c cookies2.txt \
  http://localhost:8080/api/v2/auth/login

echo -e "\n\nChecking cookies:"
cat cookies.txt
echo
cat cookies2.txt

echo -e "\n\nDone."
