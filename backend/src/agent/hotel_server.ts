import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// --- Imports needed for the A2A Client ---
import { A2AClient } from '@a2a-js/sdk/client';
import type { 
    Message, 
    MessageSendParams, 
    TaskStatusUpdateEvent 
} from '@a2a-js/sdk';


async function sendMessageAndGetFinalResponse(
    agentUrl: string,
    messageText: string,
    currentContextId?: string 
): Promise<any> {
    const client = new A2AClient(agentUrl);
    const messageId = uuidv4();

    const messagePayload: Message = {
        messageId: messageId,
        kind: "message",
        role: "user",
        parts: [
            {
                kind: "text",
                text: messageText,
            },
        ],
        ...(currentContextId && { contextId: currentContextId }),
    };

    const params: MessageSendParams = {
        message: messagePayload,
    };

    console.log(`[Router] Sending message to ${agentUrl}...`);

    try {
        const stream = client.sendMessageStream(params);

        for await (const event of stream) {
            if (event.kind === "status-update") {
                const statusUpdate = event as TaskStatusUpdateEvent;

                if (statusUpdate.final) {
                    const finalMessage = statusUpdate.status.message;
                    
                    if (finalMessage && finalMessage.parts && finalMessage.parts[0]?.kind === 'text') {
                        const rawText = finalMessage.parts[0].text;
                        
                        try {
                            const finalResponse = JSON.parse(rawText);
                            console.log(`[Router] Successfully received final JSON from ${agentUrl}.`);
                            return finalResponse; 
                        } catch (parseError) {
                            console.warn(`[Router] Final message from ${agentUrl} was not JSON. Returning raw text.`);
                            return { error: "Received stream, but final message text was not valid JSON.", rawText };
                        }
                    }
                }
            }
        }
        
        throw new Error("Stream closed without sending a final successful status update.");

    } catch (error) {
        console.error(`[Router] A2A communication failed with ${agentUrl}:`, (error as Error).message);
        throw error;
    }
}


const app = express();
app.use(express.json()); 

const allowedOrigins = ['http://localhost:5173']; //frontend
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    })
);

interface AgentRegistryEntry {
    id: string; 
    name: string;
    agentBaseUrl: string;
}

const agentRegistry: AgentRegistryEntry[] = [
    {
        id: 'hotel-1',
        name: 'Grand Hotel Agent',
        agentBaseUrl: 'http://localhost:41241',
    },
    // {
    //     id: 'hotel-2',
    //     name: 'Luxury Inn Agent',
    //     agentBaseUrl: 'http://localhost:41242',
    // },
    // {
    //     id: 'hotel-3',
    //     name: 'Beach Resort Agent',
    //     agentBaseUrl: 'http://localhost:41243',
    // }
];

const agentCache = new Map<string, AgentRegistryEntry>(
    agentRegistry.map(agent => [agent.id, agent])
);


// --- /registry ENDPOINT (Unchanged) ---
// This GET endpoint is for discovery and is not part of the invocation change.
app.get('/registry', async (req, res) =>{
    const { hotelId } = req.query; 
    
    let agents = agentRegistry.map(agent => ({
        id: agent.id,
        name: agent.name,
        url: agent.agentBaseUrl,
        cardUrl: `${agent.agentBaseUrl}/.well-known/agent-card.json`
    }));

    if (hotelId && typeof hotelId === 'string') {
        const agent = agents.filter(a => a.id === hotelId);
        res.json({ agent });
    } else {
        res.json({ agents });
    }
});


