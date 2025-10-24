import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AgentCard, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type { RequestContext } from '@a2a-js/sdk/server';
import type { ExecutionEventBus } from '@a2a-js/sdk/server';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk/server';
import { A2AExpressApp } from "@a2a-js/sdk/server/express";

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Client, PrivateKey, AccountId, ContractId, TopicId, ContractExecuteTransaction, ContractCallQuery, ContractFunctionParameters, Hbar } from '@hashgraph/sdk';
import { PineconeStore } from '@langchain/pinecone';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { HederaLangchainToolkit, coreConsensusPlugin } from 'hedera-agent-kit';
import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';


// --- Configuration and Tool Functions (Unchanged) ---

export interface TravelAgentConfig{
    id: string;
    name: string;
    basicInfo: string;
    hederaAccountId: string;
    hederaPrivateKey: string;
    bookingTopicId: string;
    escrowContractId: string;
    hotelId: number; // Added specific hotel ID for this agent
    agentBaseUrl:string;
}

// NOTE: llm must be passed to createHotelInfoTool since it uses it directly.
function createHotelInfoTool(llm: ChatGoogleGenerativeAI, config: TravelAgentConfig, pinecone: PineconeClient){
    // ... (Your createHotelInfoTool implementation remains the same) ...
    // Note: The LLM for RAG is already configured inside this function.
    return new DynamicStructuredTool({
        name: 'get_hotel_info',
        description: 'Retrieve hotel details (e.g., pool hours, checkout time). Input: question string and hotelId.',
        schema: z.object({
            question: z.string().describe('The question about hotel information'),
            hotelId: z.number().describe('The hotel ID to query information for')
        }),
        func: async ({ question, hotelId }) => {
            try {
                const embeddings = new GoogleGenerativeAIEmbeddings({
                    model: 'text-embedding-004',
                    apiKey: process.env.GOOGLE_API_KEY!,
                });

                const namespace = `hotel-${hotelId}`;
                const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME || 'hotel-bookings');
                
                const vectorStore = await PineconeStore.fromExistingIndex(embeddings,{
                    pineconeIndex,
                    namespace,
                });
                
                const retriever = vectorStore.asRetriever({
                    k: 3,
                    filter: { hotelId }
                });

                const ragPrompt = ChatPromptTemplate.fromTemplate(`
                    You are ${config.name}, an AI travel agent for hotel bookings on Hedera.
                    Basic info: ${config.basicInfo}
                    Answer the user's question based ONLY on the following retrieved context for Hotel ID ${hotelId}. 
                    If the answer isn't in the context, say so.

                    Context:
                    {context}

                    Question: {input}
                `);

                const documentChain = await createStuffDocumentsChain({ llm, prompt: ragPrompt });
                const ragChain = await createRetrievalChain({ retriever, combineDocsChain: documentChain });

                const result = await ragChain.invoke({ input: question });
                return result.answer;
            } catch (error) {
                return `Error retrieving hotel info: ${error}`;
            }
        }
    });
}

