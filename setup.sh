#!/bin/bash

# Gemini Enterprise API Explorer - Setup Script
# This script sets up the development environment and starts the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Gemini Enterprise API Explorer - Setup & Start          ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get version
get_version() {
    $1 --version 2>&1 | head -n 1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"
echo ""

# Check Python
if ! command_exists python3; then
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    echo "  Please install Python 3.9 or higher from https://www.python.org/"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo -e "${GREEN}✓ Python ${PYTHON_VERSION} found${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js 18 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"

# Check npm
if ! command_exists npm; then
    echo -e "${RED}✗ npm is not installed${NC}"
    echo "  npm should come with Node.js. Please reinstall Node.js."
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm ${NPM_VERSION} found${NC}"

echo ""
echo -e "${BLUE}🔧 Setting up backend...${NC}"

# Create Python virtual environment if it doesn't exist
if [ ! -d "backend/.venv" ]; then
    echo "  Creating Python virtual environment..."
    cd backend
    python3 -m venv .venv
    cd ..
    echo -e "${GREEN}  ✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}  ✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment and install dependencies
echo "  Installing Python dependencies..."
cd backend
source .venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1
cd ..
echo -e "${GREEN}  ✓ Python dependencies installed${NC}"

echo ""
echo -e "${BLUE}🔧 Setting up frontend...${NC}"

# Install Node.js dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "  Installing Node.js dependencies (this may take a few minutes)..."
    cd frontend
    npm install > /dev/null 2>&1
    cd ..
    echo -e "${GREEN}  ✓ Node.js dependencies installed${NC}"
else
    echo -e "${GREEN}  ✓ Node.js dependencies already installed${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}🚀 Starting servers...${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}  Starting backend server...${NC}"
cd backend
source .venv/bin/activate
cd ..
python -m backend.api.main > /dev/null 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}  ✓ Backend started (PID: $BACKEND_PID)${NC}"
echo "    Backend URL: http://localhost:8000"
echo "    API Docs: http://localhost:8000/docs"

# Wait for backend to be ready
echo ""
echo "  Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}  ✗ Backend failed to start${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Start frontend in background
echo ""
echo -e "${BLUE}  Starting frontend server...${NC}"
cd frontend
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}  ✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "    Frontend URL: http://localhost:3000"

# Wait a moment for frontend to start
sleep 3

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    🎉 All Set!                             ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${YELLOW}📱 Opening browser...${NC}"
echo ""

# Open browser (works on macOS, Linux, and WSL)
if command_exists open; then
    # macOS
    open http://localhost:3000
elif command_exists xdg-open; then
    # Linux
    xdg-open http://localhost:3000 > /dev/null 2>&1
elif command_exists wslview; then
    # WSL
    wslview http://localhost:3000
else
    echo -e "${YELLOW}  Could not auto-open browser. Please navigate to:${NC}"
    echo -e "${BLUE}  http://localhost:3000${NC}"
fi

echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Configure your Google Cloud credentials in the sidebar:"
echo "     • Project Number (your GCP project number)"
echo "     • Engine ID (your Agentspace engine ID)"
echo ""
echo "  2. Start exploring the API endpoints!"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "  • Backend PID: $BACKEND_PID"
echo "  • Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}  To stop the servers, run:${NC}"
echo "    kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo -e "${BLUE}  Or press Ctrl+C if running in foreground${NC}"
echo ""

# Keep script running and wait for user interrupt
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
