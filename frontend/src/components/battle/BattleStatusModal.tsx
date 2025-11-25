'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface BattleStatusModalProps {
  status: 'staking' | 'waiting-join' | 'ready' | 'finalizing' | null;
  onClose?: () => void;
}

export default function BattleStatusModal({ status, onClose }: BattleStatusModalProps) {
  if (!status) return null;

  const statusConfig = {
    staking: {
      title: 'Staking Tokens',
      message: 'Please sign the transaction in your wallet to stake your tokens',
      showClose: false,
    },
    'waiting-join': {
      title: 'Waiting for Opponent',
      message: 'Computer is joining the battle and staking tokens',
      showClose: false,
    },
    ready: {
      title: 'Battle Ready',
      message: 'Both players have staked. Starting battle...',
      showClose: false,
    },
    finalizing: {
      title: 'Finalizing Battle',
      message: 'Transferring tokens to the winner',
      showClose: false,
    },
  };

  const config = statusConfig[status];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="glass-effect border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 text-center relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative z-10">
            {/* Loading Spinner */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 rounded-full border-2 border-white/5"
                >
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-cyan"
                  />
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-neon-cyan/50" />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-light text-neon-cyan mb-3 tracking-wider"
            >
              {config.title}
            </motion.h2>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-gray-400 tracking-wide leading-relaxed max-w-sm mx-auto"
            >
              {config.message}
            </motion.p>

            {/* Progress Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex justify-center space-x-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Background Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent pointer-events-none" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

