import { Coin, PricePoint, BattleData, Profile } from '@/types';

// Mock API functions - will be replaced with real API calls later

export const getTop30Coins = async (): Promise<Coin[]> => {
  try {
    // Fetch top tradeable coins from Binance (all are guaranteed to be tradeable)
    const response = await fetch('http://localhost:8000/api/coins/top?limit=30');
    if (!response.ok) {
      throw new Error('Failed to fetch coins');
    }
    const coins = await response.json();
    
    // Validate that coins have required fields
    if (!coins || coins.length === 0) {
      throw new Error('No coins returned from API');
    }
    
    // Validate coins have required fields
    const validCoins = coins.filter((coin: any) => {
      const isValid = coin && coin.id && coin.symbol && coin.name && coin.binance_symbol;
      if (!isValid) {
        console.warn('⚠️ Skipping invalid coin:', coin);
      }
      return isValid;
    });
    
    console.log(`✅ Loaded ${validCoins.length} tradeable coins from Binance`);
    
    if (validCoins.length > 0) {
      console.log('📊 Sample coin:', JSON.stringify(validCoins[0]));
    }
    
    return validCoins;
  } catch (error) {
    console.error('❌ Error fetching coins:', error);
    throw error; // Don't fall back to mock data - we need real tradeable coins
  }
};

export const startBattle = async (userCoin: string): Promise<{ botCoin: string }> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  try {
    // Fetch fresh coins list
    const coins = await getTop30Coins();
    const availableCoins = coins.filter((c: Coin) => c.symbol !== userCoin);
    const randomCoin = availableCoins[Math.floor(Math.random() * availableCoins.length)];
    return { botCoin: randomCoin.symbol };
  } catch (error) {
    console.error('Error starting battle:', error);
    // Fallback to mock
  const coins = require('./constants').TOP_30_COINS;
  const availableCoins = coins.filter((c: Coin) => c.symbol !== userCoin);
  const randomCoin = availableCoins[Math.floor(Math.random() * availableCoins.length)];
  return { botCoin: randomCoin.symbol };
  }
};

export const getCoinMapping = async (): Promise<Record<string, string>> => {
  try {
    const response = await fetch('http://localhost:8000/api/coins/mapping');
    if (!response.ok) {
      throw new Error('Failed to fetch mapping');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching mapping:', error);
    return {};
  }
};

export const getLivePrice = async (binanceSymbol: string): Promise<PricePoint> => {
  try {
    // Validate input
    if (!binanceSymbol || typeof binanceSymbol !== 'string') {
      console.error('❌ Invalid binanceSymbol provided to getLivePrice:', binanceSymbol);
      throw new Error(`Invalid Binance symbol: ${binanceSymbol}`);
    }

    // Fetch real price from Binance via backend
    console.log(`💹 Fetching price for ${binanceSymbol}`);
    const response = await fetch(`http://localhost:8000/api/price/${binanceSymbol}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.statusText}`);
    }
    
    const data = await response.json();
    const price = data.price;
    console.log(`✅ ${binanceSymbol}: $${price}`);
  return {
    timestamp: Date.now(),
      price,
  };
  } catch (error) {
    console.error(`❌ Error fetching live price for ${binanceSymbol}:`, error);
    // Re-throw error instead of silently falling back to mock data
    throw error;
  }
};

export const finalizeBattle = async (battleData: BattleData): Promise<{
  winner: 'user' | 'bot';
  tokensAwarded: number;
}> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Calculate winner based on price movement
  const userStartPrice = battleData.userData[0]?.price || 0;
  const userEndPrice = battleData.userData[battleData.userData.length - 1]?.price || 0;
  const userChange = userStartPrice > 0 ? ((userEndPrice - userStartPrice) / userStartPrice) * 100 : 0;
  
  const botStartPrice = battleData.botData[0]?.price || 0;
  const botEndPrice = battleData.botData[battleData.botData.length - 1]?.price || 0;
  const botChange = botStartPrice > 0 ? ((botEndPrice - botStartPrice) / botStartPrice) * 100 : 0;
  
  // In case of draw (equal percentage change), user wins as mitigation
  const winner = userChange >= botChange ? 'user' : 'bot';
  const tokensAwarded = winner === 'user' ? 20 : 0;
  
  return { winner, tokensAwarded };
};

export const mintTokens = async (): Promise<{
  newBalance: number;
  minted: number;
}> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    newBalance: 120, // Mock value
    minted: 10,
  };
};

export const getProfile = async (walletAddress: string): Promise<Profile> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    address: walletAddress,
    wins: 12,
    losses: 8,
    battleTokens: 120,
    nfts: 3,
  };
};

export const mintNFT = async (): Promise<{ success: boolean; nftCount: number }> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    success: true,
    nftCount: 4,
  };
};

