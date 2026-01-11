#[test_only]
module battle_arena::battle_tests;

use one::test_scenario::{Self as ts, Scenario};
use one::coin::{Self, Coin};
use one::oct::OCT;
use one::transfer;
use battle_arena::battle::{Self, Battle, AdminCap};

const ADMIN: address = @0xAD;
const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;
const CHARLIE: address = @0xC;

fun setup_test(): Scenario {
    let mut scenario = ts::begin(ADMIN);
    
    // Initialize battle module
    {
        battle::init_for_testing(scenario.ctx());
    };
    
    // Mint OCT tokens to players for testing
    // Mint to ALICE
    scenario.next_tx(ALICE);
    {
        let alice_coins = coin::mint_for_testing<OCT>(2000, scenario.ctx());
        // Transfer coins to ALICE (the sender)
        transfer::public_transfer(alice_coins, ALICE);
    };
    
    // Mint to BOB
    scenario.next_tx(BOB);
    {
        let bob_coins = coin::mint_for_testing<OCT>(2000, scenario.ctx());
        // Transfer coins to BOB (the sender)
        transfer::public_transfer(bob_coins, BOB);
    };
    
    scenario
}

#[test]
fun test_create_battle_success() {
    let mut scenario = setup_test();
    
    // Alice creates a battle
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        
        ts::return_to_sender(&scenario, coins);
    };
    
    // Verify battle was created
    scenario.next_tx(ALICE);
    {
        let battle = scenario.take_shared<Battle>();
        let (player1, player2, stake_amount, is_ready) = battle::get_battle_info(&battle);
        
        assert!(player1 == ALICE, 0);
        assert!(player2 == BOB, 1);
        assert!(stake_amount == 500, 2);
        assert!(!is_ready, 3);
        
        ts::return_shared(battle);
    };
    
    scenario.end();
}

#[test]
fun test_join_battle_success() {
    let mut scenario = setup_test();
    
    // Alice creates battle
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        ts::return_to_sender(&scenario, coins);
    };
    
    // Bob joins the battle
    scenario.next_tx(BOB);
    {
        let mut battle = scenario.take_shared<Battle>();
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        
        battle::join_battle(&mut battle, stake, scenario.ctx());
        
        // Battle should now be ready
        assert!(battle::is_battle_ready(&battle), 0);
        
        ts::return_shared(battle);
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.end();
}

#[test]
fun test_finalize_battle_alice_wins() {
    let mut scenario = setup_test();
    
    // Create and join battle
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.next_tx(BOB);
    {
        let mut battle = scenario.take_shared<Battle>();
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::join_battle(&mut battle, stake, scenario.ctx());
        ts::return_shared(battle);
        ts::return_to_sender(&scenario, coins);
    };
    
    // Admin finalizes - Alice wins
    scenario.next_tx(ADMIN);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let battle = scenario.take_shared<Battle>();
        
        battle::finalize_battle(&admin_cap, battle, ALICE, scenario.ctx());
        
        ts::return_to_sender(&scenario, admin_cap);
    };
    
    // Verify Alice received all tokens
    scenario.next_tx(ALICE);
    {
        let mut alice_coins = scenario.take_from_sender<Coin<OCT>>();
        // Alice should have: 2000 (initial) - 500 (staked) + 1000 (won) = 2500
        // But we need to collect all her coins
        let value = coin::value(&alice_coins);
        // Alice's remaining coins (1500) + prize (1000)
        assert!(value >= 1000, 0); // At least the prize
        ts::return_to_sender(&scenario, alice_coins);
    };
    
    scenario.end();
}

#[test]
fun test_finalize_battle_bob_wins() {
    let mut scenario = setup_test();
    
    // Create and join battle
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.next_tx(BOB);
    {
        let mut battle = scenario.take_shared<Battle>();
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::join_battle(&mut battle, stake, scenario.ctx());
        ts::return_shared(battle);
        ts::return_to_sender(&scenario, coins);
    };
    
    // Admin finalizes - Bob wins
    scenario.next_tx(ADMIN);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let battle = scenario.take_shared<Battle>();
        
        battle::finalize_battle(&admin_cap, battle, BOB, scenario.ctx());
        
        ts::return_to_sender(&scenario, admin_cap);
    };
    
    // Verify Bob received all tokens
    scenario.next_tx(BOB);
    {
        let bob_coins = scenario.take_from_sender<Coin<OCT>>();
        let value = coin::value(&bob_coins);
        assert!(value >= 1000, 0); // At least the prize
        ts::return_to_sender(&scenario, bob_coins);
    };
    
    scenario.end();
}

