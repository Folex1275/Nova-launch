use super::*;
use soroban_sdk::testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation};
use soroban_sdk::{Address, Env, String, symbol_short};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let base_fee = 70_000_000; // 7 XLM in stroops
    let metadata_fee = 30_000_000; // 3 XLM in stroops

    // Initialize factory
    client.initialize(&admin, &treasury, &base_fee, &metadata_fee);

    // Verify state
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

#[test]
fn test_update_fees() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);

    client.initialize(&admin, &treasury, &70_000_000, &30_000_000);

    // Update base fee
    client.update_fees(&admin, &Some(100_000_000), &None);
    let state = client.get_state();
    assert_eq!(state.base_fee, 100_000_000);

    // Update metadata fee
    client.update_fees(&admin, &None, &Some(50_000_000));
    let state = client.get_state();
    assert_eq!(state.metadata_fee, 50_000_000);
}

#[test]
#[ignore] // Remove this attribute once create_token function is implemented
fn test_create_token() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    // Setup
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

    // TODO: Uncomment once create_token is implemented
    let token_address = client.create_token(
        &creator,
        &name,
        &symbol,
        &decimals,
        &initial_supply,
        &metadata_uri,
        &expected_fee,
    );

    // Verify token registered in factory
    let token_count = client.get_token_count();
    assert_eq!(token_count, 1);

    // Verify token info stored correctly
    let token_info = client.get_token_info(&0).unwrap();
    assert_eq!(token_info.address, token_address);
    assert_eq!(token_info.creator, creator);
    assert_eq!(token_info.name, name);
    assert_eq!(token_info.symbol, symbol);
    assert_eq!(token_info.decimals, decimals);
    assert_eq!(token_info.total_supply, initial_supply);
    assert_eq!(token_info.metadata_uri, metadata_uri);

    // Verify initial supply minted (Commented verification)
    // let token_client = token::Client::new(&env, &token_address);
    // let creator_balance = token_client.balance(&creator);
    // assert_eq!(creator_balance, initial_supply);
}

#[test]
#[ignore]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")] 
fn test_unauthorized_minting_fails() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let attacker = Address::generate(&env);

    client.initialize(&admin, &treasury, &70_000_000, &30_000_000);

    // Attacker tries to mint/create without authorization
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

    let name = String::from_str(&env, "Test Token");
    let symbol = String::from_str(&env, "TEST");
    let metadata_uri = Some(String::from_str(&env, "ipfs://QmTest"));

    // Provide insufficient fee (50M vs required 100M)
    client.create_token(
        &creator,
        &name,
        &symbol,
        &7,
        &1_000_000,
        &metadata_uri,
        &50_000_000,
    );
}

#[test]
#[ignore]
#[should_panic(expected = "Error(Contract, #3)")] // InvalidParameters error
fn test_create_token_invalid_parameters() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, TokenFactory);
    let client = TokenFactoryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let creator = Address::generate(&env);

    client.initialize(&admin, &treasury, &70_000_000, &30_000_000);

    client.create_token(
        &creator,
        &String::from_str(&env, ""), // Invalid empty name
        &String::from_str(&env, "TEST"),
        &7,
        &1_000_000,
        &None,
        &70_000_000,
    );
}