import { Router, Request, Response } from 'express';
import { onechainClient } from '../services/onechainClient';
import {
  CreateBattleRequest,
  JoinBattleRequest,
  FinalizeBattleRequest,
} from '../types';

const router = Router();

/**
 * POST /api/battles/create
 * Execute a signed create_battle transaction from the frontend
 */
router.post('/create', async (req: Request<{}, {}, CreateBattleRequest>, res: Response) => {
  try {
    console.log('Executing signed create_battle transaction from frontend');

    const { transaction_bytes, signature } = req.body;

    if (!transaction_bytes || !signature) {
      res.status(400).json({
        error: 'Missing required fields: transaction_bytes and signature',
      });
      return;
    }

    const result = await onechainClient.createBattle(transaction_bytes, signature);

    res.json(result);
  } catch (error) {
    console.error('Create battle error:', error);
    res.status(500).json({
      error: `Failed to create battle: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * POST /api/battles/join
 * Join an existing battle
 */
router.post('/join', async (req: Request<{}, {}, JoinBattleRequest>, res: Response) => {
  try {
    const { battle_id, player2_address, stake_amount, coin_object_id } = req.body;

    if (!battle_id || !player2_address || !stake_amount) {
      res.status(400).json({
        error: 'Missing required fields: battle_id, player2_address, and stake_amount',
      });
      return;
    }

    // Verify battle exists and is ready to join
    try {
      const battle = await onechainClient.getBattleDetails(battle_id);
      if (battle.is_ready) {
        res.status(400).json({
          error: 'Battle already has both players staked',
        });
        return;
      }
      if (battle.stake_amount !== stake_amount) {
        res.status(400).json({
          error: `Stake amount must be ${battle.stake_amount}`,
        });
        return;
      }
    } catch (error) {
      console.warn('Could not verify battle state:', error);
    }

    const result = await onechainClient.joinBattle(
      battle_id,
      player2_address,
      stake_amount,
      coin_object_id
    );

    res.json(result);
  } catch (error) {
    console.error('Join battle error:', error);
    res.status(500).json({
      error: `Failed to join battle: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * POST /api/battles/finalize
 * Finalize a battle and declare the winner
 */
router.post('/finalize', async (req: Request<{}, {}, FinalizeBattleRequest>, res: Response) => {
  try {
    const { battle_id, winner } = req.body;

    if (!battle_id || !winner) {
      res.status(400).json({
        error: 'Missing required fields: battle_id and winner',
      });
      return;
    }

    // Optionally verify battle is ready before finalizing
    try {
      const battle = await onechainClient.getBattleDetails(battle_id);
      if (!battle.is_ready) {
        res.status(400).json({
          error: 'Battle is not ready (both players must stake)',
        });
        return;
      }
    } catch (error) {
      console.warn('Could not verify battle state:', error);
    }

    const result = await onechainClient.finalizeBattle(battle_id, winner);

    res.json(result);
  } catch (error) {
    console.error('Finalize battle error:', error);
    res.status(500).json({
      error: `Failed to finalize battle: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/battles/:battle_id
 * Get details of a specific battle
 */
router.get('/:battle_id', async (req: Request, res: Response) => {
  try {
    const { battle_id } = req.params;

    if (!battle_id) {
      res.status(400).json({
        error: 'Missing battle_id parameter',
      });
      return;
    }

    const battle = await onechainClient.getBattleDetails(battle_id);

    res.json(battle);
  } catch (error) {
    console.error('Get battle error:', error);
    res.status(404).json({
      error: `Battle not found: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

export default router;

