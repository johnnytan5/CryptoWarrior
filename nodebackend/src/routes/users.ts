import { Router, Request, Response } from 'express';
import { onechainClient } from '../services/onechainClient';

const router = Router();

/**
 * GET /api/users/:address/balance
 * Get user's OCT (native OneChain token) balance
 */
router.get('/:address/balance', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address) {
      res.status(400).json({
        error: 'Missing address parameter',
      });
      return;
    }

    console.log(`Getting balance for ${address}`);

    const balance = await onechainClient.getUserCoins(address);

    console.log(
      `Balance for ${address}: ${balance.total_balance} tokens, ${balance.coins.length} coin objects`
    );

    res.json(balance);
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

export default router;

