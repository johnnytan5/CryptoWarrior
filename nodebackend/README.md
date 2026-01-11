# Crypto Warrior Backend (Node.js/Express)

Express.js backend for Crypto Battle Arena on OneChain, built with TypeScript and the native OneChain SDK.

## Features

- ✅ Native OneChain SDK integration (`@onelabs/sui`)
- ✅ TypeScript for type safety
- ✅ Battle management (create, join, finalize)
- ✅ User balance queries
- ✅ Crypto market data (CoinGecko + Binance)
- ✅ Automatic coin management (merge/split)
- ✅ Transaction signing with Ed25519 keypairs

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the `nodebackend` directory:

```env
# OneChain Configuration
ONECHAIN_NETWORK=testnet
ONECHAIN_RPC_URL=https://rpc-testnet.onelabs.cc:443

# Smart Contract Addresses
PACKAGE_ID=your_package_id_here
ADMIN_CAP_ID=your_admin_cap_id_here

# Admin Wallet
ADMIN_PRIVATE_KEY=suiprivkey1...
DEPLOYER_ADDRESS=0x...

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# CORS
CORS_ORIGINS=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:8000` (or your configured port).

## API Endpoints

### Health Check
- `GET /` - Health check
- `GET /health` - Detailed health check

### Battles
- `POST /api/battles/create` - Execute signed create_battle transaction
- `POST /api/battles/join` - Join an existing battle (bot signs)
- `POST /api/battles/finalize` - Finalize a battle and declare winner
- `GET /api/battles/:battle_id` - Get battle details

### Users
- `GET /api/users/:address/balance` - Get user's OCT balance

### Crypto Market Data
- `GET /api/coins/top?limit=30` - Get top tradeable coins
- `GET /api/coins/:coin_id/info` - Get coin information
- `GET /api/price/:symbol` - Get real-time price (e.g., BTCUSDT)
- `GET /api/price/batch?symbols=BTCUSDT,ETHUSDT` - Get multiple prices
- `GET /api/ticker/:symbol` - Get 24h ticker statistics
- `GET /api/klines/:symbol?interval=1m&limit=60` - Get candlestick data
- `GET /api/coins/mapping` - Get CoinGecko to Binance mapping

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Type check without building

### Project Structure

```
nodebackend/
├── src/
│   ├── config.ts              # Configuration
│   ├── index.ts               # Express app entry point
│   ├── types/                 # TypeScript types
│   ├── services/              # Business logic
│   │   ├── onechainClient.ts  # OneChain SDK client
│   │   └── cryptoApi.ts       # CoinGecko & Binance APIs
│   ├── routes/                # API routes
│   │   ├── battles.ts
│   │   ├── users.ts
│   │   └── coins.ts
│   └── middleware/            # Express middleware
│       └── errorHandler.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Key Differences from Python Backend

1. **Native SDK**: Uses `@onelabs/sui` SDK instead of manual RPC calls
2. **Type Safety**: Full TypeScript support with shared types
3. **Simpler Crypto**: SDK handles all Ed25519 signing and Bech32 encoding
4. **Better Error Handling**: TypeScript catches errors at compile time
5. **Code Sharing**: Can share transaction building logic with frontend

## Troubleshooting

### "No admin keypair available"
- Check that `ADMIN_PRIVATE_KEY` is set in `.env`
- Ensure the private key is in the correct format (Bech32 `suiprivkey1...` or base64)

### "Failed to get coins"
- Verify `ONECHAIN_RPC_URL` is correct
- Check network connectivity

### Transaction failures
- Ensure `PACKAGE_ID` and `ADMIN_CAP_ID` are correct
- Verify the admin wallet has sufficient OCT for gas

## License

MIT

