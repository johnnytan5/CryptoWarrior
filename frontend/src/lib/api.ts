/**
 * API client for Battle Arena backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface UserBalance {
  address: string;
  total_balance: number;
  coins: {
    object_id: string;
    balance: number;
  }[];
}

export interface BattleDetails {
  id: string;
  player1: string;
  player2: string;
  stake_amount: number;
  is_ready: boolean;
  admin: string;
}

export interface CreateBattleResponse {
  success: boolean;
  battle_id: string;
  player1: string;
  stake_amount: number;
  message: string;
  transaction_digest?: string;
}

export interface FinalizeBattleResponse {
  success: boolean;
  battle_id: string;
  winner: string;
  message: string;
  total_prize?: number;
  transaction_digest?: string;
}

/**
 * Get user's battle token balance and coin objects
 */
export async function getUserBalance(address: string): Promise<UserBalance> {
  const response = await fetch(`${API_BASE_URL}/api/users/${address}/balance`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch balance: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Mint battle tokens to a user
 */
export async function mintTokens(address: string, amount: number) {
  const response = await fetch(`${API_BASE_URL}/api/tokens/mint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, amount })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mint tokens: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Create a new battle
 */
export async function createBattle(
  player1Address: string,
  stakeAmount: number,
  coinObjectId: string
): Promise<CreateBattleResponse> {
  const response = await fetch(`${API_BASE_URL}/api/battles/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player1_address: player1Address,
      stake_amount: stakeAmount,
      coin_object_id: coinObjectId
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create battle: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Join an existing battle
 */
export async function joinBattle(
  battleId: string,
  player2Address: string,
  stakeAmount: number,
  coinObjectId: string
) {
  const response = await fetch(`${API_BASE_URL}/api/battles/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      battle_id: battleId,
      player2_address: player2Address,
      stake_amount: stakeAmount,
      coin_object_id: coinObjectId
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to join battle: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Finalize a battle and declare the winner
 */
export async function finalizeBattle(
  battleId: string,
  winner: string
): Promise<FinalizeBattleResponse> {
  const response = await fetch(`${API_BASE_URL}/api/battles/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      battle_id: battleId,
      winner: winner
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to finalize battle: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Get battle details
 */
export async function getBattleDetails(battleId: string): Promise<BattleDetails> {
  const response = await fetch(`${API_BASE_URL}/api/battles/${battleId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get battle details: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Check if backend is healthy
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

