#!/bin/bash
# OneChain CLI Installation Script for EC2

set -e

echo "🔧 Installing OneChain CLI..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please do not run as root. Use a regular user with sudo privileges.${NC}"
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
else
    echo -e "${RED}❌ Unsupported architecture: $ARCH${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected architecture: $ARCH${NC}"

# Create tools directory
mkdir -p ~/tools
cd ~/tools

# Check if OneChain CLI is already installed
if command -v one &> /dev/null; then
    echo -e "${GREEN}✅ OneChain CLI is already installed${NC}"
    one --version
    exit 0
fi

echo -e "${YELLOW}Step 1: Downloading OneChain CLI...${NC}"
echo -e "${YELLOW}⚠️  Note: Replace the URL below with the actual OneChain CLI download URL${NC}"
echo -e "${YELLOW}Check OneChain documentation for the latest release URL${NC}"

# TODO: Replace with actual OneChain CLI download URL
# Example (replace with actual):
# DOWNLOAD_URL="https://github.com/onelabs/onechain/releases/latest/download/onechain-cli-linux-${ARCH}.tar.gz"

# For now, provide instructions
echo ""
echo -e "${YELLOW}Please download OneChain CLI manually:${NC}"
echo "1. Visit OneChain documentation/releases"
echo "2. Download the Linux ${ARCH} binary"
echo "3. Extract and move to /usr/local/bin/"
echo ""
echo "Example commands (replace URL with actual):"
echo "  wget <ONECHAIN_DOWNLOAD_URL>"
echo "  tar -xzf onechain-cli-linux-${ARCH}.tar.gz"
echo "  sudo mv one /usr/local/bin/"
echo "  sudo chmod +x /usr/local/bin/one"
echo "  one --version"
echo ""

# Alternative: If OneChain uses a package manager
echo -e "${YELLOW}Alternative: Install via package manager (if available)${NC}"
echo "Check OneChain documentation for package installation instructions"
echo ""

# Verify installation
if command -v one &> /dev/null; then
    echo -e "${GREEN}✅ OneChain CLI installed successfully!${NC}"
    one --version
else
    echo -e "${RED}❌ OneChain CLI installation incomplete${NC}"
    echo "Please install manually following the instructions above"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure OneChain: cd ~/cryptoWarrior/battle_arena && nano .env"
echo "2. Test CLI: one client --version"
echo "3. Export private key: one keytool export --key-identity YOUR_ADDRESS"

