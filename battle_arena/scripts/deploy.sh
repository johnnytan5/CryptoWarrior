#!/bin/bash

# Deploy Battle Arena Smart Contracts to OneChain Testnet
# Usage: ./scripts/deploy.sh

set -e

echo "========================================"
echo "Battle Arena Smart Contract Deployment"
echo "========================================"
echo ""

# Check if one CLI is installed
if ! command -v one &> /dev/null; then
    echo "Error: 'one' CLI is not installed or not in PATH"
    echo "Please install OneChain CLI first"
    exit 1
fi

# Get current active address
DEPLOYER_ADDRESS=$(one client active-address)
echo "Deploying from address: $DEPLOYER_ADDRESS"
echo ""

# Check balance
echo "Checking OCT balance..."
one client gas
echo ""

# Publish the package
echo "Publishing Battle Arena package..."
echo "This may take a moment..."
echo ""

PUBLISH_OUTPUT=$(one client publish --gas-budget 100000000 --skip-dependency-verification --json)

# Extract package ID
PACKAGE_ID=$(echo $PUBLISH_OUTPUT | jq -r '.objectChanges[] | select(.type == "published") | .packageId')

echo ""
echo "========================================"
echo "Deployment Successful!"
echo "========================================"
echo ""
echo "Package ID: $PACKAGE_ID"
echo ""

# Extract important object IDs from the deployment
echo "Extracting deployment information..."
echo ""

# Get AdminCap object ID
ADMIN_CAP_ID=$(echo $PUBLISH_OUTPUT | jq -r '.objectChanges[] | select(.type == "created" and (.objectType // "" | contains("AdminCap"))) | .objectId // empty' | head -1)
if [ -z "$ADMIN_CAP_ID" ] || [ "$ADMIN_CAP_ID" = "null" ]; then
    echo "Warning: AdminCap ID not found in deployment output"
    ADMIN_CAP_ID=""
else
    echo "AdminCap ID: $ADMIN_CAP_ID"
fi

echo ""
echo "========================================"
echo "Save these values for future operations:"
echo "========================================"
echo ""
echo "export PACKAGE_ID=$PACKAGE_ID"
if [ -n "$ADMIN_CAP_ID" ]; then
    echo "export ADMIN_CAP_ID=$ADMIN_CAP_ID"
fi
echo "export DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS"
echo ""

# Save to .env file
echo "PACKAGE_ID=$PACKAGE_ID" > .env
if [ -n "$ADMIN_CAP_ID" ]; then
    echo "ADMIN_CAP_ID=$ADMIN_CAP_ID" >> .env
fi
echo "DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS" >> .env

echo "Environment variables saved to .env file"
echo ""
echo "Next steps:"
echo "1. Source the environment: source .env"
echo "2. Users need OCT tokens from faucet to participate in battles"
echo "3. Create battle: Use your frontend or scripts/create_battle.sh"
echo ""

