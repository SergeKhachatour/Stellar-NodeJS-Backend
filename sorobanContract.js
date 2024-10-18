const StellarSdk = require('stellar-sdk');

// Configure the SDK to use the desired network
StellarSdk.Network.useTestnet(); // Use .usePublic() for mainnet

// Create a Soroban RPC client
const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');

async function callContractMethod() {
  try {
    // Set up the contract ID and method
    const contractId = 'CONTRACT_ID_HERE';
    const method = 'METHOD_NAME_HERE';

    // Set up the account that will submit the transaction
    const sourceKeypair = StellarSdk.Keypair.fromSecret('YOUR_SECRET_KEY');
    const sourcePublicKey = sourceKeypair.publicKey();

    // Prepare the transaction
    const account = await server.getAccount(sourcePublicKey);
    
    // Create the contract object
    const contract = new StellarSdk.Contract(contractId);

    // Prepare the operation
    const operation = contract.call(method, ...parameters);

    // Build the transaction
    let transaction = new StellarSdk.TransactionBuilder(account, { fee: StellarSdk.BASE_FEE })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Sign the transaction
    transaction.sign(sourceKeypair);

    // Submit the transaction
    const result = await server.sendTransaction(transaction);
    console.log('Transaction submitted:', result);

    // You may want to wait for the transaction to be confirmed
    // and then fetch the result
    // This part depends on how you want to handle the response

  } catch (error) {
    console.error('Error:', error);
  }
}

callContractMethod();