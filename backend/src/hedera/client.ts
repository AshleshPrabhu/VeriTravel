import { Client, PrivateKey, AccountId } from "@hashgraph/sdk";
import * as dotenv from 'dotenv';

dotenv.config();

let hederaClient: Client;

try {
    const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID || "");
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY || "");
    
    if (process.env.HEDERA_NETWORK === "testnet") {
        hederaClient = Client.forTestnet();
    } else if (process.env.HEDERA_NETWORK === "mainnet") {
        hederaClient = Client.forMainnet();
    } else {
        // Default to testnet
        hederaClient = Client.forTestnet();
    }
    
    hederaClient.setOperator(operatorId, operatorKey);
    
    console.log("Hedera client initialized successfully");
    console.log("Network:", process.env.HEDERA_NETWORK);
    console.log("Operator ID:", operatorId.toString());
    
} catch (error) {
    console.error("Failed to initialize Hedera client:", error);
    throw error;
}

export { hederaClient };