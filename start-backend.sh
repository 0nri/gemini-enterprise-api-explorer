#!/bin/bash

# Backend Startup Script
# Starts the FastAPI backend server with full logging

set -e

echo "🔧 Starting Backend Server..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Activate virtual environment (from project root)
echo -e "${BLUE}Activating Python virtual environment...${NC}"
source backend/.venv/bin/activate

echo -e "${GREEN}✓ Virtual environment activated${NC}"
echo ""

# Start the backend server
echo -e "${BLUE}Starting FastAPI server...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Backend server starting...${NC}"
echo ""
echo "  🔧 Backend URL: http://localhost:8000"
echo "  📚 API Docs:    http://localhost:8000/docs"
echo "  ❤️  Health:      http://localhost:8000/health"
echo ""
echo "  Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the server from project root (this will show all logs)
python -m backend.api.main
