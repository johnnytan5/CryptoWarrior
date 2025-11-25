# Database Requirements Analysis - DynamoDB & S3

## Overview
This document outlines all user data that needs to be stored using **AWS DynamoDB** (NoSQL database) and **AWS S3** (for NFT images), organized by wallet address (primary key).

---

## Infrastructure Overview

### AWS Services
- **DynamoDB**: NoSQL database for all structured data
- **S3**: Object storage for NFT images
- **S3 Bucket Name**: `crypto-warrior-nfts` (or your preferred name)
- **S3 Path Structure**: `nfts/{nft_id}/image.{ext}` (e.g., `nfts/0x123...abc/image.png`)

---

## 1. User Profile Data

### Current Implementation
- **Source**: `frontend/src/types/index.ts` - `Profile` interface
- **Displayed in**: Profile page (`/profile`)

### DynamoDB Table: `Users`

**Table Name**: `crypto-warrior-users`

**Key Schema**:
- **Partition Key (PK)**: `wallet_address` (String) - OneChain wallet address

**Attributes**:
```json
{
  "wallet_address": "0x...",  // PK
  "wins": 0,                   // Number
  "losses": 0,                 // Number
  "nfts": 0,                   // Number
  "created_at": "2024-01-01T00:00:00Z",  // String (ISO 8601)
  "updated_at": "2024-01-01T00:00:00Z"   // String (ISO 8601)
}
```

**DynamoDB Operations**:
- **Get User**: `GetItem` with `wallet_address` as key
- **Create User**: `PutItem` with `wallet_address` as key
- **Update Profile**: `UpdateItem` on `wallet_address` key

**Note**: `battleTokens` balance is **on-chain** and should be fetched from blockchain, not stored in DB.

---

## 2. Minting Limits & History

### Current Implementation
- **Source**: `frontend/src/app/mint/page.tsx`
- **Current Logic**: Frontend tracks `dailyMinted` in state (resets on page refresh)
- **Limit**: 10 mints per day, 1 BTK per mint

### DynamoDB Table: `MintHistory`

**Table Name**: `crypto-warrior-mint-history`

**Key Schema**:
- **Partition Key (PK)**: `wallet_address` (String)
- **Sort Key (SK)**: `minted_at` (String) - ISO 8601 timestamp (e.g., "2024-01-01T12:00:00Z")

**Attributes**:
```json
{
  "wallet_address": "0x...",           // PK
  "minted_at": "2024-01-01T12:00:00Z",  // SK
  "mint_id": "uuid-v4",                 // Unique mint ID
  "amount_raw": 1000000000,             // Number (raw units, 1_000_000_000 = 1 BTK)
  "amount_human": 1.00,                  // Number (human readable)
  "transaction_digest": "0x..."         // String (on-chain transaction hash)
}
```

**Global Secondary Index (GSI)**:
- **GSI Name**: `wallet-date-index`
- **Partition Key**: `wallet_address`
- **Sort Key**: `minted_at`
- **Purpose**: Query mints by wallet and date range

**DynamoDB Operations**:
- **Get Daily Mint Count**: 
  ```javascript
  Query({
    TableName: 'crypto-warrior-mint-history',
    IndexName: 'wallet-date-index',
    KeyConditionExpression: 'wallet_address = :addr AND minted_at BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':addr': walletAddress,
      ':start': startOfDay,
      ':end': endOfDay
    }
  })
  ```
- **Get All Mints for User**: Query by `wallet_address` (PK)
- **Insert Mint Record**: `PutItem` with `wallet_address` (PK) and `minted_at` (SK)

---

## 3. Battle History

### Current Implementation
- **Source**: Battle completion in `frontend/src/app/page.tsx` and `frontend/src/components/battle/BattleGraph.tsx`
- **Current State**: No battle history is stored (only displayed in victory modal)

### DynamoDB Table: `Battles`

