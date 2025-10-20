import express from 'express';
import { hederaService, hotelBookingService, aiAgentService } from './hederaService.js';

const router = express.Router();

// Get account balance
router.get('/balance/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const balance = await hederaService.getBalance(accountId);
        res.json({ success: true, balance });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// Send payment
router.post('/send-payment', async (req, res) => {
    try {
        const { fromAccountId, toAccountId, amount, privateKey } = req.body;
        
        if (!fromAccountId || !toAccountId || !amount || !privateKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        const result = await hederaService.sendPayment(fromAccountId, toAccountId, amount, privateKey);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// Create new account
router.post('/create-account', async (req, res) => {
    try {
        const account = await hederaService.createAccount();
        res.json({ success: true, account });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// Hotel Registration
router.post('/hotel/register', async (req, res) => {
    try {
        const { hotelName } = req.body;
        
        if (!hotelName) {
            return res.status(400).json({ 
                success: false, 
                error: 'Hotel name is required' 
            });
        }

        // Create Hedera account for hotel
        const hotelAccount = await hederaService.createAccount();
        
        // Create loyalty token for hotel
        const loyaltyToken = await hederaService.createToken(
            `${hotelName} Loyalty Token`,
            hotelName.substring(0, 3).toUpperCase()
        );

        res.json({
            success: true,
            hotelAccount,
            loyaltyToken
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// User sets up allowance for AI agent
router.post('/user/setup-allowance', async (req, res) => {
    try {
        const { userAccountId, userPrivateKey, allowanceAmount } = req.body;
        
        if (!userAccountId || !userPrivateKey || !allowanceAmount) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // You'll need to set this in your .env file
        const agentAccountId = process.env.MAIN_AI_AGENT_ACCOUNT_ID;
        
        if (!agentAccountId) {
            return res.status(500).json({ 
                success: false, 
                error: 'AI Agent account not configured' 
            });
        }

        const result = await aiAgentService.setupUserAllowance(
            userAccountId,
            userPrivateKey,
            agentAccountId,
            allowanceAmount
        );

        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

// AI Agent makes booking payment
router.post('/agent/make-booking', async (req, res) => {
    try {
        const { userAccountId, hotelAccountId, amount } = req.body;
        
        if (!userAccountId || !hotelAccountId || !amount) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        const agentPrivateKey = process.env.MAIN_AI_AGENT_PRIVATE_KEY;
        
        if (!agentPrivateKey) {
            return res.status(500).json({ 
                success: false, 
                error: 'AI Agent private key not configured' 
            });
        }

        const result = await aiAgentService.agentMakePayment(
            userAccountId,
            agentPrivateKey,
            hotelAccountId,
            amount
        );

        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
});

export default router;