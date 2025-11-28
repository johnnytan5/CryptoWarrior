"""FastAPI backend for Crypto Battle Arena."""

from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from config import settings
from onechain_client import onechain_client
from crypto_api import coingecko, binance, get_top_tradeable_coins

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Crypto Battle Arena API",
    description="Backend API for Crypto Battle Arena on OneChain",
    version="1.0.0",
    debug=settings.debug,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Request/Response Models ===

class MintTokensRequest(BaseModel):
    """Request model for minting tokens."""
    address: str = Field(..., description="Recipient's Sui address")
    amount: int = Field(..., gt=0, description="Amount of tokens to mint")


class MintTokensResponse(BaseModel):
    """Response model for minting tokens."""
    success: bool
    recipient: str
    amount: int
    message: str
    transaction_digest: Optional[str] = None


class CreateBattleRequest(BaseModel):
    """Request model for creating a battle."""
    player1_address: str = Field(..., description="Player 1's Sui address")
    stake_amount: int = Field(..., gt=0, description="Amount to stake")
    opponent_address: Optional[str] = Field(None, description="Opponent's address (optional for now)")
    coin_object_id: Optional[str] = Field(None, description="Optional coin object ID (auto-selected if not provided)")


class CreateBattleResponse(BaseModel):
    """Response model for creating a battle."""
    success: bool
    battle_id: str
    player1: str
    stake_amount: int
    message: str
    transaction_digest: Optional[str] = None


class JoinBattleRequest(BaseModel):
    """Request model for joining a battle."""
    battle_id: str = Field(..., description="Battle object ID to join")
    player2_address: str = Field(..., description="Player 2's Sui address")
    stake_amount: int = Field(..., gt=0, description="Amount to stake")
    coin_object_id: Optional[str] = Field(None, description="Optional coin object ID (auto-selected if not provided)")


class JoinBattleResponse(BaseModel):
    """Response model for joining a battle."""
    success: bool
    battle_id: str
    player2: str
    stake_amount: int
    message: str
    transaction_digest: Optional[str] = None


class FinalizeBattleRequest(BaseModel):
    """Request model for finalizing a battle."""
    battle_id: str = Field(..., description="Battle object ID")
    winner: str = Field(..., description="Winner's Sui address")


class FinalizeBattleResponse(BaseModel):
    """Response model for finalizing a battle."""
    success: bool
    battle_id: str
    winner: str
    message: str
    transaction_digest: Optional[str] = None
    total_prize: Optional[int] = None


class BattleDetailsResponse(BaseModel):
    """Response model for battle details."""
    id: str
    player1: str
    player2: str
    stake_amount: int
    is_ready: bool
    admin: str


class UserBalanceResponse(BaseModel):
    """Response model for user balance."""
    address: str
    total_balance: int
    human_readable_balance: float
    coins: list


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    network: str
    package_id: str


class CoinInfo(BaseModel):
    """Model for coin information."""
    id: str
    symbol: str
    name: str
    binance_symbol: str  # Binance trading pair (e.g., "BTCUSDT")
    image: str
    current_price: Optional[float] = None
    market_cap_rank: Optional[int] = None
    price_change_percentage_1h: Optional[float] = None
    price_change_percentage_24h: Optional[float] = None
    volume_24h: Optional[float] = None


class PriceData(BaseModel):
    """Model for price data."""
    symbol: str
    price: float


class Ticker24hData(BaseModel):
    """Model for 24h ticker data."""
    symbol: str
    price: float
    price_change: float
    price_change_percent: float
    high_24h: float
    low_24h: float
    volume: float


class KlineData(BaseModel):
    """Model for kline/candlestick data."""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


# === API Routes ===

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "network": settings.onechain_network,
        "package_id": settings.package_id,
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "network": settings.onechain_network,
        "package_id": settings.package_id,
    }


# === Crypto Market Data Endpoints ===

@app.get("/api/coins/top", response_model=List[CoinInfo])
async def get_top_coins(limit: int = Query(default=30, le=50, ge=1)):
    """
    Get top tradeable coins from Binance with images from CoinGecko.
    
    This endpoint fetches coins that are:
    1. Available on Binance (so we can get real-time prices)
    2. Enriched with CoinGecko images and metadata
    
    All returned coins are guaranteed to have Binance trading pairs.
    
    Args:
        limit: Number of coins to fetch (1-50, default: 30)
        
    Returns:
        List of tradeable coins with images and metadata
    """
    try:
        logger.info(f"Fetching top {limit} tradeable coins from Binance")
        coins = get_top_tradeable_coins(limit=limit)
        logger.info(f"Returning {len(coins)} coins, all tradeable on Binance")
        return coins
    except Exception as e:
        logger.error(f"Error fetching top coins: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch coins: {str(e)}"
        )


