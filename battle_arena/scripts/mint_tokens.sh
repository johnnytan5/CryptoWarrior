#!/bin/bash

# Mint Battle Tokens
# Usage: ./scripts/mint_tokens.sh <recipient_address> <amount>

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <recipient_address> <amount>"
    echo "Example: $0 0x123...abc 1000"
    exit 1
fi

RECIPIENT=$1
AMOUNT=$2

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found. Please run deploy.sh first."
    exit 1
fi

echo "========================================"
echo "Minting Battle Tokens"
echo "========================================"
echo ""
echo "Recipient: $RECIPIENT"
echo "Amount: $AMOUNT"
echo "Package ID: $PACKAGE_ID"
echo "MintCap ID: $MINT_CAP_ID"
echo ""

# Mint tokens (auto-confirm with 'yes' for non-interactive execution)
echo "y" | one client call \
    --package $PACKAGE_ID \
    --module battle_token \
    --function mint \
    --args $MINT_CAP_ID $AMOUNT $RECIPIENT \
    --gas-budget 10000000 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully minted $AMOUNT BTK tokens to $RECIPIENT"
    echo ""
else
    echo ""
    echo "❌ Failed to mint tokens"
    exit 1
fi

