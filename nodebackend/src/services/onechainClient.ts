import { SuiClient, getFullnodeUrl } from '@onelabs/sui/client';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Transaction } from '@onelabs/sui/transactions';
import { toB64, fromB64 } from '@onelabs/sui/utils';
import { decodeSuiPrivateKey } from '@onelabs/sui/cryptography';
import { config } from '../config';

export class OneChainClient {
  private client: SuiClient;
  private adminKeypair: Ed25519Keypair | null = null;
  private packageId: string;
  private adminCapId: string;

  constructor() {
    // Initialize Sui client
    const network = config.onechainNetwork as 'testnet' | 'mainnet' | 'devnet' | 'localnet';
    this.client = new SuiClient({ url: config.onechainRpcUrl || getFullnodeUrl(network) });
    
    this.packageId = config.packageId;
    this.adminCapId = config.adminCapId;

    // Initialize admin keypair
    if (config.adminPrivateKey) {
      try {
        // Handle different private key formats:
        // 1. Bech32 format (suiprivkey1...)
        // 2. Base64 encoded
        // 3. Hex encoded
        
        if (config.adminPrivateKey.startsWith('suiprivkey1') || config.adminPrivateKey.startsWith('onepriv')) {
          // Bech32-encoded private key - use SDK's decoder
          const { secretKey } = decodeSuiPrivateKey(config.adminPrivateKey);
          this.adminKeypair = Ed25519Keypair.fromSecretKey(secretKey);
        } else {
          // Try base64 first, then hex
          try {
            const decoded = fromB64(config.adminPrivateKey);
            this.adminKeypair = Ed25519Keypair.fromSecretKey(decoded);
          } catch {
            // Try hex
            const hexBytes = new Uint8Array(
              config.adminPrivateKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
            );
            this.adminKeypair = Ed25519Keypair.fromSecretKey(hexBytes);
          }
        }
        
        console.log('Admin keypair initialized successfully');
        console.log(`Admin address: ${this.adminKeypair.getPublicKey().toSuiAddress()}`);
      } catch (error) {
        console.error('Error initializing admin keypair:', error);
        this.adminKeypair = null;
      }
    }

    if (!this.packageId || !this.adminCapId) {
      console.warn('OneChain client not fully configured. Check environment variables.');
    }
  }