app.post('/', async (req, res) => {
    // 1. Get ALL data from the body
    const { agentId, intent, input } = req.body;

    // 2. Validate top-level fields
    if (!agentId || !intent || !input) {
        return res.status(400).json({ 
            error: "Missing required fields in body: agentId, intent, and input are all required." 
        });
    }

    // 3. Find agent URL from registry
    const agentInfo = agentCache.get(agentId);
    if(!agentInfo){
        return res.status(404).json({ "error": `Hotel agent '${agentId}' not found in registry` });
    }

    // 4. Build the prompt (This logic is identical to your old server)
    let prompt = '';
    let requiredFields = [];
    let responseKey = 'response';

    try{
        switch(intent){
            case "booking_confirmation":
                requiredFields = ['HotelName', 'hotelId', 'userId', 'checkInDate', 'checkOutDate', 'value'];
                if (requiredFields.some(field => input[field] === undefined)) {
                    return res.status(400).json({ error: `Missing required fields for ${intent}: ${requiredFields.join(', ')}` });
                }
                
                prompt = `Book ${input.HotelName} (hotelId: ${input.hotelId}) for user: ${input.userId} on ${input.checkInDate} to ${input.checkOutDate} for ${input.value} tinybars.`;
                responseKey = 'transactionBytes';
                break;

            case "hotel_specific":
                requiredFields = ['question', 'hotelId'];
                if (requiredFields.some(field => input[field] === undefined)) {
                    return res.status(400).json({ error: `Missing required fields for ${intent}: ${requiredFields.join(', ')}` });
                }

                prompt = `Answer this question about hotel ID ${input.hotelId}: "${input.question}"`;
                responseKey = 'answer';
                break;

            case "check_in":
                requiredFields = ['bookingId'];
                if(requiredFields.some(field => input[field] === undefined)){
                    return res.status(400).json({ error: `Missing required fields for ${intent}: ${requiredFields.join(', ')}` });
                }

                prompt = `Check in to booking ID ${input.bookingId}.`;
                responseKey = 'transactionBytes';
                break;

            case "cancel_booking":
                requiredFields = ['bookingId'];
                if (requiredFields.some(field => input[field] === undefined)) {
                    return res.status(400).json({ error: `Missing required fields for ${intent}: ${requiredFields.join(', ')}` });
                }
                
                prompt = `Cancel booking ID ${input.bookingId}.`;
                responseKey = 'transactionBytes';
                break;

            case "get_booking_details":
                requiredFields = ['bookingId'];
                if(requiredFields.some(field => input[field] === undefined)){
                    return res.status(400).json({ error: `Missing required fields for ${intent}: ${requiredFields.join(', ')}` });
                }

                prompt = `Get booking details for booking ID ${input.bookingId}.`;
                responseKey = 'details';
                break;

            case "get_user_bookings":
                requiredFields = ['userAddress'];
                if(requiredFields.some(field => input[field] === undefined)){
                    return res.status(400).json({ error: `Missing required fields for ${intent}: ${requiredFields.join(', ')}` });
                }

                prompt = `Get all bookings for user ${input.userAddress}.`;
                responseKey = 'bookings';
                break;

            case "get_hotel_bookings":
                requiredFields = ['hotelId'];
                if(requiredFields.some(field => input[field] === undefined)){
                    return res.status(400).json({ error: `Missing required fields for ${intent}: ${requiredFields.join(', ')}` });
                }

                prompt = `Get all bookings for hotel ID ${input.hotelId}.`;
                responseKey = 'bookings';
                break;

            default:
                return res.status(400).json({ error: `Unsupported intent: ${intent}` });
        }

        // 5. Call the external A2A agent
        const agentResponse = await sendMessageAndGetFinalResponse(
            agentInfo.agentBaseUrl,
            prompt
        );

        // 6. Translate the A2A response back to the old API format
        let responseValue: string;

        if (agentResponse.error && agentResponse.rawText) {
            responseValue = agentResponse.rawText;
        } else if (agentResponse.message) {
            responseValue = agentResponse.message;
        } else if (agentResponse.error) {
            throw new Error(agentResponse.error);
        } else {
            throw new Error('Unknown response format from A2A agent');
        }

        // 7. Send the response in the *old* format
        res.json({ [responseKey]: responseValue });

    }catch(error){
        console.error(`Error invoking agent ${agentId} for intent ${intent}:`, error);
        const errorMessage = (error instanceof Error) ? error.message : "Agent invocation failed";
        res.status(500).json({ error: errorMessage, details: error });
    }
});

app.listen(7000, async () => {
    console.log('Hotel Agents *Router* Server on port 7000');
    console.log('Registered agents:');
    agentRegistry.forEach(agent => {
        console.log(`- ${agent.name} (${agent.id}) -> ${agent.agentBaseUrl}`);
    });
});