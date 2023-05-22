require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");

require("@nomicfoundation/hardhat-toolbox");

const dotenv = require("dotenv");
dotenv.config();

module.exports = {
    solidity: "0.8.17",
    networks: {
        goerli: {
            url: process.env.RPCURL,
            accounts: [process.env.PRIVATE_KEY]
        },
    },
    etherscan: {
        apiKey: {
            goerli: process.env.ETHERSCAN_API_KEY
        }
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};
