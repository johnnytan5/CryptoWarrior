'use client';

import { useState, useEffect } from 'react';
import { Coin } from '@/types';
import { getTop30Coins } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

interface WarriorSelectorProps {
  selectedWarrior: Coin | null;
  onSelect: (warrior: Coin) => void;
}

export default function WarriorSelector({ selectedWarrior, onSelect }: WarriorSelectorProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCoin, setHoveredCoin] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoins = async () => {
      console.log('🎯 WarriorSelector: Fetching coins...');
      const topCoins = await getTop30Coins();
      console.log(`🎯 WarriorSelector: Received ${topCoins.length} coins`);
      if (topCoins.length > 0) {
        console.log('🎯 WarriorSelector: First coin sample:', JSON.stringify(topCoins[0]));
      }
      setCoins(topCoins);
      setLoading(false);
    };
    fetchCoins();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="inline-flex items-center space-x-3 text-gray-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"
          ></motion.div>
          <span className="text-sm tracking-wide">Loading warriors...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      <motion.label
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="block text-sm font-medium mb-6 text-gray-300 tracking-wide"
      >
        Select Your Warrior
      </motion.label>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {coins.map((coin, index) => (
          <motion.button
            key={coin.id || coin.symbol}
            onClick={() => {
              console.log('🎯 WarriorSelector: Coin selected:', JSON.stringify(coin));
              onSelect(coin);
            }}
            onMouseEnter={() => setHoveredCoin(coin.symbol)}
            onMouseLeave={() => setHoveredCoin(null)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.015, type: 'spring', stiffness: 300 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`p-4 rounded-xl border transition-all relative overflow-hidden group ${
              selectedWarrior?.symbol === coin.symbol
                ? 'border-neon-cyan/50 bg-neon-cyan/10 shadow-lg shadow-neon-cyan/20'
                : hoveredCoin === coin.symbol
                ? 'border-white/30 bg-white/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            {/* Glow effect on hover */}
            {selectedWarrior?.symbol === coin.symbol && (
              <motion.div
                layoutId="selectedGlow"
                className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-transparent rounded-xl"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Coin Image */}
              <div className={`w-12 h-12 mb-2 rounded-full overflow-hidden ring-2 transition-all ${
                selectedWarrior?.symbol === coin.symbol 
                  ? 'ring-neon-cyan/50 shadow-lg shadow-neon-cyan/30' 
                  : 'ring-white/10 group-hover:ring-white/30'
              }`}>
                <img 
                  src={coin.image} 
                  alt={coin.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              
              {/* Symbol */}
              <div className={`text-xs font-bold mb-0.5 transition-colors ${
                selectedWarrior?.symbol === coin.symbol ? 'text-neon-cyan' : 'text-gray-300 group-hover:text-white'
              }`}>
                {coin.symbol}
              </div>
              
              {/* Name */}
              <div className="text-[10px] text-gray-500 truncate w-full text-center">
                {coin.name}
              </div>
              
              {/* Market Cap Rank Badge */}
              {coin.market_cap_rank && coin.market_cap_rank <= 10 && (
                <div className="absolute top-2 right-2 bg-neon-cyan/20 text-neon-cyan text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-neon-cyan/30">
                  #{coin.market_cap_rank}
                </div>
              )}
            </div>
            
            {/* Selection indicator */}
            {hoveredCoin === coin.symbol && selectedWarrior?.symbol !== coin.symbol && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-2 right-2 w-2 h-2 bg-neon-cyan rounded-full"
              />
            )}
          </motion.button>
        ))}
      </div>
      
      <AnimatePresence>
        {selectedWarrior && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 p-6 bg-gradient-to-br from-neon-cyan/10 to-neon-cyan/5 border border-neon-cyan/30 rounded-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative z-10 flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-neon-cyan/50 shadow-lg shadow-neon-cyan/20">
                <img 
                  src={selectedWarrior.image} 
                  alt={selectedWarrior.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Selected Warrior</p>
                <p className="text-lg font-semibold text-neon-cyan">{selectedWarrior.name}</p>
                <p className="text-sm text-gray-400">{selectedWarrior.symbol}</p>
                {selectedWarrior.current_price && (
                  <p className="text-xs text-gray-500 mt-1">
                    ${selectedWarrior.current_price.toLocaleString()}
                  </p>
                )}
              </div>
              {selectedWarrior.price_change_percentage_24h !== undefined && (
                <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  selectedWarrior.price_change_percentage_24h >= 0
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {selectedWarrior.price_change_percentage_24h >= 0 ? '+' : ''}
                  {selectedWarrior.price_change_percentage_24h.toFixed(2)}%
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
