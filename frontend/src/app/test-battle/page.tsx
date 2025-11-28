'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import confetti from 'canvas-confetti';

// Configuration (in production, these would come from environment variables)
const PACKAGE_ID = '0xe80cbff7a5b3535c486399f3ec52b94952515626e3a784525269eeee8f3e35c8';
const COMPUTER_ADDRESS = '0xf243e79908bd2a90e54a4121a5f65f225b894316f19a73c68620ebe190c855e9';

interface BattleState {
  battleId: string;
  userStake: number;
  computerAddress: string;
  status: 'idle' | 'creating' | 'waiting' | 'ready' | 'finalizing' | 'finished';
}

export default function TestBattlePage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const { battleTokenBalance, refreshBalance } = useApp();
  const client = useSuiClient();
  
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

  const [betAmount, setBetAmount] = useState<string>('10');
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [error, setError] = useState<string>('');
  const [winner, setWinner] = useState<'user' | 'computer' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStartBattle = async () => {
    if (!currentAccount?.address) {
      setError('Please connect your wallet first');
      return;
    }

    const betAmountNum = parseFloat(betAmount);
    if (isNaN(betAmountNum) || betAmountNum <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    if (betAmountNum > battleTokenBalance) {
      setError(`Insufficient balance. You have ${battleTokenBalance.toFixed(2)} BTK`);
      return;
    }

    setError('');
    setLoading(true);
    setBattle({ 
      battleId: '', 
      userStake: betAmountNum, 
      computerAddress: COMPUTER_ADDRESS,
      status: 'creating' 
    });

    try {
      // Convert BTK to raw units (9 decimals)
      const stakeAmount = Math.floor(betAmountNum * 1_000_000_000);

      // Step 1: Get user's coin objects
      const balanceResponse = await fetch(`http://localhost:8000/api/users/${currentAccount.address}/balance`);
      if (!balanceResponse.ok) {
        throw new Error('Failed to fetch balance');
      }
      const balanceData = await balanceResponse.json();
      
      // Check total balance
      if (balanceData.total_balance < stakeAmount) {
        throw new Error(`Insufficient balance. Required: ${betAmountNum} BTK, Available: ${balanceData.total_balance / 1_000_000_000} BTK`);
      }
      
      if (balanceData.coins.length === 0) {
        throw new Error('No coins found. Please mint some battle tokens first.');
      }
      
      // Step 2: Build transaction for creating battle
      const tx = new Transaction();
      
      // Find a coin with sufficient balance
      let coinToUse = balanceData.coins.find((coin: any) => coin.balance >= stakeAmount);
      
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
            otherCoins.map(coin => tx.object(coin.object_id))
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

      // Call create_battle function
      tx.moveCall({
        target: `${PACKAGE_ID}::battle::create_battle`,
        arguments: [
          stakeCoin,
          tx.pure.address(COMPUTER_ADDRESS), // opponent
          tx.pure.address(currentAccount.address), // admin (treasury)
        ],
      });

      // Step 3: User signs and executes transaction
      signAndExecuteTransaction(
        {
          transaction: tx,
          chain: 'sui:testnet',
        },
        {
          onSuccess: async (result) => {
            console.log('Battle created:', result);
            
            // Extract battle_id from object changes
            const battleObject = result.objectChanges?.find(
              (change: any) => change.type === 'created' && change.objectType?.includes('battle::Battle')
            );
            
            if (!battleObject || !('objectId' in battleObject)) {
              setError('Failed to find battle ID in transaction result');
              setBattle(null);
              setLoading(false);
              return;
            }

            const battleId = battleObject.objectId;
            setBattle(prev => prev ? { ...prev, battleId, status: 'waiting' } : null);

            // Step 4: Computer joins battle (backend handles this)
            try {
              const joinResponse = await fetch('http://localhost:8000/api/battles/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  battle_id: battleId,
                  player2_address: COMPUTER_ADDRESS,
                  stake_amount: stakeAmount,
                }),
              });

              if (!joinResponse.ok) {
                const errorData = await joinResponse.json();
                throw new Error(errorData.detail || 'Computer failed to join battle');
              }

              // Battle is ready!
              setBattle(prev => prev ? { ...prev, status: 'ready' } : null);
              setLoading(false);
              await refreshBalance();
            } catch (err: any) {
              console.error('Computer join error:', err);
              setError(err.message || 'Computer failed to join battle');
              setBattle(null);
              setLoading(false);
            }
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            setError(error.message || 'Failed to create battle');
            setBattle(null);
            setLoading(false);
          },
        }
      );

    } catch (err: any) {
      console.error('Battle creation error:', err);
      setError(err.message || 'Failed to start battle');
      setBattle(null);
      setLoading(false);
    }
  };

  const handleSelectWinner = async (selectedWinner: 'user' | 'computer') => {
    if (!battle || !currentAccount?.address) return;

    setLoading(true);
    setBattle(prev => prev ? { ...prev, status: 'finalizing' } : null);

    try {
      const winnerAddress = selectedWinner === 'user' ? currentAccount.address : COMPUTER_ADDRESS;

      const response = await fetch('http://localhost:8000/api/battles/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battle_id: battle.battleId,
          winner: winnerAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to finalize battle');
      }

      // Battle finished!
      setWinner(selectedWinner);
      setBattle(prev => prev ? { ...prev, status: 'finished' } : null);
      
      // Refresh balance
      await refreshBalance();

      // Celebrate if user wins
      if (selectedWinner === 'user') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      setLoading(false);

    } catch (err: any) {
      console.error('Finalize error:', err);
      setError(err.message || 'Failed to finalize battle');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBattle(null);
    setWinner(null);
    setError('');
    setBetAmount('10');
    refreshBalance();
  };

  if (!currentAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-neon-cyan mb-4">Test Battle Arena</h1>
          <p className="text-gray-400 mb-6">Please connect your wallet to continue</p>
          <button
            onClick={() => router.push('/connect-wallet')}
            className="px-6 py-3 bg-neon-cyan/20 border border-neon-cyan/50 rounded-lg hover:bg-neon-cyan/30 transition-all"
          >
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-neon-cyan mb-2 tracking-wider">
            Test Battle Arena
          </h1>
          <p className="text-gray-400">Integration Test: Battle System</p>
        </motion.div>

        {/* Balance Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-black/40 border border-neon-cyan/30 rounded-lg p-6 mb-6"
        >
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your Balance:</span>
            <span className="text-2xl font-bold text-neon-cyan">
              {battleTokenBalance.toFixed(2)} BTK
            </span>
          </div>
        </motion.div>

        {/* Battle Setup */}
        {!battle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 border border-neon-purple/30 rounded-lg p-8"
          >
            <h2 className="text-2xl font-bold text-neon-purple mb-6">Start Battle</h2>

            <div className="mb-6">
              <label className="block text-gray-400 mb-2">Bet Amount (BTK)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="flex-1 px-4 py-3 bg-black/60 border border-neon-purple/50 rounded-lg focus:outline-none focus:border-neon-purple text-white"
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={() => setBetAmount(battleTokenBalance.toString())}
                  className="px-4 py-3 bg-neon-purple/20 border border-neon-purple/50 rounded-lg hover:bg-neon-purple/30 transition-all"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-black/60 border border-gray-700 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Your Address:</span>
                <span className="text-white font-mono text-xs">
                  {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Computer Address:</span>
                <span className="text-white font-mono text-xs">
                  {COMPUTER_ADDRESS.slice(0, 6)}...{COMPUTER_ADDRESS.slice(-4)}
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleStartBattle}
              disabled={loading}
              className="w-full py-4 bg-neon-purple/30 border-2 border-neon-purple rounded-lg text-white font-bold text-lg hover:bg-neon-purple/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting Battle...' : 'Start Battle'}
            </button>
          </motion.div>
        )}

        {/* Battle In Progress */}
        {battle && battle.status !== 'finished' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/40 border border-neon-cyan/30 rounded-lg p-8"
          >
            <h2 className="text-2xl font-bold text-neon-cyan mb-6 text-center">
              {battle.status === 'creating' && 'Creating Battle...'}
              {battle.status === 'waiting' && 'Computer Joining...'}
              {battle.status === 'ready' && 'Select Winner'}
              {battle.status === 'finalizing' && 'Finalizing Battle...'}
            </h2>

            <div className="mb-6 p-4 bg-black/60 border border-neon-cyan/50 rounded-lg">
              <div className="flex justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-gray-400 text-sm mb-1">You</p>
                  <p className="text-2xl font-bold text-neon-cyan">{battle.userStake.toFixed(2)} BTK</p>
                </div>
                <div className="flex items-center px-4">
                  <span className="text-gray-500 text-2xl">VS</span>
                </div>
                <div className="text-center flex-1">
                  <p className="text-gray-400 text-sm mb-1">Computer</p>
                  <p className="text-2xl font-bold text-neon-purple">{battle.userStake.toFixed(2)} BTK</p>
                </div>
              </div>
              <div className="text-center pt-4 border-t border-gray-700">
                <span className="text-gray-400">Total Pool: </span>
                <span className="text-xl font-bold text-white">{(battle.userStake * 2).toFixed(2)} BTK</span>
              </div>
            </div>

            {battle.status === 'ready' && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSelectWinner('user')}
                  disabled={loading}
                  className="py-6 bg-neon-cyan/30 border-2 border-neon-cyan rounded-lg text-white font-bold text-xl hover:bg-neon-cyan/40 transition-all disabled:opacity-50"
                >
                  User Wins
                </button>
                <button
                  onClick={() => handleSelectWinner('computer')}
                  disabled={loading}
                  className="py-6 bg-neon-purple/30 border-2 border-neon-purple rounded-lg text-white font-bold text-xl hover:bg-neon-purple/40 transition-all disabled:opacity-50"
                >
                  Computer Wins
                </button>
              </div>
            )}

            {(battle.status === 'creating' || battle.status === 'waiting' || battle.status === 'finalizing') && (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-cyan"></div>
              </div>
            )}
          </motion.div>
        )}

        {/* Battle Results */}
        {battle && battle.status === 'finished' && winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-black/40 border-2 rounded-lg p-8 ${
              winner === 'user' ? 'border-neon-cyan' : 'border-neon-purple'
            }`}
          >
            <h2 className={`text-4xl font-bold mb-4 text-center ${
              winner === 'user' ? 'text-neon-cyan' : 'text-neon-purple'
            }`}>
              {winner === 'user' ? '🎉 YOU WIN! 🎉' : '💀 COMPUTER WINS 💀'}
            </h2>

            <div className="mb-6 p-6 bg-black/60 border border-gray-700 rounded-lg">
              <div className="text-center mb-4">
                <p className="text-gray-400 mb-2">Winner:</p>
                <p className={`text-2xl font-bold ${
                  winner === 'user' ? 'text-neon-cyan' : 'text-neon-purple'
                }`}>
                  {winner === 'user' ? 'You' : 'Computer'}
                </p>
              </div>
              <div className="text-center pt-4 border-t border-gray-700">
                <p className="text-gray-400 mb-2">Prize:</p>
                <p className="text-3xl font-bold text-white">
                  {(battle.userStake * 2).toFixed(2)} BTK
                </p>
              </div>
              <div className="text-center pt-4 border-t border-gray-700 mt-4">
                <p className="text-gray-400 mb-2">
                  {winner === 'user' ? 'You gained:' : 'You lost:'}
                </p>
                <p className={`text-2xl font-bold ${
                  winner === 'user' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {winner === 'user' ? '+' : '-'}{battle.userStake.toFixed(2)} BTK
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-4 bg-neon-cyan/30 border-2 border-neon-cyan rounded-lg text-white font-bold text-lg hover:bg-neon-cyan/40 transition-all"
            >
              Battle Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

