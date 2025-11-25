'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BattleCountdownProps {
  duration: number;
  onComplete: () => void;
}

export default function BattleCountdown({ duration, onComplete }: BattleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [currentPoll, setCurrentPoll] = useState(0);
  const totalPolls = 12;  // Changed from 6 to 12 to match actual polling

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const pollInterval = setInterval(() => {
      setCurrentPoll((prev) => {
        if (prev < totalPolls - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 5000);  // Changed from 10000 to 5000 to match actual 5-second polling

    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
    };
  }, [timeLeft, onComplete, totalPolls]);

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full glass-effect border border-white/10 rounded-xl p-6 mb-6 hover-lift"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-300 tracking-wide">Battle in Progress</h3>
          <motion.div
            key={timeLeft}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-semibold text-neon-cyan tabular-nums"
          >
            {timeLeft}s
          </motion.div>
        </div>
        <div className="w-full bg-white/5 rounded-full h-2 mb-4 border border-white/10 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 tracking-wide">
          <motion.span
            key={currentPoll}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2"
          >
            <span>Poll {currentPoll + 1} of {totalPolls}</span>
            {currentPoll > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-1.5 h-1.5 bg-neon-green rounded-full"
              />
            )}
          </motion.span>
          <span>{timeLeft}s remaining</span>
        </div>
        <AnimatePresence mode="wait">
          {currentPoll > 0 && (
            <motion.div
              key={currentPoll}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="mt-4 text-center"
            >
              <div className="text-xs text-neon-green font-medium">
                Price Update #{currentPoll} Received
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