**Table Name**: `crypto-warrior-battles`

**Key Schema**:
- **Partition Key (PK)**: `battle_id` (String) - On-chain battle object ID

**Attributes**:
```json
{
  "battle_id": "0x...",                  // PK
  "user_address": "0x...",              // String
  "bot_address": "0x...",               // String
  "user_coin_id": "bitcoin",            // String (CoinGecko ID)
  "user_coin_symbol": "BTC",             // String
  "bot_coin_id": "ethereum",             // String
  "bot_coin_symbol": "ETH",              // String
  "wager_amount_raw": 1000000000,        // Number
  "wager_amount_human": 1.00,            // Number
  "winner": "0x...",                     // String (winner's wallet address)
  "tokens_awarded_raw": 2000000000,      // Number
  "tokens_awarded_human": 2.00,          // Number
  "user_start_price": 45000.12345678,    // Number
  "user_end_price": 45150.23456789,      // Number
  "bot_start_price": 2500.12345678,      // Number
  "bot_end_price": 2480.23456789,        // Number
  "user_change_percentage": 0.3333,       // Number
  "bot_change_percentage": -0.7944,       // Number
  "is_draw": false,                      // Boolean
  "created_at": "2024-01-01T12:00:00Z",  // String (ISO 8601)
  "finalized_at": "2024-01-01T12:01:00Z", // String (ISO 8601)
  "transaction_digest_create": "0x...",  // String
  "transaction_digest_finalize": "0x..." // String
}
```

**Global Secondary Indexes (GSIs)**:

1. **GSI Name**: `user-battles-index`
   - **Partition Key**: `user_address`
   - **Sort Key**: `created_at`
   - **Purpose**: Query battles by user, sorted by date

2. **GSI Name**: `winner-index`
   - **Partition Key**: `winner`
   - **Sort Key**: `created_at`
   - **Purpose**: Query battles by winner

**DynamoDB Operations**:
- **Get Battle by ID**: `GetItem` with `battle_id` as key
- **Get User's Battles**: Query `user-battles-index` by `user_address`
- **Get Recent Battles**: Query with `created_at` sort key (descending)
- **Create Battle**: `PutItem` with `battle_id` as key

**Use Cases**:
- Display battle history on profile page
- Calculate win/loss statistics
- Show recent battles
- Analytics and leaderboards

---

## 4. NFT Data (Future Implementation)

### How NFTs Work on OneChain

**Yes, NFTs ARE stored in the user's wallet as objects on OneChain.**

On OneChain, NFTs are **owned objects** that belong to a user's wallet address. You can query them using:
```bash
one client objects <wallet_address>
```

The NFT object itself contains metadata (name, description, attributes, etc.) stored in the Move struct fields.

### Why Store NFT Data in Database?

While NFTs exist on-chain, querying the blockchain for NFT metadata every time is slow and expensive. The database acts as a **cache/index** for fast access to NFT display information.

### S3 Storage for NFT Images

**S3 Bucket**: `crypto-warrior-nfts` (or your preferred name)

**S3 Path Structure**:
```
s3://crypto-warrior-nfts/nfts/{nft_id}/image.{ext}
```

**Examples**:
- `s3://crypto-warrior-nfts/nfts/0x123...abc/image.png`
- `s3://crypto-warrior-nfts/nfts/0x456...def/image.jpg`

**S3 Operations**:
- **Upload Image**: `PutObject` to S3 with `nft_id` in path
- **Get Image URL**: Generate presigned URL or use CloudFront CDN URL
- **Delete Image**: `DeleteObject` (if NFT is burned/transferred)

**S3 Image URL Format**:
- **Option A - CloudFront CDN** (Recommended): `https://d1234567890.cloudfront.net/nfts/{nft_id}/image.png`
- **Option B - S3 Presigned URL**: Temporary URL (expires after set time)
- **Option C - Public S3 URL**: `https://crypto-warrior-nfts.s3.amazonaws.com/nfts/{nft_id}/image.png`