function createContractCallTool(client: Client, contractId: ContractId){
    // ... (Your createContractCallTool implementation remains the same) ...
    return new DynamicStructuredTool({
        name: 'call_contract_function',
        description: `Call functions on BookingEscrow contract. Supported functions:
        - bookHotel: Book a hotel room
        - checkInHotel: Check in to a booking
        - cancelBooking: Cancel a booking
        - getBooking: Get booking details
        - getUserBookings: Get all bookings for a user
        - getHotelBookings: Get all bookings for a hotel`,
        schema: z.object({
            functionName: z.enum(['bookHotel', 'checkInHotel', 'cancelBooking', 'getBooking', 'getUserBookings', 'getHotelBookings'])
                .describe('The function to call'),
            hotelId: z.number().optional().describe('Hotel ID (for bookHotel, getHotelBookings)'),
            checkInDate: z.number().optional().describe('Check-in date as Unix timestamp (for bookHotel)'),
            checkOutDate: z.number().optional().describe('Check-out date as Unix timestamp (for bookHotel)'),
            bookingId: z.number().optional().describe('Booking ID (for checkInHotel, cancelBooking, getBooking)'),
            userAddress: z.string().optional().describe('User address (for getUserBookings)'),
            valueInTinybars: z.number().optional().describe('HBAR amount in tinybars (for bookHotel)')
        }),
        func: async (input) => {
            try{
                const { functionName, hotelId, checkInDate, checkOutDate, bookingId, userAddress, valueInTinybars } = input;

                if(['bookHotel', 'checkInHotel', 'cancelBooking'].includes(functionName)){
                    const tx = new ContractExecuteTransaction()
                        .setContractId(contractId)
                        .setGas(100000);
                    
                    if(valueInTinybars && functionName === 'bookHotel'){
                        tx.setPayableAmount(Hbar.fromTinybars(valueInTinybars));
                    }

                    if(functionName === 'bookHotel'){
                        if(!hotelId || !checkInDate || !checkOutDate){
                            throw new Error('bookHotel requires hotelId, checkInDate, and checkOutDate');
                        }
                        tx.setFunction('bookHotel', new ContractFunctionParameters()
                            .addUint256(hotelId)
                            .addUint256(checkInDate)
                            .addUint256(checkOutDate));
                    }else if(functionName === 'checkInHotel' || functionName === 'cancelBooking'){
                        if(!bookingId){
                            throw new Error(`${functionName} requires bookingId`);
                        }
                        tx.setFunction(functionName, new ContractFunctionParameters().addUint256(bookingId));
                    }

                    const txBytes = await tx.toBytes();
                    return `Transaction ready for signing. Base64 bytes: ${Buffer.from(txBytes).toString('base64')}`;
                }else if (['getBooking', 'getUserBookings', 'getHotelBookings'].includes(functionName)){
                    const query = new ContractCallQuery()
                        .setContractId(contractId)
                        .setGas(100000);
                        
                    if(functionName === 'getBooking'){
                        if(!bookingId) throw new Error('getBooking requires bookingId');
                        query.setFunction('getBooking', new ContractFunctionParameters().addUint256(bookingId));
                    }else if(functionName === 'getUserBookings'){
                        if(!userAddress) throw new Error('getUserBookings requires userAddress');
                        query.setFunction('getUserBookings', new ContractFunctionParameters().addAddress(userAddress));
                    } else if(functionName === 'getHotelBookings'){
                        if(!hotelId) throw new Error('getHotelBookings requires hotelId');
                        query.setFunction('getHotelBookings', new ContractFunctionParameters().addUint256(hotelId));
                    }
                    
                    const result = await query.execute(client);
                    return JSON.stringify(result.asBytes());
                }else{
                    throw new Error(`Unsupported function: ${functionName}`);
                }
            }catch(error){
                return `Error: ${error}`;
            }
        }
    });
}

function createHCSMessageTool(bookingTopicId: string, hcsTool: StructuredToolInterface){
    // ... (Your createHCSMessageTool implementation remains the same) ...
    return new DynamicStructuredTool({
        name: 'submit_hcs_message',
        description: `Log a booking attestation to Hedera HCS topic ${bookingTopicId}. Provide the message content as a JSON string containing booking details.`,
        schema: z.object({
            topicId: z.string().describe('The HCS topic ID to submit to'),
            message: z.string().describe('The message content as a JSON string')
        }),
        func: async ({ topicId, message }) => {
            try{
                const result = await hcsTool.invoke({ topicId, message });
                return typeof result === 'string' ? result : JSON.stringify(result);
            }catch(error){
                return `Error submitting to HCS: ${error}`;
            }
        }
    });
}

async function initializePineconeStore(pinecone: PineconeClient){
    // NOTE: This function is currently empty, but it's called during setup.
    const embeddings = new GoogleGenerativeAIEmbeddings({
        model: 'text-embedding-004',
        apiKey: process.env.GOOGLE_API_KEY!,
    });
}

// --- Travel Agent (A2A Executor) Implementation ---

export class TravelAgent{
    public readonly id: string;
    public readonly name: string;
    private agentExecutor: AgentExecutor;
    private client: Client;
    private config: TravelAgentConfig;
    
    // NOTE: bookingTopicId and escrowContractId are initialized for context,
    // but the actual Hedera SDK objects are not directly needed here.
    private bookingTopicId: TopicId; 
    private escrowContractId: ContractId;

    private constructor(config: TravelAgentConfig, agentExecutor: AgentExecutor, client: Client){
        this.id = config.id;
        this.name = config.name;
        this.agentExecutor = agentExecutor;
        this.client = client;
        this.config = config;
        this.bookingTopicId = TopicId.fromString(config.bookingTopicId);
        this.escrowContractId = ContractId.fromString(config.escrowContractId);
    }
    
