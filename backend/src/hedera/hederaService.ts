import { 
    Client, 
    PrivateKey, 
    AccountId, 
    Hbar, 
    TransferTransaction,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    AccountCreateTransaction,
    AccountAllowanceApproveTransaction,
    AccountBalanceQuery
} from "@hashgraph/sdk";
import { hederaClient } from "./client.js";

export const hederaService = {
    async getBalance(accountId: string): Promise<string> {
        try {
            const balance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(hederaClient);
            return balance.hbars.toString();
        } catch (error) {
            console.error("Error getting balance:", error);
            throw error;
        }
    },

    async sendPayment(fromAccountId: string, toAccountId: string, amount: number, privateKey: string): Promise<string> {
        try {
            const transaction = await new TransferTransaction()
                .addHbarTransfer(fromAccountId, new Hbar(-amount))
                .addHbarTransfer(toAccountId, new Hbar(amount))
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(privateKey));

            const response = await transaction.execute(hederaClient);
            const receipt = await response.getReceipt(hederaClient);
            return receipt.status.toString();
        } catch (error) {
            console.error("Error sending payment:", error);
            throw error;
        }
    },

    async createToken(name: string, symbol: string, decimals: number = 2): Promise<string> {
        try {
            const transaction = await new TokenCreateTransaction()
                .setTokenName(name)
                .setTokenSymbol(symbol)
                .setDecimals(decimals)
                .setInitialSupply(1000000)
                .setTokenType(TokenType.FungibleCommon)
                .setSupplyType(TokenSupplyType.Infinite)
                .setTreasuryAccountId(AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!))
                .execute(hederaClient);

            const receipt = await transaction.getReceipt(hederaClient);
            return receipt.tokenId?.toString() || "";
        } catch (error) {
            console.error("Error creating token:", error);
            throw error;
        }
    },

    async createAccount(): Promise<{accountId: string, privateKey: string, publicKey: string}> {
        try {
            const newAccountPrivateKey = PrivateKey.generateED25519();
            const newAccountPublicKey = newAccountPrivateKey.publicKey;

            const transaction = await new AccountCreateTransaction()
                .setKey(newAccountPublicKey)
                .setInitialBalance(new Hbar(1))
                .execute(hederaClient);

            const receipt = await transaction.getReceipt(hederaClient);
            
            return {
                accountId: receipt.accountId?.toString() || "",
                privateKey: newAccountPrivateKey.toString(),
                publicKey: newAccountPublicKey.toString()
            };
        } catch (error) {
            console.error("Error creating account:", error);
            throw error;
        }
    }
};

export const hotelBookingService = {
    async createBookingEscrow(
        bookingId: string, 
        userAccountId: string, 
        amount: number
    ): Promise<{escrowAccountId: string, escrowPrivateKey: string, bookingId: string}> {
        try {
            const escrowAccount = await hederaService.createAccount();
            
            const transferTx = await new TransferTransaction()
                .addHbarTransfer(userAccountId, new Hbar(-amount))
                .addHbarTransfer(escrowAccount.accountId, new Hbar(amount))
                .execute(hederaClient);

            await transferTx.getReceipt(hederaClient);

            return {
                escrowAccountId: escrowAccount.accountId,
                escrowPrivateKey: escrowAccount.privateKey,
                bookingId
            };
        } catch (error) {
            console.error("Error creating booking escrow:", error);
            throw error;
        }
    },

    async releaseEscrowPayment(
        escrowAccountId: string, 
        escrowPrivateKey: string, 
        hotelAccountId: string, 
        amount: number
    ): Promise<string> {
        try {
            const transferTx = await new TransferTransaction()
                .addHbarTransfer(escrowAccountId, new Hbar(-amount))
                .addHbarTransfer(hotelAccountId, new Hbar(amount))
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(escrowPrivateKey));

            const response = await transferTx.execute(hederaClient);
            const receipt = await response.getReceipt(hederaClient);
            return receipt.status.toString();
        } catch (error) {
            console.error("Error releasing escrow payment:", error);
            throw error;
        }
    }
};

export const aiAgentService = {
    async setupUserAllowance(
        userAccountId: string, 
        userPrivateKey: string, 
        agentAccountId: string, 
        allowanceAmount: number
    ): Promise<string> {
        try {
            const allowanceTx = await new AccountAllowanceApproveTransaction()
                .approveHbarAllowance(userAccountId, agentAccountId, new Hbar(allowanceAmount))
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(userPrivateKey));

            const response = await allowanceTx.execute(hederaClient);
            const receipt = await response.getReceipt(hederaClient);
            return receipt.status.toString();
        } catch (error) {
            console.error("Error setting up allowance:", error);
            throw error;
        }
    },

    async agentMakePayment(
        userAccountId: string,
        agentPrivateKey: string,
        hotelAccountId: string,
        amount: number
    ): Promise<string> {
        try {
            const signedTx = await new TransferTransaction()
                .addHbarTransfer(userAccountId, new Hbar(-amount))
                .addHbarTransfer(hotelAccountId, new Hbar(amount))
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(agentPrivateKey));

            const transferTx = await signedTx.execute(hederaClient);
            const receipt = await transferTx.getReceipt(hederaClient);
            return receipt.status.toString();
        } catch (error) {
            console.error("Error making agent payment:", error);
            throw error;
        }
    }
};