/// Module: battle
/// Manages two-party battles with staking and winner determination
module battle_arena::battle;

use one::coin::{Self, Coin};
use one::event;
use one::oct::OCT;

/// Battle state - holds staked tokens from both players
public struct Battle has key, store {
    id: UID,
    /// Player 1 who created the battle
    player1: address,
    /// Player 2 who will join the battle
    player2: address,
    /// Staked tokens from player 1
    player1_stake: Coin<OCT>,
    /// Staked tokens from player 2 (initially empty)
    player2_stake: Option<Coin<OCT>>,
    /// Amount each player must stake
    stake_amount: u64,
    /// Whether battle is ready (both players staked)
    is_ready: bool,
    /// Admin address who can finalize battles
    admin: address,
}

/// Admin capability to finalize battles
public struct AdminCap has key, store {
    id: UID,
}

// === Events ===

public struct BattleCreated has copy, drop {
    battle_id: ID,
    player1: address,
    player2: address,
    stake_amount: u64,
}

public struct BattleJoined has copy, drop {
    battle_id: ID,
    player2: address,
}

public struct BattleFinalized has copy, drop {
    battle_id: ID,
    winner: address,
    total_prize: u64,
}

public struct BattleCancelled has copy, drop {
    battle_id: ID,
    refunded_to: address,
}

// === Error codes ===

/// Not authorized to perform this action
const ENotAuthorized: u64 = 0;

/// Battle already has both players
const EBattleAlreadyFull: u64 = 1;

/// Stake amount doesn't match required amount
const EInvalidStakeAmount: u64 = 2;

/// Battle is not ready (needs both players)
const EBattleNotReady: u64 = 3;

/// Cannot join your own battle
const ECannotJoinOwnBattle: u64 = 4;

/// Invalid winner address
const EInvalidWinner: u64 = 5;

/// Battle already has player 2
const EPlayer2AlreadyJoined: u64 = 6;

// === Init function ===

/// Initialize the battle module and create admin capability
fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap {
        id: object::new(ctx),
    };
    
    // Transfer admin capability to the publisher
    transfer::transfer(admin_cap, ctx.sender());
}

// === Public functions ===

/// Create a new battle and stake tokens
/// Player 1 creates the battle and specifies opponent and stake amount
public fun create_battle(
    stake: Coin<OCT>,
    opponent: address,
    admin: address,
    ctx: &mut TxContext
) {
    let sender = ctx.sender();
    
    // Cannot battle yourself
    assert!(sender != opponent, ECannotJoinOwnBattle);
    
    let stake_amount = coin::value(&stake);
    assert!(stake_amount > 0, EInvalidStakeAmount);
    
    let battle_id = object::new(ctx);
    let id_copy = object::uid_to_inner(&battle_id);
    
    let battle = Battle {
        id: battle_id,
        player1: sender,
        player2: opponent,
        player1_stake: stake,
        player2_stake: option::none(),
        stake_amount,
        is_ready: false,
        admin,
    };
    
    event::emit(BattleCreated {
        battle_id: id_copy,
        player1: sender,
        player2: opponent,
        stake_amount,
    });
    
    // Share the battle object so player2 can join
    transfer::share_object(battle);
}

/// Player 2 joins the battle by staking the same amount
public fun join_battle(
    battle: &mut Battle,
    stake: Coin<OCT>,
    ctx: &TxContext
) {
    let sender = ctx.sender();
    
    // Must be player 2
    assert!(sender == battle.player2, ENotAuthorized);
    
    // Battle must not already be full
    assert!(option::is_none(&battle.player2_stake), EPlayer2AlreadyJoined);
    
    // Stake amount must match
    let stake_value = coin::value(&stake);
    assert!(stake_value == battle.stake_amount, EInvalidStakeAmount);
    
    // Add player 2's stake
    option::fill(&mut battle.player2_stake, stake);
    battle.is_ready = true;
    
    event::emit(BattleJoined {
        battle_id: object::uid_to_inner(&battle.id),
        player2: sender,
    });
}

/// Admin finalizes the battle and transfers all tokens to winner
/// Can only be called by admin when battle is ready
public fun finalize_battle(
    _admin_cap: &AdminCap,
    battle: Battle,
    winner: address,
    _ctx: &mut TxContext
) {
    let Battle {
        id,
        player1,
        player2,
        mut player1_stake,
        player2_stake,
        stake_amount: _,
        is_ready,
        admin: _,
    } = battle;
    
    // Battle must be ready (both players staked)
    assert!(is_ready, EBattleNotReady);
    
    // Winner must be one of the players
    assert!(winner == player1 || winner == player2, EInvalidWinner);
    
    let battle_id = object::uid_to_inner(&id);
    
    // Extract player 2's stake
    let player2_coins = option::destroy_some(player2_stake);
    
    // Merge both stakes
    coin::join(&mut player1_stake, player2_coins);
    
    let total_prize = coin::value(&player1_stake);
    
    // Transfer all tokens to winner
    transfer::public_transfer(player1_stake, winner);
    
    event::emit(BattleFinalized {
        battle_id,
        winner,
        total_prize,
    });
    
    object::delete(id);
}

/// Cancel battle and refund player 1 if player 2 hasn't joined yet
/// Can be called by player 1 or admin
public fun cancel_battle(
    battle: Battle,
    ctx: &TxContext
) {
    let sender = ctx.sender();
    
    let Battle {
        id,
        player1,
        player2: _,
        player1_stake,
        player2_stake,
        stake_amount: _,
        is_ready,
        admin,
    } = battle;
    
    // Battle must not be ready yet
    assert!(!is_ready, EBattleAlreadyFull);
    
    // Only player 1 or admin can cancel
    assert!(sender == player1 || sender == admin, ENotAuthorized);
    
    // Player 2 should not have joined
    assert!(option::is_none(&player2_stake), EBattleAlreadyFull);
    
    let battle_id = object::uid_to_inner(&id);
    
    // Refund player 1
    transfer::public_transfer(player1_stake, player1);
    
    event::emit(BattleCancelled {
        battle_id,
        refunded_to: player1,
    });
    
    option::destroy_none(player2_stake);
    object::delete(id);
}

// === View functions ===

/// Get battle details
public fun get_battle_info(battle: &Battle): (address, address, u64, bool) {
    (battle.player1, battle.player2, battle.stake_amount, battle.is_ready)
}

/// Check if battle is ready
public fun is_battle_ready(battle: &Battle): bool {
    battle.is_ready
}

/// Get stake amount
public fun get_stake_amount(battle: &Battle): u64 {
    battle.stake_amount
}

// === Test-only functions ===

#[test_only]
/// Create AdminCap for testing
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