    async cancelTask(taskId: string): Promise<void> {
        console.log(`Cancelling task ${taskId}`);
        // In a real scenario, you might try to stop the LLM call or transaction.
    }  

    public static async create(config: TravelAgentConfig): Promise<TravelAgent> {
        const pinecone = new PineconeClient({
            apiKey: process.env.PINECONE_API_KEY!,
        });

        console.log('Initializing Pinecone vector store');
        await initializePineconeStore(pinecone);

        const llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.0-flash',
            apiKey: process.env.GOOGLE_API_KEY!,
        });

        const systemPrompt = `
            You are ${config.name}, the specialized AI agent for Hotel ID ${config.hotelId}.
            Basic info: ${config.basicInfo}
            Your primary goal is to answer specific questions about this hotel and handle bookings/cancellations.
            
            Use tools to:
            - Answer hotel questions with get_hotel_info (ALWAYS use hotelId: ${config.hotelId})
            - Log bookings to HCS with submit_hcs_message (topicId: ${config.bookingTopicId})
            - Book/manage hotels with call_contract_function
            
            IMPORTANT: For get_hotel_info, always pass hotelId: ${config.hotelId}
            
            For bookings:
            - Extract userId, checkInDate/checkOutDate (Unix timestamps), price (HBAR in tinybars)
            - Call bookHotel with hotelId: ${config.hotelId} and price as valueInTinybars
            - Use HITL for transactions (return transaction bytes for user approval)
            
            If input is unclear or missing details, ask for clarification.
        `;

        const agentPrompt = ChatPromptTemplate.fromTemplate(
            systemPrompt + '\n\n{input}\n\n{agent_scratchpad}'
        );

        console.log('Setting up Hedera client');
        const client = Client.forName(process.env.HEDERA_NETWORK || 'testnet').setOperator(
            AccountId.fromString(config.hederaAccountId),
            PrivateKey.fromStringECDSA(config.hederaPrivateKey)
        );

        const toolkit = new HederaLangchainToolkit({
            client,
            configuration: {
                plugins: [coreConsensusPlugin],
            },
        });
        const hederaTools = await toolkit.getTools();
        const originalHcsTool = hederaTools.find((t) => t.name === 'submit_topic_message_tool');
        
        console.log('Creating agent tools');
        const hotelInfoTool = createHotelInfoTool(llm, config, pinecone);
        const contractTool = createContractCallTool(client, ContractId.fromString(config.escrowContractId));
        const allTools: StructuredToolInterface[] = [hotelInfoTool, contractTool];
        
        if(originalHcsTool){
            const hcsMessageTool = createHCSMessageTool(config.bookingTopicId, originalHcsTool);
            allTools.push(hcsMessageTool);
        }

        const agent = await createToolCallingAgent({ llm, tools: allTools, prompt: agentPrompt });
        const agentExecutor = new AgentExecutor({ 
            agent, 
            tools: allTools,
            returnIntermediateSteps: false,
            maxIterations: 10
        });

        console.log(`✓ Agent ${config.name} initialized with Pinecone namespace hotel-${config.hotelId}\n`);
        return new TravelAgent(config, agentExecutor, client);
    }
    
    // **CRITICAL CHANGE: This method now implements the A2A Executor interface**
    public async execute(
        requestContext: RequestContext,
        eventBus: ExecutionEventBus
    ): Promise<void> {
        const taskId = requestContext.task?.id || uuidv4();
        const contextId = requestContext.userMessage.contextId || requestContext.task?.contextId || uuidv4();
        const messageText = requestContext.userMessage?.parts && requestContext.userMessage.parts[0]?.kind === 'text' 
            ? requestContext.userMessage.parts[0].text : '';

        console.log(`[${taskId}] [${this.name}] Processing request: "${messageText}"`);

        // 1. Send WORKING update
        eventBus.publish({
            kind: 'status-update',
            taskId,
            contextId,
            status: {
                state: 'working',
                message: {
                    kind: 'message',
                    role: 'agent',
                    messageId: uuidv4(),
                    parts: [{ kind: 'text', text: `${this.name} is processing your request...` }],
                    taskId, contextId,
                },
                timestamp: new Date().toISOString(),
            },
            final: false,
        });

        try{
            // 2. Execute the LangChain Agent
            const result = await this.agentExecutor.invoke({ input: messageText });
            const output = result.output;

            // 3. Send COMPLETED update
            const successUpdate: TaskStatusUpdateEvent = {
                kind: 'status-update',
                taskId,
                contextId,
                status: {
                    state: 'completed',
                    message: {
                        kind: 'message',
                        role: 'agent',
                        messageId: uuidv4(),
                        parts: [{ kind: 'text', text: output }], // The final response from LangChain
                        taskId,
                        contextId,
                    },
                    timestamp: new Date().toISOString(),
                },
                final: true,
            };
            eventBus.publish(successUpdate);
            console.log(`[${taskId}] Query processed successfully. Output: ${output.substring(0, 50)}...`);
            
        } catch(error) {
            console.error(`[${taskId}] Error during execution:`, error);
            
            // 4. Send FAILED update
            const errorUpdate: TaskStatusUpdateEvent = {
                kind: 'status-update',
                taskId,
                contextId,
                status: {
                    state: 'failed',
                    message: {
                        kind: 'message',
                        role: 'agent',
                        messageId: uuidv4(),
                        parts: [{ kind: 'text', text: `An internal error occurred: ${(error as Error).message}` }],
                        taskId,
                        contextId,
                    },
                    timestamp: new Date().toISOString(),
                },
                final: true,
            };
            eventBus.publish(errorUpdate);
        }
    }

    public getAgentCard(): AgentCard {
        return {
            name: this.name,
            description: `Specialized AI Agent for Hotel ID ${this.config.hotelId}. Uses Hedera for bookings and Pinecone for hotel data.`,
            url: this.config.agentBaseUrl,
            provider: {
                organization: 'VeriTravel',
                url: 'https://veritravel.xyz',
            },
            version: '1.0.0',
            protocolVersion: '1.0',
            capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
            defaultInputModes: ['text'],
            defaultOutputModes: ['text'],
            skills: [
                { id: 'get_hotel_info', name: 'get_hotel_info', description: 'Answer hotel questions (amenities, policies, hours) for this specific hotel.', tags: ['rag', 'pinecone'] },
                { id: 'book_hotel', name: 'call_contract_function', description: 'Book a room via BookingEscrow contract.', tags: ['hedera', 'booking'] },
                { id: 'check_in_hotel', name: 'call_contract_function', description: 'Check in to a booking.', tags: ['hedera'] },
                { id: 'cancel_booking', name: 'call_contract_function', description: 'Cancel a booking.', tags: ['hedera'] },
            ],
        };
    }
}


