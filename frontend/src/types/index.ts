export interface Coin {
  id: string; // CoinGecko ID for reference
  symbol: string; // Base symbol (e.g., "BTC")
  name: string;
  binance_symbol: string; // Trading pair (e.g., "BTCUSDT")
  image: string;
  current_price?: number;
  market_cap_rank?: number;
  price_change_percentage_1h?: number;
  price_change_percentage_24h?: number;
  volume_24h?: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface BattleData {
  userCoin: string;
  botCoin: string;
  userData: PricePoint[];
  botData: PricePoint[];
}

export interface Profile {
  address: string;
  wins: number;
  losses: number;
  battleTokens: number;
  nfts: number;
}

export interface BattleProgress {
  userData: PricePoint[];
  botData: PricePoint[];
  isActive: boolean;
  currentPoll: number;
  userStartPrice: number;
  botStartPrice: number;
}

