const express = require('express');
const StellarSdk = require('stellar-sdk');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';
const protocol = process.env.PROTOCOL || 'http';

const serverUrl = `${process.env.STELLAR_PROTOCOL}://${process.env.STELLAR_SERVER}`;
const server = new StellarSdk.Server(serverUrl);
StellarSdk.Networks[process.env.STELLAR_NETWORK || 'TESTNET'];

app.use(express.json());

const API_KEY = process.env.API_KEY;

/**
 * Middleware function to authenticate API requests using a token.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); 
    if (token !== API_KEY) return res.sendStatus(403); 
    next(); 
}

/**
 * Endpoint to create a new Stellar account.
 * Uses Friendbot to fund the account on the testnet.
 */
app.post('/create-account', authenticateToken, async (req, res) => {
  try {
    const pair = StellarSdk.Keypair.random();
    const response = await axios.get(`https://friendbot.stellar.org?addr=${pair.publicKey()}`);
    res.json({
      publicKey: pair.publicKey(),
      secret: pair.secret(),
      response: response.data
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: error.message || 'An error occurred while creating the account' });
  }
});

/**
 * Endpoint to issue a new asset on the Stellar network.
 * Requires the issuer's secret key and the asset code.
 */
app.post('/issue-asset', authenticateToken, async (req, res) => {
  const { issuerSecret, assetCode } = req.body;
  if (!issuerSecret || !assetCode) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecret);
    const asset = new StellarSdk.Asset(assetCode, issuerKeypair.publicKey());
    const account = await server.loadAccount(issuerKeypair.publicKey());
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: issuerKeypair.publicKey(),
        asset: asset,
        amount: '10000'
      }))
      .setTimeout(30)
      .build();

    transaction.sign(issuerKeypair);
    const transactionResult = await server.submitTransaction(transaction);
    res.json(transactionResult);
  } catch (error) {
    console.error('Error issuing asset:', error);
    res.status(500).json({ error: error.message || 'An error occurred while issuing the asset' });
  }
});

/**
 * Endpoint to create a trustline for an asset.
 * Allows an account to hold a specific asset issued by another account.
 */
app.post('/create-trustline', authenticateToken, async (req, res) => {
  const { accountSecret, assetCode, issuerPublicKey, limit} = req.body;
  if (!accountSecret || !assetCode || !issuerPublicKey) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const accountKeypair = StellarSdk.Keypair.fromSecret(accountSecret);
    const asset = new StellarSdk.Asset(assetCode, issuerPublicKey, StellarSdk.Asset.ASSET_TYPE_CREDIT_ALPHANUM12);
    const account = await server.loadAccount(accountKeypair.publicKey());
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET
    })
      .addOperation(StellarSdk.Operation.changeTrust({
        asset: asset,
        limit: limit || '1000000000'
      }))
      .setTimeout(30)
      .build();

    transaction.sign(accountKeypair);
    const transactionResult = await server.submitTransaction(transaction);

    res.json({
      message: 'Trustline created successfully',
      transactionResult
    });
  } catch (error) {
    console.error('Error creating trustline:', error);
    res.status(500).json({
      message: 'Error creating trustline',
      error: error.message || error.toString()
    });
  }
});

/**
 * Endpoint to transfer an asset between Stellar accounts.
 * Requires sender's secret, recipient's public key, asset details, and amount.
 */
app.post('/transfer-asset', authenticateToken, async (req, res) => {
  const { senderSecret, recipientPublicKey, assetCode, issuerPublicKey, amount } = req.body;
  if (!senderSecret || !recipientPublicKey || !assetCode || !issuerPublicKey || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const senderKeypair = StellarSdk.Keypair.fromSecret(senderSecret);
    const asset = new StellarSdk.Asset(assetCode, issuerPublicKey);
    const account = await server.loadAccount(senderKeypair.publicKey());
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: recipientPublicKey,
        asset: asset,
        amount: amount
      }))
      .setTimeout(30)
      .build();

    transaction.sign(senderKeypair);
    const transactionResult = await server.submitTransaction(transaction);
    res.json(transactionResult);
  } catch (error) {
    console.error('Error transferring asset:', error);
    res.status(500).json({ error: error.message || 'An error occurred while transferring the asset' });
  }
});

/**
 * Endpoint to show the balance of a Stellar account.
 * Displays balances for all assets held by the account.
 */
app.post('/show-balance', authenticateToken, async (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) {
    return res.status(400).json({ error: 'Missing public key' });
  }

  try {
    const account = await server.loadAccount(publicKey);
    const balances = account.balances.map(balance => ({
      asset_type: balance.asset_type,
      asset_code: balance.asset_code || 'XLM',
      balance: balance.balance
    }));

    res.json({
      account_id: account.id,
      balances: balances
    });
  } catch (error) {
    console.error('Error fetching account balance:', error);
    res.status(500).json({
      message: 'Error fetching account balance',
      error: error.message || 'An error occurred while fetching the account balance'
    });
  }
});

/**
 * Endpoint to show all trustlines for a Stellar account.
 * Lists all non-native assets the account is allowed to hold.
 */
app.post('/show-trustlines', authenticateToken, async (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) {
    return res.status(400).json({ error: 'Missing public key' });
  }

  try {
    const account = await server.loadAccount(publicKey);
    const trustlines = account.balances.filter(balance => balance.asset_type !== 'native');

    res.json({
      message: 'Trustlines retrieved successfully',
      trustlines: trustlines.map(tl => ({
        asset_code: tl.asset_code,
        asset_issuer: tl.asset_issuer,
        balance: tl.balance,
        limit: tl.limit
      }))
    });
  } catch (error) {
    console.error('Error retrieving trustlines:', error);
    res.status(500).json({
      message: 'Error retrieving trustlines',
      error: error.message || 'An error occurred while retrieving trustlines'
    });
  }
});

/**
 * Endpoint to show assets issued by a specific account.
 * Lists all assets where the specified account is the issuer.
 */
app.post('/show-issued-assets', authenticateToken, async (req, res) => {
  const { issuerPublicKey } = req.body;
  if (!issuerPublicKey) {
    return res.status(400).json({ error: 'Missing issuer public key' });
  }

  try {
    const account = await server.loadAccount(issuerPublicKey);
    const issuedAssets = account.balances.filter(balance => 
      balance.asset_type !== 'native' && balance.asset_issuer === issuerPublicKey
    );

    const formattedAssets = issuedAssets.map(asset => ({
      assetCode: asset.asset_code,
      assetIssuer: asset.asset_issuer,
      balance: asset.balance
    }));

    res.json({
      issuer: issuerPublicKey,
      issuedAssets: formattedAssets
    });
  } catch (error) {
    console.error('Error fetching issued assets:', error);
    res.status(500).json({ 
      error: error.message || 'An error occurred while fetching issued assets'
    });
  }
});

app.listen(port, host, () => {
  console.log(`Stellar NodeJS Backend listening at ${protocol}://${host}:${port}`);
  console.log(`Connected to Stellar server: ${serverUrl}`);
});
