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

#### Development Mode

```bash
# Development mode (with auto-reload)
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: **http://localhost:8000**

#### Production Mode (Gunicorn)

```bash
# Activate virtual environment
source venv/bin/activate

# Run with Gunicorn (production)
gunicorn main:app -c gunicorn_config.py

# Or specify custom settings
gunicorn main:app \
  --workers 5 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 30
```

**Note:** For production deployment on EC2, see the [Production Deployment](#-production-deployment) section below.

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

# Get battle details
curl http://localhost:8000/api/battles/0xBATTLE_ID

# Get user balance
curl http://localhost:8000/api/users/0xADDRESS/balance
```

### Using HTTPie

```bash
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
// pages/api/get-balance.ts
export default async function handler(req, res) {
  const address = req.query.address;
  const response = await fetch(`http://localhost:8000/api/users/${address}/balance`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await response.json();
  res.status(200).json(data);
}
```

### Example: Direct Fetch

```typescript
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

## 🚀 Production Deployment

### EC2 Deployment with Gunicorn

#### 1. Prerequisites

- EC2 instance running Ubuntu (20.04 or later recommended)
- Python 3.11+ installed
- Domain name configured (optional, for SSL)
- Security group configured to allow HTTP (80) and HTTPS (443)

#### 2. Initial Setup

```bash
# Clone or upload your code to EC2
cd ~/cryptoWarrior/backend

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

#### 3. Configure Environment Variables

Create/update `.env` file with production values:

```env
# OneChain Configuration
ONECHAIN_NETWORK=testnet
ONECHAIN_RPC_URL=https://rpc-testnet.onelabs.cc:443

# Smart Contract Addresses
PACKAGE_ID=0x...
ADMIN_CAP_ID=0x...

# Admin Wallet
ADMIN_PRIVATE_KEY=your_base64_encoded_private_key
DEPLOYER_ADDRESS=0x...

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# CORS - Add your Vercel domain here
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

#### 4. Install Systemd Service

```bash
# Copy service file
sudo cp crypto-warrior-api.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start the service
sudo systemctl start crypto-warrior-api

# Enable auto-start on boot
sudo systemctl enable crypto-warrior-api

# Check status
sudo systemctl status crypto-warrior-api
```

#### 5. View Logs

```bash
# View live logs
sudo journalctl -u crypto-warrior-api -f

# View recent logs
sudo journalctl -u crypto-warrior-api -n 100

# View logs since boot
sudo journalctl -u crypto-warrior-api --since boot
```

#### 6. Nginx Configuration (Reverse Proxy + SSL)

Create `/etc/nginx/sites-available/crypto-warrior-api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/crypto-warrior-api /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

#### 7. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

#### 8. Gunicorn Configuration

The `gunicorn_config.py` file is pre-configured with production settings:

- **Workers**: Automatically calculated as `(2 × CPU cores) + 1`
- **Timeout**: 30 seconds
- **Max requests**: 1000 (prevents memory leaks)
- **Preload app**: Enabled for better performance

You can override settings with environment variables:

```bash
export GUNICORN_WORKERS=5
export GUNICORN_LOG_LEVEL=debug
export GUNICORN_MAX_REQUESTS=500
```

#### 9. Monitoring

```bash
# Check service status
sudo systemctl status crypto-warrior-api

# Check if Gunicorn is running
ps aux | grep gunicorn

# Check port binding
sudo netstat -tlnp | grep 8000

# Test API endpoint
curl http://localhost:8000/health
```

#### 10. Updating the Service

```bash
# Pull latest code
cd ~/cryptoWarrior/backend
git pull  # or upload new files

# Run deployment script
./deploy.sh

# Restart service
sudo systemctl restart crypto-warrior-api

# Check if restart was successful
sudo systemctl status crypto-warrior-api
```

### Performance Tuning

#### Worker Count

For EC2 instances:
- **t3.small** (2 vCPU): 5 workers (default)
- **t3.medium** (2 vCPU): 5 workers
- **t3.large** (2 vCPU): 5 workers
- **t3.xlarge** (4 vCPU): 9 workers

Adjust in `gunicorn_config.py` or via environment variable:
```bash
export GUNICORN_WORKERS=9
```

#### Memory Management

Workers automatically restart after 1000 requests (configurable) to prevent memory leaks.

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

### Issue: "Service won't start"
- Check logs: `sudo journalctl -u crypto-warrior-api -n 50`
- Verify `.env` file exists and has all required variables
- Check file permissions: `ls -la .env`
- Verify virtual environment: `source venv/bin/activate && which python`

### Issue: "Gunicorn workers keep restarting"
- Check worker logs for errors
- Verify memory usage: `free -h`
- Check if external APIs (Binance, CoinGecko) are reachable
- Review timeout settings in `gunicorn_config.py`

### Issue: "502 Bad Gateway" (Nginx)
- Check if Gunicorn is running: `sudo systemctl status crypto-warrior-api`
- Verify Gunicorn is listening on port 8000: `sudo netstat -tlnp | grep 8000`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

---

Built with ❤️ for Crypto Battle Arena on OneChain

