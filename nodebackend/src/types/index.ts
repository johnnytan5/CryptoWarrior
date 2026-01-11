// Request/Response Types

export interface CreateBattleRequest {
  transaction_bytes: string;
  signature: string;
}

export interface CreateBattleResponse {
  success: boolean;
  battle_id: string;
  player1: string;
  stake_amount: number;
  message: string;
  transaction_digest?: string;
  raw_effects?: string; // Base64-encoded raw effects for wallet reporting
}

export interface JoinBattleRequest {
  battle_id: string;
  player2_address: string;
  stake_amount: number;
  coin_object_id?: string;
}

export interface JoinBattleResponse {
  success: boolean;
  battle_id: string;
  player2: string;
  stake_amount: number;
  message: string;
  transaction_digest?: string;
}

export interface FinalizeBattleRequest {
  battle_id: string;
  winner: string;
}

export interface FinalizeBattleResponse {
  success: boolean;
  battle_id: string;
  winner: string;
  message: string;
  transaction_digest?: string;
  total_prize?: number;
}

export interface BattleDetailsResponse {
  id: string;
  player1: string;
  player2: string;
  stake_amount: number;
  is_ready: boolean;
  admin: string;
}

export interface UserBalanceResponse {
  address: string;
  total_balance: number;
  human_readable_balance: number;
  coins: Array<{
    object_id: string;
    balance: number;
  }>;
}

export interface HealthResponse {
  status: string;
  network: string;
  package_id: string;
}

// Coin Market Data Types
export interface CoinInfo {
  id: string;
  symbol: string;
  name: string;
  binance_symbol: string;
  image: string;
  current_price?: number;
  market_cap_rank?: number;
  price_change_percentage_1h?: number;
  price_change_percentage_24h?: number;
  volume_24h?: number;
}

export interface PriceData {
  symbol: string;
  price: number;
}

export interface Ticker24hData {
  symbol: string;
  price: number;
  price_change: number;
  price_change_percent: number;
  high_24h: number;
  low_24h: number;
  volume: number;
}

export interface KlineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

