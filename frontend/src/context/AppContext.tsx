'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useCurrentAccount } from '@onelabs/dapp-kit';
import { Coin, BattleProgress, Profile } from '@/types';
import { getUserBalance, type UserBalance } from '@/lib/api';

interface AppContextType {
  battleTokenBalance: number;
  setBattleTokenBalance: (balance: number) => void;
  userCoins: UserBalance['coins'];
  setUserCoins: (coins: UserBalance['coins']) => void;
  refreshBalance: () => Promise<void>;
  isLoadingBalance: boolean;
  selectedWarrior: Coin | null;
  setSelectedWarrior: (warrior: Coin | null) => void;
  botSelectedWarrior: Coin | null;
  setBotSelectedWarrior: (warrior: Coin | null) => void;
  battleProgress: BattleProgress | null;
  setBattleProgress: (progress: BattleProgress | null) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const currentAccount = useCurrentAccount();
  const [battleTokenBalance, setBattleTokenBalance] = useState<number>(0);
  const [userCoins, setUserCoins] = useState<UserBalance['coins']>([]);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [selectedWarrior, setSelectedWarrior] = useState<Coin | null>(null);
  const [botSelectedWarrior, setBotSelectedWarrior] = useState<Coin | null>(null);
  const [battleProgress, setBattleProgress] = useState<BattleProgress | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Function to fetch balance from backend (memoized to prevent infinite loops)
  const refreshBalance = useCallback(async () => {
    if (!currentAccount?.address) {
      setBattleTokenBalance(0);
      setUserCoins([]);
      return;
    }

    setIsLoadingBalance(true);
    try {
      const balanceData = await getUserBalance(currentAccount.address);
      // Convert raw units to human-readable BTK (9 decimals)
      const humanReadableBalance = balanceData.total_balance / 1_000_000_000;
      setBattleTokenBalance(humanReadableBalance);
      setUserCoins(balanceData.coins);
      console.log('Balance updated:', humanReadableBalance.toFixed(2), 'BTK');
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      // If backend is not available, set to 0 instead of showing error
      setBattleTokenBalance(0);
      setUserCoins([]);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [currentAccount?.address]);

  // Fetch balance when wallet connects or changes
  useEffect(() => {
    if (currentAccount?.address) {
      refreshBalance();
    } else {
      setBattleTokenBalance(0);
      setUserCoins([]);
    }
  }, [currentAccount?.address]);

  return (
    <AppContext.Provider
      value={{
        battleTokenBalance,
        setBattleTokenBalance,
        userCoins,
        setUserCoins,
        refreshBalance,
        isLoadingBalance,
        selectedWarrior,
        setSelectedWarrior,
        botSelectedWarrior,
        setBotSelectedWarrior,
        battleProgress,
        setBattleProgress,
        profile,
        setProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

