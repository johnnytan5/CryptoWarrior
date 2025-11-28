'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { useApp } from '@/context/AppContext';
import WarriorSelector from '@/components/battle/WarriorSelector';
import WarriorSelectionAnimation from '@/components/battle/WarriorSelectionAnimation';
import BattleGraph from '@/components/battle/BattleGraph';
import WinnerAnnouncement from '@/components/battle/WinnerAnnouncement';
import BattleStatusModal from '@/components/battle/BattleStatusModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import { startBattle, getTop30Coins } from '@/utils/api';
import { Coin } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/utils/constants';

type UserCoin = {
  object_id: string;
  balance: number;
};

type UserBalanceData = {
  total_balance: number;
  coins: UserCoin[];
};

// Configuration (same as test-battle page)
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8';
const COMPUTER_ADDRESS = process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS || '0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9';

export default function Home() {
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  const {
    selectedWarrior,
    setSelectedWarrior,
    botSelectedWarrior,
    setBotSelectedWarrior,
    battleProgress,
    setBattleProgress,
    battleTokenBalance,
    refreshBalance,
  } = useApp();

  // Use custom execute function to get object changes
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
          showEffects: true,
        },
      }),
  });

  const [isBattleActive, setIsBattleActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showSelectionAnimation, setShowSelectionAnimation] = useState(false);
  const [allCoins, setAllCoins] = useState<Coin[]>([]);
  const [wagerAmount, setWagerAmount] = useState<number>(0);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [battleStatus, setBattleStatus] = useState<'idle' | 'staking' | 'waiting-join' | 'ready' | 'active' | 'finalizing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<{
    winner: 'user' | 'bot';
    tokensAwarded: number;
    wagerAmount: number;
    userCoin: Coin;
    botCoin: Coin;
    userStartPrice: number;
    botStartPrice: number;
    userEndPrice: number;
    botEndPrice: number;
  } | null>(null);

  const handleWagerChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setWagerAmount(Math.min(Math.max(0, numValue), battleTokenBalance));
  };

  const handleStartBattle = async () => {
    if (!currentAccount?.address) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!selectedWarrior) {
      alert('Please select a warrior first!');
      return;
    }

    if (wagerAmount <= 0) {
      alert('Please enter a wager amount!');
      return;
    }

    if (wagerAmount > battleTokenBalance) {
      alert('Insufficient battle tokens!');
      return;
    }

    setError(null);
    setIsStarting(true);
    setBattleStatus('staking');

    try {
      // Ensure wallet is connected and ready
      if (!currentAccount?.address) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Small delay to ensure wallet extension is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Convert BTK to raw units (9 decimals)
      const stakeAmount = Math.floor(wagerAmount * 1_000_000_000);

      // Step 1: Get user's coin objects
      const balanceResponse = await fetch(`${API_BASE_URL}/api/users/${currentAccount.address}/balance`);
      if (!balanceResponse.ok) {
        throw new Error('Failed to fetch balance');
      }
      const balanceData: UserBalanceData = await balanceResponse.json();
      
      // Check total balance
      if (balanceData.total_balance < stakeAmount) {
        throw new Error(`Insufficient balance. Required: ${wagerAmount} BTK, Available: ${balanceData.total_balance / 1_000_000_000} BTK`);
      }
      
      if (balanceData.coins.length === 0) {
        throw new Error('No coins found. Please mint some battle tokens first.');
      }
      
      // Step 2: Build transaction for creating battle
      const tx = new Transaction();
      
      // Find a coin with sufficient balance
      let coinToUse = balanceData.coins.find((coin) => coin.balance >= stakeAmount);
      
      let stakeCoin;
      
      if (!coinToUse) {
        // No single coin has enough - merge all coins into the first one
        const firstCoin = balanceData.coins[0];
        const otherCoins = balanceData.coins.slice(1);
        
        if (otherCoins.length > 0) {
          // Merge all other coins into the first coin
          // After merge, firstCoin will have total_balance
          tx.mergeCoins(
            tx.object(firstCoin.object_id),
            otherCoins.map((coin) => tx.object(coin.object_id))
          );
        }
        
        // After merging, the first coin will have the total balance
        // Since total_balance >= stakeAmount (we checked above), we can use it
        coinToUse = firstCoin;
      }
      
      // Reference to the coin we'll use (after potential merge)
      const coinRef = tx.object(coinToUse.object_id);
      
      // If the coin has more than needed (or will have after merge), split it
      // After merge, coinToUse will have total_balance, so we check that
      const finalBalance = coinToUse.balance >= stakeAmount 
        ? coinToUse.balance 
        : balanceData.total_balance;
      
      if (finalBalance > stakeAmount) {
        // Split the exact amount needed
        const [splitCoin] = tx.splitCoins(coinRef, [stakeAmount]);
        stakeCoin = splitCoin;
      } else {
        // Exact amount - use the coin directly
        stakeCoin = coinRef;
      }

      // Call create_battle function (same as test-battle)
      tx.moveCall({
        target: `${PACKAGE_ID}::battle::create_battle`,
        arguments: [
          stakeCoin,
          tx.pure.address(COMPUTER_ADDRESS), // opponent
          tx.pure.address(currentAccount.address), // admin (treasury)
        ],
      });

      // Step 3: User signs and executes transaction
      // Wrap in try-catch to handle extension errors gracefully
      try {
        signAndExecuteTransaction(
          {
            transaction: tx,
            chain: 'sui:testnet',
          },
          {
            onSuccess: async (result) => {
              try {
                console.log('Battle creation transaction successful:', {
                  digest: result.digest,
                  objectChanges: result.objectChanges?.length || 0,
                });
            
                // Extract battle_id from object changes
                const battleObject = result.objectChanges?.find(
                  (change: any) => change.type === 'created' && change.objectType?.includes('battle::Battle')
                );
                
                if (!battleObject || !('objectId' in battleObject)) {
                  setError('Failed to find battle ID in transaction result');
                  setBattleStatus('idle');
                  setIsStarting(false);
                  return;
                }

                const newBattleId = battleObject.objectId;
                setBattleId(newBattleId);
                setBattleStatus('waiting-join');

                // Step 4: Computer joins battle (backend handles this)
                try {
                  const joinResponse = await fetch(`${API_BASE_URL}/api/battles/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      battle_id: newBattleId,
                      player2_address: COMPUTER_ADDRESS,
                      stake_amount: stakeAmount,
                    }),
                  });

                  if (!joinResponse.ok) {
                    const errorData = await joinResponse.json();
                    throw new Error(errorData.detail || 'Computer failed to join battle');
                  }

                  // Battle is ready! Now start the selection animation and price battle
                  setBattleStatus('ready');
                  setIsStarting(false);
                  await refreshBalance();

                  // Fetch all coins for the selection animation
                  const coins = await getTop30Coins();
                  setAllCoins(coins);
                  
                  // Show selection animation
                  setShowSelectionAnimation(true);
                } catch (err: any) {
                  console.error('Computer join error:', err);
                  setError(err.message || 'Computer failed to join battle');
                  setBattleStatus('idle');
                  setBattleId(null);
                  setIsStarting(false);
                }
              } catch (err: any) {
                console.error('Battle creation success handler error:', err);
                setError(err.message || 'Failed to process battle creation');
                setBattleStatus('idle');
                setIsStarting(false);
              }
            },
            onError: (error: any) => {
              console.error('Transaction failed:', error);
              
              // Filter out harmless extension connection errors
              const errorMessage = error?.message || error?.toString() || 'Unknown error';
              if (errorMessage.includes('Could not establish connection') || 
                  errorMessage.includes('Receiving end does not exist')) {
                // This is a harmless extension communication error, user can still sign
                console.warn('Extension connection warning (harmless):', errorMessage);
                return;
              }
              
              setError(errorMessage);
              setBattleStatus('idle');
              setIsStarting(false);
            },
          }
        );
      } catch (txError: any) {
        // Handle transaction building errors
        console.error('Transaction building error:', txError);
        const errorMessage = txError?.message || txError?.toString() || 'Failed to build transaction';
        
        // Filter out harmless extension connection errors
        if (errorMessage.includes('Could not establish connection') || 
            errorMessage.includes('Receiving end does not exist')) {
          console.warn('Extension connection warning (harmless):', errorMessage);
          // Don't show error, let the transaction proceed
          return;
        }
        
        setError(errorMessage);
        setBattleStatus('idle');
        setIsStarting(false);
      }

    } catch (err: any) {
      console.error('Battle creation error:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to start battle';
      
      // Filter out harmless extension connection errors
      if (errorMessage.includes('Could not establish connection') || 
          errorMessage.includes('Receiving end does not exist')) {
        console.warn('Extension connection warning (harmless):', errorMessage);
        return;
      }
      
      setError(errorMessage);
      setBattleStatus('idle');
      setIsStarting(false);
    }
  };

  const handleSelectionComplete = (computerCoin: Coin) => {
    // Selection animation complete, set bot warrior and start price battle
    setBotSelectedWarrior(computerCoin);
    setShowSelectionAnimation(false);
    setIsStarting(false);
    setBattleStatus('active');
    setIsBattleActive(true);
  };

  const handleBattleComplete = async (
    winner: 'user' | 'bot', 
    tokensAwarded: number,
    userStartPrice: number,
    botStartPrice: number,
    userEndPrice: number,
    botEndPrice: number
  ) => {
    if (!battleId || !currentAccount?.address) {
      console.error('Missing battle ID or wallet address');
      return;
    }

    if (!selectedWarrior || !botSelectedWarrior) {
      console.error('Missing coin data for battle result');
      return;
    }

    setBattleStatus('finalizing');
    setIsBattleActive(false);

    // Determine winner address
    const winnerAddress = winner === 'user' ? currentAccount.address : COMPUTER_ADDRESS;

    try {
      // Finalize battle on-chain via backend
      const response = await fetch(`${API_BASE_URL}/api/battles/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battle_id: battleId,
          winner: winnerAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to finalize battle');
      }

    // Calculate final token change based on wager
    let finalTokenChange = 0;
    
    if (winner === 'user') {
        // User wins: get 2x the wager (their wager + opponent's wager)
        finalTokenChange = wagerAmount * 2;
    } else {
        // User loses: lose the wagered amount
      finalTokenChange = -wagerAmount;
    }

    setBattleResult({ 
      winner, 
      tokensAwarded: Math.abs(finalTokenChange),
        wagerAmount,
        userCoin: selectedWarrior,
        botCoin: botSelectedWarrior,
        userStartPrice,
        botStartPrice,
        userEndPrice,
        botEndPrice
      });

      // Refresh balance from backend to get real on-chain balance
      await refreshBalance();
      setBattleStatus('idle');
      setBattleId(null);

    } catch (err: any) {
      console.error('Finalize battle error:', err);
      setError(err.message || 'Failed to finalize battle');
      setBattleStatus('idle');
    }
  };

  const handleCloseResult = () => {
    setBattleResult(null);
    setSelectedWarrior(null);
    setBotSelectedWarrior(null);
    setBattleProgress(null);
    setWagerAmount(0);
    setBattleId(null);
    setBattleStatus('idle');
    setError(null);
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-dark-bg py-12 px-4 relative">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl font-light text-neon-cyan tracking-wide mb-3">
              Crypto Battle Arena
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-gray-400 tracking-wide"
            >
              Select your warrior and compete against the AI
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2"
            >
              <span className="text-xs text-gray-400">Available Balance:</span>
              <span className="text-sm font-semibold text-neon-green tabular-nums">{battleTokenBalance.toFixed(2)} BTK</span>
              <span className="text-xs text-gray-500">tokens</span>
            </motion.div>
          </motion.div>

          <AnimatePresence mode="wait">
            {!isBattleActive ? (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="glass-effect border border-white/10 rounded-2xl p-8 hover-lift"
              >
                <div className="relative z-10">
                  <WarriorSelector
                    selectedWarrior={selectedWarrior}
                    onSelect={setSelectedWarrior}
                  />

                  {/* Wager Input */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-8 max-w-md mx-auto"
                  >
                    <label className="block text-sm font-medium mb-3 text-gray-300 tracking-wide">
                      Wager Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={battleTokenBalance}
                        value={wagerAmount || ''}
                        onChange={(e) => handleWagerChange(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-lg font-medium text-gray-200 placeholder-gray-500 focus:outline-none focus:border-neon-cyan/50 transition-all tabular-nums"
                      />
                      <button
                        onClick={() => setWagerAmount(battleTokenBalance)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-neon-cyan/10 text-neon-cyan text-xs rounded-lg border border-neon-cyan/30 hover:bg-neon-cyan/20 transition-all"
                      >
                        Max
                      </button>
                    </div>
                    {wagerAmount > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 text-center"
                      >
                        <p className="text-xs text-gray-400">
                          Win: <span className="text-neon-green font-medium">+{(wagerAmount * 2).toFixed(2)} BTK</span> • 
                          Lose: <span className="text-red-400 font-medium">-{wagerAmount.toFixed(2)} BTK</span>
                        </p>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                    >
                      <p className="text-sm text-red-400">{error}</p>
                    </motion.div>
                  )}

                  <div className="mt-10 flex justify-center">
                    <motion.button
                      onClick={handleStartBattle}
                      disabled={!selectedWarrior || isStarting || wagerAmount <= 0 || battleStatus !== 'idle'}
                      whileHover={selectedWarrior && !isStarting && wagerAmount > 0 && battleStatus === 'idle' ? { scale: 1.02 } : {}}
                      whileTap={selectedWarrior && !isStarting && wagerAmount > 0 && battleStatus === 'idle' ? { scale: 0.98 } : {}}
                      className={`px-12 py-4 text-sm font-medium tracking-wide rounded-xl transition-all relative overflow-hidden ${
                        !selectedWarrior || isStarting || wagerAmount <= 0 || battleStatus !== 'idle'
                          ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                          : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/15'
                      }`}
                    >
                      {!selectedWarrior ? (
                        'Select Warrior'
                      ) : wagerAmount <= 0 ? (
                        'Enter Wager'
                      ) : isStarting || battleStatus !== 'idle' ? (
                        <span className="flex items-center space-x-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"
                          />
                          <span>
                            {battleStatus === 'staking' && 'Signing Transaction'}
                            {battleStatus === 'waiting-join' && 'Opponent Joining'}
                            {battleStatus === 'ready' && 'Starting Battle'}
                            {battleStatus === 'finalizing' && 'Finalizing'}
                            {!battleStatus && 'Processing'}
                          </span>
                        </span>
                      ) : (
                        `Start Battle (${wagerAmount.toFixed(2)} BTK)`
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="battle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-effect border border-white/10 rounded-2xl p-8"
              >
                <div className="relative z-10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-10 text-center"
                  >
                    <h2 className="text-xl font-light text-neon-cyan tracking-wide mb-4">
                      Battle in Progress
                    </h2>
                    <div className="inline-flex items-center space-x-2 bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg px-4 py-2 mb-8">
                      <span className="text-xs text-gray-400">Wager:</span>
                      <span className="text-lg font-semibold text-neon-cyan tabular-nums">{wagerAmount}</span>
                      <span className="text-xs text-gray-500">tokens</span>
                    </div>
                    <div className="flex justify-center items-center space-x-16">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: 'spring' }}
                        className="text-center"
                      >
                        <div className="text-xs text-gray-400 mb-3 tracking-wide">Your Warrior</div>
                        <div className="text-2xl font-semibold text-neon-cyan px-6 py-3 bg-neon-cyan/5 rounded-xl border border-neon-cyan/20">
                          {selectedWarrior?.symbol}
                        </div>
                      </motion.div>
                      <motion.div
                        animate={{ rotate: [0, 180, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="text-lg text-gray-600"
                      >
                        VS
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="text-center"
                      >
                        <div className="text-xs text-gray-400 mb-3 tracking-wide">Bot Warrior</div>
                        <div className="text-2xl font-semibold text-neon-pink px-6 py-3 bg-neon-pink/5 rounded-xl border border-neon-pink/20">
                          {botSelectedWarrior?.symbol}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>

                  {selectedWarrior && botSelectedWarrior && (
                    <BattleGraph
                      userCoin={selectedWarrior}
                      botCoin={botSelectedWarrior}
                      onBattleComplete={handleBattleComplete}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {battleResult && (
              <WinnerAnnouncement
                winner={battleResult.winner}
                tokensAwarded={battleResult.tokensAwarded}
                wagerAmount={battleResult.wagerAmount}
                userCoin={battleResult.userCoin}
                botCoin={battleResult.botCoin}
                userStartPrice={battleResult.userStartPrice}
                botStartPrice={battleResult.botStartPrice}
                userEndPrice={battleResult.userEndPrice}
                botEndPrice={battleResult.botEndPrice}
                onClose={handleCloseResult}
              />
            )}
          </AnimatePresence>

          {/* Battle Status Modal */}
          <BattleStatusModal
            status={battleStatus !== 'idle' && battleStatus !== 'active' ? battleStatus : null}
          />
        </div>

        {/* Selection Animation Overlay */}
        <AnimatePresence>
          {showSelectionAnimation && selectedWarrior && allCoins.length > 0 && (
            <WarriorSelectionAnimation
              userCoin={selectedWarrior}
              allCoins={allCoins}
              onComplete={handleSelectionComplete}
            />
          )}
        </AnimatePresence>
      </main>
    </ProtectedRoute>
  );
}
