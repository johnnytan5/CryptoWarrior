'use client';

import { useState } from 'react';
import { useCurrentAccount } from '@onelabs/dapp-kit';
import { useApp } from '@/context/AppContext';
import { mintTokens } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function MintPage() {
  const currentAccount = useCurrentAccount();
  const { battleTokenBalance, refreshBalance } = useApp();
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [dailyMinted, setDailyMinted] = useState(0);
  const [mintedAmount, setMintedAmount] = useState(0);
  const DAILY_LIMIT = 10;
  const MINT_AMOUNT = 1_000_000_000; // 1 BTK (1 billion raw units with 9 decimals)

  const handleMint = async () => {
    if (!currentAccount?.address) {
      alert('Please connect your wallet first.');
      return;
    }

    if (dailyMinted >= DAILY_LIMIT) {
      alert('Daily mint limit reached! Come back tomorrow.');
      return;
    }

    setIsMinting(true);
    try {
      // Call backend API to mint tokens
      const result = await mintTokens(currentAccount.address, MINT_AMOUNT);
      
      if (result.success) {
        setDailyMinted((prev) => prev + 1);
        setMintedAmount(1); // 1 BTK per mint
        setMintSuccess(true);
        
        // Refresh balance from backend after a short delay
        setTimeout(async () => {
          await refreshBalance();
        }, 2000);
        
        setTimeout(() => {
          setMintSuccess(false);
        }, 5000);
      } else {
        throw new Error(result.message || 'Minting failed');
      }
    } catch (error) {
      console.error('Error minting tokens:', error);
      alert(`Failed to mint tokens: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsMinting(false);
    }
  };

  const progressPercentage = (dailyMinted / DAILY_LIMIT) * 100;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-dark-bg py-12 px-4 relative">
        <div className="max-w-xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl font-light text-neon-cyan tracking-wide mb-3">
              Mint Battle Tokens
            </h1>
            <p className="text-sm text-gray-400">
              Convert your points into battle tokens
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect border border-white/10 rounded-2xl p-8"
          >
            {/* Current Balance */}
            <div className="text-center mb-10">
              <div className="text-xs text-gray-400 mb-3 tracking-wide">Current Balance</div>
              <div className="text-5xl font-light text-neon-green mb-2 tabular-nums">
                {battleTokenBalance.toFixed(2)} BTK
              </div>
              <div className="text-xs text-gray-500 tracking-wide">Battle Tokens</div>
            </div>

            {/* Daily Limit Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-300 tracking-wide">
                  Mint Progress (1 BTK per mint)
                </span>
                <span className="text-sm text-gray-400 tabular-nums">
                  {dailyMinted} / {DAILY_LIMIT}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 border border-white/10 overflow-hidden">
                <motion.div
                  className={`h-2 rounded-full ${
                    progressPercentage >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-neon-green to-neon-cyan'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {dailyMinted >= DAILY_LIMIT && (
                <p className="text-xs text-red-400 mt-3 text-center">
                  Mint Limit Reached (10 BTK minted)
                </p>
              )}
            </div>

            {/* Mint Button */}
            <div className="flex justify-center mb-8">
              <motion.button
                onClick={handleMint}
                disabled={isMinting || dailyMinted >= DAILY_LIMIT}
                whileHover={dailyMinted < DAILY_LIMIT ? { scale: 1.02 } : {}}
                whileTap={dailyMinted < DAILY_LIMIT ? { scale: 0.98 } : {}}
                className={`px-10 py-4 text-sm font-medium rounded-xl transition-all tracking-wide ${
                  isMinting || dailyMinted >= DAILY_LIMIT
                    ? 'bg-white/5 cursor-not-allowed text-gray-600 border border-white/5'
                    : 'bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/15'
                }`}
              >
                {isMinting ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-neon-green border-t-transparent"></div>
                    <span>Minting...</span>
                  </span>
                ) : dailyMinted >= DAILY_LIMIT ? (
                  'Limit Reached (10/10)'
                ) : (
                  `Mint 1 BTK (${dailyMinted}/10)`
                )}
              </motion.button>
            </div>

            {/* Success Message */}
            <AnimatePresence>
              {mintSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-neon-green/10 border border-neon-green/30 rounded-xl text-center mb-6"
                >
                  <div className="text-sm font-medium text-neon-green mb-1">
                    Successfully Minted {mintedAmount} Tokens
                  </div>
                  <p className="text-xs text-gray-400">
                    New balance: {battleTokenBalance} tokens
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Section */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-sm font-medium text-gray-300 mb-3 tracking-wide">How It Works</h3>
              <ul className="text-xs text-gray-400 space-y-2">
                <li>• You can mint up to 10 battle tokens per day</li>
                <li>• Tokens are earned by winning battles</li>
                <li>• Use tokens to mint NFTs when you reach 1000 tokens</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
