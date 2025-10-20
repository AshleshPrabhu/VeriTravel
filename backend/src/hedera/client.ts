
import { Client } from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config();

export const hederaClient = (() => {
    const network = process.env.HEDERA_NETWORK || "testnet";
    const client =
        network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

    client.setOperator(
        process.env.HEDERA_ACCOUNT_ID!,
        process.env.HEDERA_PRIVATE_KEY!
    );

    console.log(`Hedera client connected to ${network}`);
    return client;
})();