### DynamoDB Table: `NFTs`

**Table Name**: `crypto-warrior-nfts`

**Key Schema**:
- **Partition Key (PK)**: `nft_id` (String) - On-chain NFT object ID
- **Sort Key (SK)**: Not needed (nft_id is unique)

**Attributes**:
```json
{
  "nft_id": "0x...",                     // PK
  "wallet_address": "0x...",              // String (current owner)
  "nft_type": "cat_warrior",              // String
  "rarity": "rare",                       // String (common, rare, epic, legendary)
  "s3_image_key": "nfts/0x.../image.png", // String (S3 object key)
  "image_url": "https://cdn.../nfts/0x.../image.png", // String (CDN URL)
  "name": "Cat Warrior #123",             // String
  "description": "A fierce cat warrior...", // String
  "metadata": {                            // Map (JSON object)
    "attributes": [
      {"trait_type": "Power", "value": 85},
      {"trait_type": "Speed", "value": 92}
    ],
    "collection": "Crypto Warriors",
    "edition": 123
  },
  "minted_at": "2024-01-01T12:00:00Z",   // String (ISO 8601)
  "mint_transaction_digest": "0x..."      // String
}
```

**Global Secondary Indexes (GSIs)**:

1. **GSI Name**: `wallet-nfts-index`
   - **Partition Key**: `wallet_address`
   - **Sort Key**: `minted_at`
   - **Purpose**: Query NFTs by owner, sorted by mint date

2. **GSI Name**: `type-rarity-index`
   - **Partition Key**: `nft_type`
   - **Sort Key**: `rarity`
   - **Purpose**: Query NFTs by type and rarity

### What Information Do We Need from Database to Render NFTs?

To render and display NFTs in the frontend, we need:

1. **`image_url`** (REQUIRED) - The S3/CDN URL to display the NFT image
2. **`s3_image_key`** - S3 object key for direct S3 operations
3. **`nft_type`** - For categorization and filtering (e.g., "cat_warrior", "dragon_warrior")
4. **`rarity`** - For styling (e.g., different border colors: common=gray, rare=blue, epic=purple, legendary=gold)
5. **`name`** - NFT title/name to display
6. **`description`** - Optional description text
7. **`metadata`** (Map) - Additional attributes like:
   - `attributes`: Array of traits (e.g., `[{"trait_type": "Power", "value": 85}]`)
   - `collection`: Collection name
   - `edition`: Edition number
   - Any other custom fields

**DynamoDB Operations**:
- **Get NFT by ID**: `GetItem` with `nft_id` as key
- **Get User's NFTs**: Query `wallet-nfts-index` by `wallet_address`
- **Count User's NFTs**: Query `wallet-nfts-index` and count results
- **Get NFTs by Type**: Query `type-rarity-index` by `nft_type`
- **Get NFTs by Rarity**: Query `type-rarity-index` with `nft_type` and `rarity`

### Data Flow for NFT Rendering

1. **Query DynamoDB**: Query `wallet-nfts-index` by `wallet_address` to get all user's NFTs
2. **Render NFTs**: Use `image_url` (S3/CDN URL), `name`, `rarity`, etc. from DynamoDB to display
3. **Verify On-Chain** (optional): Use `nft_id` to query OneChain and verify ownership if needed

**Note**: The database is the **source of truth for display metadata**, while the OneChain blockchain is the **source of truth for ownership**. If an NFT is transferred, you'll need to update the `wallet_address` in DynamoDB.

---

## 5. Price Data (Optional - for Analytics)

### Potential Use Case
- Track price movements during battles
- Historical price data for analytics
- Chart data persistence

### DynamoDB Table: `BattlePriceData` (Optional)

**Table Name**: `crypto-warrior-battle-price-data`

