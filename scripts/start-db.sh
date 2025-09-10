#!/bin/bash

# Start SurrealDB in Docker for development
echo "🚀 Starting SurrealDB in Docker..."

# Stop existing container if running
docker stop surrealdb-dev 2>/dev/null
docker rm surrealdb-dev 2>/dev/null

# Start SurrealDB container
docker run -d \
  --name surrealdb-dev \
  -p 8000:8000 \
  surrealdb/surrealdb:latest \
  start --log info --user root --pass root memory --bind 0.0.0.0:8000

echo "✅ SurrealDB is running on http://localhost:8000"
echo "📊 Database: spottisahko/main"
echo "🔐 Credentials: root/root"
echo ""
echo "To stop: docker stop surrealdb-dev"
echo "To view logs: docker logs surrealdb-dev -f"