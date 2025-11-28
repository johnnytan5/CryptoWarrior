# Deployment Summary

Quick reference for deploying Crypto Warrior to production.

## 🎯 Deployment Overview

- **Frontend:** Vercel (Simple ✅)
- **Backend:** EC2 (Complex ⚠️)

## 📱 Frontend Deployment (Vercel)

### Status: ✅ Ready to Deploy

**Steps:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` → `https://api.yourdomain.com`
   - `NEXT_PUBLIC_PACKAGE_ID` → Your package ID
   - `NEXT_PUBLIC_DEPLOYER_ADDRESS` → Your deployer address
4. Deploy!

**That's it!** Frontend is ready.

## 🖥️ Backend Deployment (EC2)

### Status: ⚠️ Requires Setup

**What You Need:**
1. ✅ OneChain CLI installed on EC2
2. ✅ Private keys configured
3. ✅ Battle arena directory with .env
4. ✅ Python dependencies
5. ✅ System configuration

**Why It's Complex:**
- Backend uses `one client` commands via subprocess
- Needs OneChain CLI binary installed
- Requires private keys for signing transactions
- Battle arena directory needs its own .env file

### Quick Checklist

**Before Starting:**
- [ ] EC2 instance launched (Ubuntu 22.04/20.04)
- [ ] Security group configured (HTTP, HTTPS, SSH)
- [ ] Domain name ready (optional but recommended)
- [ ] Private key exported: `one keytool export --key-identity YOUR_ADDRESS`

**On EC2:**
- [ ] Install OneChain CLI
- [ ] Install Python 3.11+
- [ ] Upload/clone code
- [ ] Configure `battle_arena/.env`
- [ ] Configure `backend/.env`
- [ ] Run `backend/deploy.sh`
- [ ] Install systemd service
- [ ] Configure Nginx
- [ ] Install SSL certificate

**See:** `backend/EC2_DEPLOYMENT.md` for detailed steps

## 🐳 Docker? Not Recommended (Yet)

**Why not Dockerize now:**
- Adds complexity
- OneChain CLI needs to be in container
- Private keys need secure mounting
- Battle arena directory needs access
- Harder to debug initially

**Recommendation:** Deploy directly first, containerize later if needed.

## 📋 Environment Variables Summary

### Frontend (.env.local or Vercel)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_DEPLOYER_ADDRESS=0x...
```

### Backend (backend/.env)
```env
PACKAGE_ID=0x...
MINT_CAP_ID=0x...
ADMIN_CAP_ID=0x...
ADMIN_PRIVATE_KEY=base64_encoded_key
DEPLOYER_ADDRESS=0x...
CORS_ORIGINS=https://your-app.vercel.app
```

### Battle Arena (battle_arena/.env)
```env
PACKAGE_ID=0x...
MINT_CAP_ID=0x...
ADMIN_CAP_ID=0x...
DEPLOYER_ADDRESS=0x...
ADMIN_PRIVATE_KEY=base64_encoded_key
```

## 🔐 Security Notes

1. **Never commit .env files** - They contain private keys!
2. **Secure file permissions:** `chmod 600 .env`
3. **Use AWS Secrets Manager** for production (optional but recommended)
4. **Configure firewall:** Only allow necessary ports
5. **Use HTTPS:** Always use SSL certificates

## 📚 Documentation Files

- **Frontend:** `frontend/README.md` - Basic setup
- **Backend:** `backend/README.md` - Development setup
- **EC2 Deployment:** `backend/EC2_DEPLOYMENT.md` - Complete EC2 guide
- **OneChain Setup:** `backend/setup_onechain.sh` - CLI installation helper

## 🚀 Quick Start Commands

### Frontend (Local)
```bash
cd frontend
npm install
npm run dev
```

### Backend (Local)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Backend (Production/EC2)
```bash
cd backend
./deploy.sh
sudo systemctl start crypto-warrior-api
```

## ✅ Final Verification

**Frontend:**
- [ ] Deployed to Vercel
- [ ] Environment variables set
- [ ] Can access frontend URL

**Backend:**
- [ ] Running on EC2
- [ ] Health endpoint works: `curl https://api.yourdomain.com/health`
- [ ] Frontend can connect to backend
- [ ] OneChain CLI commands work
- [ ] Logs are accessible

## 🆘 Need Help?

1. Check `backend/EC2_DEPLOYMENT.md` for detailed steps
2. Check logs: `sudo journalctl -u crypto-warrior-api -f`
3. Test endpoints: `curl https://api.yourdomain.com/health`
4. Verify OneChain CLI: `one client --version`

