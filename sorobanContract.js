const StellarSdk = require('stellar-sdk');

// Configure the SDK to use the desired network
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = StellarSdk.Networks.TESTNET; // Use StellarSdk.Networks.PUBLIC for mainnet

/**
 * Calls a method on a Stellar smart contract.
 * @param {string} contractId - The ID of the contract to call.
 * @param {string} method - The name of the method to call on the contract.
 * @param {string} secret - The secret key of the account submitting the transaction.
 * @param {...any} parameters - The parameters to pass to the contract method.
 */
async function callContractMethod(contractId, method, secret, ...parameters) {
  try {
    // Set up the account that will submit the transaction
    const sourceKeypair = StellarSdk.Keypair.fromSecret(secret);
    const sourcePublicKey = sourceKeypair.publicKey();

    // Prepare the transaction
    const account = await server.loadAccount(sourcePublicKey);
    
    // Create the operation
    const operation = StellarSdk.Operation.invokeHostFunction({
      function: method,
      parameters: parameters.map(StellarSdk.xdr.ScVal.scvString),
      contractId: contractId
    });

    // Build the transaction
    let transaction = new StellarSdk.TransactionBuilder(account, { 
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: networkPassphrase
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Sign the transaction
    transaction.sign(sourceKeypair);

    // Submit the transaction
    const result = await server.submitTransaction(transaction);
    console.log('Transaction submitted:', result);

    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Example usage:
// callContractMethod('CONTRACT_ID_HERE', 'METHOD_NAME_HERE', 'YOUR_SECRET_KEY', param1, param2, ...);

module.exports = {
  callContractMethod
};
