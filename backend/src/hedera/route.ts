import express from 'express';
import { 
    hederaService, 
    hotelHederaService, 
    aiAgentService, 
    userHederaService 
} from '../hedera/hederaService.js';

const router = express.Router();

router.post('/user/setup', async (req, res) => {
    try {
        const { initialAllowance } = req.body;
        const result = await userHederaService.setupNewUser(initialAllowance || 100);
        
        res.json({
            success: true,
            message: 'User setup complete',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'User setup failed'
        });
    }
});

router.get('/user/:accountId/balance', async (req, res) => {
    try {
        const { accountId } = req.params;
        const balance = await hederaService.getBalance(accountId);
        // const allowanceInfo = await userHederaService.getUserAllowanceInfo(accountId);
        
        res.json({
            success: true,
            data: {
                ...balance,
                // ...allowanceInfo
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get balance'
        });
    }
});

router.post('/user/allowance', async (req, res) => {
    try {
        const { userAccountId, userPrivateKey, allowanceAmount } = req.body;
        
        if (!userAccountId || !userPrivateKey || !allowanceAmount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userAccountId, userPrivateKey, allowanceAmount'
            });
        }

        const result = await aiAgentService.setupUserAllowance(
            userAccountId,
            userPrivateKey,
            process.env.MAIN_AI_AGENT_ACCOUNT_ID!,
            allowanceAmount
        );

        res.json({
            success: true,
            message: 'Allowance setup successful',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Allowance setup failed'
        });
    }
});

router.post('/hotel/setup', async (req, res) => {
    try {
        const { hotelName } = req.body;
        
        if (!hotelName) {
            return res.status(400).json({
                success: false,
                error: 'Hotel name is required'
            });
        }

        const result = await hotelHederaService.setupHotelAccounts(hotelName);
        
        res.json({
            success: true,
            message: 'Hotel Hedera setup complete',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Hotel setup failed'
        });
    }
});

// ignore this for now
router.post('/hotel/loyalty/award', async (req, res) => {
    try {
        const { 
            loyaltyTokenId, 
            hotelAccountId, 
            hotelPrivateKey, 
            guestAccountId, 
            points 
        } = req.body;

        const result = await hotelHederaService.awardLoyaltyPoints(
            loyaltyTokenId,
            hotelAccountId,
            hotelPrivateKey,
            guestAccountId,
            points
        );

        res.json({
            success: true,
            message: `Awarded ${points} loyalty points`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to award points'
        });
    }
});

router.post('/ai/make-booking-payment', async (req, res) => {
    try {
        const { 
            userAccountId, 
            hotelAccountId, 
            amount, 
            bookingId,
            memo 
        } = req.body;

        if (!userAccountId || !hotelAccountId || !amount || !bookingId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const escrow = await aiAgentService.createBookingEscrow(
            bookingId,
            userAccountId,
            process.env.MAIN_AI_AGENT_PRIVATE_KEY!,
            amount
        );

        res.json({
            success: true,
            message: 'Booking payment processed via escrow',
            data: {
                bookingId,
                escrowAccountId: escrow.escrowAccountId,
                amount,
                transactionId: escrow.transactionId
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Booking payment failed'
        });
    }
});

router.post('/ai/release-payment', async (req, res) => {
    try {
        const { 
            escrowAccountId, 
            escrowPrivateKey, 
            hotelAccountId, 
            amount, 
            bookingId 
        } = req.body;

        const result = await aiAgentService.releaseEscrowPayment(
            escrowAccountId,
            escrowPrivateKey,
            hotelAccountId,
            amount,
            bookingId
        );

        res.json({
            success: true,
            message: 'Payment released to hotel',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Payment release failed'
        });
    }
});

router.post('/ai/refund-payment', async (req, res) => {
    try {
        const { 
            escrowAccountId, 
            escrowPrivateKey, 
            userAccountId, 
            amount, 
            bookingId 
        } = req.body;

        const result = await aiAgentService.refundEscrowPayment(
            escrowAccountId,
            escrowPrivateKey,
            userAccountId,
            amount,
            bookingId
        );

        res.json({
            success: true,
            message: 'Payment refunded to user',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Refund failed'
        });
    }
});

router.post('/ai/direct-payment', async (req, res) => {
    try {
        const { userAccountId, recipientAccountId, amount, memo } = req.body;

        const result = await aiAgentService.agentMakePayment(
            userAccountId,
            process.env.MAIN_AI_AGENT_PRIVATE_KEY!,
            recipientAccountId,
            amount,
            memo
        );

        res.json({
            success: true,
            message: 'Direct payment completed',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Direct payment failed'
        });
    }
});

router.post('/account/create', async (req, res) => {
    try {
        const account = await hederaService.createAccount();
        res.json({
            success: true,
            data: account
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Account creation failed'
        });
    }
});

// Send HBAR payment
router.post('/payment/send', async (req, res) => {
    try {
        const { fromAccountId, toAccountId, amount, privateKey } = req.body;
        
        const result = await hederaService.sendPayment(
            fromAccountId,
            toAccountId,
            amount,
            privateKey
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Payment failed'
        });
    }
});

router.post('/token/create', async (req, res) => {
    try {
        const { 
            name, 
            symbol, 
            initialSupply, 
            decimals, 
            treasuryAccountId, 
            treasuryPrivateKey 
        } = req.body;

        const result = await hederaService.createToken(
            name,
            symbol,
            initialSupply || 1000000,
            decimals || 0,
            treasuryAccountId,
            treasuryPrivateKey
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Token creation failed'
        });
    }
});

router.post('/token/transfer', async (req, res) => {
    try {
        const { 
            tokenId, 
            fromAccountId, 
            toAccountId, 
            amount, 
            privateKey 
        } = req.body;

        const result = await hederaService.transferTokens(
            tokenId,
            fromAccountId,
            toAccountId,
            amount,
            privateKey
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Token transfer failed'
        });
    }
});

export default router;