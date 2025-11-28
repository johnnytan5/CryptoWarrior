# Crypto Battle Arena Backend

FastAPI backend for the Crypto Battle Arena game on OneChain.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Install requirements
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required Configuration:**
```env
PACKAGE_ID=0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8
MINT_CAP_ID=0xc05a9c3e1e75f677a17a5a1a6c1b3bde40063bb5f2749a8cac5cb6daef4c9d61
ADMIN_CAP_ID=0xe99a9f9caa9905b6a657697b3f1df41b3dd25f59088fa518b99214cf46f17de8
ADMIN_PRIVATE_KEY=your_base64_encoded_private_key
```

### 3. Get Your Admin Private Key

```bash
# Export your private key (this is your admin wallet)
one keytool export --key-identity 0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9

# Copy the base64 string and paste it into .env as ADMIN_PRIVATE_KEY
```

### 4. Run the Server

```bash
# Development mode (with auto-reload)
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: **http://localhost:8000**

## 📡 API Endpoints

### Health Check
```bash
GET /
GET /health

Response:
{
  "status": "healthy",
  "network": "testnet",
  "package_id": "0x..."
}
```

### Mint Tokens
```bash
POST /api/tokens/mint
Content-Type: application/json

{
  "address": "0x123...",
  "amount": 1000
}

Response:
{
  "success": true,
  "recipient": "0x123...",
  "amount": 1000,
  "message": "Tokens minted successfully",
  "transaction_digest": "..."
}
```

### Create Battle
```bash
POST /api/battles/create
Content-Type: application/json

{
  "player1_address": "0x123...",
  "stake_amount": 1000,
  "coin_object_id": "0xabc..."
}

Response:
{
  "success": true,
  "battle_id": "0x456...",
  "player1": "0x123...",
  "stake_amount": 1000,
  "message": "Battle created successfully",
  "transaction_digest": "..."
}
```

### Join Battle
```bash
POST /api/battles/join
Content-Type: application/json

{
  "battle_id": "0x456...",
  "player2_address": "0x789...",
  "stake_amount": 1000,
  "coin_object_id": "0xdef..."
}

Response:
{
  "success": true,
  "battle_id": "0x456...",
  "player2": "0x789...",
  "stake_amount": 1000,
  "message": "Joined battle successfully",
  "transaction_digest": "..."
}
```

### Finalize Battle
```bash
POST /api/battles/finalize
Content-Type: application/json

{
  "battle_id": "0x456...",
  "winner": "0x789..."
}

Response:
{
  "success": true,
  "battle_id": "0x456...",
  "winner": "0x789...",
  "message": "Battle finalized successfully",
  "transaction_digest": "...",
  "total_prize": 2000
}
```

### Get Battle Details
```bash
GET /api/battles/{battle_id}

Response:
{
  "id": "0x456...",
  "player1": "0x123...",
  "player2": "0x789...",
  "stake_amount": 1000,
  "is_ready": true,
  "admin": "0xabc..."
}
```

### Get User Balance
```bash
GET /api/users/{address}/balance

Response:
{
  "address": "0x123...",
  "total_balance": 5000,
  "coins": [
    {
      "object_id": "0x...",
      "balance": 5000
    }
  ]
}
```

## 🧪 Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:8000/health

# Mint tokens
curl -X POST http://localhost:8000/api/tokens/mint \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9",
    "amount": 1000
  }'

# Get battle details
curl http://localhost:8000/api/battles/0xBATTLE_ID

# Get user balance
curl http://localhost:8000/api/users/0xADDRESS/balance
```

### Using HTTPie

```bash
# Mint tokens
http POST localhost:8000/api/tokens/mint \
  address="0x123..." \
  amount:=1000

# Finalize battle
http POST localhost:8000/api/battles/finalize \
  battle_id="0x456..." \
  winner="0x789..."
```

### API Documentation

Visit **http://localhost:8000/docs** for interactive Swagger UI documentation.

## 🔐 Security

1. **Never commit `.env` file** - It contains your private key!
2. **Use environment variables** in production
3. **Implement rate limiting** for public endpoints
4. **Add authentication** if needed (JWT, API keys, etc.)
5. **Validate all inputs** - FastAPI does this automatically with Pydantic
6. **Use HTTPS** in production

## 📂 Project Structure

```
backend/
├── main.py              # FastAPI app and routes
├── config.py            # Configuration settings
├── onechain_client.py   # OneChain blockchain client
├── requirements.txt     # Python dependencies
├── .env.example         # Example environment variables
├── .env                 # Your environment variables (gitignored)
└── README.md           # This file
```

## 🔄 Integration with Frontend

### Example: Next.js API Route

```typescript
// pages/api/mint-tokens.ts
export default async function handler(req, res) {
  const response = await fetch('http://localhost:8000/api/tokens/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: req.body.address,
      amount: 1000
    })
  });
  
  const data = await response.json();
  res.status(200).json(data);
}
```

### Example: Direct Fetch

```typescript
// Mint tokens when user connects wallet
async function mintInitialTokens(address: string) {
  const response = await fetch('http://localhost:8000/api/tokens/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, amount: 1000 })
  });
  return await response.json();
}

// Finalize battle when game ends
async function finalizeBattle(battleId: string, winner: string) {
  const response = await fetch('http://localhost:8000/api/battles/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ battle_id: battleId, winner })
  });
  return await response.json();
}
```

## 📊 Logging

Logs are output to console. In production, consider:
- Using structured logging (JSON format)
- Sending logs to a service (CloudWatch, Datadog, etc.)
- Setting appropriate log levels

## 🚨 Error Handling

The API returns standard HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid input)
- `404`: Not Found (battle doesn't exist)
- `500`: Internal Server Error

Error response format:
```json
{
  "error": "Error message",
  "status_code": 400
}
```

## 🔧 Development

```bash
# Run with auto-reload
python main.py

# Or with uvicorn
uvicorn main:app --reload

# Run tests (if you add them)
pytest

# Format code
black .

# Lint code
flake8 .
```

## 📝 TODO

- [ ] Implement proper key management (use AWS KMS, HashiCorp Vault, etc.)
- [ ] Add request rate limiting
- [ ] Add authentication/authorization
- [ ] Implement caching for battle states
- [ ] Add comprehensive error handling
- [ ] Write unit tests
- [ ] Add API versioning
- [ ] Implement event subscriptions
- [ ] Add monitoring and metrics

## 🆘 Troubleshooting

### Issue: "Failed to load admin keypair"
- Make sure `ADMIN_PRIVATE_KEY` in `.env` is correctly set
- Get it from: `one keytool export --key-identity YOUR_ADDRESS`

### Issue: "Connection refused"
- Check if OneChain RPC URL is correct
- Verify network connectivity

### Issue: "Transaction failed"
- Check if admin has enough OCT for gas
- Verify object IDs are correct
- Check transaction logs

---

Built with ❤️ for Crypto Battle Arena on OneChain

