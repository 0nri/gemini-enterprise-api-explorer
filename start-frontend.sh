#!/bin/bash

# Frontend Startup Script
# Starts the Next.js development server

set -e

echo "🌐 Starting Frontend Server..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to frontend directory
cd frontend

echo -e "${BLUE}Starting Next.js development server...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Frontend server starting...${NC}"
echo ""
echo "  🌐 Frontend URL: http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the development server
npm run dev
