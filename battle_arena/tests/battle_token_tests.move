#[test_only]
module battle_arena::battle_token_tests;

use one::test_scenario::{Self as ts, Scenario};
use one::coin::{Self, Coin};
use battle_arena::battle_token::{Self, BATTLE_TOKEN, MintCap};

const ADMIN: address = @0xAD;
const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;

fun setup_test(): Scenario {
    let mut scenario = ts::begin(ADMIN);
    {
        battle_token::init_for_testing(scenario.ctx());
    };
    scenario
}

#[test]
fun test_mint_tokens_success() {
    let mut scenario = setup_test();
    
    // Admin mints 1000 tokens to Alice
    scenario.next_tx(ADMIN);
    {
        let mut mint_cap = scenario.take_from_sender<MintCap>();
        battle_token::mint(&mut mint_cap, 1000, ALICE, scenario.ctx());
        ts::return_to_sender(&scenario, mint_cap);
    };
    
    // Verify Alice received the tokens
    scenario.next_tx(ALICE);
    {
        let coins = scenario.take_from_sender<Coin<BATTLE_TOKEN>>();
        assert!(coin::value(&coins) == 1000, 0);
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.end();
}

#[test]
fun test_mint_multiple_recipients() {
    let mut scenario = setup_test();
    
    // Admin mints to multiple users
    scenario.next_tx(ADMIN);
    {
        let mut mint_cap = scenario.take_from_sender<MintCap>();
        battle_token::mint(&mut mint_cap, 500, ALICE, scenario.ctx());
        battle_token::mint(&mut mint_cap, 300, BOB, scenario.ctx());
        ts::return_to_sender(&scenario, mint_cap);
    };
    
    // Verify Alice's balance
    scenario.next_tx(ALICE);
    {
        let coins = scenario.take_from_sender<Coin<BATTLE_TOKEN>>();
        assert!(coin::value(&coins) == 500, 0);
        ts::return_to_sender(&scenario, coins);
    };
    
    // Verify Bob's balance
    scenario.next_tx(BOB);
    {
        let coins = scenario.take_from_sender<Coin<BATTLE_TOKEN>>();
        assert!(coin::value(&coins) == 300, 0);
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.end();
}

#[test]
fun test_total_supply() {
    let mut scenario = setup_test();
    
    scenario.next_tx(ADMIN);
    {
        let mut mint_cap = scenario.take_from_sender<MintCap>();
        
        // Initial supply should be 0
        assert!(battle_token::total_supply(&mint_cap) == 0, 0);
        
        // Mint some tokens
        battle_token::mint(&mut mint_cap, 1000, ALICE, scenario.ctx());
        battle_token::mint(&mut mint_cap, 500, BOB, scenario.ctx());
        
        // Total supply should be 1500
        assert!(battle_token::total_supply(&mint_cap) == 1500, 1);
        
        ts::return_to_sender(&scenario, mint_cap);
    };
    
    scenario.end();
}

#[test]
fun test_burn_tokens() {
    let mut scenario = setup_test();
    
    // Mint tokens to Alice
    scenario.next_tx(ADMIN);
    {
        let mut mint_cap = scenario.take_from_sender<MintCap>();
        battle_token::mint(&mut mint_cap, 1000, ALICE, scenario.ctx());
        ts::return_to_sender(&scenario, mint_cap);
    };
    
    // Alice burns some tokens
    scenario.next_tx(ALICE);
    {
        let mut coins = scenario.take_from_sender<Coin<BATTLE_TOKEN>>();
        let burn_coin = coin::split(&mut coins, 300, scenario.ctx());
        
        scenario.next_tx(ADMIN);
        let mut mint_cap = scenario.take_from_sender<MintCap>();
        let burned = battle_token::burn(&mut mint_cap, burn_coin);
        assert!(burned == 300, 0);
        
        ts::return_to_sender(&scenario, mint_cap);
        scenario.next_tx(ALICE);
        
        // Alice should have 700 left
        assert!(coin::value(&coins) == 700, 1);
        ts::return_to_sender(&scenario, coins);
    };
    
    scenario.end();
}

#[test]
#[expected_failure(abort_code = battle_token::EInvalidAmount)]
fun test_mint_zero_amount_fails() {
    let mut scenario = setup_test();
    
    scenario.next_tx(ADMIN);
    {
        let mut mint_cap = scenario.take_from_sender<MintCap>();
        battle_token::mint(&mut mint_cap, 0, ALICE, scenario.ctx());
        ts::return_to_sender(&scenario, mint_cap);
    };
    
    scenario.end();
}

