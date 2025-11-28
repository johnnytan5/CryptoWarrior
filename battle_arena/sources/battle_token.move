/// Module: battle_token
/// Manages the Battle Token (BTK) minting and treasury operations
module battle_arena::battle_token;

use one::coin::{Self, Coin, TreasuryCap};
use one::url;

/// One-time witness for the BATTLE_TOKEN
public struct BATTLE_TOKEN has drop {}

/// Capability to mint tokens - owned by admin
public struct MintCap has key, store {
    id: UID,
    treasury_cap: TreasuryCap<BATTLE_TOKEN>,
}

// === Error codes ===

/// Invalid amount provided
const EInvalidAmount: u64 = 0;

// === Init function ===

/// Initialize the Battle Token
/// Creates the treasury cap and transfers mint capability to publisher
fun init(witness: BATTLE_TOKEN, ctx: &mut TxContext) {
    // Create the currency with symbol BTK
    let (treasury_cap, metadata) = coin::create_currency(
        witness,
        9, // decimals
        b"BTK",
        b"Battle Token",
        b"Token for Crypto Battle Arena",
        option::some(url::new_unsafe_from_bytes(b"https://battle-arena.example.com/token.png")),
        ctx
    );

    // Freeze the metadata object (no more changes to token info)
    transfer::public_freeze_object(metadata);

    // Create MintCap and transfer to the publisher (admin)
    let mint_cap = MintCap {
        id: object::new(ctx),
        treasury_cap,
    };

    transfer::transfer(mint_cap, ctx.sender());
}

// === Public functions ===

/// Mint battle tokens to a recipient address
/// Only callable by the MintCap holder (admin)
public fun mint(
    cap: &mut MintCap,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    assert!(amount > 0, EInvalidAmount);
    
    let coins = coin::mint(&mut cap.treasury_cap, amount, ctx);
    transfer::public_transfer(coins, recipient);
}

/// Burn battle tokens
/// Anyone can burn their own tokens
public fun burn(
    cap: &mut MintCap,
    coins: Coin<BATTLE_TOKEN>
): u64 {
    coin::burn(&mut cap.treasury_cap, coins)
}

// === View functions ===

/// Get the total supply of battle tokens
public fun total_supply(cap: &MintCap): u64 {
    coin::total_supply(&cap.treasury_cap)
}

// === Test-only functions ===

#[test_only]
/// Create MintCap for testing
public fun init_for_testing(ctx: &mut TxContext) {
    init(BATTLE_TOKEN {}, ctx);
}