// --- Server Setup (The desired main function) ---

async function main() {
    // NOTE: This is a placeholder config. You must define this with real ENV variables.
    const PORT = process.env.AGENT_PORT || 41241;
    const config: TravelAgentConfig = {
        id: 'hotel-1-agent', // Unique ID for this specific hotel agent
        name: 'Grand Hotel Agent',
        basicInfo: 'Specializes in information and bookings for the Grand Hotel.',
        hederaAccountId: process.env.HEDERA_ACCOUNT_ID!,
        hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
        bookingTopicId: process.env.BOOKING_TOPIC_ID!,
        escrowContractId: process.env.ESCROW_CONTRACT_ID!,
        hotelId: 1, // The specific hotel this agent serves
        agentBaseUrl: `http://localhost:${PORT}`,
    };

    const agent = await TravelAgent.create(config);
    const agentCard = agent.getAgentCard(); // Get the card from the instance

    const taskStore = new InMemoryTaskStore();
    
    // The agent instance now correctly implements the AgentExecutor interface required here
    const requestHandler = new DefaultRequestHandler(
        agentCard,
        taskStore,
        agent // Pass the TravelAgent instance
    );

    const routerApp = express();
    const app = new A2AExpressApp(requestHandler);
    const expressApp = app.setupRoutes(routerApp, '');

    // Set a different default port than the RoutingAgent (41240)
    // const PORT = process.env.AGENT_PORT || 41241; 
    expressApp.listen(PORT, () => {
        console.log(`[${agentCard.name}] Server started on http://localhost:${PORT}`);
        console.log(`[${agentCard.name}] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    });
}

main().catch((err) => {
    console.error("Error starting TravelAgent:", err);
});