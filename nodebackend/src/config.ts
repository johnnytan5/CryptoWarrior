import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // OneChain Configuration
  onechainNetwork: process.env.ONECHAIN_NETWORK || 'testnet',
  onechainRpcUrl: process.env.ONECHAIN_RPC_URL || 'https://rpc-testnet.onelabs.cc:443',
  
  // Smart Contract Addresses
  packageId: process.env.PACKAGE_ID || '',
  adminCapId: process.env.ADMIN_CAP_ID || '',
  
  // Admin Wallet
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '',
  deployerAddress: process.env.DEPLOYER_ADDRESS || '',
  
  // API Configuration
  apiHost: process.env.API_HOST || '0.0.0.0',
  apiPort: parseInt(process.env.API_PORT || '8000', 10),
  debug: process.env.DEBUG === 'true',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3000'],
};

// Validate required environment variables
const requiredVars = ['PACKAGE_ID', 'ADMIN_CAP_ID', 'ADMIN_PRIVATE_KEY', 'DEPLOYER_ADDRESS'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`Warning: Missing required environment variables: ${missingVars.join(', ')}`);
}

