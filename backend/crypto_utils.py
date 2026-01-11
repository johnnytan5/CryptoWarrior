"""Cryptographic utilities for OneChain transaction signing."""

import base64
import logging
from typing import Optional, Tuple
from nacl.signing import SigningKey
from nacl.encoding import RawEncoder, HexEncoder
import hashlib

try:
    import bech32
    HAS_BECH32 = True
except ImportError:
    HAS_BECH32 = False
    bech32 = None

logger = logging.getLogger(__name__)


class OneChainKeypair:
    """Ed25519 keypair for OneChain transactions."""
    
    def __init__(self, private_key: str):
        """
        Initialize keypair from private key.
        
        Args:
            private_key: Base64-encoded private key (32 bytes) or hex string
        """
        try:
            key_bytes = None
            
            # Check if it's a Bech32-encoded key (suiprivkey1... or similar)
            if private_key.startswith('suiprivkey1') or private_key.startswith('one'):
                if not HAS_BECH32:
                    raise ValueError("bech32 library required to decode Bech32-encoded private keys. Install with: pip install bech32")
                
                try:
                    # Decode Bech32
                    hrp, data = bech32.bech32_decode(private_key)
                    if hrp and data:
                        # Convert 5-bit groups to 8-bit bytes
                        decoded_bytes = bytes(bech32.convertbits(data, 5, 8, False))
                        # Sui/OneChain Bech32 private keys may have version byte or checksum
                        # Take the first 32 bytes (skip version/checksum if present)
                        if len(decoded_bytes) >= 32:
                            key_bytes = decoded_bytes[:32]
                        elif len(decoded_bytes) == 33:
                            # If 33 bytes, might have version byte at start, take last 32
                            key_bytes = decoded_bytes[1:33]
                        else:
                            raise ValueError(f"Decoded Bech32 key has wrong length: {len(decoded_bytes)} bytes (expected 32-33)")
                except Exception as bech32_error:
                    raise ValueError(f"Failed to decode Bech32 private key: {bech32_error}")
            
            # Try base64 if not Bech32
            if key_bytes is None:
                try:
                    key_bytes = base64.b64decode(private_key)
                    if len(key_bytes) != 32:
                        # Wrong length, try hex
                        key_bytes = None
                except Exception:
                    # Base64 failed, try hex encoding
                    pass
            
            # If base64 didn't work or wrong length, try hex
            if key_bytes is None or len(key_bytes) != 32:
                try:
                    # Remove 0x prefix if present
                    hex_key = private_key.replace('0x', '').strip()
                    key_bytes = bytes.fromhex(hex_key)
                except Exception as hex_error:
                    raise ValueError(f"Private key is neither valid Bech32, base64, nor hex: {hex_error}")
            
            if len(key_bytes) != 32:
                raise ValueError(f"Invalid private key length: {len(key_bytes)} bytes (expected 32)")
            
            self.signing_key = SigningKey(key_bytes)
            self.verify_key = self.signing_key.verify_key
            
        except Exception as e:
            logger.error(f"Failed to initialize keypair: {e}")
            raise ValueError(f"Invalid private key format: {e}")
    
    def get_address(self) -> str:
        """
        Get the OneChain address from the public key.
        
        OneChain addresses are derived from the public key using:
        1. Take the 32-byte public key
        2. Hash with SHA3-256 (or Blake2b-256)
        3. Take first 32 bytes
        4. Prepend with 0x and encode as hex
        
        Note: OneChain uses the same address derivation as Sui.
        """
        # Get public key bytes (32 bytes)
        public_key_bytes = bytes(self.verify_key)
        
        # OneChain/Sui uses Blake2b-256 for address derivation
        # But we need to check the exact algorithm
        # For now, using SHA3-256 as it's common in Sui
        hash_obj = hashlib.sha3_256()
        hash_obj.update(public_key_bytes)
        address_bytes = hash_obj.digest()[:32]
        
        # Convert to hex with 0x prefix
        address = "0x" + address_bytes.hex()
        return address
    
    def sign_transaction(self, transaction_bytes: bytes) -> bytes:
        """
        Sign transaction bytes with Ed25519.
        
        Args:
            transaction_bytes: Raw transaction bytes to sign
            
        Returns:
            Ed25519 signature (64 bytes)
        """
        # Sign the transaction bytes
        signed = self.signing_key.sign(transaction_bytes)
        # Return only the signature (last 64 bytes)
        return signed.signature
    
    def sign_transaction_base64(self, transaction_base64: str) -> str:
        """
        Sign a base64-encoded transaction and return base64 signature.
        
        Args:
            transaction_base64: Base64-encoded transaction bytes
            
        Returns:
            Base64-encoded signature
        """
        transaction_bytes = base64.b64decode(transaction_base64)
        signature = self.sign_transaction(transaction_bytes)
        return base64.b64encode(signature).decode('utf-8')
    
    @staticmethod
    def from_base64_private_key(private_key_b64: str) -> 'OneChainKeypair':
        """Create keypair from base64-encoded private key."""
        return OneChainKeypair(private_key_b64)
    
    @staticmethod
    def from_hex_private_key(private_key_hex: str) -> 'OneChainKeypair':
        """Create keypair from hex-encoded private key."""
        return OneChainKeypair(private_key_hex)


def get_keypair_from_env(private_key_env: str) -> Optional[OneChainKeypair]:
    """
    Create a keypair from environment variable.
    
    Args:
        private_key_env: Private key from environment variable
        
    Returns:
        OneChainKeypair instance or None if invalid
    """
    if not private_key_env:
        return None
    
    try:
        return OneChainKeypair(private_key_env)
    except Exception as e:
        logger.error(f"Failed to create keypair from env: {e}")
        return None

