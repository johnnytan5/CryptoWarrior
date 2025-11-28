"""Crypto API integrations for CoinGecko and Binance."""

import httpx
import logging
from typing import List, Dict, Any, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# API Base URLs
COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"
BINANCE_BASE_URL = "https://api.binance.com/api/v3"

# HTTP client with increased timeout and retry configuration
# Increased timeout to 30 seconds to handle slow network conditions
# Using separate timeouts for connect (5s) and read (30s)
http_client = httpx.Client(
    timeout=httpx.Timeout(30.0, connect=5.0),
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
)


class CoinGeckoAPI:
    """CoinGecko API client for fetching coin images and metadata."""
    
    @staticmethod
    def get_top_coins(limit: int = 30, vs_currency: str = "usd") -> List[Dict[str, Any]]:
        """
        Get top coins by market cap with images and basic info.
        
        Args:
            limit: Number of coins to fetch (max 250)
            vs_currency: Currency for price data (default: usd)
            
        Returns:
            List of coins with id, symbol, name, image, current_price, etc.
        """
        try:
            url = f"{COINGECKO_BASE_URL}/coins/markets"
            params = {
                "vs_currency": vs_currency,
                "order": "market_cap_desc",
                "per_page": limit,
                "page": 1,
                "sparkline": False,
                "price_change_percentage": "1h,24h",
            }
            
            response = http_client.get(url, params=params)
            response.raise_for_status()
            
            coins = response.json()
            
            # Map to our format
            result = []
            for coin in coins:
                result.append({
                    "id": coin["id"],  # e.g., "bitcoin"
                    "symbol": coin["symbol"].upper(),  # e.g., "BTC"
                    "name": coin["name"],  # e.g., "Bitcoin"
                    "image": coin["image"],  # Image URL
                    "current_price": coin["current_price"],
                    "market_cap_rank": coin["market_cap_rank"],
                    "price_change_percentage_1h": coin.get("price_change_percentage_1h_in_currency"),
                    "price_change_percentage_24h": coin.get("price_change_percentage_24h"),
                })
            
            logger.info(f"Fetched {len(result)} coins from CoinGecko")
            return result
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.error(f"CoinGecko API rate limited (429)")
                raise Exception("CoinGecko API rate limited. Please try again in a moment.")
            else:
                logger.error(f"CoinGecko API HTTP error: {e.response.status_code} - {e}")
                raise Exception(f"CoinGecko API error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"CoinGecko API error: {e}")
            raise Exception(f"Failed to fetch coins from CoinGecko: {str(e)}")
    
    @staticmethod
    def get_coin_info(coin_id: str) -> Dict[str, Any]:
        """
        Get detailed info for a specific coin.
        
        Args:
            coin_id: CoinGecko coin ID (e.g., "bitcoin")
            
        Returns:
            Coin info with image, symbol, name, etc.
        """
        try:
            # Use the simpler /coins/markets endpoint with a single coin
            url = f"{COINGECKO_BASE_URL}/coins/markets"
            params = {
                "vs_currency": "usd",
                "ids": coin_id,  # Single coin by ID
                "order": "market_cap_desc",
                "per_page": 1,
                "page": 1,
            }
            
            response = http_client.get(url, params=params)
            response.raise_for_status()
            
            coins = response.json()
            
            if not coins or len(coins) == 0:
                raise Exception(f"Coin {coin_id} not found")
            
            coin = coins[0]
            
            return {
                "id": coin["id"],
                "symbol": coin["symbol"].upper(),
                "name": coin["name"],
                "image": coin["image"],  # Direct image URL
            }
            
        except Exception as e:
            logger.error(f"CoinGecko coin info error for {coin_id}: {e}")
            raise Exception(f"Failed to fetch coin info: {str(e)}")
    
    @staticmethod
    def get_coingecko_to_binance_mapping() -> Dict[str, str]:
        """
        Map CoinGecko coin IDs to Binance trading pairs.
        
        Returns:
            Dictionary mapping CoinGecko ID to Binance symbol (e.g., {"bitcoin": "BTCUSDT"})
        """
        return {
            "bitcoin": "BTCUSDT",
            "ethereum": "ETHUSDT",
            "tether": "USDTUSDT",
            "binancecoin": "BNBUSDT",
            "solana": "SOLUSDT",
            "ripple": "XRPUSDT",
            "usd-coin": "USDCUSDT",
            "staked-ether": "STETHUSDT",
            "cardano": "ADAUSDT",
            "dogecoin": "DOGEUSDT",
            "tron": "TRXUSDT",
            "avalanche-2": "AVAXUSDT",
            "chainlink": "LINKUSDT",
            "polkadot": "DOTUSDT",
            "polygon": "MATICUSDT",
            "wrapped-bitcoin": "WBTCUSDT",
            "shiba-inu": "SHIBUSDT",
            "litecoin": "LTCUSDT",
            "bitcoin-cash": "BCHUSDT",
            "uniswap": "UNIUSDT",
            "stellar": "XLMUSDT",
            "cosmos": "ATOMUSDT",
            "monero": "XMRUSDT",
            "okb": "OKBUSDT",
            "ethereum-classic": "ETCUSDT",
            "internet-computer": "ICPUSDT",
            "filecoin": "FILUSDT",
            "aptos": "APTUSDT",
            "hedera-hashgraph": "HBARUSDT",
            "cronos": "CROUSDT",
        }


class BinanceAPI:
    """Binance API client for real-time price updates."""
    
    @staticmethod
    def get_price(symbol: str, retries: int = 2) -> Dict[str, Any]:
        """
        Get current price for a trading pair with retry logic.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            retries: Number of retry attempts (default: 2)
            
        Returns:
            Price data with symbol and price
        """
        import time
        
        url = f"{BINANCE_BASE_URL}/ticker/price"
        params = {"symbol": symbol}
        
        last_error = None
        for attempt in range(retries + 1):
            try:
                response = http_client.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                
                return {
                    "symbol": data["symbol"],
                    "price": float(data["price"]),
                }
                
            except httpx.TimeoutException as e:
                last_error = e
                if attempt < retries:
                    wait_time = (attempt + 1) * 1.0  # Exponential backoff: 1s, 2s
                    logger.warning(f"Binance API timeout for {symbol} (attempt {attempt + 1}/{retries + 1}), retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Binance API timeout for {symbol} after {retries + 1} attempts")
                    raise Exception(f"Failed to fetch price from Binance: Request timed out after {retries + 1} attempts. This may be due to network issues or Binance API being slow.")
            except Exception as e:
                last_error = e
                if attempt < retries and isinstance(e, (httpx.NetworkError, httpx.ConnectError)):
                    wait_time = (attempt + 1) * 1.0
                    logger.warning(f"Binance API network error for {symbol} (attempt {attempt + 1}/{retries + 1}), retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Binance API error for {symbol}: {e}")
                    raise Exception(f"Failed to fetch price from Binance: {str(e)}")
        
        # Should never reach here, but just in case
        raise Exception(f"Failed to fetch price from Binance after {retries + 1} attempts: {str(last_error)}")
    
    @staticmethod
    def get_multiple_prices(symbols: List[str]) -> List[Dict[str, Any]]:
        """
        Get current prices for multiple trading pairs.
        
        Args:
            symbols: List of trading pairs (e.g., ["BTCUSDT", "ETHUSDT"])
            
        Returns:
            List of price data
        """
        try:
            url = f"{BINANCE_BASE_URL}/ticker/price"
            
            response = http_client.get(url)
            response.raise_for_status()
            
            all_prices = response.json()
            
            # Filter for requested symbols
            symbol_set = set(symbols)
            result = []
            
            for price_data in all_prices:
                if price_data["symbol"] in symbol_set:
                    result.append({
                        "symbol": price_data["symbol"],
                        "price": float(price_data["price"]),
                    })
            
            return result
            
        except Exception as e:
            logger.error(f"Binance API error for multiple prices: {e}")
            raise Exception(f"Failed to fetch prices from Binance: {str(e)}")
    
    @staticmethod
    def get_24h_ticker(symbol: str) -> Dict[str, Any]:
        """
        Get 24-hour price change statistics.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            
        Returns:
            24h stats including price change, volume, high, low
        """
        try:
            url = f"{BINANCE_BASE_URL}/ticker/24hr"
            params = {"symbol": symbol}
            
            response = http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                "symbol": data["symbol"],
                "price": float(data["lastPrice"]),
                "price_change": float(data["priceChange"]),
                "price_change_percent": float(data["priceChangePercent"]),
                "high_24h": float(data["highPrice"]),
                "low_24h": float(data["lowPrice"]),
                "volume": float(data["volume"]),
            }
            
        except Exception as e:
            logger.error(f"Binance 24h ticker error for {symbol}: {e}")
            raise Exception(f"Failed to fetch 24h ticker: {str(e)}")
    
    @staticmethod
    def get_klines(symbol: str, interval: str = "1m", limit: int = 60) -> List[Dict[str, Any]]:
        """
        Get candlestick/kline data for charts.
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            interval: Kline interval (1m, 3m, 5m, 15m, 30m, 1h, etc.)
            limit: Number of klines to fetch (max 1000)
            
        Returns:
            List of kline data with timestamp, open, high, low, close
        """
        try:
            url = f"{BINANCE_BASE_URL}/klines"
            params = {
                "symbol": symbol,
                "interval": interval,
                "limit": limit,
            }
            
            response = http_client.get(url, params=params)
            response.raise_for_status()
            
            klines = response.json()
            
            result = []
            for kline in klines:
                result.append({
                    "timestamp": int(kline[0]),  # Open time
                    "open": float(kline[1]),
                    "high": float(kline[2]),
                    "low": float(kline[3]),
                    "close": float(kline[4]),
                    "volume": float(kline[5]),
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Binance klines error for {symbol}: {e}")
            raise Exception(f"Failed to fetch klines: {str(e)}")
    
    @staticmethod
    def get_top_coins_by_volume(limit: int = 30) -> List[Dict[str, Any]]:
        """
        Get top USDT trading pairs from Binance by 24h volume.
        
        Args:
            limit: Number of coins to return (default: 30)
            
        Returns:
            List of coins with symbol, price, volume, and 24h change
        """
        try:
            url = f"{BINANCE_BASE_URL}/ticker/24hr"
            
            response = http_client.get(url)
            response.raise_for_status()
            
            all_tickers = response.json()
            
            # Filter for USDT pairs only and exclude stablecoins
            usdt_pairs = []
            excluded_symbols = {'USDTUSDT', 'TUSDUSDT', 'BUSDUSDT', 'DAIUSDT', 'FDUSDUSDT'}
            
            for ticker in all_tickers:
                symbol = ticker['symbol']
                # Only USDT pairs (for USD pricing)
                if symbol.endswith('USDT') and symbol not in excluded_symbols:
                    try:
                        usdt_pairs.append({
                            'symbol': symbol,
                            'base_symbol': symbol[:-4],  # Remove 'USDT' suffix
                            'price': float(ticker['lastPrice']),
                            'volume_usdt': float(ticker['quoteVolume']),  # Volume in USDT
                            'price_change_24h': float(ticker['priceChangePercent']),
                        })
                    except (ValueError, KeyError) as e:
                        logger.warning(f"Skipping {symbol}: {e}")
                        continue
            
            # Sort by volume (highest first)
            usdt_pairs.sort(key=lambda x: x['volume_usdt'], reverse=True)
            
            # Get top N
            top_coins = usdt_pairs[:limit]
            
            logger.info(f"Fetched top {len(top_coins)} coins from Binance by volume")
            
            return top_coins
            
        except Exception as e:
            logger.error(f"Binance top coins error: {e}")
            raise Exception(f"Failed to fetch top coins from Binance: {str(e)}")


# Initialize APIs
coingecko = CoinGeckoAPI()
binance = BinanceAPI()


def get_top_tradeable_coins(limit: int = 30) -> List[Dict[str, Any]]:
    """
    Get top coins from CoinGecko and map to Binance trading pairs.
    Simple and fast approach: fetch top 30 from CoinGecko, map to Binance.
    
    Args:
        limit: Number of coins to return
        
    Returns:
        List of coins with Binance symbol, price, and CoinGecko image
    """
    # CoinGecko ID -> Binance symbol mapping
    coingecko_to_binance = {
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
        "kucoin-shares": "KCSUSDT",
        "elrond-erd-2": "EGLDUSDT",
        "neo": "NEOUSDT",
        "dash": "DASHUSDT",
        "zcash": "ZECUSDT",
        "pancakeswap-token": "CAKEUSDT",
        "sushi": "SUSHIUSDT",
        "toncoin": "TONUSDT",
    }
    
    # Step 1: Fetch top coins from CoinGecko (fetch more to account for filtering)
    # Fetch 40 coins to get 30 tradeable ones (avoiding rate limits)
    logger.info(f"Fetching top 40 coins from CoinGecko to find {limit} tradeable ones")
    try:
        coins = coingecko.get_top_coins(limit=40)
        logger.info(f"Fetched {len(coins)} coins from CoinGecko")
    except Exception as e:
        logger.error(f"Failed to fetch coins from CoinGecko: {e}")
        # If rate limited, try with smaller limit after a longer delay
        if "429" in str(e) or "Too Many Requests" in str(e) or "rate limited" in str(e).lower():
            logger.warning("Rate limited, waiting 3 seconds then trying with smaller limit (30)")
            try:
                import time
                time.sleep(3)  # Wait 3 seconds before retry (CoinGecko free tier resets quickly)
                coins = coingecko.get_top_coins(limit=30)
                logger.info(f"Fetched {len(coins)} coins from CoinGecko (fallback)")
            except Exception as e2:
                logger.error(f"Fallback also failed: {e2}")
                raise Exception(f"CoinGecko API rate limited. Please wait 30-60 seconds and try again.")
        else:
            raise Exception(f"Failed to fetch top coins: {str(e)}")
    
    # Step 2: Filter to only coins that have Binance mappings
    result = []
    for coin in coins:
        coin_id = coin['id']
        
        # Check if this coin has a Binance mapping
        binance_symbol = coingecko_to_binance.get(coin_id)
        if not binance_symbol:
            continue  # Skip coins without Binance mapping
        
        # Extract base symbol from Binance trading pair (e.g., "BTCUSDT" -> "BTC")
        base_symbol = binance_symbol.replace("USDT", "")
        
        # Use CoinGecko prices directly for speed (we already have them)
        # Binance prices will be fetched during live battle polling
        current_price = coin.get('current_price', 0)
        price_change_24h = coin.get('price_change_percentage_24h', 0)
        
        result.append({
            'id': coin_id,
            'symbol': base_symbol,
            'name': coin['name'],
            'binance_symbol': binance_symbol,
            'image': coin.get('image', ''),
            'current_price': current_price,
            'price_change_percentage_24h': price_change_24h,
            'market_cap_rank': coin.get('market_cap_rank'),
        })
        
        if len(result) >= limit:
            break
    
    logger.info(f"Returning {len(result)} coins with Binance mappings")
    return result

