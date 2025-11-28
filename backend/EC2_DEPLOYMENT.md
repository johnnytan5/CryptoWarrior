# EC2 Deployment Guide

Complete step-by-step guide for deploying Crypto Warrior backend to EC2.

## 📋 Pre-Deployment Checklist

### Frontend (Vercel) ✅
- [x] Environment variables configured
- [x] All hardcoded URLs replaced
- [x] Ready to deploy

**Action:** Just deploy to Vercel and add environment variables in dashboard.

### Backend (EC2) - More Complex ⚠️

You're correct - the backend is more complex because it needs:
1. ✅ OneChain CLI installed
2. ✅ Private keys configured
3. ✅ Battle arena directory with .env
4. ✅ Python dependencies
5. ✅ System configuration

## 🚀 Step-by-Step EC2 Deployment

### Step 1: Launch EC2 Instance

**Recommended Instance:**
- **Type:** t3.medium or t3.large (2-4 vCPU, 4-8 GB RAM)
- **OS:** Ubuntu 22.04 LTS or 20.04 LTS
- **Storage:** 20 GB minimum
- **Security Group:** Allow HTTP (80), HTTPS (443), SSH (22)

### Step 2: Initial Server Setup

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y build-essential curl git wget
```

### Step 3: Install OneChain CLI

```bash
# Create a directory for OneChain
mkdir -p ~/tools
cd ~/tools

# Download OneChain CLI (check latest version from OneChain docs)
# Replace with actual download URL from OneChain
wget https://github.com/onelabs/onechain/releases/latest/download/onechain-cli-linux-amd64.tar.gz

# Extract
tar -xzf onechain-cli-linux-amd64.tar.gz

# Move to /usr/local/bin for system-wide access
sudo mv one /usr/local/bin/
sudo chmod +x /usr/local/bin/one

# Verify installation
one --version
```

**Alternative:** If OneChain CLI is installed via package manager:
```bash
# Follow OneChain official installation guide
# This is just an example - use actual OneChain installation method
```

### Step 4: Install Python 3.11+

```bash
# Check Python version
python3 --version

# If Python < 3.11, install Python 3.11
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Make python3 point to 3.11
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

### Step 5: Upload Your Code

**Option A: Using Git (Recommended)**
```bash
# Install Git if not already installed
sudo apt install -y git

# Clone your repository
cd ~
git clone https://github.com/yourusername/cryptoWarrior.git
# OR if using SSH
# git clone git@github.com:yourusername/cryptoWarrior.git
```

**Option B: Using SCP (Alternative)**
```bash
# From your local machine
scp -i your-key.pem -r cryptoWarrior ubuntu@your-ec2-ip:~/
```

### Step 6: Configure OneChain CLI

```bash
cd ~/cryptoWarrior/battle_arena

# Create .env file for OneChain CLI
nano .env
```

Add your OneChain configuration:
```env
# OneChain Network
NETWORK=testnet
RPC_URL=https://rpc-testnet.onelabs.cc:443

# Your deployed contract addresses
PACKAGE_ID=0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8
MINT_CAP_ID=0xc05a9c3e1e75f677a17a5a1a6c1b3bde40063bb5f2749a8cac5cb6daef4c9d61
ADMIN_CAP_ID=0xe99a9f9caa9905b6a657697b3f1df41b3dd25f59088fa518b99214cf46f17de8
DEPLOYER_ADDRESS=0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9

# Your private key (base64 encoded)
# Get it with: one keytool export --key-identity YOUR_ADDRESS
ADMIN_PRIVATE_KEY=your_base64_encoded_private_key_here
```

**Important:** Get your private key first:
```bash
# On your local machine or EC2
one keytool export --key-identity YOUR_ADDRESS

# Copy the base64 string and paste into ADMIN_PRIVATE_KEY
```

### Step 7: Configure Backend Environment

```bash
cd ~/cryptoWarrior/backend

# Create .env file
nano .env
```

Add backend configuration:
```env
# OneChain Configuration
ONECHAIN_NETWORK=testnet
ONECHAIN_RPC_URL=https://rpc-testnet.onelabs.cc:443

# Smart Contract Addresses (same as battle_arena/.env)
PACKAGE_ID=0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8
MINT_CAP_ID=0xc05a9c3e1e75f677a17a5a1a6c1b3bde40063bb5f2749a8cac5cb6daef4c9d61
ADMIN_CAP_ID=0xe99a9f9caa9905b6a657697b3f1df41b3dd25f59088fa518b99214cf46f17de8

# Admin Wallet
ADMIN_PRIVATE_KEY=your_base64_encoded_private_key_here
DEPLOYER_ADDRESS=0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# CORS - Add your Vercel domain
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

### Step 8: Run Deployment Script

```bash
cd ~/cryptoWarrior/backend

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

