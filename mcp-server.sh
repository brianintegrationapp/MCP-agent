#!/usr/bin/env bash

echo "=== Running mcp-server.sh script ===" 1>&2

export INTEGRATION_APP_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZWE4ZDk1YzIxOWRiNWVjNjJjOTQ3NCIsImlzcyI6ImY4OGY1MmJjLTU3YTktNDdlMy05M2IzLTg0M2ZhMGRkNTcwOCIsImV4cCI6MTc3NjM5MTExOX0.zYFBv2PzpR882x3EqPavWXJWfIOqbaO8yEz0A6JuBuw"
export INTEGRATION_KEY="hubspot"

echo "Token: $INTEGRATION_APP_TOKEN" 1>&2
echo "Integration Key: $INTEGRATION_KEY" 1>&2

echo "Now running npx @integration-app/mcp-server ..." 1>&2
npx @integration-app/mcp-server
