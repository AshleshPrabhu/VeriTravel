import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { TravelAgent, createTravelAgent, type TravelAgentConfig } from './hotel_specific.js';
import type { 
    Message, 
    TaskStatusUpdateEvent 
} from '@a2a-js/sdk';
import type { RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document } from '@langchain/core/documents';
import { PineconeStore } from '@langchain/pinecone';

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

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!);

const embeddings = new GoogleGenerativeAIEmbeddings({
            model: 'text-embedding-004',
            apiKey: process.env.GOOGLE_API_KEY!,
        });

// --- Agent Registry with Configs ---
interface AgentRegistryEntry {
    id: string; 
    name: string;
    config: TravelAgentConfig;
    instance: TravelAgent | undefined; // Cache the agent instance
}

const agentRegistry: AgentRegistryEntry[] = [
    {
        id: 'hotel-0',
        name: 'Seaside Inn',
        instance: undefined,
        config: {
            id: 'hotel-0-agent',
            name: 'Seaside Inn',
            basicInfo: 'Specializes in information and bookings for the Seaside Inn Hotel.',
            hederaAccountId: process.env.HEDERA_ACCOUNT_ID!,
            hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
            bookingTopicId: process.env.BOOKING_TOPIC_ID!,
            escrowContractId: process.env.ESCROW_CONTRACT_ID!,
            hotelId: 0,
            agentBaseUrl: 'http://localhost:41241',
        }
    },
    // Add more hotels here as needed
    // {
    //     id: 'hotel-1',
    //     name: 'Mountain Lodge',
    //     config: {
    //         id: 'hotel-1-agent',
    //         name: 'Mountain Lodge',
    //         basicInfo: 'Specializes in information and bookings for the Mountain Lodge Hotel.',
    //         hederaAccountId: process.env.HEDERA_ACCOUNT_ID!,
    //         hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
    //         bookingTopicId: process.env.BOOKING_TOPIC_ID!,
    //         escrowContractId: process.env.ESCROW_CONTRACT_ID!,
    //         hotelId: 2,
    //         agentBaseUrl: 'http://localhost:41242',
    //     }
    // },
];

const agentCache = new Map<string, AgentRegistryEntry>(
    agentRegistry.map(agent => [agent.id, agent])
);

// --- Initialize all agents on startup ---
async function initializeAgents() {
    console.log('Initializing hotel agents...');
    for (const entry of agentRegistry) {
        try {
            console.log(`- Initializing ${entry.name}...`);
            entry.instance = await createTravelAgent(entry.config);
            console.log(`  ✓ ${entry.name} ready`);
        } catch (error) {
            console.error(`  ✗ Failed to initialize ${entry.name}:`, error);
        }
    }
    console.log('All agents initialized.\n');
}

// --- Simple EventBus implementation ---
class SimpleEventBus extends EventEmitter implements ExecutionEventBus {
    publish(event: TaskStatusUpdateEvent): void {
        this.emit('event', event);
    }
    
    finished(): Promise<void> {
        return Promise.resolve();
    }
}



async function storeHotelInfoInPinecone(hotelId: number, hotelInfo: string){
    try {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1024,
            chunkOverlap: 256,
        });
        const chunks = await splitter.splitText(hotelInfo);
        const documents = chunks.map((chunk) => new Document({ pageContent: chunk, metadata: { hotelId } }));

        const namespace = `hotel-${hotelId}`;
        await PineconeStore.fromDocuments(documents, embeddings,{
            pineconeIndex: pineconeIndex as any,
            namespace,
        });

        console.log(`Hotel info embedded and stored for hotel-${hotelId}`);
    } catch(error){
        console.error(`Failed to store hotel info for hotel-${hotelId}:`, error);
        throw error;
    }
}


// --- /registry ENDPOINT ---
app.get('/registry', async (req, res) => {
    const { hotelId } = req.query; 
    
    let agents = agentRegistry.map(agent => ({
        id: agent.id,
        name: agent.name,
        url: agent.config.agentBaseUrl,
        cardUrl: `${agent.config.agentBaseUrl}/.well-known/agent-card.json`
    }));

    if (hotelId && typeof hotelId === 'string') {
        const agent = agents.filter(a => a.id === hotelId);
        res.json({ agent });
    } else {
        res.json({ agents });
    }
});