  /**
   * Get user's OCT coins
   */
  async getUserCoins(address: string): Promise<{
    address: string;
    total_balance: number;
    human_readable_balance: number;
    coins: Array<{ object_id: string; balance: number }>;
  }> {
    try {
      const coins = await this.client.getCoins({
        owner: address,
        coinType: '0x2::oct::OCT', // OCT is the native OneChain token
      });

      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      const humanReadable = Number(totalBalance) / 1_000_000_000; // OCT has 9 decimals

      return {
        address,
        total_balance: Number(totalBalance),
        human_readable_balance: humanReadable,
        coins: coins.data.map(coin => ({
          object_id: coin.coinObjectId,
          balance: Number(coin.balance),
        })),
      };
    } catch (error) {
      console.error(`Failed to get coins for ${address}:`, error);
      throw new Error(`Failed to get user coins: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get battle details
   */
  async getBattleDetails(battleId: string): Promise<{
    id: string;
    player1: string;
    player2: string;
    stake_amount: number;
    is_ready: boolean;
    admin: string;
  }> {
    try {
      const object = await this.client.getObject({
        id: battleId,
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      });

      if (!object.data || object.error) {
        throw new Error(`Battle not found: ${object.error?.code || 'Unknown error'}`);
      }

      const content = object.data.content;
      if (!content || 'fields' in content === false) {
        throw new Error('Invalid battle object format');
      }

      const fields = (content as { fields: Record<string, any> }).fields;

      return {
        id: battleId,
        player1: fields.player1 || '',
        player2: fields.player2 || '',
        stake_amount: Number(fields.stake_amount || 0),
        is_ready: fields.is_ready || false,
        admin: fields.admin || '',
      };
    } catch (error) {
      console.error(`Failed to get battle details for ${battleId}:`, error);
      throw new Error(`Failed to get battle details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a signed create_battle transaction from the frontend
   */
  async createBattle(transactionBytes: string, signature: string): Promise<{
    success: boolean;
    battle_id: string;
    player1: string;
    stake_amount: number;
    message: string;
    transaction_digest?: string;
    raw_effects?: string;
  }> {
    try {
      console.log('Executing signed create_battle transaction from frontend');

      const result = await this.client.executeTransactionBlock({
        transactionBlock: transactionBytes,
        signature,
        options: {
          showInput: true,
          showEffects: true,
          showRawEffects: true, // Required for wallet reporting
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      });

      // Check if transaction was successful
      if (!result.effects || result.effects.status.status !== 'success') {
        const error = result.effects?.status.error || 'Unknown error';
        console.error(`Create battle transaction failed: ${error}`);
        throw new Error(`Transaction failed: ${error}`);
      }

      // Extract battle_id from objectChanges
      const objectChanges = result.objectChanges || [];
      let battleId: string | null = null;

      for (const change of objectChanges) {
        if (change.type === 'created' && 'objectType' in change) {
          const objectType = change.objectType as string;
          if (objectType.includes('battle::Battle')) {
            battleId = change.objectId;
            break;
          }
        }
      }

      if (!battleId) {
        // Try to find in effects.created
        const created = result.effects?.created || [];
        for (const createdObj of created) {
          const objId = createdObj.reference?.objectId;
          if (objId) {
            try {
              const objData = await this.client.getObject({
                id: objId,
                options: { showType: true },
              });
              const objType = objData.data?.type;
              if (objType && objType.includes('battle::Battle')) {
                battleId = objId;
                break;
              }
            } catch {
              continue;
            }
          }
        }
      }

      if (!battleId) {
        console.error('No battle object found in transaction result');
        throw new Error('Failed to extract battle_id from transaction result');
      }

      // Extract player1 address from transaction
      const sender = result.transaction?.data?.sender || 'unknown';

      console.log(`Successfully created battle: ${battleId}`);

      // Extract rawEffects for wallet reporting
      let rawEffectsB64: string | undefined;
      if (result.rawEffects) {
        try {
          // rawEffects might be a Uint8Array or base64 string
          if (typeof result.rawEffects === 'string') {
            rawEffectsB64 = result.rawEffects;
          } else if (result.rawEffects instanceof Uint8Array) {
            rawEffectsB64 = toB64(result.rawEffects);
          } else if (Array.isArray(result.rawEffects)) {
            // Array of numbers (bytes)
            const bytes = new Uint8Array(result.rawEffects);
            rawEffectsB64 = toB64(bytes);
          }
        } catch (error) {
          console.warn(`Failed to encode rawEffects: ${error}`);
        }
      }

      return {
        success: true,
        battle_id: battleId,
        player1: sender,
        stake_amount: 0, // Can't determine from transaction result easily
        message: 'Battle created successfully',
        transaction_digest: result.digest,
        raw_effects: rawEffectsB64,
      };
    } catch (error) {
      console.error('Failed to execute create_battle transaction:', error);
      throw error;
    }
  }

  /**
   * Select and prepare a coin for staking (merge if needed, split if needed)
   */
  async selectAndPrepareCoin(
    _address: string,
    requiredAmount: number,
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
      // Get all coins
      const coinsData = await this.getUserCoins(_address);
      const coins = coinsData.coins;

      if (coins.length === 0) {
        throw new Error('No coins available');
      }

      // Find a coin with sufficient balance
      let suitableCoin = coins.find(coin => coin.balance >= requiredAmount);

      if (suitableCoin) {
        // If exact amount, use it directly
        if (suitableCoin.balance === requiredAmount) {
          console.log(`Found coin with exact amount: ${suitableCoin.object_id} (${requiredAmount} units)`);
          return suitableCoin.object_id;
        }
        // If larger, we need to split it to get the exact amount
        console.log(`Found coin with ${suitableCoin.balance} units, splitting to get exactly ${requiredAmount}`);
        const splitCoinId = await this.splitCoin(
          _address,
          suitableCoin.object_id,
          requiredAmount,
          signerKeypair
        );
        return splitCoinId;
      }

      // No single coin is large enough, merge all coins
      console.log(`Merging ${coins.length} coins to get sufficient balance`);
      const totalBalance = coins.reduce((sum, coin) => sum + coin.balance, 0);

      if (totalBalance < requiredAmount) {
        throw new Error(`Insufficient total balance. Required: ${requiredAmount}, Available: ${totalBalance}`);
      }

      // Merge all coins into the first one
      const destinationCoin = coins[0].object_id;
      const sourceCoins = coins.slice(1).map(c => c.object_id);

      if (sourceCoins.length > 0) {
        console.log(`Merging ${sourceCoins.length} source coins into ${destinationCoin}`);
        await this.mergeCoins(_address, destinationCoin, sourceCoins, signerKeypair);
        console.log('Merge complete, waiting 2 seconds for blockchain to finalize...');
        // Wait a bit for the blockchain to finalize the merge transactions
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // After merging, we should have enough in the destination coin
      // We need to split the EXACT amount required
      console.log(`Splitting exactly ${requiredAmount} from merged coin ${destinationCoin}`);
      const splitCoinId = await this.splitCoin(
        _address,
        destinationCoin,
        requiredAmount,
        signerKeypair
      );
      return splitCoinId;
    } catch (error) {
      console.error('Failed to prepare coin:', error);
      throw error;
    }
  }

  /**
   * Merge multiple coins into one
   */
  async mergeCoins(
    _address: string,
    destinationCoinId: string,
    sourceCoinIds: string[],
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
      // Merge coins one at a time (unsafe_mergeCoins only accepts one source at a time)
      let currentDestination = destinationCoinId;

      for (const sourceCoinId of sourceCoinIds) {
        console.log(`Merging ${sourceCoinId} into ${currentDestination}`);
        
        const tx = new Transaction();
        tx.mergeCoins(tx.object(currentDestination), [tx.object(sourceCoinId)]);

        const result = await this.client.signAndExecuteTransaction({
          signer: signerKeypair,
          transaction: tx,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

        if (!result.effects || result.effects.status.status !== 'success') {
          throw new Error(`Failed to merge ${sourceCoinId}: ${result.effects?.status.error || 'Unknown error'}`);
        }

        // After merging, the destination coin is mutated with a new version
        // We need to keep using the same coin ID but don't need to update it
        // The SDK will handle the version automatically on the next transaction
        console.log(`Successfully merged ${sourceCoinId} into ${currentDestination}`);
      }

      console.log(`Successfully merged all ${sourceCoinIds.length} coins into ${destinationCoinId}`);
      return destinationCoinId;
    } catch (error) {
      console.error('Failed to merge coins:', error);
      throw new Error(`Failed to merge coins: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Split a coin
   */
  async splitCoin(
    _address: string,
    coinId: string,
    amount: number,
    signerKeypair: Ed25519Keypair
  ): Promise<string> {
    try {
      console.log(`Splitting coin ${coinId} to get exactly ${amount} units`);
      const tx = new Transaction();
      const [splitCoin] = tx.splitCoins(tx.object(coinId), [amount]);
      tx.transferObjects([splitCoin], signerKeypair.getPublicKey().toSuiAddress());

      const result = await this.client.signAndExecuteTransaction({
        signer: signerKeypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (!result.effects || result.effects.status.status !== 'success') {
        throw new Error(`Failed to split coin: ${result.effects?.status.error || 'Unknown error'}`);
      }

      // Find the split coin in object changes
      const objectChanges = result.objectChanges || [];
      for (const change of objectChanges) {
        if (change.type === 'created' && 'objectType' in change) {
          const objectType = change.objectType as string;
          if (objectType.includes('Coin<')) {
            console.log(`Successfully created split coin: ${change.objectId} with ${amount} units`);
            return change.objectId;
          }
        }
      }

      // If not found in object changes, return the split coin reference
      // This is a fallback - the actual coin ID should be in object changes
      throw new Error('Failed to extract split coin ID from transaction result');
    } catch (error) {
      console.error('Failed to split coin:', error);
      throw error;
    }
  }

  /**
   * Join a battle (bot/admin signs)
   */
  async joinBattle(
    battleId: string,
    player2Address: string,
    stakeAmount: number,
    coinObjectId?: string
  ): Promise<{
    success: boolean;
    battle_id: string;
    player2: string;
    stake_amount: number;
    message: string;
    transaction_digest?: string;
  }> {
    try {
      if (!this.adminKeypair) {
        throw new Error('No admin keypair available for signing join_battle transaction');
      }

      console.log(`Player2 ${player2Address} joining battle ${battleId}`);

      // Auto-select and prepare coin if not provided
      let coinId = coinObjectId;
      if (!coinId) {
        coinId = await this.selectAndPrepareCoin(player2Address, stakeAmount, this.adminKeypair);
        console.log(`Auto-selected coin for player2: ${coinId}`);
      }

      // Build and execute join_battle transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::battle::join_battle`,
        arguments: [tx.object(battleId), tx.object(coinId)],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: this.adminKeypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (!result.effects || result.effects.status.status !== 'success') {
        const error = result.effects?.status.error || 'Unknown error';
        console.error(`Join battle transaction failed: ${error}`);
        throw new Error(`Transaction failed: ${error}`);
      }

      console.log(`Successfully joined battle ${battleId}`);

      return {
        success: true,
        battle_id: battleId,
        player2: player2Address,
        stake_amount: stakeAmount,
        message: 'Successfully joined battle',
        transaction_digest: result.digest,
      };
    } catch (error) {
      console.error('Failed to join battle:', error);
      throw error;
    }
  }

  /**
   * Finalize a battle
   */
  async finalizeBattle(battleId: string, winner: string): Promise<{
    success: boolean;
    battle_id: string;
    winner: string;
    message: string;
    transaction_digest?: string;
    total_prize?: number;
  }> {
    try {
      if (!this.adminKeypair) {
        throw new Error('No admin keypair available for signing finalize_battle transaction');
      }

      console.log(`Finalizing battle ${battleId}, winner: ${winner}`);

      const tx = new Transaction();
      tx.moveCall({
        target: `${this.packageId}::battle::finalize_battle`,
        arguments: [tx.object(this.adminCapId), tx.object(battleId), tx.pure.address(winner)],
      });

      const result = await this.client.signAndExecuteTransaction({
        signer: this.adminKeypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      if (!result.effects || result.effects.status.status !== 'success') {
        const error = result.effects?.status.error || 'Unknown error';
        console.error(`Finalize battle transaction failed: ${error}`);
        throw new Error(`Transaction failed: ${error}`);
      }

      console.log(`Successfully finalized battle ${battleId}`);

      return {
        success: true,
        battle_id: battleId,
        winner,
        message: 'Battle finalized successfully',
        transaction_digest: result.digest,
      };
    } catch (error) {
      console.error('Failed to finalize battle:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const onechainClient = new OneChainClient();

