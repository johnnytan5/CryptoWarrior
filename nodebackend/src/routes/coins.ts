import { Router, Request, Response } from 'express';
import { CoinGeckoAPI, BinanceAPI, getTopTradeableCoins } from '../services/cryptoApi';

const router = Router();

/**
 * GET /api/coins/top
 * Get top tradeable coins from Binance with images from CoinGecko
 */
router.get('/top', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 30;
    const validatedLimit = Math.min(Math.max(limit, 1), 50); // Clamp between 1 and 50

    console.log(`Fetching top ${validatedLimit} tradeable coins from Binance`);

    const coins = await getTopTradeableCoins(validatedLimit);

    console.log(`Returning ${coins.length} coins, all tradeable on Binance`);

    res.json(coins);
  } catch (error) {
    console.error('Error fetching top coins:', error);
    res.status(500).json({
      error: `Failed to fetch coins: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/coins/:coin_id/info
 * Get detailed information for a specific coin from CoinGecko
 */
router.get('/:coin_id/info', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;

    if (!coin_id) {
      res.status(400).json({
        error: 'Missing coin_id parameter',
      });
      return;
    }

    console.log(`Fetching coin info for ${coin_id}`);

    const coin = await CoinGeckoAPI.getCoinInfo(coin_id);

    res.json(coin);
  } catch (error) {
    console.error('Error fetching coin info:', error);
    res.status(404).json({
      error: `Coin not found: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/coins/price/:symbol
 * Get real-time price from Binance
 */
router.get('/price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      res.status(400).json({
        error: 'Missing symbol parameter',
      });
      return;
    }

    console.log(`Fetching price for ${symbol}`);

    const priceData = await BinanceAPI.getPrice(symbol);

    res.json(priceData);
  } catch (error) {
    console.error('Error fetching price:', error);
    res.status(500).json({
      error: `Failed to fetch price: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/coins/price/batch
 * Get real-time prices for multiple coins from Binance
 */
router.get('/price/batch', async (req: Request, res: Response) => {
  try {
    const symbolsParam = req.query.symbols as string;

    if (!symbolsParam) {
      res.status(400).json({
        error: 'Missing symbols query parameter (comma-separated)',
      });
      return;
    }

    const symbolList = symbolsParam.split(',').map(s => s.trim().toUpperCase());

    console.log(`Fetching prices for ${symbolList.length} symbols`);

    const prices = await BinanceAPI.getMultiplePrices(symbolList);

    res.json(prices);
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
    res.status(500).json({
      error: `Failed to fetch prices: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/coins/ticker/:symbol
 * Get 24-hour price statistics from Binance
 */
router.get('/ticker/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      res.status(400).json({
        error: 'Missing symbol parameter',
      });
      return;
    }

    console.log(`Fetching 24h ticker for ${symbol}`);

    const ticker = await BinanceAPI.get24hTicker(symbol);

    res.json(ticker);
  } catch (error) {
    console.error('Error fetching 24h ticker:', error);
    res.status(500).json({
      error: `Failed to fetch ticker: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/coins/klines/:symbol
 * Get candlestick/kline data for charts from Binance
 */
router.get('/klines/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = (req.query.interval as string) || '1m';
    const limit = parseInt(req.query.limit as string) || 60;
    const validatedLimit = Math.min(Math.max(limit, 1), 1000); // Clamp between 1 and 1000

    if (!symbol) {
      res.status(400).json({
        error: 'Missing symbol parameter',
      });
      return;
    }

    console.log(`Fetching ${validatedLimit} klines for ${symbol} at ${interval} interval`);

    const klines = await BinanceAPI.getKlines(symbol, interval, validatedLimit);

    res.json(klines);
  } catch (error) {
    console.error('Error fetching klines:', error);
    res.status(500).json({
      error: `Failed to fetch klines: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/coins/mapping
 * Get mapping between CoinGecko IDs and Binance symbols
 */
router.get('/mapping', async (_req: Request, res: Response) => {
  try {
    const mapping = await CoinGeckoAPI.getCoinGeckoToBinanceMapping();

    res.json(mapping);
  } catch (error) {
    console.error('Error fetching mapping:', error);
    res.status(500).json({
      error: `Failed to fetch mapping: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

export default router;