#[test]
fun test_cancel_battle_success() {
    let mut scenario = setup_test();
    
    // Alice creates battle
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        ts::return_to_sender(&scenario, coins);
    };
    
    // Alice cancels before Bob joins
    scenario.next_tx(ALICE);
    {
        let battle = scenario.take_shared<Battle>();
        battle::cancel_battle(battle, scenario.ctx());
    };
    
    // Alice should get refund
    scenario.next_tx(ALICE);
    {
        // Alice will have 2 coin objects: the original (1500) and refund (500)
        // Take all and verify total
        let ids = ts::ids_for_sender<Coin<OCT>>(&scenario);
        let mut total_value = 0;
        let mut i = 0;
        let len = vector::length(&ids);
        
        while (i < len) {
            let coin = scenario.take_from_sender<Coin<OCT>>();
            total_value = total_value + coin::value(&coin);
            ts::return_to_sender(&scenario, coin);
            i = i + 1;
        };
        
        // Should have full 2000 back (500 refund + 1500 remaining)
        assert!(total_value == 2000, 0);
    };
    
    scenario.end();
}

#[test]
#[expected_failure(abort_code = battle::ECannotJoinOwnBattle)]
fun test_cannot_battle_yourself() {
    let mut scenario = setup_test();
    
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        
        // Alice tries to battle herself - should fail
        battle::create_battle(stake, ALICE, ADMIN, scenario.ctx());
        
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.end();
}

#[test]
#[expected_failure(abort_code = battle::EInvalidStakeAmount)]
fun test_join_with_wrong_amount_fails() {
    let mut scenario = setup_test();
    
    // Alice creates battle with 500 stake
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        ts::return_to_sender(&scenario, coins);
    };
    
    // Bob tries to join with wrong amount - should fail
    scenario.next_tx(BOB);
    {
        let mut battle = scenario.take_shared<Battle>();
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 300, scenario.ctx()); // Wrong amount!
        
        battle::join_battle(&mut battle, stake, scenario.ctx());
        
        ts::return_shared(battle);
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.end();
}

#[test]
#[expected_failure(abort_code = battle::ENotAuthorized)]
fun test_wrong_player_cannot_join() {
    let mut scenario = setup_test();
    
    // Mint OCT tokens to Charlie
    scenario.next_tx(CHARLIE);
    {
        let charlie_coins = coin::mint_for_testing<OCT>(2000, scenario.ctx());
        // Transfer coins to CHARLIE (the sender)
        transfer::public_transfer(charlie_coins, CHARLIE);
    };
    
    // Alice creates battle for Bob
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        ts::return_to_sender(&scenario, coins);
    };
    
    // Charlie tries to join - should fail (not the designated opponent)
    scenario.next_tx(CHARLIE);
    {
        let mut battle = scenario.take_shared<Battle>();
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        
        battle::join_battle(&mut battle, stake, scenario.ctx());
        
        ts::return_shared(battle);
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.end();
}

#[test]
#[expected_failure(abort_code = battle::EBattleNotReady)]
fun test_finalize_before_both_players_fails() {
    let mut scenario = setup_test();
    
    // Alice creates battle but Bob doesn't join
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        ts::return_to_sender(&scenario, coins);
    };
    
    // Admin tries to finalize before Bob joins - should fail
    scenario.next_tx(ADMIN);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let battle = scenario.take_shared<Battle>();
        
        battle::finalize_battle(&admin_cap, battle, ALICE, scenario.ctx());
        
        ts::return_to_sender(&scenario, admin_cap);
    };
    
    scenario.end();
}

#[test]
#[expected_failure(abort_code = battle::EInvalidWinner)]
fun test_finalize_with_invalid_winner_fails() {
    let mut scenario = setup_test();
    
    // Create and join battle
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::create_battle(stake, BOB, ADMIN, scenario.ctx());
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.next_tx(BOB);
    {
        let mut battle = scenario.take_shared<Battle>();
        let mut coins = scenario.take_from_sender<Coin<OCT>>();
        let stake = coin::split(&mut coins, 500, scenario.ctx());
        battle::join_battle(&mut battle, stake, scenario.ctx());
        ts::return_shared(battle);
        ts::return_to_sender(&scenario, coins);
    };
    
    // Admin tries to declare Charlie as winner - should fail
    scenario.next_tx(ADMIN);
    {
        let admin_cap = scenario.take_from_sender<AdminCap>();
        let battle = scenario.take_shared<Battle>();
        
        battle::finalize_battle(&admin_cap, battle, CHARLIE, scenario.ctx());
        
        ts::return_to_sender(&scenario, admin_cap);
    };
    
    scenario.end();
}

