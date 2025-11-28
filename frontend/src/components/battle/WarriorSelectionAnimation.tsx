'use client';

import { useState, useEffect, useRef } from 'react';
import { Coin } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface WarriorSelectionAnimationProps {
  userCoin: Coin;
  allCoins: Coin[];
  onComplete: (computerCoin: Coin) => void;
}

export default function WarriorSelectionAnimation({
  userCoin,
  allCoins,
  onComplete,
}: WarriorSelectionAnimationProps) {
  const [phase, setPhase] = useState<'shuffling' | 'stopping' | 'complete'>('shuffling');
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [availableCoins] = useState(() => allCoins.filter(c => c.symbol !== userCoin.symbol));
  const onCompleteRef = useRef(onComplete);

  // Update ref when callback changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    console.log('🎰 Animation started');
    
    // Pre-select the final coin
    const finalCoinIndex = Math.floor(Math.random() * availableCoins.length);
    const finalCoin = availableCoins[finalCoinIndex];
    
    // Create spinning sound
    let sound: { oscillator: OscillatorNode; gainNode: GainNode; audioContext: AudioContext } | null = null;
    let tickInterval: NodeJS.Timeout | null = null;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      sound = { oscillator, gainNode, audioContext };
      oscillator.start();
      
      // Tick sounds
      tickInterval = setInterval(() => {
        try {
          const tickContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const tickOsc = tickContext.createOscillator();
          const tickGain = tickContext.createGain();
          
          tickOsc.connect(tickGain);
          tickGain.connect(tickContext.destination);
          tickOsc.frequency.value = 1200;
          tickOsc.type = 'square';
          tickGain.gain.value = 0.05;
          tickOsc.start();
          tickOsc.stop(tickContext.currentTime + 0.05);
        } catch (e) {
          // Ignore tick sound errors
        }
      }, 100);
    } catch (e) {
      console.error('Audio error:', e);
    }

    // Animate using setInterval for more predictable timing
    const startTime = Date.now();
    const duration = 1800;
    const initialSpeed = 50;
    
    const animationInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 0.85) {
        setPhase('shuffling');
        const speed = initialSpeed * (1 - progress * 0.3);
        setScrollOffset(prev => prev + speed);
      } else if (progress < 1) {
        setPhase('stopping');
        const decelerationProgress = (progress - 0.85) / 0.15;
        const speed = initialSpeed * 0.7 * (1 - decelerationProgress);
        setScrollOffset(prev => prev + speed);
      }
    }, 16); // ~60fps

    // Force stop after exact duration
    const stopTimeout = setTimeout(() => {
      console.log('🎰 Animation complete');
      clearInterval(animationInterval);
      
      setPhase('complete');
      setSelectedCoin(finalCoin);
      
      // Stop sounds
      if (sound) {
        try {
          sound.gainNode.gain.exponentialRampToValueAtTime(0.01, sound.audioContext.currentTime + 0.1);
          sound.oscillator.stop(sound.audioContext.currentTime + 0.1);
        } catch (e) {
          // Already stopped
        }
      }
      if (tickInterval) clearInterval(tickInterval);
      
      // Completion sound
      try {
        const completeContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const completeOsc = completeContext.createOscillator();
        const completeGain = completeContext.createGain();
        completeOsc.connect(completeGain);
        completeGain.connect(completeContext.destination);
        completeOsc.frequency.value = 600;
        completeOsc.type = 'sine';
        completeGain.gain.value = 0.15;
        completeOsc.start();
        completeOsc.stop(completeContext.currentTime + 0.2);
      } catch (e) {
        // Ignore
      }
      
      // Call completion callback after showing result
      setTimeout(() => {
        console.log('🎰 Calling onComplete');
        onCompleteRef.current(finalCoin);
      }, 2000); // Wait 2 seconds to show the result
    }, duration);

    // Cleanup
    return () => {
      console.log('🎰 Animation cleanup');
      clearInterval(animationInterval);
      clearTimeout(stopTimeout);
      if (sound) {
        try {
          sound.oscillator.stop();
        } catch (e) {
          // Already stopped
        }
      }
      if (tickInterval) clearInterval(tickInterval);
    };
  }, []); // Run once on mount - availableCoins is stable, onComplete uses ref
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Calculate which coins to show in the viewport
  const coinHeight = 100; // Height of each coin slot
  const visibleCoins = 5;
  const currentIndex = Math.floor(scrollOffset / coinHeight) % availableCoins.length;
  
  const getVisibleCoins = () => {
    const coins = [];
    for (let i = -2; i < visibleCoins; i++) {
      const index = (currentIndex + i + availableCoins.length * 100) % availableCoins.length;
      coins.push(availableCoins[index]);
    }
    return coins;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="max-w-5xl w-full mx-auto p-8">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-center text-neon-cyan mb-12 tracking-wider"
        >
          {phase === 'complete' ? 'WARRIORS SELECTED!' : 'SELECTING WARRIORS...'}
        </motion.h2>

        <div className="grid grid-cols-2 gap-12">
          {/* User's Coin - Static */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="text-sm text-gray-400 mb-4 tracking-wide">YOUR WARRIOR</div>
            <motion.div
              animate={phase === 'complete' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-neon-cyan/50 shadow-2xl shadow-neon-cyan/50">
                <img
                  src={userCoin.image}
                  alt={userCoin.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-transparent rounded-full" />
            </motion.div>
            <div className="mt-6 text-center">
              <p className="text-2xl font-bold text-neon-cyan">{userCoin.symbol}</p>
              <p className="text-sm text-gray-400 mt-1">{userCoin.name}</p>
              {userCoin.current_price && (
                <p className="text-xs text-gray-500 mt-2">
                  ${userCoin.current_price.toLocaleString()}
                </p>
              )}
            </div>
          </motion.div>

          {/* Computer's Coin - Shuffling */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="text-sm text-gray-400 mb-4 tracking-wide">
              {phase === 'complete' ? 'COMPUTER WARRIOR' : 'COMPUTER SELECTING...'}
            </div>
            
            <div className="relative w-40 h-40 overflow-hidden">
              {/* Slot machine container */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full ring-4 ring-neon-purple/50 shadow-2xl shadow-neon-purple/50 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {phase === 'complete' && selectedCoin ? (
                      <motion.img
                        key="final"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        src={selectedCoin.image}
                        alt={selectedCoin.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <motion.div
                        key="shuffling"
                        className="relative w-full h-full"
                        style={{
                          filter: phase === 'stopping' ? 'blur(2px)' : 'blur(4px)',
                        }}
                      >
                        {getVisibleCoins().map((coin, index) => (
                          <motion.div
                            key={`${coin.id}-${index}`}
                            className="absolute inset-0"
                            style={{
                              top: `${(index - 2) * coinHeight - (scrollOffset % coinHeight)}px`,
                            }}
                          >
                            <img
                              src={coin.image}
                              alt={coin.name}
                              className="w-full h-full object-cover"
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Glow effects */}
              {phase !== 'complete' && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
                </>
              )}
            </div>

            {selectedCoin && phase === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-center"
              >
                <p className="text-2xl font-bold text-neon-purple">{selectedCoin.symbol}</p>
                <p className="text-sm text-gray-400 mt-1">{selectedCoin.name}</p>
                {selectedCoin.current_price && (
                  <p className="text-xs text-gray-500 mt-2">
                    ${selectedCoin.current_price.toLocaleString()}
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* VS Badge */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border-2 border-white/20 rounded-full w-20 h-20 flex items-center justify-center">
            <motion.span
              animate={phase !== 'complete' ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-2xl font-bold text-white"
            >
              VS
            </motion.span>
          </div>
        </motion.div>

        {/* Loading indicator */}
        {phase !== 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center space-x-2 text-gray-400">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-neon-cyan rounded-full"
              />
              <span className="text-sm">Preparing battle arena...</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

