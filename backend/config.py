"""Configuration settings for the FastAPI backend."""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings."""
    
    # OneChain Configuration
    onechain_network: str = "testnet"
    onechain_rpc_url: str = "https://rpc-testnet.onelabs.cc:443"
    
    # Smart Contract Addresses
    package_id: str
    admin_cap_id: str
    
    # Admin Wallet
    admin_private_key: str
    deployer_address: str
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    cors_origin_regex: Optional[str] = None
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"  # Allow extra fields from .env that aren't defined in the model
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


# Global settings instance
settings = Settings()

