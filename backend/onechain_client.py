"""OneChain blockchain client for interacting with smart contracts."""

import asyncio
from typing import Optional, Dict, Any, List
import httpx
import base64
import logging
import json
import subprocess
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class OneChainClient:
    """Client for interacting with OneChain smart contracts using JSON-RPC."""
    
    def __init__(self):
        """Initialize the OneChain client."""
        self.package_id = os.getenv("PACKAGE_ID")
        self.mint_cap_id = os.getenv("MINT_CAP_ID")
        self.admin_cap_id = os.getenv("ADMIN_CAP_ID")
        self.deployer_address = os.getenv("DEPLOYER_ADDRESS")
        self.admin_private_key = os.getenv("ADMIN_PRIVATE_KEY")
        self.rpc_url = os.getenv("ONECHAIN_RPC_URL", "https://rpc-testnet.onelabs.cc:443")
        
        # Initialize HTTP client
        self.http_client = httpx.Client(timeout=30.0)
        
        if not all([self.package_id, self.mint_cap_id, self.admin_cap_id, self.deployer_address]):
            logger.warning("OneChain client not fully configured. Check environment variables.")
    
    async def _rpc_call(self, method: str, params: list) -> Dict[str, Any]:
        """Make a JSON-RPC call to OneChain."""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        }
        
        response = self.http_client.post(
            self.rpc_url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        result = response.json()
        
        if "error" in result:
            raise Exception(f"RPC Error: {result['error']}")
        
        return result.get("result", {})
    
    def mint_tokens(
        self, 
        recipient: str, 
        amount: int
    ) -> Dict[str, Any]:
        """
        Mint battle tokens to a recipient address using CLI with auto-confirmation.
        
        Args:
            recipient: Recipient's Sui address
            amount: Amount of tokens to mint (in raw units)
            
        Returns:
            Transaction result dictionary
        """
        try:
            import subprocess
            import os
            
            logger.info(f"Minting {amount} tokens to {recipient}")
            
            # Load env file to get package and cap IDs
            env_file = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "battle_arena",
                ".env"
            )
            
            # Build the command with -y flag before call subcommand
            cmd = f"""
            cd {os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}/battle_arena && \
            source .env && \
            one client -y call \
                --package $PACKAGE_ID \
                --module battle_token \
                --function mint \
                --args $MINT_CAP_ID {amount} {recipient} \
                --gas-budget 10000000
            """
            
            logger.info(f"Executing mint command for {amount} tokens to {recipient}")
            
            # Execute with shell=True to handle piping and environment variables
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
                executable='/bin/bash'
            )
            
            logger.info(f"Command stdout: {result.stdout}")
            logger.info(f"Command stderr: {result.stderr}")
            
            if result.returncode == 0 or "Transaction executed" in result.stdout:
                logger.info(f"Successfully minted {amount} tokens to {recipient}")
                
                # Extract transaction digest if present
                tx_digest = "unknown"
                for line in result.stdout.split('\n'):
                    if "Transaction Digest" in line or "digest" in line.lower():
                        parts = line.split(":")
                        if len(parts) > 1:
                            tx_digest = parts[-1].strip()
                            break
                
                return {
                    "success": True,
                    "recipient": recipient,
                    "amount": amount,
                    "message": "Tokens minted successfully",
                    "transaction_digest": tx_digest
                }
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"Mint command failed: {error_msg}")
                raise Exception(f"Failed to mint tokens: {error_msg}")
            
        except subprocess.TimeoutExpired:
            logger.error("Mint command timed out after 60 seconds")
            raise Exception("Minting timed out - check OneChain node connection")
        except Exception as e:
            logger.error(f"Failed to mint tokens: {e}", exc_info=True)
            raise
    
    def select_and_prepare_coin(
        self,
        user_address: str,
        required_amount: int
    ) -> str:
        """
        Select a suitable coin and split it if necessary to match the required amount.
        
        Args:
            user_address: User's address
            required_amount: Amount needed (in raw units)
            
        Returns:
            Coin object ID with exactly the required amount
        """
        try:
            logger.info(f"Preparing coin for {user_address}, amount: {required_amount}")
            
            # Get user's coins
            balance_data = self.get_user_coins(user_address)
            coins = balance_data.get("coins", [])
            
            if not coins:
                raise Exception(f"No battle token coins found for {user_address}")
            
            # Check total balance
            if balance_data["total_balance"] < required_amount:
                raise Exception(
                    f"Insufficient balance. Required: {required_amount}, "
                    f"Available: {balance_data['total_balance']}"
                )
            
            # Find a coin with exact amount (best case)
            for coin in coins:
                if coin["balance"] == required_amount:
                    logger.info(f"Found exact match coin: {coin['object_id']}")
                    return coin["object_id"]
            
            # Find a coin with more than required amount and split it
            for coin in coins:
                if coin["balance"] > required_amount:
                    logger.info(f"Splitting coin {coin['object_id']}: {coin['balance']} -> {required_amount}")
                    new_coin_id = self.split_coin(coin["object_id"], required_amount)
                    return new_coin_id
            
            # If we have multiple smaller coins, we need to merge them first
            # For simplicity, we'll raise an error for now
            raise Exception(
                f"No single coin large enough to split. "
                f"Please merge your coins first or use a different staking amount."
            )
            
        except Exception as e:
            logger.error(f"Failed to prepare coin: {e}", exc_info=True)
            raise

    def create_battle(
        self,
        player1_address: str,
        stake_amount: int,
        coin_object_id: str = None,
        opponent_address: str = None
    ) -> Dict[str, Any]:
        """
        Create a new battle with player1 staking tokens using OneChain CLI.
        Automatically handles coin splitting if needed.
        
        Args:
            player1_address: Address of player1 (creator)
            stake_amount: Amount of tokens to stake
            coin_object_id: Optional specific coin to use (will be auto-selected if None)
            
        Returns:
            Transaction result with battle_id
        """
        try:
            import subprocess
            import os
            import re
            
            logger.info(f"Creating battle: {stake_amount} tokens from {player1_address}")
            
            # If no specific coin provided, auto-select and prepare
            if coin_object_id is None:
                coin_object_id = self.select_and_prepare_coin(player1_address, stake_amount)
                logger.info(f"Auto-selected coin: {coin_object_id}")
            
            # Use a placeholder opponent address if not provided (for testing)
            # In production, this should always be provided
            if opponent_address is None:
                # Use a different address than player1 to avoid "cannot battle yourself" error
                # For now, use a placeholder - in production this should be required
                opponent_address = "0x0000000000000000000000000000000000000000000000000000000000000000"
                logger.warning(f"No opponent specified, using placeholder: {opponent_address}")
            
            # Build the command with -y flag for auto-confirmation
            cmd = f"""
            cd {os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}/battle_arena && \
            source .env && \
            one client -y call \
                --package $PACKAGE_ID \
                --module battle \
                --function create_battle \
                --args {coin_object_id} {opponent_address} $DEPLOYER_ADDRESS \
                --gas-budget 10000000 \
                --json
            """
            
            logger.info(f"Executing create_battle for {player1_address}")
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
                executable='/bin/bash'
            )
            
            logger.info(f"Command stdout: {result.stdout}")
            if result.stderr:
                logger.warning(f"Command stderr: {result.stderr}")
            
            # Try to parse as JSON first
            try:
                json_result = json.loads(result.stdout)
                
                # Extract battle_id from objectChanges
                battle_id = None
                for change in json_result.get("objectChanges", []):
                    if change.get("type") == "created" and "battle::Battle" in change.get("objectType", ""):
                        battle_id = change.get("objectId")
                        break
                
                if battle_id:
                    logger.info(f"Successfully created battle: {battle_id}")
                    return {
                        "success": True,
                        "player1": player1_address,
                        "stake_amount": stake_amount,
                        "battle_id": battle_id,
                        "message": "Battle created successfully",
                        "transaction_digest": json_result.get("digest")
                    }
            except json.JSONDecodeError:
                # Fall back to regex parsing
                pass
            
            # Fallback: extract battle_id via regex
            if result.returncode == 0 or "Transaction executed" in result.stdout:
                match = re.search(r'0x[a-fA-F0-9]{64}', result.stdout)
                if match:
                    battle_id = match.group(0)
                    logger.info(f"Successfully created battle (regex): {battle_id}")
                    return {
                        "success": True,
                        "player1": player1_address,
                        "stake_amount": stake_amount,
                        "battle_id": battle_id,
                        "message": "Battle created successfully"
                    }
            
            error_msg = result.stderr or result.stdout
            logger.error(f"Create battle failed: {error_msg}")
            raise Exception(f"Failed to create battle: {error_msg}")
            
        except subprocess.TimeoutExpired:
            logger.error("Create battle timed out")
            raise Exception("Battle creation timed out - check OneChain node connection")
        except Exception as e:
            logger.error(f"Failed to create battle: {e}", exc_info=True)
            raise
    
    def join_battle(
        self,
        battle_id: str,
        player2_address: str,
        stake_amount: int,
        coin_object_id: str = None
    ) -> Dict[str, Any]:
        """
        Join an existing battle with player2 staking tokens using OneChain CLI.
        Automatically handles coin splitting if needed.
        
        Args:
            battle_id: ID of the battle to join
            player2_address: Address of player2 (joiner)
            stake_amount: Amount of tokens to stake (must match battle amount)
            coin_object_id: Optional specific coin to use (will be auto-selected if None)
            
        Returns:
            Transaction result dictionary
        """
        try:
            import subprocess
            import os
            
            logger.info(f"Player2 {player2_address} joining battle {battle_id}")
            
            # If no specific coin provided, auto-select and prepare
            if coin_object_id is None:
                coin_object_id = self.select_and_prepare_coin(player2_address, stake_amount)
                logger.info(f"Auto-selected coin for player2: {coin_object_id}")
            
            # Build the command with -y flag for auto-confirmation
            cmd = f"""
            cd {os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}/battle_arena && \
            source .env && \
            one client -y call \
                --package $PACKAGE_ID \
                --module battle \
                --function join_battle \
                --args {battle_id} {coin_object_id} \
                --gas-budget 10000000 \
                --json
            """
            
            logger.info(f"Executing join_battle for {player2_address}")
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
                executable='/bin/bash'
            )
            
            logger.info(f"Command stdout: {result.stdout}")
            if result.stderr:
                logger.warning(f"Command stderr: {result.stderr}")
            
            # Try to parse as JSON
            try:
                json_result = json.loads(result.stdout)
                if json_result.get("effects", {}).get("status", {}).get("status") == "success":
                    logger.info(f"Successfully joined battle {battle_id}")
                    return {
                        "success": True,
                        "battle_id": battle_id,
                        "player2": player2_address,
                        "stake_amount": stake_amount,
                        "message": "Joined battle successfully",
                        "transaction_digest": json_result.get("digest")
                    }
            except json.JSONDecodeError:
                pass
            
            # Fallback
            if result.returncode == 0 or "Transaction executed" in result.stdout:
                logger.info(f"Successfully joined battle {battle_id}")
                return {
                    "success": True,
                    "battle_id": battle_id,
                    "player2": player2_address,
                    "stake_amount": stake_amount,
                    "message": "Joined battle successfully"
                }
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"Join battle failed: {error_msg}")
                raise Exception(f"Failed to join battle: {error_msg}")
            
        except subprocess.TimeoutExpired:
            logger.error("Join battle timed out")
            raise Exception("Join battle timed out - check OneChain node connection")
        except Exception as e:
            logger.error(f"Failed to join battle: {e}", exc_info=True)
            raise
    
    def finalize_battle(
        self,
        battle_id: str,
        winner: str
    ) -> Dict[str, Any]:
        """
        Finalize a battle and declare the winner using OneChain CLI.
        
        Args:
            battle_id: ID of the battle object
            winner: Address of the winning player
            
        Returns:
            Transaction result dictionary
        """
        try:
            import subprocess
            import os
            
            logger.info(f"Finalizing battle {battle_id}, winner: {winner}")
            
            # Build the command with -y flag for auto-confirmation
            cmd = f"""
            cd {os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}/battle_arena && \
            source .env && \
            one client -y call \
                --package $PACKAGE_ID \
                --module battle \
                --function finalize_battle \
                --args $ADMIN_CAP_ID {battle_id} {winner} \
                --gas-budget 10000000
            """
            
            logger.info(f"Executing finalize_battle")
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
                executable='/bin/bash'
            )
            
            logger.info(f"Command stdout: {result.stdout}")
            logger.info(f"Command stderr: {result.stderr}")
            
            if result.returncode == 0 or "Transaction executed" in result.stdout:
                logger.info(f"Successfully finalized battle {battle_id}")
                
                return {
                    "success": True,
                    "battle_id": battle_id,
                    "winner": winner,
                    "message": "Battle finalized successfully",
                    "total_prize": None  # Winner receives all staked tokens automatically
                }
            else:
                error_msg = result.stderr or result.stdout
                logger.error(f"Finalize battle failed: {error_msg}")
                raise Exception(f"Failed to finalize battle: {error_msg}")
            
        except subprocess.TimeoutExpired:
            logger.error("Finalize battle timed out")
            raise Exception("Finalize battle timed out - check OneChain node connection")
        except Exception as e:
            logger.error(f"Failed to finalize battle: {e}", exc_info=True)
            raise
    
    def get_battle_details(self, battle_id: str) -> Dict[str, Any]:
        """
        Get details of a battle object from OneChain.
        
        Args:
            battle_id: ID of the battle object
            
        Returns:
            Battle details dictionary
        """
        try:
            import subprocess
            
            logger.info(f"Getting battle details for {battle_id}")
            
            # Use OneChain CLI to get object
            cmd = [
                "one", "client", "object",
                battle_id,
                "--json"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                try:
                    obj_data = json.loads(result.stdout)
                    
                    # Extract battle fields from the object
                    if "data" in obj_data:
                        obj_data = obj_data["data"]
                    
                    if "content" in obj_data and "fields" in obj_data["content"]:
                        fields = obj_data["content"]["fields"]
                        
                        # Parse the battle fields
                        # player2 is just an address in the current contract
                        player2_addr = fields.get("player2")
                        
                        # player2_stake is Option<Coin>, check if it exists
                        player2_stake = fields.get("player2_stake")
                        has_player2_stake = player2_stake is not None and player2_stake != "null"
                        
                        return {
                            "id": battle_id,
                            "player1": fields.get("player1"),
                            "player2": player2_addr,
                            "stake_amount": int(fields.get("stake_amount", 0)),
                            "is_ready": fields.get("is_ready", False),
                            "is_active": True,  # Battle is active if it exists
                            "admin": fields.get("admin"),
                        }
                    
                    logger.warning(f"Unexpected object structure for battle {battle_id}")
                    raise Exception("Could not parse battle object")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse battle object JSON: {e}")
                    raise
            else:
                logger.error(f"Failed to get battle object: {result.stderr}")
                raise Exception(f"Battle not found or error querying: {result.stderr}")
            
        except Exception as e:
            logger.error(f"Failed to get battle details: {e}", exc_info=True)
            raise
    
    def split_coin(
        self,
        coin_object_id: str,
        split_amount: int,
        ctx: Dict[str, Any] = None
    ) -> str:
        """
        Split a coin object into two parts using a proper Move call with transfer.
        Returns the new coin object ID.
        
        Args:
            coin_object_id: The coin object to split
            split_amount: Amount to split off (in raw units)
            ctx: Optional context (not used for CLI, kept for compatibility)
            
        Returns:
            Object ID of the newly created split coin
        """
        try:
            import subprocess
            import os
            import re
            
            logger.info(f"Splitting coin {coin_object_id}, amount: {split_amount}")
            
            if not self.package_id:
                raise Exception("Package ID not configured. Cannot split coins.")
            
            # Use PTB (Programmable Transaction Block) to:
            # 1. Split the coin
            # 2. Transfer the new split coin back to the sender
            # This properly handles the returned value from coin::split
            
            cmd = f"""
            cd {os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}/battle_arena && \
            source .env && \
            one client -y ptb \\
                --split-coins @{coin_object_id} [{split_amount}] \\
                --assign new_coin \\
                --transfer-objects [new_coin] @$DEPLOYER_ADDRESS \\
                --gas-budget 10000000 \\
                --json
            """
            
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
                executable='/bin/bash'
            )
            
            logger.info(f"Split coin command output: {result.stdout[:500]}")
            if result.stderr:
                logger.warning(f"Split coin stderr: {result.stderr[:500]}")
            
            # Try to parse as JSON first
            try:
                json_result = json.loads(result.stdout)
                
                # Extract the new coin object ID from objectChanges
                for change in json_result.get("objectChanges", []):
                    change_type = change.get("type")
                    object_type = change.get("objectType", "")
                    
                    # Look for the created coin object
                    if change_type == "created" and "coin::Coin" in object_type and "battle_token" in object_type:
                        new_coin_id = change.get("objectId")
                        logger.info(f"Split created new coin: {new_coin_id}")
                        return new_coin_id
                
                # If JSON parsing worked but no coin found, log and raise
                logger.error(f"No created coin found in objectChanges: {json_result.get('objectChanges', [])}")
                raise Exception("Failed to extract new coin ID from split result")
                
            except json.JSONDecodeError:
                # If not JSON, try to extract object ID from text output
                logger.warning("Split output is not JSON, attempting text parsing")
                
                # Look for object IDs in the output (Sui object IDs are 64 hex chars)
                object_ids = re.findall(r'0x[a-fA-F0-9]{64}', result.stdout)
                
                if object_ids:
                    # The last one created is likely our split coin
                    new_coin_id = object_ids[-1]
                    logger.info(f"Split created new coin (from text): {new_coin_id}")
                    return new_coin_id
                
                # If we still can't find it, raise error with output
                logger.error(f"Failed to parse split output: {result.stdout}")
                raise Exception(f"Split coin command failed: {result.stdout[:200]}")
            
        except subprocess.TimeoutExpired:
            logger.error("Split coin timed out")
            raise Exception("Coin split timed out")
        except Exception as e:
            logger.error(f"Failed to split coin: {e}", exc_info=True)
            raise

    def get_user_coins(self, address: str) -> Dict[str, Any]:
        """
        Get user's battle token coins using OneChain CLI.
        
        Args:
            address: User's Sui address
            
        Returns:
            User's coin information
        """
        try:
            # Use OneChain CLI to get coins
            import subprocess
            
            cmd = [
                "one", "client", "objects",
                address,  # Address is a positional argument
                "--json"
            ]
            
            logger.info(f"Querying coins for address: {address}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                try:
                    objects = json.loads(result.stdout)
                    logger.info(f"Found {len(objects)} objects for address")
                    
                    # Filter for battle tokens
                    battle_token_type = f"{self.package_id}::battle_token::BATTLE_TOKEN"
                    coin_objects = []
                    total_balance = 0
                    
                    for obj in objects:
                        # Objects are wrapped in a "data" field
                        obj_data = obj.get("data", obj)
                        
                        # Log each object type for debugging
                        if "content" in obj_data and "type" in obj_data["content"]:
                            obj_type = obj_data["content"]["type"]
                            logger.debug(f"Object type: {obj_type}")
                            
                            # Check if this is a Coin type containing our battle token
                            # Format: 0x2::coin::Coin<PACKAGE_ID::battle_token::BATTLE_TOKEN>
                            if "coin::Coin" in obj_type and "battle_token::BATTLE_TOKEN" in obj_type:
                                content = obj_data["content"]
                                if "fields" in content and "balance" in content["fields"]:
                                    balance = int(content["fields"]["balance"])
                                    total_balance += balance
                                    coin_objects.append({
                                        "object_id": obj_data.get("objectId", "unknown"),
                                        "balance": balance,
                                    })
                                    logger.info(f"Found battle token coin: {obj_data.get('objectId')}, balance: {balance} raw units")
                    
                    if coin_objects:
                        human_readable = total_balance / 1_000_000_000
                        logger.info(f"Total battle token balance: {total_balance} raw units ({human_readable:.9f} BTK)")
                        return {
                            "address": address,
                            "total_balance": total_balance,
                            "human_readable_balance": human_readable,
                            "coins": coin_objects,
                        }
                    else:
                        logger.warning(f"No battle token coins found for {address}")
                        return {
                            "address": address,
                            "total_balance": 0,
                            "human_readable_balance": 0.0,
                            "coins": [],
                        }
                        
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse CLI output: {e}")
                    logger.error(f"CLI output: {result.stdout[:500]}")
                    raise
            else:
                logger.warning(f"CLI returned error code {result.returncode}")
                logger.warning(f"STDERR: {result.stderr}")
                logger.warning(f"STDOUT: {result.stdout[:500]}")
                raise Exception(f"CLI command failed: {result.stderr}")
            
        except Exception as e:
            logger.error(f"Failed to get user coins: {e}", exc_info=True)
            raise


# Global client instance
onechain_client = OneChainClient()

