# Battle Arena Smart Contracts

A decentralized battle system on OneChain where players can stake Battle Tokens and compete in 1v1 battles.

## 📋 Overview

Battle Arena consists of two main smart contracts:

1. **Battle Token (BTK)** - Custom fungible token for the battle system
2. **Battle System** - Manages player battles, staking, and prize distribution

## ✨ Features

- ✅ **Token Minting**: Admin can mint Battle Tokens to any address
- ✅ **Battle Creation**: Players can create battles and stake tokens
- ✅ **Fair Staking**: Both players must stake equal amounts
- ✅ **Admin-Controlled Finalization**: Only admin can declare winners via API endpoint
- ✅ **Prize Distribution**: Winner automatically receives all staked tokens
- ✅ **Edge Case Handling**: 
  - Rejects battles with unequal stakes
  - Rejects battles without 2 players
  - Allows cancellation before opponent joins

## 🏗️ Architecture

### Battle Token Module (`battle_token.move`)

```move
// Key Functions:
- init(): Initialize the token with MintCap
- mint(): Mint tokens to recipient (admin only)
- burn(): Burn tokens
- total_supply(): View total token supply
```

**Capabilities:**
- `MintCap`: Required to mint tokens, owned by admin

### Battle Module (`battle.move`)

```move
// Key Functions:
- create_battle(): Player 1 creates battle and stakes tokens
- join_battle(): Player 2 joins and stakes equal amount
- finalize_battle(): Admin declares winner (requires AdminCap)
- cancel_battle(): Cancel battle if opponent hasn't joined
```

**Capabilities:**
- `AdminCap`: Required to finalize battles, owned by admin

**Objects:**
- `Battle`: Shared object holding battle state and staked tokens

## 🚀 Deployment

### Prerequisites

```bash
# Install OneChain CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install --locked --git https://github.com/one-chain-labs/onechain.git one_chain --features tracing
mv ~/.cargo/bin/one_chain ~/.cargo/bin/one

# Configure for testnet
one client new-env --alias testnet --rpc https://rpc-testnet.onelabs.cc:443
one client switch --env testnet

# Get testnet tokens
curl --location --request POST 'https://faucet-testnet.onelabs.cc/v1/gas' \
--header 'Content-Type: application/json' \
--data-raw '{
    "FixedAmountRequest": {
        "recipient": "<YOUR_ADDRESS>"
    }
}'
```

### Deploy to Testnet

```bash
# Deploy contracts
cd battle_arena
./scripts/deploy.sh

# This will output:
# - Package ID
# - MintCap ID (for minting tokens)
# - AdminCap ID (for finalizing battles)
# - All values saved to .env file
```

## 📖 Usage

### 1. Mint Tokens to Players

```bash
# Mint 1000 tokens to Alice
./scripts/mint_tokens.sh 0xAliceAddress 1000

# Mint 1000 tokens to Bob
./scripts/mint_tokens.sh 0xBobAddress 1000
```

**Via CLI:**
```bash
one client call \
    --package $PACKAGE_ID \
    --module battle_token \
    --function mint \
    --args $MINT_CAP_ID 1000 0xRecipientAddress \
    --gas-budget 10000000
```

### 2. Create a Battle (Player 1)

**Via CLI:**
```bash
one client call \
    --package $PACKAGE_ID \
    --module battle \
    --function create_battle \
    --args $STAKE_COIN_ID 0xOpponentAddress $ADMIN_ADDRESS \
    --gas-budget 10000000
```

**Via TypeScript SDK:**
```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();

// Split coins for staking
const [stakeCoin] = tx.splitCoins(tx.object(playerCoins), [tx.pure(500)]);

// Create battle
tx.moveCall({
    target: `${packageId}::battle::create_battle`,
    arguments: [
        stakeCoin,
        tx.pure(opponentAddress),
        tx.pure(adminAddress),
    ],
});

await client.signAndExecuteTransaction({ 
    signer: player1Keypair, 
    transaction: tx 
});
```

### 3. Join Battle (Player 2)

**Via CLI:**
```bash
one client call \
    --package $PACKAGE_ID \
    --module battle \
    --function join_battle \
    --args $BATTLE_ID $STAKE_COIN_ID \
    --gas-budget 10000000
```

**Via TypeScript SDK:**
```typescript
const tx = new Transaction();

const [stakeCoin] = tx.splitCoins(tx.object(playerCoins), [tx.pure(500)]);

tx.moveCall({
    target: `${packageId}::battle::join_battle`,
    arguments: [
        tx.object(battleId),
        stakeCoin,
    ],
});

await client.signAndExecuteTransaction({ 
    signer: player2Keypair, 
    transaction: tx 
});
```

### 4. Finalize Battle (Admin via API)

```bash
# Declare winner
./scripts/finalize_battle.sh $BATTLE_ID $WINNER_ADDRESS
```

**Via CLI:**
```bash
one client call \
    --package $PACKAGE_ID \
    --module battle \
    --function finalize_battle \
    --args $ADMIN_CAP_ID $BATTLE_ID $WINNER_ADDRESS \
    --gas-budget 10000000
```

