"""Configuration settings for the FastAPI backend."""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings."""
    
    # OneChain Configuration
    onechain_network: str = "testnet"
    onechain_rpc_url: str = "https://rpc-testnet.onelabs.cc:443"
    
    # Smart Contract Addresses
    package_id: str
    mint_cap_id: str
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()

