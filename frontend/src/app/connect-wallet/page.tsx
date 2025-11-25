'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, ConnectModal } from '@onelabs/dapp-kit';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConnectWalletPage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (currentAccount) {
      setShowSuccessModal(true);
      
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentAccount, router]);

  return (
    <main className="min-h-screen bg-dark-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/3 via-transparent to-neon-purple/3"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-md w-full mx-4"
      >
        <h1 className="text-3xl font-light text-neon-cyan tracking-wide mb-3">
          Crypto Battle Arena
        </h1>
        <p className="text-sm text-gray-400 tracking-wide mb-12">
          Connect your wallet to begin
        </p>

        <ConnectModal
          trigger={
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full px-8 py-4 text-sm font-medium rounded-xl transition-all tracking-wide bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/15"
            >
              Connect Wallet
            </motion.button>
          }
        />

        <p className="text-xs text-gray-500 mt-6">
          Sui wallet required (testnet)
        </p>
      </motion.div>

      <AnimatePresence>
        {showSuccessModal && currentAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass-effect border border-neon-green/30 rounded-2xl p-10 max-w-md w-full mx-4 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 mx-auto mb-6 border-2 border-neon-green rounded-full flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              <h2 className="text-2xl font-light text-neon-green tracking-wide mb-6">
                Connected
              </h2>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                <p className="text-xs text-gray-400 mb-2">Wallet Address</p>
                <p className="text-xs font-mono text-gray-300 break-all">
                  {currentAccount.address}
                </p>
              </div>
              
              <p className="text-xs text-gray-400">
                Redirecting to battle arena...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
