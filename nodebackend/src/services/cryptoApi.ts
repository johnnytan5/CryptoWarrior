import axios, { AxiosInstance } from 'axios';
import { CoinInfo, PriceData, Ticker24hData, KlineData } from '../types';
import https from 'https';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// HTTP client with increased timeout and SSL config
// Note: If behind VPN, Node.js should respect system proxy settings
const httpClient: AxiosInstance = axios.create({
  timeout: 60000, // Increase to 60 seconds
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; CryptoWarrior/1.0)',
  },
  // Allow self-signed certificates if VPN is interfering
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Only use if VPN causes cert issues
  }),
});

export class CoinGeckoAPI {
  /**
   * Get top coins by market cap with images and basic info
   */
  static async getTopCoins(limit: number = 30, vsCurrency: string = 'usd'): Promise<any[]> {
    try {
      const response = await httpClient.get(`${COINGECKO_BASE_URL}/coins/markets`, {
        params: {
          vs_currency: vsCurrency,
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false,
          price_change_percentage: '1h,24h',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching top coins from CoinGecko:', error);
      throw new Error(`Failed to fetch top coins: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get detailed information for a specific coin
   */
  static async getCoinInfo(coinId: string): Promise<CoinInfo> {
    try {
      const response = await httpClient.get(`${COINGECKO_BASE_URL}/coins/${coinId}`);
      const data = response.data;

      // Map to our CoinInfo format
      return {
        id: data.id,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        binance_symbol: `${data.symbol.toUpperCase()}USDT`, // Default mapping
        image: data.image?.large || data.image?.small || '',
        current_price: data.market_data?.current_price?.usd,
        market_cap_rank: data.market_cap_rank,
        price_change_percentage_1h: data.market_data?.price_change_percentage_1h_in_currency?.usd,
        price_change_percentage_24h: data.market_data?.price_change_percentage_24h_in_currency?.usd,
        volume_24h: data.market_data?.total_volume?.usd,
      };
    } catch (error) {
      console.error(`Error fetching coin info for ${coinId}:`, error);
      throw new Error(`Failed to fetch coin info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get mapping between CoinGecko IDs and Binance symbols
   */
  static async getCoinGeckoToBinanceMapping(): Promise<Record<string, string>> {
    try {
      // Get top coins from CoinGecko
      const coins = await this.getTopCoins(250);
      const mapping: Record<string, string> = {};

      for (const coin of coins) {
        const symbol = coin.symbol.toUpperCase();
        mapping[coin.id] = `${symbol}USDT`;
      }

      return mapping;
    } catch (error) {
      console.error('Error creating coin mapping:', error);
      throw new Error(`Failed to create mapping: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export class BinanceAPI {
  /**
   * Get real-time price for a symbol
   */
  static async getPrice(symbol: string): Promise<PriceData> {
    try {
      const response = await httpClient.get(`${BINANCE_BASE_URL}/ticker/price`, {
        params: { symbol: symbol.toUpperCase() },
      });
      return {
        symbol: symbol.toUpperCase(),
        price: parseFloat(response.data.price),
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw new Error(`Failed to fetch price: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get prices for multiple symbols
   */
  static async getMultiplePrices(symbols: string[]): Promise<PriceData[]> {
    try {
      const response = await httpClient.get(`${BINANCE_BASE_URL}/ticker/price`);
      const allPrices = response.data as Array<{ symbol: string; price: string }>;
      
      // Filter to requested symbols
      const symbolSet = new Set(symbols.map(s => s.toUpperCase()));
      const filtered = allPrices
        .filter(p => symbolSet.has(p.symbol))
        .map(p => ({
          symbol: p.symbol,
          price: parseFloat(p.price),
        }));

      return filtered;
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      throw new Error(`Failed to fetch prices: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get 24-hour ticker statistics
   */
  static async get24hTicker(symbol: string): Promise<Ticker24hData> {
    try {
      const response = await httpClient.get(`${BINANCE_BASE_URL}/ticker/24hr`, {
        params: { symbol: symbol.toUpperCase() },
      });
      const data = response.data;
      return {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        price_change: parseFloat(data.priceChange),
        price_change_percent: parseFloat(data.priceChangePercent),
        high_24h: parseFloat(data.highPrice),
        low_24h: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
      };
    } catch (error) {
      console.error(`Error fetching 24h ticker for ${symbol}:`, error);
      throw new Error(`Failed to fetch ticker: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get candlestick/kline data
   */
  static async getKlines(
    symbol: string,
    interval: string = '1m',
    limit: number = 60
  ): Promise<KlineData[]> {
    try {
      const response = await httpClient.get(`${BINANCE_BASE_URL}/klines`, {
        params: {
          symbol: symbol.toUpperCase(),
          interval,
          limit,
        },
      });

      return response.data.map((kline: any[]) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      throw new Error(`Failed to fetch klines: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all trading pairs available on Binance
   */
  static async getAllTradingPairs(): Promise<string[]> {
    try {
      console.log('Fetching Binance exchange info...');
      const response = await httpClient.get(`${BINANCE_BASE_URL}/exchangeInfo`, {
        timeout: 60000, // 60 second timeout for this specific call
      });
      const symbols = response.data.symbols
        .filter((s: any) => s.status === 'TRADING' && s.symbol.endsWith('USDT'))
        .map((s: any) => s.symbol);
      console.log(`Fetched ${symbols.length} USDT trading pairs from Binance`);
      return symbols;
    } catch (error) {
      console.error('Error fetching trading pairs from Binance:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Binance API timeout - check your internet connection or VPN settings');
        }
        if (error.code === 'ENOTFOUND') {
          throw new Error('Cannot resolve Binance API - check DNS or VPN settings');
        }
        throw new Error(`Binance API error: ${error.message}`);
      }
      throw new Error(`Failed to fetch trading pairs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Get top tradeable coins from Binance with images from CoinGecko
 */
export async function getTopTradeableCoins(limit: number = 30): Promise<CoinInfo[]> {
  try {
    // Simplified approach: Use hardcoded mapping instead of fetching all trading pairs
    // This avoids the timeout issue with Binance exchangeInfo endpoint
    console.log('Using hardcoded Binance trading pair mappings');
    
    const coingeckoToBinance: Record<string, string> = {
      "bitcoin": "BTCUSDT",
      "ethereum": "ETHUSDT",
      "binancecoin": "BNBUSDT",
      "solana": "SOLUSDT",
      "ripple": "XRPUSDT",
      "usd-coin": "USDCUSDT",
      "cardano": "ADAUSDT",
      "dogecoin": "DOGEUSDT",
      "tron": "TRXUSDT",
      "avalanche-2": "AVAXUSDT",
      "chainlink": "LINKUSDT",
      "polkadot": "DOTUSDT",
      "polygon": "MATICUSDT",
      "shiba-inu": "SHIBUSDT",
      "litecoin": "LTCUSDT",
      "bitcoin-cash": "BCHUSDT",
      "uniswap": "UNIUSDT",
      "stellar": "XLMUSDT",
      "cosmos": "ATOMUSDT",
      "monero": "XMRUSDT",
      "ethereum-classic": "ETCUSDT",
      "internet-computer": "ICPUSDT",
      "filecoin": "FILUSDT",
      "aptos": "APTUSDT",
      "hedera-hashgraph": "HBARUSDT",
      "cronos": "CROUSDT",
      "near": "NEARUSDT",
      "vechain": "VETUSDT",
      "algorand": "ALGOUSDT",
      "arbitrum": "ARBUSDT",
      "optimism": "OPUSDT",
      "maker": "MKRUSDT",
      "aave": "AAVEUSDT",
      "the-graph": "GRTUSDT",
      "the-sandbox": "SANDUSDT",
      "decentraland": "MANAUSDT",
      "axie-infinity": "AXSUSDT",
      "fantom": "FTMUSDT",
      "eos": "EOSUSDT",
      "tezos": "XTZUSDT",
      "theta-token": "THETAUSDT",
      "thorchain": "RUNEUSDT",
      "elrond-erd-2": "EGLDUSDT",
      "neo": "NEOUSDT",
      "dash": "DASHUSDT",
      "zcash": "ZECUSDT",
      "pancakeswap-token": "CAKEUSDT",
      "sushi": "SUSHIUSDT",
      "toncoin": "TONUSDT",
    };

    // Get top coins from CoinGecko
    console.log(`Fetching top ${limit * 2} coins from CoinGecko`);
    const coingeckoCoins = await CoinGeckoAPI.getTopCoins(limit * 2);
    console.log(`Fetched ${coingeckoCoins.length} coins from CoinGecko`);

    // Filter to only coins that have Binance mappings
    const result: CoinInfo[] = [];
    const seenSymbols = new Set<string>();

    for (const coin of coingeckoCoins) {
      if (result.length >= limit) break;

      const coinId = coin.id;
      const binanceSymbol = coingeckoToBinance[coinId];

      if (binanceSymbol && !seenSymbols.has(coin.symbol)) {
        seenSymbols.add(coin.symbol);
        const baseSymbol = binanceSymbol.replace('USDT', '');

        result.push({
          id: coinId,
          symbol: baseSymbol,
          name: coin.name,
          binance_symbol: binanceSymbol,
          image: coin.image || '',
          current_price: coin.current_price,
          market_cap_rank: coin.market_cap_rank,
          price_change_percentage_1h: coin.price_change_percentage_1h,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          volume_24h: coin.total_volume,
        });
      }
    }

    console.log(`Returning ${result.length} coins with Binance mappings`);
    return result;
  } catch (error) {
    console.error('Error getting top tradeable coins:', error);
    throw new Error(`Failed to get top tradeable coins: ${error instanceof Error ? error.message : String(error)}`);
  }
}

