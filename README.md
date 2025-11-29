# 🎮 Crypto Warrior

A decentralized battle arena game built on OneChain where players compete by predicting cryptocurrency price movements. Stake Battle Tokens (BTK), select your warrior coin, and battle against opponents in real-time price prediction matches.

## 📖 About

Crypto Warrior is a Web3 gaming platform that combines cryptocurrency trading knowledge with competitive gameplay. Players stake Battle Tokens (BTK) to participate in battles where they predict which cryptocurrency will have better price performance over a set time period. The winner takes the staked tokens, creating an engaging and skill-based gaming experience on the blockchain.

### Key Features

- 🪙 **Battle Token System**: Custom Sui-backed coin (BTK) on OneChain
- ⚔️ **Real-time Battles**: Compete in cryptocurrency price prediction battles
- 📊 **Live Price Data**: Real-time price feeds from Binance and CoinGecko APIs
- 💰 **Staking & Rewards**: Stake BTK tokens, winner takes all
- 🎯 **Multiple Coins**: Battle with top 30+ cryptocurrencies
- 🔐 **Web3 Integration**: Fully decentralized with One Wallet support

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Blockchain**: OneChain DApp Kit (@onelabs/dapp-kit)
- **State Management**: React Context API, TanStack Query
- **Hosting**: Vercel

### Backend
- **Framework**: FastAPI (Python)
- **Server**: Gunicorn + Uvicorn workers
- **APIs**: 
  - Binance API (real-time crypto prices)
  - CoinGecko API (coin metadata)
- **Blockchain**: OneChain CLI integration
- **Hosting**: AWS EC2

### Blockchain
- **Network**: OneChain Testnet
- **Smart Contracts**: Move language
- **Wallet**: One Wallet (browser extension)
- **Token Standard**: Sui Coin Standard (BTK - Battle Token)

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: AWS EC2
- **Reverse Proxy**: Nginx (optional, for HTTPS)
- **Tunneling**: ngrok (for HTTPS backend access)
- **Monitoring**: Vercel Cron Jobs (health checks)

## 🚀 User Guide

### Prerequisites

1. **Install One Wallet**
   - Download the One Wallet extension for Chrome/Edge
   - Register a new wallet or import an existing one
   - Add the extension to your browser

2. **Enable Developer Mode**
   - Open One Wallet extension
   - Go to Settings
   - Enable "Developer Mode" (required for testnet interactions)

3. **Get Testnet Tokens**
   - Switch to OneChain Testnet in One Wallet
   - Request OCT (OneChain Testnet) tokens from the faucet:
     - Use the OneChain CLI: `one client faucet`
     - Or visit the testnet faucet website
   - You'll need OCT for gas fees

4. **Add Battle Token (BTK)**
   - In One Wallet, go to "Add Token" or "Manage Tokens"
   - Add custom token with this contract address:
     ```
     0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8::battle_token::BATTLE_TOKEN
     ```
   - The token symbol should appear as "BTK" or "BATTLE_TOKEN"

### How to Play

1. **Connect Wallet**
   - Visit the Crypto Warrior dApp
   - Click "Connect Wallet"
   - Approve the connection in One Wallet

2. **Get Battle Tokens**
   - If you don't have BTK tokens, you can mint them:
     - Go to the Mint page
     - Enter the amount you want
     - Approve the transaction
   - Or receive BTK from another player

3. **Start a Battle**
   - Select your warrior (cryptocurrency) from the top 30 coins
   - Choose your stake amount (in BTK)
   - Click "Start Battle"
   - Wait for an opponent or battle against the bot

4. **Battle Mechanics**
   - Each battle lasts for a set duration (e.g., 5 minutes)
   - Real-time price tracking for both warriors
   - The coin with better price performance wins
   - Winner takes all staked BTK tokens

5. **View Results**
   - After the battle ends, see the winner announcement
   - Check your updated BTK balance
   - View battle history in your profile

## 📁 Project Structure

```
cryptoWarrior/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # API client libraries
│   │   └── utils/        # Utility functions
│   └── package.json
├── backend/              # FastAPI backend server
│   ├── main.py          # FastAPI application
│   ├── onechain_client.py  # OneChain blockchain client
│   ├── crypto_api.py    # Binance/CoinGecko API integration
│   └── requirements.txt
├── battle_arena/        # Move smart contracts
│   ├── sources/         # Move source files
│   │   ├── battle.move
│   │   └── battle_token.move
│   └── scripts/         # Deployment scripts
└── README.md
```

## 🔧 Setup & Development

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend will run on `http://localhost:8000`

### Environment Variables

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_PACKAGE_ID=0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8
NEXT_PUBLIC_DEPLOYER_ADDRESS=0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9
```

**Backend (.env):**
```
PACKAGE_ID=0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8
MINT_CAP_ID=your_mint_cap_id
ADMIN_CAP_ID=your_admin_cap_id
ADMIN_PRIVATE_KEY=your_private_key
DEPLOYER_ADDRESS=0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9
ONECHAIN_RPC_URL=https://rpc-testnet.onelabs.cc:443
```

## 🚀 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set root directory to `frontend`
4. Add environment variables
5. Deploy automatically

### Backend (AWS EC2)

See `backend/EC2_DEPLOYMENT.md` for detailed instructions.

Quick setup:
1. Launch EC2 instance (Ubuntu)
2. Install dependencies (Python, OneChain CLI)
3. Clone repository
4. Set up systemd service
5. Configure Nginx (optional, for HTTPS)

## 🎯 Potential Improvements

### Short-term
- ✅ **Sponsored Transaction Gas**: Implement gasless transactions using sponsored transactions on OneChain, allowing users to play without holding OCT tokens
- ✅ **Multiplayer Battles**: Add support for multiple players (3+ way battles) with tournament-style brackets
- ✅ **NFT Minting**: Create NFT warriors that players can mint, collect, and use in battles with special abilities or bonuses
- ✅ **Leaderboards**: Global and seasonal leaderboards with rankings and rewards
- ✅ **Battle History**: Detailed battle history with replays and statistics

### Medium-term
- **Tournament Mode**: Organize scheduled tournaments with entry fees and prize pools
- **Achievement System**: Unlock achievements and badges for milestones
- **Referral Program**: Reward users for inviting friends
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Price prediction analytics, win rate statistics, coin performance data

### Long-term
- **Cross-chain Integration**: Support for multiple blockchains (Sui, Aptos, etc.)
- **DAO Governance**: Decentralized governance for game parameters and updates
- **Staking Rewards**: Earn passive income by staking BTK tokens
- **Marketplace**: Trade NFT warriors and battle items
- **AI Opponents**: Advanced AI opponents with different difficulty levels

## 🔒 Security

- Private keys are stored securely and never exposed
- Smart contracts are audited (recommended before mainnet)
- All transactions are on-chain and verifiable
- CORS protection on API endpoints
- Input validation on all user inputs

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

## 🙏 Acknowledgments

- OneChain Labs for the blockchain infrastructure
- Binance and CoinGecko for price data APIs
- The open-source community for amazing tools and libraries

---

**⚠️ Disclaimer**: This is a testnet application. All tokens and transactions are on the testnet and have no real-world value. Always do your own research before participating in any blockchain-based games.

