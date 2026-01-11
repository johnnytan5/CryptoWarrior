'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useCurrentAccount } from '@onelabs/dapp-kit';
import { getProfile, mintNFT } from '@/utils/api';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ProfilePage() {
  const currentAccount = useCurrentAccount();
  const { battleTokenBalance, refreshBalance, profile, setProfile } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [isMintingNFT, setIsMintingNFT] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (currentAccount) {
        setIsLoading(true);
        try {
          // Refresh balance from blockchain
          await refreshBalance();
          
          // Load profile data (mock for now)
          const profileData = await getProfile(currentAccount.address);
          setProfile(profileData);
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadProfile();
  }, [currentAccount, setProfile, refreshBalance]);

  const handleMintNFT = async () => {
    if (battleTokenBalance < 1000) {
      alert('You need at least 1000.00 OCT to mint an NFT!');
      return;
    }

    setIsMintingNFT(true);
    try {
      const result = await mintNFT();
      if (result.success && profile) {
        setProfile({
          ...profile,
          nfts: result.nftCount,
        });
        // Refresh balance from backend after NFT mint
        await refreshBalance();
        setMintSuccess(true);
        setTimeout(() => setMintSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error minting NFT:', error);
      alert('Failed to mint NFT. Please try again.');
    } finally {
      setIsMintingNFT(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-dark-bg py-12 px-4 relative">
          <div className="max-w-2xl mx-auto text-center relative z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-neon-cyan border-t-transparent mx-auto"></div>
            <p className="mt-4 text-sm text-gray-400">Loading profile...</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  const totalBattles = (profile?.wins || 0) + (profile?.losses || 0);
  const winRate = totalBattles > 0 ? ((profile?.wins || 0) / totalBattles) * 100 : 0;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-dark-bg py-12 px-4 relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl font-light text-neon-cyan tracking-wide mb-3">
              Your Profile
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect border border-white/10 rounded-2xl p-8"
          >
            {/* Wallet Address */}
            <div className="mb-10 pb-8 border-b border-white/10">
              <div className="text-xs text-gray-400 mb-3 tracking-wide">Wallet Address</div>
              <div className="font-mono text-sm bg-white/5 p-4 rounded-xl break-all border border-white/10 text-gray-300">
                {currentAccount?.address}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="text-center p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-3xl font-light text-neon-cyan mb-2 tabular-nums">
                  {totalBattles}
                </div>
                <div className="text-xs text-gray-400 tracking-wide">Total Battles</div>
              </div>
              <div className="text-center p-6 bg-white/5 border border-neon-green/10 rounded-xl">
                <div className="text-3xl font-light text-neon-green mb-2 tabular-nums">
                  {profile?.wins || 0}
                </div>
                <div className="text-xs text-gray-400 tracking-wide">Wins</div>
              </div>
              <div className="text-center p-6 bg-white/5 border border-red-500/10 rounded-xl">
                <div className="text-3xl font-light text-red-400 mb-2 tabular-nums">
                  {profile?.losses || 0}
                </div>
                <div className="text-xs text-gray-400 tracking-wide">Losses</div>
              </div>
              <div className="text-center p-6 bg-white/5 border border-neon-purple/10 rounded-xl">
                <div className="text-3xl font-light text-neon-purple mb-2 tabular-nums">
                  {winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 tracking-wide">Win Rate</div>
              </div>
            </div>

            {/* OCT Balance */}
            <div className="mb-8 p-6 bg-gradient-to-br from-neon-green/5 to-neon-cyan/5 border border-neon-green/20 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-400 mb-2 tracking-wide">OCT Balance</div>
                  <div className="text-3xl font-light text-neon-green tabular-nums">
                    {battleTokenBalance.toFixed(2)} OCT
                  </div>
                </div>
              </div>
            </div>

            {/* NFT Section */}
            <div className="p-6 bg-gradient-to-br from-neon-purple/5 to-neon-pink/5 border border-neon-purple/20 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-xs text-gray-400 mb-2 tracking-wide">Minted NFTs</div>
                  <div className="text-3xl font-light text-neon-purple tabular-nums">
                    {profile?.nfts || 0}
                  </div>
                </div>
              </div>
              <div>
                <motion.button
                  onClick={handleMintNFT}
                  disabled={isMintingNFT || battleTokenBalance < 1000}
                  whileHover={battleTokenBalance >= 1000 ? { scale: 1.02 } : {}}
                  whileTap={battleTokenBalance >= 1000 ? { scale: 0.98 } : {}}
                  className={`w-full px-6 py-3 rounded-xl font-medium transition-all text-sm tracking-wide ${
                    isMintingNFT || battleTokenBalance < 1000
                      ? 'bg-white/5 cursor-not-allowed text-gray-600 border border-white/5'
                      : 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/15'
                  }`}
                >
                  {isMintingNFT ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-neon-purple border-t-transparent"></div>
                      <span>Minting NFT...</span>
                    </span>
                  ) : (
                    'Mint Cat Warrior NFT (1000 OCT)'
                  )}
                </motion.button>
                {battleTokenBalance < 1000 && (
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Need {(1000 - battleTokenBalance).toFixed(2)} OCT more to mint an NFT
                  </p>
                )}
                {mintSuccess && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 bg-neon-green/10 border border-neon-green/30 rounded-xl text-center"
                  >
                    <p className="text-sm text-neon-green font-medium">
                      NFT Minted Successfully! You Now Have {profile?.nfts || 0} NFTs
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
