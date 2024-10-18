# Stellar-NodeJS-Backend
# Stellar NodeJS Backend

This is a Node.js backend application that interacts with the Stellar blockchain network. It provides various endpoints for creating accounts, issuing assets, managing trustlines, and performing transactions on the Stellar network.

## Features

- Create Stellar accounts
- Issue custom assets
- Create trustlines
- Transfer assets
- Show account balances
- Display trustlines for an account
- Show issued assets for an account

## Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/stellar-nodejs-backend.git
   cd stellar-nodejs-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add the following configuration:
   ```
   PORT=3000
   HOST=localhost
   PROTOCOL=http
   STELLAR_PROTOCOL=https
   STELLAR_SERVER=horizon-testnet.stellar.org
   STELLAR_NETWORK=TESTNET
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```

2. The server will start running at `http://localhost:3000` (or as configured in your .env file).

## API Endpoints

All endpoints require authentication using an API key in the Authorization header.

- POST `/create-account`: Create a new Stellar account
- POST `/issue-asset`: Issue a new custom asset
- POST `/create-trustline`: Create a trustline for an asset
- POST `/transfer-asset`: Transfer assets between accounts
- POST `/show-balance`: Show the balance of an account
- POST `/show-trustlines`: Show trustlines for an account
- POST `/show-issued-assets`: Show assets issued by an account

For detailed information on request/response formats for each endpoint, please refer to the API documentation.

## Security

This application uses a simple API key authentication mechanism. Make sure to keep your API key secure and not expose it in client-side code or public repositories.

## Environment Variables

- `PORT`: The port number on which the server will run (default: 3000)
- `HOST`: The host address for the server (default: localhost)
- `PROTOCOL`: The protocol for the server (http or https)
- `STELLAR_PROTOCOL`: The protocol for connecting to the Stellar network
- `STELLAR_SERVER`: The Stellar network server address
- `STELLAR_NETWORK`: The Stellar network to connect to (TESTNET or PUBLIC)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
