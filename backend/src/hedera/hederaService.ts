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
    AccountBalanceQuery,
    TokenAssociateTransaction,
    AccountInfoQuery
} from "@hashgraph/sdk";
import { hederaClient } from "./client.js";


export const hederaService = {

    // this is used for creating new accounts for hotels /users or ai
    async createAccount(): Promise<{accountId: string, privateKey: string, publicKey: string}> {
        try {
            const newAccountPrivateKey = PrivateKey.generateED25519();
            const newAccountPublicKey = newAccountPrivateKey.publicKey;

            const transaction = await new AccountCreateTransaction()
                .setKey(newAccountPublicKey)
                .setInitialBalance(new Hbar(2))
                .execute(hederaClient);

            const receipt = await transaction.getReceipt(hederaClient);
            
            console.log('New account created:', receipt.accountId?.toString());
            
            return {
                accountId: receipt.accountId?.toString() || "",
                privateKey: newAccountPrivateKey.toString(),
                publicKey: newAccountPublicKey.toString()
            };
        } catch (error) {
            console.error("Error creating account:", error);
            throw error;
        }
    },

    async getBalance(accountId: string): Promise<{hbar: string, tokens: any[]}> {
        try {
            const balance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(hederaClient);
            
            return {
                hbar: balance.hbars.toString(),
                tokens: balance.tokens ? Object.entries(balance.tokens._map || {}).map(([tokenId, amount]) => ({
                    tokenId,
                    amount: amount.toString()
                })) : []
            };
        } catch (error) {
            console.error("Error getting balance:", error);
            throw error;
        }
    },

    async sendPayment(
        fromAccountId: string, 
        toAccountId: string, 
        amount: number, 
        privateKey: string
    ): Promise<{status: string, transactionId: string, fee: string}> {
        try {
            const transaction = await new TransferTransaction()
                .addHbarTransfer(fromAccountId, new Hbar(-amount))
                .addHbarTransfer(toAccountId, new Hbar(amount))
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(privateKey));

            const response = await transaction.execute(hederaClient);
            const receipt = await response.getReceipt(hederaClient);
            
            console.log(`Payment sent: ${amount} HBAR from ${fromAccountId} to ${toAccountId}`);
            
            return {
                status: receipt.status.toString(),
                transactionId: response.transactionId.toString(),
                fee: "0.0001"
            };
        } catch (error) {
            console.error("Error sending payment:", error);
            throw error;
        }
    },

    async createToken(
        name: string, 
        symbol: string, 
        initialSupply: number = 1000000,
        decimals: number = 0,
        treasuryAccountId: string,
        treasuryPrivateKey: string
    ): Promise<{tokenId: string, transactionId: string}> {
        try {
            const transaction = await new TokenCreateTransaction()
                .setTokenName(name)
                .setTokenSymbol(symbol)
                .setDecimals(decimals)
                .setInitialSupply(initialSupply)
                .setTokenType(TokenType.FungibleCommon)
                .setSupplyType(TokenSupplyType.Infinite)
                .setTreasuryAccountId(treasuryAccountId)
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(treasuryPrivateKey));

            const response = await transaction.execute(hederaClient);
            const receipt = await response.getReceipt(hederaClient);
            
            console.log(`Token created: ${name} (${symbol}) - ${receipt.tokenId?.toString()}`);
            return {
                tokenId: receipt.tokenId?.toString() || "",
                transactionId: response.transactionId.toString()
            };
        } catch (error) {
            console.error("Error creating token:", error);
            throw error;
        }
    },

    async associateToken(
        accountId: string, 
        tokenId: string, 
        privateKey: string
    ): Promise<{status: string, transactionId: string}> {
        try {
            const transaction = await new TokenAssociateTransaction()
                .setAccountId(accountId)
                .setTokenIds([tokenId])
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(privateKey));

            const response = await transaction.execute(hederaClient);
            const receipt = await response.getReceipt(hederaClient);
            
            console.log(`Token ${tokenId} associated with account ${accountId}`);
            
            return {
                status: receipt.status.toString(),
                transactionId: response.transactionId.toString()
            };
        } catch (error) {
            console.error("Error associating token:", error);
            throw error;
        }
    },

    async transferTokens(
        tokenId: string,
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        privateKey: string
    ): Promise<{status: string, transactionId: string}> {
        try {
            const transaction = await new TransferTransaction()
                .addTokenTransfer(tokenId, fromAccountId, -amount)
                .addTokenTransfer(tokenId, toAccountId, amount)
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(privateKey));

            const response = await transaction.execute(hederaClient);
            const receipt = await response.getReceipt(hederaClient);
            
            console.log(`Transferred ${amount} tokens from ${fromAccountId} to ${toAccountId}`);
            
            return {
                status: receipt.status.toString(),
                transactionId: response.transactionId.toString()
            };
        } catch (error) {
            console.error("Error transferring tokens:", error);
            throw error;
            }
    }
}

