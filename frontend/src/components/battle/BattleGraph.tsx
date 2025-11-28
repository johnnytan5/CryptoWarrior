'use client';

import { useEffect, useState, useRef } from 'react';
import ChartComponent from '@/components/global/ChartComponent';
import { getLivePrice, finalizeBattle } from '@/utils/api';
import { PricePoint, Coin } from '@/types';
import { motion } from 'framer-motion';

interface BattleGraphProps {
  userCoin: Coin;
  botCoin: Coin;
  onBattleComplete: (
    winner: 'user' | 'bot', 
    tokensAwarded: number,
    userStartPrice: number,
    botStartPrice: number,
    userEndPrice: number,
    botEndPrice: number
  ) => void;
}

export default function BattleGraph({ userCoin, botCoin, onBattleComplete }: BattleGraphProps) {
  const [userData, setUserData] = useState<PricePoint[]>([]);
  const [botData, setBotData] = useState<PricePoint[]>([]);
  const [userStartPrice, setUserStartPrice] = useState<number>(0);
  const [botStartPrice, setBotStartPrice] = useState<number>(0);
  const [isPolling, setIsPolling] = useState(false);
  const [currentPoll, setCurrentPoll] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const battleStartedRef = useRef(false);
  const battleFinalizedRef = useRef(false);

  // Finalize battle when we have 13 data points (1 initial + 12 polls = 60 seconds)
  useEffect(() => {
    if (userData.length === 13 && botData.length === 13 && isPolling && !battleFinalizedRef.current) {
      console.log(`🏁 Battle complete! Data points: user=${userData.length}, bot=${botData.length}`);
      console.log(`⏱️ Time elapsed: ~${(userData.length - 1) * 5}s`);
      battleFinalizedRef.current = true;
      
      // Stop polling immediately
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      const finalize = async () => {
        const result = await finalizeBattle({
          userCoin: userCoin.symbol,
          botCoin: botCoin.symbol,
          userData,
          botData,
        });
        
        // Get final prices
        const userFinalPrice = userData[userData.length - 1]?.price || userStartPrice;
        const botFinalPrice = botData[botData.length - 1]?.price || botStartPrice;
        
        setIsPolling(false);
        onBattleComplete(
          result.winner, 
          result.tokensAwarded,
          userStartPrice,
          botStartPrice,
          userFinalPrice,
          botFinalPrice
        );
      };
      finalize();
    }
  }, [userData, botData, userCoin, botCoin, isPolling, onBattleComplete]);

  const startBattle = async () => {
    console.log('\n🎮 === BATTLE STARTING ===');
    console.log('🎮 User coin object:', JSON.stringify(userCoin));
    console.log('🎮 Bot coin object:', JSON.stringify(botCoin));
    console.log(`🎮 User: ${userCoin.symbol} (ID: ${userCoin.id})`);
    console.log(`🎮 Bot: ${botCoin.symbol} (ID: ${botCoin.id})`);
    console.log('🎮 Expected duration: 60 seconds (1 initial + 12 polls at 5s intervals)');
    
    // Validate coins have required fields
    if (!userCoin.id || !botCoin.id) {
      console.error('❌ CRITICAL: Coins missing ID field!');
      console.error('User coin:', userCoin);
      console.error('Bot coin:', botCoin);
      throw new Error('Invalid coin objects - missing ID field');
    }
    
    setIsPolling(true);
    setCurrentPoll(0);
    setUserData([]);
    setBotData([]);

    // Get initial prices (t=0)
    console.log('🎯 Fetching initial prices for', userCoin.symbol, 'and', botCoin.symbol);
    console.log('🎯 Binance symbols:', userCoin.binance_symbol, 'and', botCoin.binance_symbol);
    const userInitial = await getLivePrice(userCoin.binance_symbol);
    const botInitial = await getLivePrice(botCoin.binance_symbol);
    
    console.log(`📊 t=0s: Initial prices - ${userCoin.symbol}: $${userInitial.price}, ${botCoin.symbol}: $${botInitial.price}`);
    setUserStartPrice(userInitial.price);
    setBotStartPrice(botInitial.price);
    setUserData([userInitial]);
    setBotData([botInitial]);
    console.log(`📈 Data points added: user=1, bot=1`);

    // Poll every 5 seconds for 60 seconds (12 more polls after initial = 13 total)
    let pollCount = 0;
    const startTime = Date.now();
    pollIntervalRef.current = setInterval(async () => {
      pollCount++;
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setCurrentPoll(pollCount);

      console.log(`\n🔔 Poll ${pollCount}/12 triggered at t=${elapsedSeconds}s (expected t=${pollCount * 5}s)`);

      // Fetch new prices from Binance
      try {
        const [userPrice, botPrice] = await Promise.all([
          getLivePrice(userCoin.binance_symbol),
          getLivePrice(botCoin.binance_symbol),
        ]);
        
        console.log(`📈 Poll ${pollCount}: ${userCoin.symbol}=$${userPrice.price}, ${botCoin.symbol}=$${botPrice.price}`);
        
        setUserData((prev) => {
          console.log(`📊 Adding user data point ${prev.length + 1}`);
          return [...prev, userPrice];
        });
        setBotData((prev) => {
          console.log(`📊 Adding bot data point ${prev.length + 1}`);
          return [...prev, botPrice];
        });
      } catch (error) {
        console.error(`❌ Poll ${pollCount} failed:`, error);
      }

      if (pollCount >= 12) {
        // Last poll (12 polls * 5 seconds = 60 seconds)
        console.log('⏹️ Reached 12 polls, clearing interval');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }, 5000); // Poll every 5 seconds
  };

  useEffect(() => {
    // Only start battle once
    if (userCoin && botCoin && !battleStartedRef.current) {
      console.log('🎮 Battle starting (first time only)');
      battleStartedRef.current = true;
      startBattle();
    }
    
    return () => {
      console.log('🧹 Cleanup: clearing interval');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return (
    <div className="w-full space-y-6">
      
      {userData.length > 0 && botData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ChartComponent
            userData={userData}
            botData={botData}
            userCrypto={userCoin.symbol}
            botCrypto={botCoin.symbol}
            userStartPrice={userStartPrice}
            botStartPrice={botStartPrice}
          />
        </motion.div>
      )}
    </div>
  );
}
