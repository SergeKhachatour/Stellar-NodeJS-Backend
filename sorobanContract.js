const {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  nativeToScVal
} = require('@stellar/stellar-sdk');

// Configure the SDK to use the desired network
const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org:443');

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_POLL_INTERVAL = 2000;  // 2 seconds between attempts
const DEFAULT_TX_TIMEOUT = 180;  // Transaction timeout

/**
 * Calls a method on a Stellar smart contract.
 * @param {string} contractId - The ID of the contract to call.
 * @param {string} method - The name of the method to call on the contract.
 * @param {string} secret - The secret key of the account submitting the transaction.
 * @param {...any} parameters - The parameters to pass to the contract method.
 */
async function callContractMethod(contractId, method, secret, ...parameters) {
  // Add input validation
  if (!contractId || !method || !secret) {
    throw new Error('Missing required parameters: contractId, method, and secret are required');
  }

  // Add server health check with more specific error handling
  try {
    await server.getHealth();
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Soroban server endpoint not found');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to Soroban server');
    }
    throw new Error(`Soroban server health check failed: ${error.message}`);
  }

  const sourceKeypair = Keypair.fromSecret(secret);
  const contract = new Contract(contractId);
  
  try {
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
    
    let transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(contract.call(method, ...parameters.map(param => nativeToScVal(param))))
      .setTimeout(DEFAULT_TX_TIMEOUT)
      .build();

    let preparedTransaction = await server.prepareTransaction(transaction);
    preparedTransaction.sign(sourceKeypair);
    
    // New implementation using recommended polling approach
    const response = await server.sendTransaction(preparedTransaction);
    
    if (response.status === "PENDING") {
      let attempts = 0;
      
      while (attempts++ < DEFAULT_MAX_ATTEMPTS) {
        const status = await server.getTransaction(response.hash);
        
        switch (status.status) {
          case "SUCCESS":
            const transactionMeta = status.resultMetaXdr.v3().sorobanMeta();
            return transactionMeta.returnValue();
          case "FAILED":
            throw new Error(`Transaction failed: ${status.resultXdr}. Contract: ${contractId}, Method: ${method}`);
          case "NOT_FOUND":
            console.debug(`Transaction not found, attempt ${attempts}/${DEFAULT_MAX_ATTEMPTS}`);
            await new Promise(resolve => setTimeout(resolve, DEFAULT_POLL_INTERVAL));
            continue;
        }
      }
      throw new Error(`Transaction polling timeout after ${DEFAULT_MAX_ATTEMPTS} attempts. Hash: ${response.hash}`);
    }

    throw new Error(`Unexpected transaction status: ${response.status}`);

  } catch (error) {
    console.error('Contract call failed:', error);
    throw error;
  }
}

// Example usage:
// callContractMethod('CONTRACT_ID_HERE', 'METHOD_NAME_HERE', 'YOUR_SECRET_KEY', param1, param2, ...);

module.exports = {
  callContractMethod
};