**Key Schema**:
- **Partition Key (PK)**: `battle_id` (String)
- **Sort Key (SK)**: `poll_number` (Number) - 0-12 (0 = initial, 1-12 = polls)

**Attributes**:
```json
{
  "battle_id": "0x...",                  // PK
  "poll_number": 0,                      // SK (0-12)
  "coin_symbol": "BTC",                  // String
  "timestamp": 1704110400,               // Number (Unix timestamp)
  "price": 45000.12345678                // Number
}
```

**Global Secondary Index (GSI)**:
- **GSI Name**: `battle-timestamp-index`
  - **Partition Key**: `battle_id`
  - **Sort Key**: `timestamp`
  - **Purpose**: Query price data by battle, sorted by timestamp

**Note**: This is optional and can be large. Consider if you need historical price data or if on-chain battle data is sufficient.

---

## Summary of DynamoDB Tables

### Core Tables (Required)
1. **`crypto-warrior-users`** - User profiles (wins, losses, nfts count)
   - PK: `wallet_address`
2. **`crypto-warrior-mint-history`** - Minting history and daily limits
   - PK: `wallet_address`, SK: `minted_at`
   - GSI: `wallet-date-index`
3. **`crypto-warrior-battles`** - Complete battle history with all details
   - PK: `battle_id`
   - GSIs: `user-battles-index`, `winner-index`

### Future Tables (Planned)
4. **`crypto-warrior-nfts`** - NFT ownership and metadata
   - PK: `nft_id`
   - GSIs: `wallet-nfts-index`, `type-rarity-index`

### Optional Tables
5. **`crypto-warrior-battle-price-data`** - Detailed price polling data (if needed for analytics)
   - PK: `battle_id`, SK: `poll_number`
   - GSI: `battle-timestamp-index`

### S3 Buckets
- **`crypto-warrior-nfts`** - NFT images storage
  - Path: `nfts/{nft_id}/image.{ext}`

---

## API Endpoints Needed

### User Profile
- `GET /api/users/{address}/profile` - Get user profile (wins, losses, nfts)
- `PUT /api/users/{address}/profile` - Update profile (after battle completion)

### Minting
- `GET /api/users/{address}/mint/count` - Get daily mint count (Query DynamoDB)
- `POST /api/tokens/mint` - Mint tokens (already exists, needs DB integration)

### Battles
- `POST /api/battles/create` - Create battle (already exists, needs DB logging)
- `POST /api/battles/finalize` - Finalize battle (already exists, needs DB logging)
- `GET /api/users/{address}/battles` - Get user's battle history (Query GSI)
- `GET /api/battles/{battle_id}` - Get specific battle details (GetItem)

### NFTs (Future)
- `GET /api/users/{address}/nfts` - Get user's NFTs (Query GSI `wallet-nfts-index`)
- `POST /api/nfts/mint` - Mint NFT (needs implementation)
  - Upload image to S3
  - Store metadata in DynamoDB
- `GET /api/nfts/{nft_id}` - Get NFT details (GetItem)
- `GET /api/nfts/image/{nft_id}` - Get presigned S3 URL for image

---

## Data Flow

### Battle Completion Flow
1. Battle completes → Determine winner
2. Call `finalize_battle` on-chain
3. **NEW**: `PutItem` battle record into `crypto-warrior-battles` table
4. **NEW**: `UpdateItem` on `crypto-warrior-users` table to increment `wins` or `losses`
5. Refresh user balance from blockchain

### Minting Flow
1. User clicks mint → Query DynamoDB for daily mint count
2. Call `mint_tokens` on-chain
3. **NEW**: `PutItem` record into `crypto-warrior-mint-history` table
4. Refresh user balance from blockchain

