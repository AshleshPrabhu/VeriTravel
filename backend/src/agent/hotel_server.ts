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
        id: 'hotel-0',
        name: 'Seaside Inn',
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
    const { agentId, message } = req.body as { agentId: string; message: Message };

    if (!agentId || !message) {
        return res.status(400).json({ error: "Missing 'agentId' or 'message' in body" });
    }

    // 1. Find agent URL from registry
    const agentInfo = agentCache.get(agentId);
    if (!agentInfo) {
        return res.status(404).json({ "error": `Hotel agent '${agentId}' not found in registry` });
    }

    console.log(`[StreamProxy] Forwarding message to ${agentInfo.name} at ${agentInfo.agentBaseUrl}`);

    // 2. Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers immediately

    try {
        // 3. Create A2A client and get the stream
        const targetClient = new A2AClient(agentInfo.agentBaseUrl);
        const stream = targetClient.sendMessageStream({ message });

        // 4. Pipe events from the agent stream to the HTTP response
        for await (const event of stream) {
            // Format as an SSE message: "data: {JSON_STRING}\n\n"
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

    } catch (error) {
        console.error(`[StreamProxy] Error streaming from ${agentId}:`, error);
        // Try to send an error event to the client
        const errorEvent = {
            kind: 'status-update',
            status: { state: 'failed', message: { kind: 'text', text: (error as Error).message } },
            final: true
        };
        res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    } finally {
        // 5. Close the connection
        console.log(`[StreamProxy] Stream closed for ${agentId}`);
        res.end();
    }
});

app.listen(7000, async () => {
    console.log('Hotel Agents *Router* Server on port 7000');
    console.log('Registered agents:');
    agentRegistry.forEach(agent => {
        console.log(`- ${agent.name} (${agent.id}) -> ${agent.agentBaseUrl}`);
    });
});