// --- Main endpoint: Direct agent execution ---
app.post('/', async (req, res) => {
    const { agentId, message } = req.body as { agentId: string; message: Message };

    if (!agentId || !message) {
        return res.status(400).json({ error: "Missing 'agentId' or 'message' in body" });
    }

    // 1. Find agent in registry
    const agentEntry = agentCache.get(agentId);
    if (!agentEntry || !agentEntry.instance) {
        return res.status(404).json({ error: `Hotel agent '${agentId}' not found or not initialized` });
    }

    console.log(`[Router] Executing ${agentEntry.name} directly...`);

    // 2. Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        // 3. Create EventBus to capture events
        const eventBus = new SimpleEventBus();
        
        // 4. Listen to events and stream them to the client
        eventBus.on('event', (event: TaskStatusUpdateEvent) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
            
            // Close connection after final event
            if (event.final) {
                console.log(`[Router] Final event sent for ${agentId}`);
                res.end();
            }
        });

        // 5. Create RequestContext from the incoming message
        const taskId = message.taskId || uuidv4();
        const contextId = message.contextId || uuidv4();
        
        const requestContext: RequestContext = {
            taskId: taskId,
            contextId: contextId,
            userMessage: message,
            ...(message.taskId && {
                task: {
                    kind: 'task',
                    id: taskId,
                    contextId: contextId,
                    status: {
                        state: 'working',
                        timestamp: new Date().toISOString()
                    }
                }
            })
        };

        // 6. Execute the agent directly
        await agentEntry.instance.execute(requestContext, eventBus);

    } catch (error) {
        console.error(`[Router] Error executing ${agentId}:`, error);
        
        // Send error event
        const errorEvent: TaskStatusUpdateEvent = {
            kind: 'status-update',
            taskId: message.taskId || uuidv4(),
            contextId: message.contextId || uuidv4(),
            status: {
                state: 'failed',
                message: {
                    kind: 'message',
                    role: 'agent',
                    messageId: uuidv4(),
                    parts: [{ kind: 'text', text: `Error: ${(error as Error).message}` }],
                    taskId: message.taskId || uuidv4(),
                    contextId: message.contextId || uuidv4(),
                },
                timestamp: new Date().toISOString(),
            },
            final: true
        };
        
        res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
        res.end();
    }
});

app.post("/register-hotel", async (req, res) => {
    const { agentConfig, hotelInfo } = req.body as { 
        agentConfig: TravelAgentConfig; 
        hotelInfo: string;
    };

    if(!agentConfig || !hotelInfo){
        return res.status(400).json({ error: "Missing 'agentConfig' or 'hotelInfo' in body" });
    }

    const { hotelId, name } = agentConfig;

    try{
        await storeHotelInfoInPinecone(hotelId, hotelInfo);

        const newEntry: AgentRegistryEntry ={
            id: `hotel-${hotelId}`,
            name,
            config: agentConfig,
            instance: await createTravelAgent(agentConfig),
        };
        agentRegistry.push(newEntry);
        agentCache.set(newEntry.id, newEntry);

        console.log(`New hotel agent registered: ${name} (${newEntry.id})`);
        res.json({ 
            success: true, 
            agentId: newEntry.id, 
            message: `Hotel '${name}' registered and agent initialized.` 
        });
    } catch(error){
        console.error(`[Router] Error registering hotel:`, error);
        res.status(500).json({ error: `Registration failed: ${(error as Error).message}` });
    }
});

// --- Start server ---
app.listen(7000, async () => {
    console.log('Hotel Agents *Router* Server on port 7000');
    console.log('Initializing agents...\n');
    
    await initializeAgents();
    
    console.log('Router ready. Registered agents:');
    agentRegistry.forEach(agent => {
        console.log(`- ${agent.name} (${agent.id})`);
    });
});