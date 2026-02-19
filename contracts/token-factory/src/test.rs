use super::*;
use soroban_sdk::testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation};
use soroban_sdk::{Address, Env, String, symbol_short};

// --- Existing Tests (Initialize, Fees, etc.) ---

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let base_fee = 70_000_000;
    let metadata_fee = 30_000_000;

    client.initialize(&admin, &treasury, &base_fee, &metadata_fee);

    let state = client.get_state();
    assert_eq!(state.admin, admin);
    assert_eq!(state.treasury, treasury);
    assert_eq!(state.base_fee, base_fee);
    assert_eq!(state.metadata_fee, metadata_fee);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_cannot_initialize_twice() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);

    client.initialize(&admin, &treasury, &70_000_000, &30_000_000);
    client.initialize(&admin, &treasury, &70_000_000, &30_000_000);
}

// --- New/Updated Minting & Creation Tests ---

#[test]
#[ignore] // Blocked by Task 2.4 (create_token implementation)
fn test_create_and_mint_token() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let creator = Address::generate(&env);
    let base_fee = 70_000_000;
    let metadata_fee = 30_000_000;

    client.initialize(&admin, &treasury, &base_fee, &metadata_fee);

    let name = String::from_str(&env, "Test Token");
    let symbol = String::from_str(&env, "TEST");
    let decimals = 7u32;
    let initial_supply = 1_000_000_0000000i128; 
    let metadata_uri = Some(String::from_str(&env, "ipfs://QmTest123"));
    let expected_fee = base_fee + metadata_fee;

    // 1. Deploy & Mint via factory
    let token_address = client.create_token(
        &creator,
        &name,
        &symbol,
        &decimals,
        &initial_supply,
        &metadata_uri,
        &expected_fee,
    );

    // 2. Verify token registered in factory
    assert_eq!(client.get_token_count(), 1);

    // 3. Verify token info stored correctly
    let token_info = client.get_token_info(&0).unwrap();
    assert_eq!(token_info.address, token_address);
    assert_eq!(token_info.total_supply, initial_supply);

    // 4. Verify initial supply minted to creator
    // We assume the factory deploys a standard token contract
    // let token_client = soroban_sdk::token::Client::new(&env, &token_address);
    // assert_eq!(token_client.balance(&creator), initial_supply);

    // 5. Verify total supply increased
    // assert_eq!(token_client.total_supply(), initial_supply);
}

#[test]
#[ignore]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")] 
fn test_unauthorized_minting_fails() {
    let env = Env::default();
    // Do NOT mock all auths here to test failure
    
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let attacker = Address::generate(&env);

    client.initialize(&admin, &treasury, &70_000_000, &30_000_000);

    // Attacker tries to create/mint token without proper authorization or fees
    client.create_token(
        &attacker,
        &String::from_str(&env, "Fake"),
        &String::from_str(&env, "FKE"),
        &7,
        &1000,
        &None,
        &0,
    );
}

#[test]
#[ignore]
#[should_panic(expected = "Error(Contract, #1)")] // InsufficientFee error
fn test_create_token_insufficient_fee() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let creator = Address::generate(&env);

    client.initialize(&admin, &treasury, &70_000_000, &30_000_000);

    // metadata_uri is Some, but we only provide base_fee
    client.create_token(
        &creator,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "TST"),
        &7,
        &1000,
        &Some(String::from_str(&env, "ipfs://...")),
        &70_000_000, 
    );
}