**Via TypeScript SDK:**
```typescript
const tx = new Transaction();

tx.moveCall({
    target: `${packageId}::battle::finalize_battle`,
    arguments: [
        tx.object(adminCapId),
        tx.object(battleId),
        tx.pure(winnerAddress),
    ],
});

await client.signAndExecuteTransaction({ 
    signer: adminKeypair, 
    transaction: tx 
});
```

### 5. Cancel Battle (Before Opponent Joins)

```bash
one client call \
    --package $PACKAGE_ID \
    --module battle \
    --function cancel_battle \
    --args $BATTLE_ID \
    --gas-budget 10000000
```

## 🧪 Testing

```bash
# Run all tests
one move test

# Run specific test
one move test test_create_battle_success

# Run with verbose output
one move test -v
```

**Test Coverage:**
- ✅ Token minting (15 tests)
- ✅ Battle creation and joining
- ✅ Battle finalization with both winners
- ✅ Edge cases (wrong amount, wrong player, invalid winner)
- ✅ Battle cancellation

**All 15 tests pass successfully!**

## 🔐 Security Features

1. **Access Control**
   - Only MintCap holder can mint tokens
   - Only AdminCap holder can finalize battles
   - Only designated player 2 can join battles

2. **Validation**
   - Prevents self-battles
   - Enforces equal stake amounts
   - Requires both players before finalization
   - Winner must be one of the battling players

3. **Asset Safety**
   - Staked tokens locked in shared object
   - Automatic prize distribution
   - Refund mechanism for cancelled battles

## 📊 Events

The contracts emit events for tracking:

```move
// Battle Token Events
- None (uses standard coin events)

// Battle Events
- BattleCreated { battle_id, player1, player2, stake_amount }
- BattleJoined { battle_id, player2 }
- BattleFinalized { battle_id, winner, total_prize }
- BattleCancelled { battle_id, refunded_to }
```

## 🔄 Integration with Frontend

### Query Battle State

```typescript
// Get battle details
const battle = await client.getObject({
    id: battleId,
    options: { showContent: true }
});

const battleData = battle.data.content.fields;
console.log('Player 1:', battleData.player1);
console.log('Player 2:', battleData.player2);
console.log('Stake Amount:', battleData.stake_amount);
console.log('Is Ready:', battleData.is_ready);
```

### Listen to Events

```typescript
// Subscribe to battle events
const unsubscribe = await client.subscribeEvent({
    filter: {
        MoveModule: {
            package: packageId,
            module: 'battle'
        }
    },
    onMessage: (event) => {
        console.log('Battle event:', event);
        // Handle event in your UI
    }
});
```

## 📁 Project Structure

```
battle_arena/
├── Move.toml                 # Package manifest
├── sources/
│   ├── battle_token.move     # Token module
│   └── battle.move           # Battle logic
├── tests/
│   ├── battle_token_tests.move
│   └── battle_tests.move
├── scripts/
│   ├── deploy.sh             # Deployment script
│   ├── mint_tokens.sh        # Token minting helper
│   └── finalize_battle.sh    # Battle finalization helper
└── README.md                 # This file
```

## 🛠️ Development

### Build

```bash
one move build
```

### Test

```bash
one move test
```

### Format

```bash
one move fmt
```

## 📝 Gas Estimates

| Operation | Estimated Gas (OCT) |
|-----------|---------------------|
| Deploy Package | ~0.1 OCT |
| Mint Tokens | ~0.001 OCT |
| Create Battle | ~0.002 OCT |
| Join Battle | ~0.002 OCT |
| Finalize Battle | ~0.002 OCT |
| Cancel Battle | ~0.001 OCT |

*Actual costs may vary based on network conditions*

## 🐛 Error Codes

### Battle Token
- `0` - `EInvalidAmount`: Amount must be greater than 0

### Battle
- `0` - `ENotAuthorized`: Not authorized for this action
- `1` - `EBattleAlreadyFull`: Battle already has both players
- `2` - `EInvalidStakeAmount`: Stake amount doesn't match
- `3` - `EBattleNotReady`: Battle needs both players
- `4` - `ECannotJoinOwnBattle`: Cannot battle yourself
- `5` - `EInvalidWinner`: Winner must be one of the players
- `6` - `EPlayer2AlreadyJoined`: Player 2 already joined

## 🤝 Contributing

Contributions welcome! Please ensure:
1. All tests pass
2. Code follows Move style guidelines
3. Add tests for new features

## 📄 License

MIT License - Feel free to use this code for your projects!

## 🔗 Resources

- [OneChain Documentation](https://github.com/one-chain-labs/onechain)
- [Move Language Book](https://move-language.github.io/move/)
- [OneChain TypeScript SDK](https://www.npmjs.com/package/@onelabs/sui)

## 💡 Support

For issues or questions:
1. Check existing tests for examples
2. Review Move compilation errors carefully
3. Ensure you're connected to testnet
4. Verify you have sufficient OCT for gas

---

Built with ❤️ for OneChain Battle Arena