export const hotelHederaService = {
    async setupHotelAccounts(
        hotelName: string, 
        hotelOwnerPrivateKey?: string
    ): Promise<{
        hotelAccount: any,
        agentAccount: any,
        loyaltyToken: any,
        reputationToken: any
    }> {
        try {
            console.log(`Setting up Hedera accounts for ${hotelName}...`);
            
            const hotelAccount = await hederaService.createAccount();
            const agentAccount = await hederaService.createAccount();
            const loyaltyToken = await hederaService.createToken(
                `${hotelName} Loyalty Points`,
                `${hotelName.substring(0, 3).toUpperCase()}LP`,
                1000000, 
                0,
                hotelAccount.accountId,
                hotelAccount.privateKey
            );
            
            const reputationToken = await hederaService.createToken(
                `${hotelName} Reputation`,
                `${hotelName.substring(0, 3).toUpperCase()}REP`,
                10000,
                2,
                hotelAccount.accountId,
                hotelAccount.privateKey
            );
            
            if (process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY) {
                await hederaService.sendPayment(
                    process.env.HEDERA_ACCOUNT_ID,
                    hotelAccount.accountId,
                    10,
                    process.env.HEDERA_PRIVATE_KEY
                );
            }
            
            console.log(`Hotel ${hotelName} Hedera setup complete!`);
            
            return {
                hotelAccount,
                agentAccount,
                loyaltyToken,
                reputationToken
            };
        } catch (error) {
            console.error("Hotel setup failed:", error);
            throw error;
        }
    },

    async awardLoyaltyPoints(
        loyaltyTokenId: string,
        hotelAccountId: string,
        hotelPrivateKey: string,
        guestAccountId: string,
        points: number
    ): Promise<{status: string, transactionId: string}> {
        try {
            try {
                await hederaService.associateToken(guestAccountId, loyaltyTokenId, guestAccountId);
            } catch (error) {
                console.log('Token association might already exist, continuing...');
            }
            
            const result = await hederaService.transferTokens(
                loyaltyTokenId,
                hotelAccountId,
                guestAccountId,
                points,
                hotelPrivateKey
            );
            
            console.log(`Awarded ${points} loyalty points to guest ${guestAccountId}`);
            return result;
        } catch (error) {
            console.error("Error awarding loyalty points:", error);
            throw error;
        }
    }

}