@app.get("/api/coins/{coin_id}/info", response_model=CoinInfo)
async def get_coin_info(coin_id: str):
    """
    Get detailed information for a specific coin from CoinGecko.
    
    Args:
        coin_id: CoinGecko coin ID (e.g., "bitcoin", "ethereum")
        
    Returns:
        Coin information with image and metadata
    """
    try:
        logger.info(f"Fetching coin info for {coin_id}")
        coin = coingecko.get_coin_info(coin_id)
        return coin
    except Exception as e:
        logger.error(f"Error fetching coin info: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coin not found: {str(e)}"
        )


@app.get("/api/price/{symbol}", response_model=PriceData)
async def get_price(symbol: str):
    """
    Get real-time price from Binance.
    
    Use this endpoint for live price updates during battles.
    
    Args:
        symbol: Binance trading pair (e.g., "BTCUSDT", "ETHUSDT")
        
    Returns:
        Current price data
        
    Example:
        GET /api/price/BTCUSDT
    """
    try:
        logger.info(f"Fetching price for {symbol}")
        price_data = binance.get_price(symbol.upper())
        return price_data
    except Exception as e:
        logger.error(f"Error fetching price: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch price: {str(e)}"
        )


@app.get("/api/price/batch", response_model=List[PriceData])
async def get_multiple_prices(symbols: str = Query(..., description="Comma-separated list of symbols (e.g., 'BTCUSDT,ETHUSDT')")):
    """
    Get real-time prices for multiple coins from Binance.
    
    Efficient way to fetch multiple prices in a single request.
    
    Args:
        symbols: Comma-separated trading pairs (e.g., "BTCUSDT,ETHUSDT,SOLUSDT")
        
    Returns:
        List of price data for requested symbols
        
    Example:
        GET /api/price/batch?symbols=BTCUSDT,ETHUSDT,SOLUSDT
    """
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        logger.info(f"Fetching prices for {len(symbol_list)} symbols")
        prices = binance.get_multiple_prices(symbol_list)
        return prices
    except Exception as e:
        logger.error(f"Error fetching multiple prices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch prices: {str(e)}"
        )


@app.get("/api/ticker/{symbol}", response_model=Ticker24hData)
async def get_24h_ticker(symbol: str):
    """
    Get 24-hour price statistics from Binance.
    
    Includes price change, high/low, and volume.
    
    Args:
        symbol: Binance trading pair (e.g., "BTCUSDT")
        
    Returns:
        24h ticker statistics
    """
    try:
        logger.info(f"Fetching 24h ticker for {symbol}")
        ticker = binance.get_24h_ticker(symbol.upper())
        return ticker
    except Exception as e:
        logger.error(f"Error fetching 24h ticker: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ticker: {str(e)}"
        )


@app.get("/api/klines/{symbol}", response_model=List[KlineData])
async def get_klines(
    symbol: str,
    interval: str = Query(default="1m", description="Kline interval (1m, 3m, 5m, 15m, 30m, 1h, etc.)"),
    limit: int = Query(default=60, le=1000, ge=1, description="Number of klines to fetch")
):
    """
    Get candlestick/kline data for charts from Binance.
    
    Perfect for displaying price charts during battles.
    
    Args:
        symbol: Binance trading pair (e.g., "BTCUSDT")
        interval: Kline interval (1m, 3m, 5m, 15m, 30m, 1h, etc.)
        limit: Number of klines (1-1000, default: 60)
        
    Returns:
        List of kline data points
        
    Example:
        GET /api/klines/BTCUSDT?interval=1m&limit=60
        # Returns last 60 minutes of 1-minute candlesticks
    """
    try:
        logger.info(f"Fetching {limit} klines for {symbol} at {interval} interval")
        klines = binance.get_klines(symbol.upper(), interval, limit)
        return klines
    except Exception as e:
        logger.error(f"Error fetching klines: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch klines: {str(e)}"
        )


@app.get("/api/coins/mapping")
async def get_coin_mapping():
    """
    Get mapping between CoinGecko IDs and Binance symbols.
    
    Useful for converting coin selections to Binance trading pairs.
    
    Returns:
        Dictionary mapping CoinGecko ID to Binance symbol
        
    Example:
        {"bitcoin": "BTCUSDT", "ethereum": "ETHUSDT", ...}
    """
    try:
        mapping = coingecko.get_coingecko_to_binance_mapping()
        return mapping
    except Exception as e:
        logger.error(f"Error fetching mapping: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch mapping: {str(e)}"
        )


