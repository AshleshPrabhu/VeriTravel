import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
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


export interface TravelAgentConfig{
    id: string;
    name: string;
    basicInfo: string;
    hederaAccountId: string;
    hederaPrivateKey: string;
    bookingTopicId: string;
    escrowContractId: string;
    hotelId: number;
    agentBaseUrl:string;
}

function createHotelInfoTool(llm: ChatGoogleGenerativeAI, config: TravelAgentConfig, pinecone: PineconeClient){
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
                
                const vectorStore = await PineconeStore.fromExistingIndex(
                    embeddings,
                    {
                        pineconeIndex: pineconeIndex as any,
                        namespace,
                    }
                );
                
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
                    return `Transaction ready for user signing. Base64 bytes: ${Buffer.from(txBytes).toString('base64')}. Please sign with your Hedera account (as payer, add payment amount) and send back the signed base64 bytes.`;
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

function createSubmitSignedTxTool(client: Client, contractId: ContractId, bookingTopicId: string, hcsTool: StructuredToolInterface | undefined){
    return new DynamicStructuredTool({
        name: 'submit_signed_booking_tx',
        description: `Submit a user-signed Hedera transaction for booking confirmation. 
        This broadcasts the signed transaction to the network, transferring funds from the USER'S Hedera account to the escrow contract.
        Use this when the user provides signed base64 bytes (after signing the unsigned tx from call_contract_function).
        The transaction must be a signed ContractExecuteTransaction for 'bookHotel' with the user as payer.`,
        schema: z.object({
            signedBytes: z.string().describe('Base64-encoded signed transaction bytes from the user'),
            hotelId: z.number().describe('The hotel ID (for logging)'),
            checkInDate: z.number().describe('Check-in date as Unix timestamp (for logging)'),
            checkOutDate: z.number().describe('Check-out date as Unix timestamp (for logging)'),
            amountInTinybars: z.number().optional().describe('Expected HBAR amount in tinybars (for logging)'),
        }),
        func: async ({ signedBytes, hotelId, checkInDate, checkOutDate, amountInTinybars }) =>{
            try{
                if(!signedBytes || !hotelId || !checkInDate || !checkOutDate){
                    throw new Error('Missing required fields: signedBytes, hotelId, checkInDate, checkOutDate');
                }
                const signedTx = ContractExecuteTransaction.fromBytes(Buffer.from(signedBytes, 'base64'));

                const submittedTx = await signedTx.execute(client);
                const receipt = await submittedTx.getReceipt(client);

                if(receipt.status.toString() !== 'SUCCESS'){
                    throw new Error(`Transaction submission failed: ${receipt.status}`);
                }

                const txId = submittedTx.transactionId.toString();

                if(hcsTool){
                    const bookingMessage = JSON.stringify({
                        bookingId: txId,
                        hotelId,
                        checkInDate,
                        checkOutDate,
                        amountInTinybars,
                        status: 'confirmed',
                        payer: receipt.accountId?.toString() ?? 'unknown',
                        timestamp: Date.now(),
                    });
                    await hcsTool.invoke({
                        topicId: bookingTopicId,
                        message: bookingMessage,
                    });
                }

                return `Booking confirmed successfully from your account! Transaction ID: ${txId}. Funds (${amountInTinybars ? `${amountInTinybars} tinybars` : 'payment'}) transferred to escrow.`;
            }catch(error){
                console.error('Error in submit_signed_booking_tx:', error);
                throw new Error(`Booking submission failed: ${error}`);
            }
        },
    });
}

function createHCSMessageTool(bookingTopicId: string, hcsTool: StructuredToolInterface){
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
            - Prepare unsigned transactions with call_contract_function (for 'bookHotel', etc.)
            
            For booking flow:
            1. When user wants to book, use call_contract_function with 'bookHotel' to get unsigned tx bytes.
            2. Instruct user to sign the bytes with THEIR Hedera wallet (as payer, including the payment amount) and send back the base64 signed bytes.
            3. When user provides signed bytes (e.g., message contains "signed bytes: [base64]"), parse the base64 string.
            4. Extract booking details from context or user message (hotelId: ${config.hotelId}, checkInDate, checkOutDate, amountInTinybars).
            5. Use submit_signed_booking_tx with the parsed signedBytes and details to broadcast the tx and transfer funds FROM THE USER'S ACCOUNT.
            
            IMPORTANT: 
            - For get_hotel_info, always pass hotelId: ${config.hotelId}
            - Always parse user messages for signed bytes patterns when confirming bookings (e.g., "signed bytes: [base64]").
            - Funds are paid from the USER'S account since they sign as payer.
            - If details are missing in confirmation, ask for them.
            - After successful submission, the tool handles HCS logging automatically.
            
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
        const submitSignedTxTool = createSubmitSignedTxTool(client, ContractId.fromString(config.escrowContractId), config.bookingTopicId, originalHcsTool);
        const allTools: StructuredToolInterface[] = [hotelInfoTool, contractTool, submitSignedTxTool];
        
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
            // const output = result.output;
            const output = (typeof result.output === 'string') ? result.output : JSON.stringify(result.output, null, 2);            

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
                { id: 'prepare_booking_tx', name: 'call_contract_function', description: 'Prepare unsigned tx for booking (user signs to pay from their account).', tags: ['hedera', 'booking'] },
                { id: 'submit_signed_tx', name: 'submit_signed_booking_tx', description: 'Broadcast user-signed tx to confirm booking and transfer funds from user.', tags: ['hedera', 'signature', 'payment'] },
                { id: 'check_in_hotel', name: 'call_contract_function', description: 'Check in to a booking.', tags: ['hedera'] },
                { id: 'cancel_booking', name: 'call_contract_function', description: 'Cancel a booking.', tags: ['hedera'] },
            ],
        };
    }
}


export async function createTravelAgent(config: TravelAgentConfig): Promise<TravelAgent> {
    return await TravelAgent.create(config);
}

//-----Main function incase you want to run a seperate server for this agent-----------
// async function main() {
//     const PORT = process.env.AGENT_PORT || 41241;
//     const config: TravelAgentConfig = {
//         id: 'hotel-0-agent', // Unique ID for this specific hotel agent
//         name: 'Seaside Inn',
//         basicInfo: 'Specializes in information and bookings for the Seaside Inn Hotel.',
//         hederaAccountId: process.env.HEDERA_ACCOUNT_ID!,
//         hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
//         bookingTopicId: process.env.BOOKING_TOPIC_ID!,
//         escrowContractId: process.env.ESCROW_CONTRACT_ID!,
//         hotelId: 1, // The specific hotel this agent serves
//         agentBaseUrl: `http://localhost:${PORT}`,
//     };

//     const agent = await TravelAgent.create(config);
//     const agentCard = agent.getAgentCard(); // Get the card from the instance

//     const taskStore = new InMemoryTaskStore();
    
//     // The agent instance now correctly implements the AgentExecutor interface required here
//     const requestHandler = new DefaultRequestHandler(
//         agentCard,
//         taskStore,
//         agent // Pass the TravelAgent instance
//     );

//     const routerApp = express();
//     const app = new A2AExpressApp(requestHandler);
//     const expressApp = app.setupRoutes(routerApp, '');

//     // Set a different default port than the RoutingAgent (41240)
//     // const PORT = process.env.AGENT_PORT || 41241; 
//     expressApp.listen(PORT, () => {
//         console.log(`[${agentCard.name}] Server started on http://localhost:${PORT}`);
//         console.log(`[${agentCard.name}] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
//     });
// }

// main().catch((err) => {
//     console.error("Error starting TravelAgent:", err);
// });