export const aiAgentService = {
    async setupUserAllowance(
        userAccountId: string,
        userPrivateKey: string,
        agentAccountId: string,
        allowanceAmount: number
    ): Promise<{status: string, transactionId: string, allowanceAmount: number}> {
        try {
            const transaction = await new AccountAllowanceApproveTransaction()
                .approveHbarAllowance(userAccountId, agentAccountId, new Hbar(allowanceAmount))
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(userPrivateKey));

            const response = await transaction.execute(hederaClient);
            const receipt = await response.getReceipt(hederaClient);
            
            console.log(`Allowance set: AI agent can spend ${allowanceAmount} HBAR on behalf of user`);
            
            return {
                status: receipt.status.toString(),
                transactionId: response.transactionId.toString(),
                allowanceAmount
            };
        } catch (error) {
            console.error("Error setting up allowance:", error);
            throw error;
        }
    },

    async agentMakePayment(
        userAccountId: string,
        agentPrivateKey: string,
        recipientAccountId: string,
        amount: number,
        memo?: string
    ): Promise<{status: string, transactionId: string, amount: number}> {
        try {
            let transaction = new TransferTransaction()
                .addHbarTransfer(userAccountId, new Hbar(-amount))
                .addHbarTransfer(recipientAccountId, new Hbar(amount));
            
            if (memo) {
                transaction = transaction.setTransactionMemo(memo);
            }
            
            const res = await transaction
                .freezeWith(hederaClient)
                .sign(PrivateKey.fromString(agentPrivateKey));

            const response  = await res.execute(hederaClient);

            const receipt = await response.getReceipt(hederaClient);
            
            console.log(`AI Agent paid ${amount} HBAR from ${userAccountId} to ${recipientAccountId}`);
            
            return {
                status: receipt.status.toString(),
                transactionId: response.transactionId.toString(),
                amount
            };
        } catch (error) {
            console.error("AI agent payment failed:", error);
            throw error;
        }
    },

    async createBookingEscrow(
        bookingId: string,
        userAccountId: string,
        agentPrivateKey: string,
        amount: number
    ): Promise<{
        escrowAccountId: string,
        escrowPrivateKey: string,
        bookingId: string,
        amount: number,
        transactionId: string
    }> {
        try {
            console.log(` Creating escrow for booking ${bookingId}...`);
            
            const escrowAccount = await hederaService.createAccount();
            
            const transferResult = await this.agentMakePayment(
                userAccountId,
                agentPrivateKey,
                escrowAccount.accountId,
                amount,
                `Escrow for booking ${bookingId}`
            );
            
            console.log(`Escrow created: ${amount} HBAR locked for booking ${bookingId}`);
            
            return {
                escrowAccountId: escrowAccount.accountId,
                escrowPrivateKey: escrowAccount.privateKey,
                bookingId,
                amount,
                transactionId: transferResult.transactionId
            };
        } catch (error) {
            console.error(" Escrow creation failed:", error);
            throw error;
        }
    },

    async releaseEscrowPayment(
        escrowAccountId: string,
        escrowPrivateKey: string,
        hotelAccountId: string,
        amount: number,
        bookingId: string
    ): Promise<{status: string, transactionId: string}> {
        try {
            console.log(`Releasing escrow payment for booking ${bookingId}...`);
            
            const result = await hederaService.sendPayment(
                escrowAccountId,
                hotelAccountId,
                amount,
                escrowPrivateKey
            );
            
            console.log(`Payment released: ${amount} HBAR sent to hotel`);
            return result;
        } catch (error) {
            console.error("Escrow release failed:", error);
            throw error;
        }
    },

    async refundEscrowPayment(
        escrowAccountId: string,
        escrowPrivateKey: string,
        userAccountId: string,
        amount: number,
        bookingId: string
    ): Promise<{status: string, transactionId: string}> {
        try {
            console.log(`Refunding escrow for booking ${bookingId}...`);
            
            const result = await hederaService.sendPayment(
                escrowAccountId,
                userAccountId,
                amount,
                escrowPrivateKey
            );
            
            console.log(`Refund completed: ${amount} HBAR returned to user`);
            return result;
        } catch (error) {
            console.error("Escrow refund failed:", error);
            throw error;
        }
    }
}

export const userHederaService = {
    async setupNewUser(
        initialAllowance: number = 100
    ): Promise<{
        userAccount: any,
        allowanceSetup: any,
        initialBalance: any
    }> {
        try {
            console.log(' Setting up new user...');

            const userAccount = await hederaService.createAccount();
            
            if (process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY) {
                await hederaService.sendPayment(
                    process.env.HEDERA_ACCOUNT_ID,
                    userAccount.accountId,
                    20,
                    process.env.HEDERA_PRIVATE_KEY
                );
            }
            
            const allowanceSetup = await aiAgentService.setupUserAllowance(
                userAccount.accountId,
                userAccount.privateKey,
                process.env.MAIN_AI_AGENT_ACCOUNT_ID!,
                initialAllowance
            );
            
            const initialBalance = await hederaService.getBalance(userAccount.accountId);
            
            console.log('User setup complete!');
            
            return {
                userAccount,
                allowanceSetup,
                initialBalance
            };
        } catch (error) {
            console.error("User setup failed:", error);
            throw error;
        }
    },

}