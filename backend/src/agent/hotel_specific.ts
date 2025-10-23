import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Client, PrivateKey, AccountId, ContractId, TopicId, ContractExecuteTransaction, ContractCallQuery, ContractFunctionParameters, Hbar } from '@hashgraph/sdk';
import { Document } from '@langchain/core/documents';
import { PineconeStore } from '@langchain/pinecone';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { HederaLangchainToolkit, coreConsensusPlugin } from 'hedera-agent-kit';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';

export interface TravelAgentConfig{
  id: string;
  name: string;
  basicInfo: string;
  hederaAccountId: string;
  hederaPrivateKey: string;
  bookingTopicId: string;
  escrowContractId: string;
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

// If you want to hardcode any details you can do so here for now.
async function initializePineconeStore(pinecone: PineconeClient){
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: 'text-embedding-004',
    apiKey: process.env.GOOGLE_API_KEY!,
  });
}

export class TravelAgent{
  public readonly id: string;
  public readonly name: string;
  private agentExecutor: AgentExecutor;
  private client: Client;
  private bookingTopicId: TopicId;
  private escrowContractId: ContractId;

  private constructor(config: TravelAgentConfig, agentExecutor: AgentExecutor, client: Client){
    this.id = config.id;
    this.name = config.name;
    this.agentExecutor = agentExecutor;
    this.client = client;
    this.bookingTopicId = TopicId.fromString(config.bookingTopicId);
    this.escrowContractId = ContractId.fromString(config.escrowContractId);
  }

  public static async create(config: TravelAgentConfig) {
    const pinecone = new PineconeClient({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    console.log('Initializing Pinecone vector store');
    await initializePineconeStore(pinecone);

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    // temporary prompt, will change later
    const systemPrompt = `
      You are ${config.name}, an AI travel agent for hotel bookings on Hedera.
      Basic info: ${config.basicInfo}
      
      Use tools to:
      - Answer hotel questions with get_hotel_info (MUST provide hotelId)
      - Log bookings to HCS with submit_hcs_message (topicId: ${config.bookingTopicId})
      - Book/manage hotels with call_contract_function
      
      IMPORTANT: When answering questions about hotel information, you MUST extract or ask for the hotelId.
      Different hotels have different policies and amenities stored in separate namespaces.
      
      Available hotels: 1, 2, 3
      
      For bookings:
      - Extract userId, hotelId (default: 1), checkInDate/checkOutDate (Unix timestamps), price (HBAR in tinybars)
      - Call bookHotel with price as valueInTinybars and log to HCS
      - Use HITL for transactions (return transaction bytes for user approval)
      
      If input is unclear or missing hotelId, ask for clarification.
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

    console.log('✓ Travel agent initialized with Pinecone namespaces\n');
    return new TravelAgent(config, agentExecutor, client);
  }

  public async run(input: string): Promise<string>{
    try{
      const result = await this.agentExecutor.invoke({ input });
      return result.output;
    }catch(error){
      return `Error: ${error}`;
    }
  }
  // ig we dont need this for hotel specific agent?
  public getAgentCard(){
    return{
      name: this.name,
      description: `AI Travel Agent for ${this.name}. Uses Hedera Agent Kit for HCS logging and BookingEscrow contract interactions. Powered by Pinecone vector DB with namespace isolation.`,
      version: '1.0.0',
      capabilities: { hederaIntegration: true, smartContracts: true, nftBookings: true, vectorSearch: true },
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      protocolVersion: '1.0',
      url: 'http://localhost:3000',
      skills: [
        { id: 'get_hotel_info', name: 'get_hotel_info', description: 'Answer hotel questions with namespace isolation.', tags: ['rag', 'pinecone'] },
        { id: 'submit_hcs_message', name: 'submit_hcs_message', description: 'Log bookings to HCS.', tags: ['hedera', 'hcs'] },
        { id: 'book_hotel', name: 'call_contract_function', description: 'Book hotel via BookingEscrow.', tags: ['hedera', 'hscs'] },
        { id: 'check_in_hotel', name: 'call_contract_function', description: 'Check in to a booking.', tags: ['hedera', 'hscs'] },
        { id: 'cancel_booking', name: 'call_contract_function', description: 'Cancel a booking.', tags: ['hedera', 'hscs'] },
        { id: 'get_booking', name: 'call_contract_function', description: 'Get booking details.', tags: ['hedera', 'hscs'] },
        { id: 'get_user_bookings', name: 'call_contract_function', description: 'Get user bookings.', tags: ['hedera', 'hscs'] },
        { id: 'get_hotel_bookings', name: 'call_contract_function', description: 'Get hotel bookings.', tags: ['hedera', 'hscs'] },
      ],
    };
  }
}

async function main(){
  const config: TravelAgentConfig = {
    id: 'travel-1',
    name: 'AI Travel Booker',
    basicInfo: 'Handles hotel bookings, check-ins, cancellations, and queries via BookingEscrow on Hedera.',
    hederaAccountId: process.env.HEDERA_ACCOUNT_ID!,
    hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
    bookingTopicId: process.env.BOOKING_TOPIC_ID!,
    escrowContractId: process.env.ESCROW_CONTRACT_ID!,
  };

  const agent = await TravelAgent.create(config);
  
  console.log('Testing agent with Pinecone namespaced hotel information\n');
  
  const tests = [
    'What are the pool hours for hotel 1?',
    'What are the pool hours for hotel 2?',
    'What is the checkout time for hotel 3?',
    'What is the cancellation policy for hotel 1?',
    'Tell me about amenities at hotel 2',
    'Book Grand Hotel (hotel 1) for user123 on 2025-10-25 to 2025-10-27 for 100000000 tinybars.',
    'Check in to booking ID 1.',
    'Cancel booking ID 2.',
    'Get booking details for booking ID 1.',
    'Get bookings for user 0x1234567890abcdef1234567890abcdef12345678.',
    'Get bookings for hotel ID 1.',
  ];

  for(const test of tests){
    console.log(`\nQuery: ${test}`);
    const response = await agent.run(test);
    console.log(`Response: ${response}\n`);
  }
}

main().catch(console.error);