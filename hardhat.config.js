require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");

require("@nomicfoundation/hardhat-toolbox");

const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  solidity: "0.8.17",
  networks: {
    goerli: {
        // url: 'http://127.0.0.1:8545/',
        url: process.env.RPCURL,
        // accounts: ['0xac0974bec...8cbed5efcae784d7bf4f2ff80']
        accounts: [process.env.PRIVATE_KEY]
    },
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY
    }
  }
};
