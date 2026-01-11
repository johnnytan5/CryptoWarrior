"""OneChain blockchain client for interacting with smart contracts."""

from typing import Optional, Dict, Any, List
import httpx
import base64
import logging
import json
import os
from dotenv import load_dotenv
from crypto_utils import OneChainKeypair, get_keypair_from_env

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class OneChainClient:
    """Client for interacting with OneChain smart contracts using JSON-RPC."""
    
    def __init__(self):
        """Initialize the OneChain client."""
        self.package_id = os.getenv("PACKAGE_ID")
        self.admin_cap_id = os.getenv("ADMIN_CAP_ID")
        self.deployer_address = os.getenv("DEPLOYER_ADDRESS")
        self.admin_private_key = os.getenv("ADMIN_PRIVATE_KEY")
        self.rpc_url = os.getenv("ONECHAIN_RPC_URL", "https://rpc-testnet.onelabs.cc:443")
        
        # Initialize HTTP client
        self.http_client = httpx.Client(timeout=30.0)
        
        # Initialize admin keypair for signing transactions
        self.admin_keypair = None
        if self.admin_private_key:
            try:
                self.admin_keypair = get_keypair_from_env(self.admin_private_key)
                if self.admin_keypair:
                    logger.info("Admin keypair initialized successfully")
                else:
                    logger.warning("Failed to initialize admin keypair")
            except Exception as e:
                logger.error(f"Error initializing admin keypair: {e}")
        
        if not all([self.package_id, self.admin_cap_id, self.deployer_address]):
            logger.warning("OneChain client not fully configured. Check environment variables.")
    
    def _rpc_call(self, method: str, params: list) -> Dict[str, Any]:
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
    
    def _execute_transaction(self, tx_bytes: str, signer_keypair: Optional[OneChainKeypair] = None) -> Dict[str, Any]:
        """
        Execute a signed transaction.
        
        Args:
            tx_bytes: Base64-encoded transaction bytes
            signer_keypair: Keypair to sign with (defaults to admin_keypair)
            
        Returns:
            Transaction execution result
        """
        if not signer_keypair:
            signer_keypair = self.admin_keypair
        
        if not signer_keypair:
            raise Exception("No keypair available for signing transaction")
        
        # Sign the transaction
        signature = signer_keypair.sign_transaction_base64(tx_bytes)
        
        # Execute the transaction
        result = self._rpc_call(
            "sui_executeTransactionBlock",
            [
                tx_bytes,  # base64 transaction bytes
                [signature],  # list of signatures (base64)
                {
                    "showInput": True,
                    "showEffects": True,
                    "showEvents": True,
                    "showObjectChanges": True,
                    "showBalanceChanges": True
                },
                "WaitForLocalExecution"  # execution mode
            ]
        )
        
        return result
    
    def select_and_prepare_coin(
        self,
        user_address: str,
        required_amount: int,
        signer_keypair: Optional[OneChainKeypair] = None
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
                raise Exception(f"No OCT coins found for {user_address}")
            
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
                    new_coin_id = self.split_coin(
                        coin["object_id"], 
                        required_amount,
                        signer_keypair=signer_keypair,
                        recipient_address=user_address
                    )
                    return new_coin_id
            
            # If we have multiple smaller coins, we need to merge them first
            # Merge all coins into the first one
            logger.info(f"Merging {len(coins)} coins to get sufficient balance")
            if len(coins) < 2:
                raise Exception(
                    f"No single coin large enough. "
                    f"Total balance: {balance_data['total_balance']}, Required: {required_amount}"
                )
            
            # Merge all other coins into the first coin
            destination_coin = coins[0]["object_id"]
            source_coins = [coin["object_id"] for coin in coins[1:]]
            
            logger.info(f"Merging {len(source_coins)} coins into {destination_coin}")
            # Use admin keypair to sign (bot's coins)
            if not signer_keypair:
                signer_keypair = self.admin_keypair
            
            merged_coin_id = self.merge_coins(
                destination_coin,
                source_coins,
                user_address,  # signer address (bot address)
                signer_keypair=signer_keypair
            )
            
            # After merging, the destination coin should have the total balance
            # Now check if we need to split it
            if balance_data["total_balance"] > required_amount:
                logger.info(f"Splitting merged coin: {balance_data['total_balance']} -> {required_amount}")
                new_coin_id = self.split_coin(
                    merged_coin_id, 
                    required_amount,
                    signer_keypair=signer_keypair,
                    recipient_address=user_address
                )
                return new_coin_id
            else:
                # Exact amount after merge
                return merged_coin_id
            
        except Exception as e:
            logger.error(f"Failed to prepare coin: {e}", exc_info=True)
            raise

    def create_battle(
        self,
        transaction_bytes: str,
        signature: str
    ) -> Dict[str, Any]:
        """
        Execute a signed create_battle transaction from the frontend.
        
        The frontend builds and signs the transaction, then sends it to the backend
        for execution. This allows the backend to validate and track all transactions.
        
        Args:
            transaction_bytes: Base64-encoded transaction bytes from frontend
            signature: Base64-encoded signature from user's wallet
            
        Returns:
            Transaction result with battle_id
        """
        try:
            logger.info("Executing signed create_battle transaction from frontend")
            
            # Execute the signed transaction
            result = self._rpc_call(
                "sui_executeTransactionBlock",
                [
                    transaction_bytes,  # base64 transaction bytes
                    [signature],  # list of signatures (base64)
                    {
                        "showInput": True,
                        "showEffects": True,
                        "showRawEffects": True,  # Required for wallet reporting
                        "showEvents": True,
                        "showObjectChanges": True,
                        "showBalanceChanges": True
                    },
                    "WaitForLocalExecution"  # execution mode
                ]
            )
            
            # Check if transaction was successful
            effects = result.get("effects", {})
            status = effects.get("status", {})
            
            if status.get("status") != "success":
                error = status.get("error", "Unknown error")
                logger.error(f"Create battle transaction failed: {error}")
                raise Exception(f"Transaction failed: {error}")
            
            # Extract battle_id from objectChanges
            object_changes = result.get("objectChanges", [])
            battle_id = None
            
            for change in object_changes:
                change_type = change.get("type")
                object_type = change.get("objectType", "")
                
                if change_type == "created" and "battle::Battle" in object_type:
                    battle_id = change.get("objectId")
                    break
            
            if not battle_id:
                # Try to find it in effects.created
                created = effects.get("created", [])
                for created_obj in created:
                    obj_ref = created_obj.get("reference", {})
                    obj_id = obj_ref.get("objectId")
                    if obj_id:
                        # Verify it's a battle object
                        try:
                            obj_data = self._rpc_call(
                                "sui_getObject",
                                [
                                    obj_id,
                                    {"showType": True, "showContent": False}
                                ]
                            )
                            obj_type = obj_data.get("data", {}).get("type", "")
                            if "battle::Battle" in obj_type:
                                battle_id = obj_id
                                break
                        except Exception:
                            continue
            
            if not battle_id:
                logger.error(f"No battle object found in transaction result")
                raise Exception("Failed to extract battle_id from transaction result")
            
            # Extract player1 address from transaction input or object changes
            # The transaction input should contain the sender
            transaction_data = result.get("transaction", {})
            sender = transaction_data.get("data", {}).get("sender")
            
            logger.info(f"Successfully created battle: {battle_id}")
            
            # Extract rawEffects for wallet reporting (required by dApp Kit)
            # rawEffects comes as a list of bytes, convert to base64 string
            raw_effects = result.get("rawEffects")
            raw_effects_b64 = None
            if raw_effects:
                try:
                    # If it's a list of integers (bytes), convert to bytes then base64
                    if isinstance(raw_effects, list):
                        raw_effects_bytes = bytes(raw_effects)
                        raw_effects_b64 = base64.b64encode(raw_effects_bytes).decode('utf-8')
                    elif isinstance(raw_effects, str):
                        # Already a string (might be base64 already)
                        raw_effects_b64 = raw_effects
                    else:
                        # Try to convert to bytes then base64
                        raw_effects_bytes = bytes(raw_effects)
                        raw_effects_b64 = base64.b64encode(raw_effects_bytes).decode('utf-8')
                except Exception as e:
                    logger.warning(f"Failed to encode rawEffects: {e}")
                    raw_effects_b64 = None
            
            return {
                "success": True,
                "battle_id": battle_id,
                "player1": sender or "unknown",
                "stake_amount": 0,  # Can't determine from transaction result easily
                "message": "Battle created successfully",
                "transaction_digest": result.get("digest"),
                "raw_effects": raw_effects_b64  # Base64-encoded string for wallet reporting
            }
            
        except Exception as e:
            logger.error(f"Failed to execute create_battle transaction: {e}", exc_info=True)
            raise
    
    def join_battle(
        self,
        battle_id: str,
        player2_address: str,
        stake_amount: int,
        coin_object_id: str = None,
        signer_keypair: Optional[OneChainKeypair] = None
    ) -> Dict[str, Any]:
        """
        Join an existing battle with player2 (bot) staking tokens using JSON-RPC.
        Automatically handles coin splitting if needed.
        
        Args:
            battle_id: ID of the battle to join
            player2_address: Address of player2 (joiner - should be bot/admin address)
            stake_amount: Amount of tokens to stake (must match battle amount)
            coin_object_id: Optional specific coin to use (will be auto-selected if None)
            signer_keypair: Keypair to sign with (defaults to admin_keypair)
            
        Returns:
            Transaction result dictionary
        """
        try:
            if not signer_keypair:
                signer_keypair = self.admin_keypair
            
            if not signer_keypair:
                raise Exception("No keypair available for signing join_battle transaction")
            
            logger.info(f"Player2 {player2_address} joining battle {battle_id}")
            
            # If no specific coin provided, auto-select and prepare
            if coin_object_id is None:
                coin_object_id = self.select_and_prepare_coin(
                    player2_address, 
                    stake_amount,
                    signer_keypair=signer_keypair
                )
                logger.info(f"Auto-selected coin for player2: {coin_object_id}")
            
            # Step 1: Build the join_battle transaction using unsafe_moveCall
            tx_result = self._rpc_call(
                "unsafe_moveCall",
                [
                    signer_keypair.get_address(),  # signer
                    self.package_id,  # package
                    "battle",  # module
                    "join_battle",  # function
                    [],  # type_arguments
                    [
                        battle_id,  # battle_id (shared object)
                        coin_object_id  # stake coin
                    ],
                    None,  # gas (use default)
                    "10000000"  # gas_budget (must be string, not integer)
                ]
            )
            
            # unsafe_moveCall returns the transaction bytes (base64 string)
            tx_bytes = tx_result
            
            # Step 2: Execute the transaction
            result = self._execute_transaction(tx_bytes, signer_keypair)
            
            # Step 3: Check if transaction was successful
            effects = result.get("effects", {})
            status = effects.get("status", {})
            
            if status.get("status") == "success":
                logger.info(f"Successfully joined battle {battle_id}")
                return {
                    "success": True,
                    "battle_id": battle_id,
                    "player2": player2_address,
                    "stake_amount": stake_amount,
                    "message": "Joined battle successfully",
                    "transaction_digest": result.get("digest")
                }
            else:
                error = status.get("error", "Unknown error")
                logger.error(f"Join battle transaction failed: {error}")
                raise Exception(f"Failed to join battle: {error}")
            
        except Exception as e:
            logger.error(f"Failed to join battle: {e}", exc_info=True)
            raise
    
    def finalize_battle(
        self,
        battle_id: str,
        winner: str,
        signer_keypair: Optional[OneChainKeypair] = None
    ) -> Dict[str, Any]:
        """
        Finalize a battle and declare the winner using JSON-RPC.
        
        Args:
            battle_id: ID of the battle object
            winner: Address of the winning player
            signer_keypair: Keypair to sign with (defaults to admin_keypair)
            
        Returns:
            Transaction result dictionary
        """
        try:
            if not signer_keypair:
                signer_keypair = self.admin_keypair
            
            if not signer_keypair:
                raise Exception("No keypair available for signing finalize_battle transaction")
            
            if not self.admin_cap_id:
                raise Exception("AdminCap ID not configured")
            
            logger.info(f"Finalizing battle {battle_id}, winner: {winner}")
            
            # Step 1: Build the finalize_battle transaction using unsafe_moveCall
            tx_result = self._rpc_call(
                "unsafe_moveCall",
                [
                    signer_keypair.get_address(),  # signer
                    self.package_id,  # package
                    "battle",  # module
                    "finalize_battle",  # function
                    [],  # type_arguments
                    [
                        self.admin_cap_id,  # admin_cap (owned object)
                        battle_id,  # battle (shared object)
                        winner  # winner address
                    ],
                    None,  # gas (use default)
                    "10000000"  # gas_budget (must be string, not integer)
                ]
            )
            
            # unsafe_moveCall returns the transaction bytes (base64 string)
            tx_bytes = tx_result
            
            # Step 2: Execute the transaction
            result = self._execute_transaction(tx_bytes, signer_keypair)
            
            # Step 3: Check if transaction was successful
            effects = result.get("effects", {})
            status = effects.get("status", {})
            
            if status.get("status") == "success":
                logger.info(f"Successfully finalized battle {battle_id}")
                
                # Extract total prize from balance changes if available
                balance_changes = result.get("balanceChanges", [])
                total_prize = None
                for change in balance_changes:
                    if change.get("owner", {}).get("AddressOwner") == winner:
                        # Winner received tokens
                        total_prize = int(change.get("amount", 0))
                        break
                
                return {
                    "success": True,
                    "battle_id": battle_id,
                    "winner": winner,
                    "message": "Battle finalized successfully",
                    "transaction_digest": result.get("digest"),
                    "total_prize": total_prize  # Winner receives all staked tokens automatically
                }
            else:
                error = status.get("error", "Unknown error")
                logger.error(f"Finalize battle transaction failed: {error}")
                raise Exception(f"Failed to finalize battle: {error}")
            
        except Exception as e:
            logger.error(f"Failed to finalize battle: {e}", exc_info=True)
            raise
    
    def get_battle_details(self, battle_id: str) -> Dict[str, Any]:
        """
        Get details of a battle object from OneChain using JSON-RPC.
        
        Args:
            battle_id: ID of the battle object
            
        Returns:
            Battle details dictionary
        """
        try:
            logger.info(f"Getting battle details for {battle_id}")
            
            # Use sui_getObject RPC method
            result = self._rpc_call(
                "sui_getObject",
                [
                    battle_id,
                    {
                        "showType": True,
                        "showOwner": True,
                        "showContent": True,
                        "showDisplay": False,
                        "showPreviousTransaction": False,
                        "showStorageRebate": False,
                        "showBcs": False
                    }
                ]
            )
            
            # Check if object exists
            if result.get("error"):
                error_code = result.get("error", {}).get("code")
                if error_code == "ObjectNotFound":
                    raise Exception(f"Battle {battle_id} not found")
                raise Exception(f"RPC error: {result['error']}")
            
            # Extract object data
            obj_data = result.get("data", {})
            
            if not obj_data:
                raise Exception(f"Battle {battle_id} not found")
            
            # Check if object was deleted
            if obj_data.get("status") == "Deleted":
                raise Exception(f"Battle {battle_id} has been deleted")
            
            # Extract content
            content = obj_data.get("content", {})
            if not content:
                raise Exception(f"Battle {battle_id} has no content")
            
            # Extract fields from the struct
            fields = content.get("fields", {})
            if not fields:
                raise Exception(f"Battle {battle_id} has no fields")
            
            # Parse the battle fields
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
            
        except Exception as e:
            logger.error(f"Failed to get battle details: {e}", exc_info=True)
            raise
    
    def split_coin(
        self,
        coin_object_id: str,
        split_amount: int,
        signer_keypair: Optional[OneChainKeypair] = None,
        recipient_address: Optional[str] = None
    ) -> str:
        """
        Split a coin object into two parts using JSON-RPC.
        Returns the new coin object ID.
        
        Args:
            coin_object_id: The coin object to split
            split_amount: Amount to split off (in raw units)
            signer_keypair: Keypair to sign with (defaults to admin_keypair)
            recipient_address: Address to transfer the split coin to (defaults to deployer_address)
            
        Returns:
            Object ID of the newly created split coin
        """
        try:
            logger.info(f"Splitting coin {coin_object_id}, amount: {split_amount}")
            
            if not signer_keypair:
                signer_keypair = self.admin_keypair
            
            if not signer_keypair:
                raise Exception("No keypair available for signing split transaction")
            
            if not recipient_address:
                recipient_address = self.deployer_address
            
            # Step 1: Build the split coin transaction using unsafe_splitCoin
            # Note: unsafe_splitCoin returns base64 transaction bytes
            tx_result = self._rpc_call(
                "unsafe_splitCoin",
                [
                    signer_keypair.get_address(),  # signer address
                    coin_object_id,  # coin to split
                    [str(split_amount)],  # amounts to split (array of strings)
                    None,  # gas (use default)
                    "10000000"  # gas_budget (must be string, not integer)
                ]
            )
            
            # unsafe_splitCoin returns the transaction bytes
            tx_bytes = tx_result
            
            # Step 2: Execute the transaction
            result = self._execute_transaction(tx_bytes, signer_keypair)
            
            # Step 3: Extract the new coin ID from objectChanges
            object_changes = result.get("objectChanges", [])
            
            for change in object_changes:
                change_type = change.get("type")
                object_type = change.get("objectType", "")
                
                # Look for the created coin object (OCT)
                if change_type == "created" and "coin::Coin" in object_type and ("0x2::oct::OCT" in object_type or "oct::OCT" in object_type):
                    new_coin_id = change.get("objectId")
                    logger.info(f"Split created new coin: {new_coin_id}")
                    return new_coin_id
            
            # If no coin found, check effects for created objects
            effects = result.get("effects", {})
            created = effects.get("created", [])
            
            for created_obj in created:
                # Get the object to check its type
                obj_ref = created_obj.get("reference", {})
                obj_id = obj_ref.get("objectId")
                
                if obj_id:
                    # Verify it's an OCT coin by checking the object
                    try:
                        obj_data = self._rpc_call(
                            "sui_getObject",
                            [
                                obj_id,
                                {"showType": True, "showContent": False}
                            ]
                        )
                        
                        obj_type = obj_data.get("data", {}).get("type", "")
                        if "coin::Coin" in obj_type and ("0x2::oct::OCT" in obj_type or "oct::OCT" in obj_type):
                            logger.info(f"Split created new coin (from effects): {obj_id}")
                            return obj_id
                    except Exception:
                        continue
            
            # If we still can't find it, raise error
            logger.error(f"No created coin found in objectChanges: {object_changes}")
            raise Exception("Failed to extract new coin ID from split result")
            
        except Exception as e:
            logger.error(f"Failed to split coin: {e}", exc_info=True)
            raise
    
    def merge_coins(
        self,
        destination_coin_id: str,
        source_coin_ids: List[str],
        signer_address: str,
        signer_keypair: Optional[OneChainKeypair] = None
    ) -> str:
        """
        Merge multiple coins into a destination coin using JSON-RPC.
        
        Args:
            destination_coin_id: The coin to merge into
            source_coin_ids: List of coin IDs to merge
            signer_address: Address of the signer (owner of the coins)
            signer_keypair: Keypair to sign with (defaults to admin_keypair)
            
        Returns:
            The destination coin ID (same as input, but now with merged balance)
        """
        try:
            if not signer_keypair:
                signer_keypair = self.admin_keypair
            
            if not signer_keypair:
                raise Exception("No keypair available for signing merge transaction")
            
            if not source_coin_ids:
                # Nothing to merge, return destination
                return destination_coin_id
            
            logger.info(f"Merging {len(source_coin_ids)} coins into {destination_coin_id}")
            
            # Step 1: Merge coins one at a time using unsafe_mergeCoins
            # Based on the error, it seems unsafe_mergeCoins might only accept one source coin at a time
            # Or the parameter format might be different - let's merge sequentially
            current_destination = destination_coin_id
            
            for source_coin_id in source_coin_ids:
                try:
                    # Try merging one coin at a time
                    # unsafe_mergeCoins parameters: signer, primary_coin, coin_to_merge, gas, gas_budget
                    # Note: coin_to_merge might need to be a single string, not an array
                    tx_result = self._rpc_call(
                        "unsafe_mergeCoins",
                        [
                            signer_address,  # signer
                            current_destination,  # primary coin (destination)
                            source_coin_id,  # coin to merge (single string, not array)
                            None,  # gas (use default)
                            "10000000"  # gas_budget (must be string, not integer)
                        ]
                    )
                    
                    # unsafe_mergeCoins returns the transaction bytes
                    tx_bytes = tx_result
                    
                    # Execute this merge transaction
                    result = self._execute_transaction(tx_bytes, signer_keypair)
                    
                    # Check if successful
                    effects = result.get("effects", {})
                    status = effects.get("status", {})
                    if status.get("status") != "success":
                        error = status.get("error", "Unknown error")
                        logger.error(f"Merge transaction failed: {error}")
                        raise Exception(f"Failed to merge {source_coin_id}: {error}")
                    
                    logger.info(f"Successfully merged {source_coin_id} into {current_destination}")
                    # current_destination remains the same (it's the destination coin)
                    
                except Exception as merge_error:
                    logger.error(f"Failed to merge {source_coin_id} into {current_destination}: {merge_error}")
                    raise Exception(f"Failed to merge coins: {merge_error}")
            
            # All coins merged, return the destination
            logger.info(f"Successfully merged all {len(source_coin_ids)} coins into {destination_coin_id}")
            return destination_coin_id
            
        except Exception as e:
            logger.error(f"Failed to merge coins: {e}", exc_info=True)
            raise

    def get_user_coins(self, address: str) -> Dict[str, Any]:
        """
        Get user's OCT (native OneChain token) coins using JSON-RPC.
        
        Args:
            address: User's OneChain address
            
        Returns:
            User's coin information
        """
        try:
            logger.info(f"Querying OCT coins for address: {address}")
            
            # Use suix_getCoins RPC method
            # OCT coin type: 0x2::oct::OCT
            result = self._rpc_call(
                "suix_getCoins",
                [
                    address,
                    "0x2::oct::OCT",
                    None,  # cursor (for pagination)
                    50  # limit
                ]
            )
            
            # Parse the response
            coin_objects = []
            total_balance = 0
            
            # Result structure: { "data": [...], "nextCursor": ..., "hasNextPage": ... }
            coins_data = result.get("data", [])
            logger.info(f"Found {len(coins_data)} OCT coins for address")
            
            for coin_obj in coins_data:
                # Coin object structure from RPC
                coin_id = coin_obj.get("coinObjectId")
                balance_str = coin_obj.get("balance")
                
                if coin_id and balance_str:
                    balance = int(balance_str)
                    total_balance += balance
                    coin_objects.append({
                        "object_id": coin_id,
                        "balance": balance,
                    })
                    logger.debug(f"Found OCT coin: {coin_id}, balance: {balance} raw units")
            
            # If we have more pages, fetch them (unlikely for coins, but handle it)
            next_cursor = result.get("nextCursor")
            has_next = result.get("hasNextPage", False)
            
            while has_next and next_cursor:
                logger.debug(f"Fetching next page of coins, cursor: {next_cursor}")
                next_result = self._rpc_call(
                    "suix_getCoins",
                    [
                        address,
                        "0x2::oct::OCT",
                        next_cursor,
                        50
                    ]
                )
                
                next_coins = next_result.get("data", [])
                for coin_obj in next_coins:
                    coin_id = coin_obj.get("coinObjectId")
                    balance_str = coin_obj.get("balance")
                    if coin_id and balance_str:
                        balance = int(balance_str)
                        total_balance += balance
                        coin_objects.append({
                            "object_id": coin_id,
                            "balance": balance,
                        })
                
                next_cursor = next_result.get("nextCursor")
                has_next = next_result.get("hasNextPage", False)
            
            if coin_objects:
                human_readable = total_balance / 1_000_000_000
                logger.info(f"Total OCT balance: {total_balance} raw units ({human_readable:.9f} OCT)")
                return {
                    "address": address,
                    "total_balance": total_balance,
                    "human_readable_balance": human_readable,
                    "coins": coin_objects,
                }
            else:
                logger.warning(f"No OCT coins found for {address}")
                return {
                    "address": address,
                    "total_balance": 0,
                    "human_readable_balance": 0.0,
                    "coins": [],
                }
            
        except Exception as e:
            logger.error(f"Failed to get user coins: {e}", exc_info=True)
            raise


# Global client instance
onechain_client = OneChainClient()

