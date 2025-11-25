#!/bin/bash

# Finalize a battle and declare winner
# Usage: ./scripts/finalize_battle.sh <battle_id> <winner_address>

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <battle_id> <winner_address>"
    echo "Example: $0 0x123...abc 0x456...def"
    exit 1
fi

BATTLE_ID=$1
WINNER=$2

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found. Please run deploy.sh first."
    exit 1
fi

echo "========================================"
echo "Finalizing Battle"
echo "========================================"
echo ""
echo "Battle ID: $BATTLE_ID"
echo "Winner: $WINNER"
echo "Package ID: $PACKAGE_ID"
echo "AdminCap ID: $ADMIN_CAP_ID"
echo ""

# Finalize battle
one client call \
    --package $PACKAGE_ID \
    --module battle \
    --function finalize_battle \
    --args $ADMIN_CAP_ID $BATTLE_ID $WINNER \
    --gas-budget 10000000

echo ""
echo "✅ Battle finalized. Winner: $WINNER"
echo ""

