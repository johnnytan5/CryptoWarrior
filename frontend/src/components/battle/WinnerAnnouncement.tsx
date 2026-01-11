'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coin } from '@/types';

interface WinnerAnnouncementProps {
  winner: 'user' | 'bot';
  tokensAwarded: number;
  wagerAmount: number;
  userCoin: Coin;
  botCoin: Coin;
  userStartPrice: number;
  botStartPrice: number;
  userEndPrice: number;
  botEndPrice: number;
  onClose: () => void;
}

export default function WinnerAnnouncement({ 
  winner, 
  tokensAwarded, 
  wagerAmount, 
  userCoin,
  botCoin,
  userStartPrice,
  botStartPrice,
  userEndPrice,
  botEndPrice,
  onClose 
}: WinnerAnnouncementProps) {
  const isWin = winner === 'user';

  // Calculate percentage changes
  const userChange = userStartPrice > 0 
    ? ((userEndPrice - userStartPrice) / userStartPrice) * 100 
    : 0;
  const botChange = botStartPrice > 0 
    ? ((botEndPrice - botStartPrice) / botStartPrice) * 100 
    : 0;

  useEffect(() => {
    if (isWin) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ffff', '#b026ff', '#ff00ff', '#00ff41'],
      });
    }
  }, [isWin]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-effect border border-white/20 rounded-2xl p-10 max-w-md w-full mx-4 text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10">
          {isWin ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-5xl font-light text-neon-green mb-6"
              >
                Victory
              </motion.div>
              <h2 className="text-lg font-medium text-gray-300 tracking-wide mb-6">
                You won the battle
              </h2>
              
              {/* Coin Selection Info */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-xs text-gray-400 mb-3 text-center">Warriors</div>
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <img src={userCoin.image} alt={userCoin.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="text-sm font-semibold text-neon-cyan">{userCoin.symbol}</div>
                      <div className="text-xs text-gray-500">{userCoin.name}</div>
                    </div>
                  </div>
                  <div className="text-gray-600">VS</div>
                  <div className="flex items-center space-x-2">
                    <img src={botCoin.image} alt={botCoin.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="text-sm font-semibold text-neon-purple">{botCoin.symbol}</div>
                      <div className="text-xs text-gray-500">{botCoin.name}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="text-xs text-gray-400 mb-2 text-center">60-Second Performance</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Your {userCoin.symbol}</div>
                    <div className={`text-lg font-semibold ${userChange >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                      {userChange >= 0 ? '+' : ''}{userChange.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ${userStartPrice.toFixed(2)} → ${userEndPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Bot {botCoin.symbol}</div>
                    <div className={`text-lg font-semibold ${botChange >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                      {botChange >= 0 ? '+' : ''}{botChange.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ${botStartPrice.toFixed(2)} → ${botEndPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Wager Info */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">Wagered</span>
                  <span className="text-sm text-gray-300 tabular-nums">{wagerAmount.toFixed(2)} OCT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Winnings</span>
                  <span className="text-sm text-neon-green font-semibold tabular-nums">+{tokensAwarded.toFixed(2)} OCT</span>
                </div>
              </div>

              {/* Total Won */}
              <div className="inline-flex items-center space-x-2 bg-neon-green/10 border border-neon-green/30 rounded-lg px-6 py-3 mb-2">
                <span className="text-sm text-gray-400">Total Won</span>
                <span className="text-2xl font-semibold text-neon-green tabular-nums">+{tokensAwarded.toFixed(2)} OCT</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl font-light text-red-400 mb-6">Defeat</div>
              <h2 className="text-lg font-medium text-gray-300 tracking-wide mb-6">
                Battle lost
              </h2>
              
              {/* Coin Selection Info */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-xs text-gray-400 mb-3 text-center">Warriors</div>
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <img src={userCoin.image} alt={userCoin.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="text-sm font-semibold text-neon-cyan">{userCoin.symbol}</div>
                      <div className="text-xs text-gray-500">{userCoin.name}</div>
                    </div>
                  </div>
                  <div className="text-gray-600">VS</div>
                  <div className="flex items-center space-x-2">
                    <img src={botCoin.image} alt={botCoin.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="text-sm font-semibold text-neon-purple">{botCoin.symbol}</div>
                      <div className="text-xs text-gray-500">{botCoin.name}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <div className="text-xs text-gray-400 mb-2 text-center">60-Second Performance</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Your {userCoin.symbol}</div>
                    <div className={`text-lg font-semibold ${userChange >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                      {userChange >= 0 ? '+' : ''}{userChange.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ${userStartPrice.toFixed(2)} → ${userEndPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Bot {botCoin.symbol}</div>
                    <div className={`text-lg font-semibold ${botChange >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                      {botChange >= 0 ? '+' : ''}{botChange.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ${botStartPrice.toFixed(2)} → ${botEndPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Loss Info */}
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Wagered</span>
                  <span className="text-sm text-gray-300 tabular-nums">{wagerAmount.toFixed(2)} OCT</span>
                </div>
              </div>

              {/* Total Lost */}
              <div className="inline-flex items-center space-x-2 bg-red-500/10 border border-red-500/30 rounded-lg px-6 py-3 mb-4">
                <span className="text-sm text-gray-400">Total Lost</span>
                <span className="text-2xl font-semibold text-red-400 tabular-nums">-{wagerAmount.toFixed(2)} OCT</span>
              </div>
              
              <p className="text-xs text-gray-400 mt-4">
                Try again and claim victory
              </p>
            </>
          )}
          <button
            onClick={onClose}
            className="mt-8 px-8 py-3 bg-white/5 text-gray-300 border border-white/10 rounded-lg font-medium tracking-wide hover:bg-white/10 transition-all"
          >
            Continue
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
