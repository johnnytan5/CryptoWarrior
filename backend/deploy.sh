#!/bin/bash
# Deployment script for Crypto Warrior API on EC2

set -e  # Exit on error

echo "🚀 Deploying Crypto Warrior API..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Please do not run as root. Use a regular user with sudo privileges."
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Step 1: Activating virtual environment...${NC}"
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo -e "${YELLOW}Step 2: Installing/updating dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${YELLOW}Step 3: Checking environment variables...${NC}"
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Please create it with required variables."
    echo "Required variables:"
    echo "  - PACKAGE_ID"
    echo "  - MINT_CAP_ID"
    echo "  - ADMIN_CAP_ID"
    echo "  - ADMIN_PRIVATE_KEY"
    echo "  - DEPLOYER_ADDRESS"
    echo "  - CORS_ORIGINS (comma-separated list of allowed origins)"
else
    echo "✅ .env file found"
fi

echo -e "${YELLOW}Step 4: Testing Gunicorn configuration...${NC}"
gunicorn --check-config main:app -c gunicorn_config.py

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Make sure your .env file is configured correctly"
echo "2. Install systemd service (if not already installed):"
echo "   sudo cp crypto-warrior-api.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "3. Start the service:"
echo "   sudo systemctl start crypto-warrior-api"
echo "4. Enable auto-start on boot:"
echo "   sudo systemctl enable crypto-warrior-api"
echo "5. Check status:"
echo "   sudo systemctl status crypto-warrior-api"
echo "6. View logs:"
echo "   sudo journalctl -u crypto-warrior-api -f"