This will:
- Create virtual environment
- Install Python dependencies
- Validate configuration

### Step 9: Test OneChain CLI

```bash
# Test that OneChain CLI works
cd ~/cryptoWarrior/battle_arena
source .env
one client --version

# Test a simple command (adjust based on your setup)
one client active-address
```

### Step 10: Install Systemd Service

```bash
cd ~/cryptoWarrior/backend

# Copy service file
sudo cp crypto-warrior-api.service /etc/systemd/system/

# Edit service file to match your paths (if needed)
sudo nano /etc/systemd/system/crypto-warrior-api.service

# Update paths in service file:
# - WorkingDirectory should be: /home/ubuntu/cryptoWarrior/backend
# - User should be: ubuntu (or your username)
# - EnvironmentFile should be: /home/ubuntu/cryptoWarrior/backend/.env

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start crypto-warrior-api

# Enable auto-start on boot
sudo systemctl enable crypto-warrior-api

# Check status
sudo systemctl status crypto-warrior-api
```

### Step 11: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/crypto-warrior-api
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Replace with your domain

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;  # Replace with your domain

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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
# Create symlink
sudo ln -s /etc/nginx/sites-available/crypto-warrior-api /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 12: Install SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d api.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 13: Verify Deployment

```bash
# Check service status
sudo systemctl status crypto-warrior-api

# Check logs
sudo journalctl -u crypto-warrior-api -f

# Test API endpoint
curl http://localhost:8000/health

# Test from outside (if domain configured)
curl https://api.yourdomain.com/health
```

## 🔒 Security Best Practices

### 1. Secure .env Files

```bash
# Set proper permissions
chmod 600 ~/cryptoWarrior/backend/.env
chmod 600 ~/cryptoWarrior/battle_arena/.env

# Don't commit .env files to git
# Make sure .env is in .gitignore
```

### 2. Use AWS Secrets Manager (Optional but Recommended)

Instead of storing private keys in .env files, use AWS Secrets Manager:

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure

# Store secrets
aws secretsmanager create-secret \
    --name crypto-warrior/admin-private-key \
    --secret-string "your_base64_encoded_private_key"
```

Then update your code to fetch from Secrets Manager instead of .env.

### 3. Firewall Configuration

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## 🐳 Docker Alternative (Optional)

If you prefer Docker, you can containerize the backend. However, this adds complexity because:
- OneChain CLI needs to be in the container
- Private keys need to be mounted securely
- Battle arena directory needs to be accessible

**Recommendation:** Start without Docker, then containerize later if needed.

## 📊 Monitoring

### Set Up Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/crypto-warrior-api
```

Add:
```
/var/log/crypto-warrior-api/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        systemctl reload crypto-warrior-api > /dev/null 2>&1 || true
    endscript
}
```

### Health Check Endpoint

Your API already has `/health` endpoint. Set up monitoring:

```bash
# Create a simple health check script
nano ~/health-check.sh
```

```bash
#!/bin/bash
curl -f http://localhost:8000/health || systemctl restart crypto-warrior-api
```

Make it executable and add to crontab:
```bash
chmod +x ~/health-check.sh
crontab -e
# Add: */5 * * * * /home/ubuntu/health-check.sh
```

## 🆘 Troubleshooting

### Issue: OneChain CLI not found
```bash
# Check if installed
which one

# If not found, check PATH
echo $PATH

# Add to PATH if needed
export PATH=$PATH:/usr/local/bin
```

### Issue: Permission denied on .env
```bash
# Fix permissions
chmod 600 ~/cryptoWarrior/backend/.env
chmod 600 ~/cryptoWarrior/battle_arena/.env
```

### Issue: Service won't start
```bash
# Check logs
sudo journalctl -u crypto-warrior-api -n 50

# Check if port is in use
sudo netstat -tlnp | grep 8000

# Test manually
cd ~/cryptoWarrior/backend
source venv/bin/activate
gunicorn main:app -c gunicorn_config.py
```

### Issue: OneChain commands failing
```bash
# Test OneChain CLI directly
cd ~/cryptoWarrior/battle_arena
source .env
one client active-address

# Check if .env is being loaded correctly
cat .env
```

## ✅ Final Checklist

Before going live:

- [ ] OneChain CLI installed and working
- [ ] Private keys configured in both .env files
- [ ] Python dependencies installed
- [ ] Backend service running and auto-starting
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] CORS configured with Vercel domain
- [ ] Health endpoint responding
- [ ] Logs are being captured
- [ ] Firewall configured
- [ ] .env files secured (chmod 600)
- [ ] Frontend deployed to Vercel with correct API URL

## 🎉 You're Ready!

Once all steps are complete, your backend should be running on EC2 and accessible via your domain. Update your Vercel frontend with the production API URL and you're live!