### NFT Minting Flow (Future)
1. User clicks mint NFT → Check balance (1000 BTK)
2. Call NFT mint function on-chain (creates NFT object owned by user)
3. **NEW**: Generate NFT image (or use pre-generated)
4. **NEW**: Upload image to S3: `PutObject` to `s3://crypto-warrior-nfts/nfts/{nft_id}/image.png`
5. **NEW**: Extract NFT metadata from on-chain object (name, rarity, etc.)
6. **NEW**: `PutItem` record into `crypto-warrior-nfts` table with:
   - `s3_image_key`: S3 object key
   - `image_url`: CloudFront/CDN URL
   - All metadata
7. **NEW**: `UpdateItem` on `crypto-warrior-users` table to increment `nfts` count
8. Refresh user balance from blockchain

### NFT Query Flow (Future)
1. **Option A - From DynamoDB (Fast)**: Query `wallet-nfts-index` by `wallet_address` for instant display
2. **Option B - From OneChain (Slow but authoritative)**: 
   - Use `one client objects <wallet_address>` to get all objects
   - Filter for NFT object type (e.g., `PACKAGE_ID::nft::CatWarrior`)
   - Parse object fields to extract metadata
   - **Recommended**: Use DynamoDB for display, verify ownership on-chain if needed

### NFT Image Access Flow
1. Frontend requests NFT image
2. Backend generates CloudFront presigned URL or returns CDN URL
3. Frontend displays image from S3/CDN

---

## Key Points

1. **On-Chain Data**: 
   - Battle token balance is always fetched from blockchain (source of truth)
   - **NFTs exist as objects on OneChain** - owned by user's wallet address
   - NFT ownership is verified on-chain
2. **Off-Chain Data**: 
   - Wins, losses, mint history, battle history stored in DynamoDB for performance
   - **NFT metadata stored in DynamoDB for fast rendering** (image_url, name, rarity, etc.)
   - **NFT images stored in S3** for scalable image hosting
   - DynamoDB acts as cache/index for NFT display information
3. **Primary Keys**: 
   - All tables use appropriate partition keys (PK) and sort keys (SK)
   - GSIs enable efficient querying by different attributes
4. **Timestamps**: Track when events occurred using ISO 8601 strings
5. **Transaction Hashes**: Store on-chain transaction digests for verification
6. **NFT Rendering**: 
   - DynamoDB provides `image_url` (S3/CDN URL), `name`, `rarity` for fast frontend rendering
   - S3 stores actual image files
   - On-chain object ID (`nft_id`) links DynamoDB record to OneChain object
   - If NFT is transferred, update `wallet_address` in DynamoDB
7. **S3 Image URLs**:
   - Use CloudFront CDN for fast global delivery
   - Generate presigned URLs for temporary access if needed
   - Store S3 key in DynamoDB for easy reference

---

## AWS Infrastructure Setup

### DynamoDB Tables to Create
1. `crypto-warrior-users`
2. `crypto-warrior-mint-history` (with GSI)
3. `crypto-warrior-battles` (with GSIs)
4. `crypto-warrior-nfts` (with GSIs) - Future
5. `crypto-warrior-battle-price-data` (with GSI) - Optional

### S3 Bucket to Create
- **Bucket Name**: `crypto-warrior-nfts`
- **Region**: Your preferred AWS region
- **Access**: Private bucket with CloudFront distribution (recommended)
- **CORS**: Enable CORS if accessing from frontend directly

### IAM Permissions Needed
- DynamoDB: `GetItem`, `PutItem`, `UpdateItem`, `Query`, `Scan`
- S3: `PutObject`, `GetObject`, `DeleteObject`
- CloudFront: Read access (if using CDN)

---

## Next Steps

1. Set up AWS DynamoDB tables with proper key schemas and GSIs
2. Create S3 bucket for NFT images
3. Set up CloudFront distribution for S3 (optional but recommended)
4. Update backend to use DynamoDB SDK and S3 SDK
5. Create backend endpoints for DynamoDB operations
6. Update frontend to fetch from DynamoDB where appropriate
7. Implement NFT image upload to S3
8. Add battle history display to profile page