@app.post("/api/tokens/mint", response_model=MintTokensResponse)
async def mint_tokens(request: MintTokensRequest):
    """
    Mint battle tokens to a user's address.
    
    This endpoint is called when:
    - A new user connects their wallet
    - User needs more tokens for battles
    - Admin wants to airdrop tokens
    """
    try:
        logger.info(f"Minting {request.amount} tokens to {request.address}")
        
        result = onechain_client.mint_tokens(
            recipient=request.address,
            amount=request.amount
        )
        
        return MintTokensResponse(
            success=result["success"],
            recipient=result["recipient"],
            amount=result["amount"],
            message=result["message"],
        )
        
    except Exception as e:
        logger.error(f"Mint tokens error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mint tokens: {str(e)}"
        )


@app.post("/api/battles/create", response_model=CreateBattleResponse)
async def create_battle(request: CreateBattleRequest):
    """
    Create a new battle.
    
    This endpoint is called when:
    - Player 1 wants to start a new battle
    - They stake their tokens to create the battle
    """
    try:
        logger.info(f"Creating battle: {request.stake_amount} tokens from {request.player1_address}")
        
        result = onechain_client.create_battle(
            player1_address=request.player1_address,
            stake_amount=request.stake_amount,
            coin_object_id=request.coin_object_id,
            opponent_address=request.opponent_address
        )
        
        return CreateBattleResponse(
            success=result["success"],
            battle_id=result["battle_id"],
            player1=result["player1"],
            stake_amount=result["stake_amount"],
            message=result["message"],
        )
        
    except Exception as e:
        logger.error(f"Create battle error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create battle: {str(e)}"
        )


@app.post("/api/battles/join", response_model=JoinBattleResponse)
async def join_battle(request: JoinBattleRequest):
    """
    Join an existing battle.
    
    This endpoint is called when:
    - Player 2 wants to join an existing battle
    - They stake their tokens to join
    """
    try:
        logger.info(f"Joining battle {request.battle_id}: {request.player2_address}")
        
        # Verify battle exists and is ready to join
        try:
            battle = onechain_client.get_battle_details(request.battle_id)
            # Check if battle is already ready (player2 has already staked)
            if battle.get("is_ready"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Battle already has both players staked"
                )
            if battle.get("stake_amount") != request.stake_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stake amount must be {battle.get('stake_amount')}"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Could not verify battle state: {e}")
        
        result = onechain_client.join_battle(
            battle_id=request.battle_id,
            player2_address=request.player2_address,
            stake_amount=request.stake_amount,
            coin_object_id=request.coin_object_id
        )
        
        return JoinBattleResponse(
            success=result["success"],
            battle_id=result["battle_id"],
            player2=result["player2"],
            stake_amount=result["stake_amount"],
            message=result["message"],
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Join battle error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join battle: {str(e)}"
        )


@app.post("/api/battles/finalize", response_model=FinalizeBattleResponse)
async def finalize_battle(request: FinalizeBattleRequest):
    """
    Finalize a battle and declare the winner.
    
    This endpoint is called when:
    - The game logic determines a winner
    - Admin manually finalizes a battle
    """
    try:
        logger.info(f"Finalizing battle {request.battle_id}, winner: {request.winner}")
        
        # Optionally verify battle is ready before finalizing
        try:
            battle = onechain_client.get_battle_details(request.battle_id)
            if not battle.get("is_ready"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Battle is not ready (both players must stake)"
                )
        except Exception as e:
            logger.warning(f"Could not verify battle state: {e}")
        
        result = onechain_client.finalize_battle(
            battle_id=request.battle_id,
            winner=request.winner
        )
        
        return FinalizeBattleResponse(
            success=result["success"],
            battle_id=result["battle_id"],
            winner=result["winner"],
            message=result["message"],
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Finalize battle error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to finalize battle: {str(e)}"
        )


@app.get("/api/battles/{battle_id}", response_model=BattleDetailsResponse)
async def get_battle(battle_id: str):
    """
    Get details of a specific battle.
    
    Used by frontend to:
    - Display battle status
    - Check if battle is ready
    - Show player information
    """
    try:
        logger.info(f"Getting battle details for {battle_id}")
        
        battle = onechain_client.get_battle_details(battle_id)
        
        return BattleDetailsResponse(**battle)
        
    except Exception as e:
        logger.error(f"Get battle error: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battle not found: {str(e)}"
        )


@app.get("/api/users/{address}/balance", response_model=UserBalanceResponse)
async def get_user_balance(address: str):
    """
    Get user's battle token balance.
    
    Used by frontend to:
    - Display user's token balance
    - Check if user has enough tokens for battle
    """
    try:
        logger.info(f"Getting balance for {address}")
        
        balance = onechain_client.get_user_coins(address)
        
        logger.info(f"Balance for {address}: {balance['total_balance']} tokens, {len(balance['coins'])} coin objects")
        
        return UserBalanceResponse(**balance)
        
    except Exception as e:
        logger.error(f"Get balance error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get balance: {str(e)}"
        )


# === Error Handlers ===

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    logger.error(f"HTTP error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )

