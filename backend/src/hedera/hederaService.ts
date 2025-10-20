import {
    Hbar,
    AccountBalanceQuery,
    TransferTransaction,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
} from "@hashgraph/sdk";
import { hederaClient } from "./client.js";

export const hederaService = {
    async getBalance(accountId: string) {
        const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(hederaClient);
        console.log(" Balance:", balance.hbars.toString());
        return balance.hbars.toString();
    },

    async sendPayment(toAccountId: string, amountHbar: number) {
        const tx = await new TransferTransaction()
        .addHbarTransfer(process.env.HEDERA_ACCOUNT_ID!, new Hbar(-amountHbar))
        .addHbarTransfer(toAccountId, new Hbar(amountHbar))
        .execute(hederaClient);

        const receipt = await tx.getReceipt(hederaClient);
        console.log("Payment Status:", receipt.status.toString());
        return receipt.status.toString();
    },

    async createToken() {
        const tx = await new TokenCreateTransaction()
        .setTokenName("AI Credit")
        .setTokenSymbol("AICR")
        .setDecimals(2)
        .setInitialSupply(100000)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTreasuryAccountId(process.env.HEDERA_ACCOUNT_ID!)
        .freezeWith(hederaClient)
        .execute(hederaClient);

        const receipt = await tx.getReceipt(hederaClient);
        if (!receipt.tokenId) {
            throw new Error("Token creation failed: tokenId is null");
        }
        console.log("Token created:", receipt.tokenId.toString());
        return receipt.tokenId.toString();
    },
};
