import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents';
import { BufferWindowMemory } from 'langchain/memory';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Client, PrivateKey, AccountId, ContractId, TopicId, ContractExecuteTransaction, ContractCallQuery, ContractFunctionParameters, Hbar } from '@hashgraph/sdk';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Tool } from 'langchain/tools';
import { HederaLangchainToolkit, coreConsensusPlugin } from 'hedera-agent-kit';

export interface TravelAgentConfig{
  id: string;
  name: string;
  basicInfo: string;
  hederaAccountId: string;
  hederaPrivateKey: string;
  bookingTopicId: string;
  escrowContractId: string;
}

class HotelInfoTool extends Tool{
  name = 'get_hotel_info';
  description = 'Retrieve hotel details (e.g., pool hours, checkout time). Input: question string.';

  constructor(private ragChain: any){
    super();
  }

  protected async _call(input: string): Promise<string>{
    const result = await this.ragChain.invoke({ input });
    return result.answer;
  }
}

class ContractCallTool extends Tool{
  name = 'call_contract_function';
  description = `
    Call functions on BookingEscrow contract. Input: JSON string { contractId: string, functionName: string, params: object, value?: number }.
    Supported functions:
    - bookHotel: { hotelId: number, checkInDate: number, checkOutDate: number }, value: HBAR amount in tinybars.
    - checkInHotel: { bookingId: number }.
    - cancelBooking: { bookingId: number }.
    - getBooking: { bookingId: number }.
    - getUserBookings: { user: string }.
    - getHotelBookings: { hotelId: number }.
    For bookHotel, checkInHotel, cancelBooking, return transaction bytes for user approval (HITL).
  `;

  constructor(private client: Client, private contractId: ContractId){
    super();
  }

  protected async _call(input: string): Promise<string>{
    try{
      const{ contractId, functionName, params, value } = JSON.parse(input);
      if(contractId !== this.contractId.toString()){
        throw new Error('Invalid contractId');
      }

      if(['bookHotel', 'checkInHotel', 'cancelBooking'].includes(functionName)){
        const tx = new ContractExecuteTransaction().setContractId(this.contractId).setGas(100000);
        if (value) {
          tx.setPayableAmount(Hbar.fromTinybars(value));
        }

        if(functionName === 'bookHotel'){
          const { hotelId, checkInDate, checkOutDate } = params;
          tx.setFunction('bookHotel', new ContractFunctionParameters()
            .addUint256(hotelId)
            .addUint256(checkInDate)
            .addUint256(checkOutDate));
        } else if(functionName === 'checkInHotel' || functionName === 'cancelBooking'){
          const { bookingId } = params;
          tx.setFunction(functionName, new ContractFunctionParameters().addUint256(bookingId));
        }

        const txBytes = await tx.toBytes();
        return `transaction bytes: ${Buffer.from(txBytes).toString('base64')}`;
      } else if (['getBooking', 'getUserBookings', 'getHotelBookings'].includes(functionName)){
        // Query functions
        const query = new ContractCallQuery().setContractId(this.contractId).setGas(100000);
        if(functionName === 'getBooking'){
          query.setFunction('getBooking', new ContractFunctionParameters().addUint256(params.bookingId));
        }else if (functionName === 'getUserBookings'){
          query.setFunction('getUserBookings', new ContractFunctionParameters().addAddress(params.user));
        }else if (functionName === 'getHotelBookings'){
          query.setFunction('getHotelBookings', new ContractFunctionParameters().addUint256(params.hotelId));
        }
        const result = await query.execute(this.client);
        return JSON.stringify(result.asBytes());
      }else {
        throw new Error(`Unsupported function: ${functionName}`);
      }
    }catch(error){
      return `Error: ${error}`;
    }
  }
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
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: 'text-embedding-004',
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    const docs = [
      new Document({ pageContent: 'The pool is open 9 AM to 9 PM.' }),
      new Document({ pageContent: 'Checkout time is 11 AM. Late checkout costs $50.' }),
      new Document({ pageContent: 'Our cancellation policy is 48 hours.' }),
    ];

    const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
    const retriever = vectorStore.asRetriever();

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    const ragPrompt = ChatPromptTemplate.fromTemplate(`
      You are ${config.name}, an AI travel agent for hotel bookings on Hedera.
      Basic info: ${config.basicInfo}
      Answer the user's question based ONLY on the following retrieved context. If the answer isn't in the context, say so.

      Context:
      {context}

      Question: {input}
    `);

    const documentChain = await createStuffDocumentsChain({ llm, prompt: ragPrompt });
    const ragChain = await createRetrievalChain({ retriever, combineDocsChain: documentChain });

    const systemPrompt = `
      You are {{name}}, an AI travel agent for hotel bookings on Hedera.
      Basic info: {{basicInfo}}
      Use tools to:
      - Answer hotel questions (e.g., pool hours) with get_hotel_info (input: question string).
      - Log bookings to HCS with submit_hcs_message (input: JSON string {{ topicId, message: {{ userId: string, checkInDate: string, price: number, bookingId: number }} }}).
      - Book a hotel with call_contract_function (functionName: "bookHotel", input: JSON string {{ contractId: "{{escrowContractId}}", params: {{ hotelId: number, checkInDate: number, checkOutDate: number }}, value: number }}) and log to HCS.
      - Check in to a booking with call_contract_function (functionName: "checkInHotel", input: JSON string {{ contractId: "{{escrowContractId}}", params: {{ bookingId: number }} }}).
      - Cancel a booking with call_contract_function (functionName: "cancelBooking", input: JSON string {{ contractId: "{{escrowContractId}}", params: {{ bookingId: number }} }}).
      - Get booking details with call_contract_function (functionName: "getBooking", input: JSON string {{ contractId: "{{escrowContractId}}", params: {{ bookingId: number }} }}).
      - Get user bookings with call_contract_function (functionName: "getUserBookings", input: JSON string {{ contractId: "{{escrowContractId}}", params: {{ user: string }} }}).
      - Get hotel bookings with call_contract_function (functionName: "getHotelBookings", input: JSON string {{ contractId: "{{escrowContractId}}", params: {{ hotelId: number }} }}).
      For bookings:
      - Extract userId, hotelId (default: 1), checkInDate/checkOutDate (Unix timestamps), price (HBAR in tinybars).
      - Call bookHotel with price as msg.value and log to HCS.
      - Use HITL for bookHotel, checkInHotel, cancelBooking (return transaction bytes).
      If input is unclear, ask for clarification. Examples:
      - "Book Grand Hotel for user123 on 2025-10-25 to 2025-10-27 for 100000000 tinybars" → bookHotel + HCS log.
      - "Check in to booking ID 1" → checkInHotel.
      - "Get my bookings for 0x123...abc" → getUserBookings.
    `;

    const agentPrompt = ChatPromptTemplate.fromTemplate(systemPrompt + '\n\n{input}\n\n{agent_scratchpad}');

    // Hedera Client & Toolkit
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
    const tools = await toolkit.getTools();

    const hcsTool = tools.find((t) => t.name === 'submit_message_to_topic')!;
    hcsTool.description = `Log a booking attestation to Hedera HCS topic ${config.bookingTopicId}. Input: JSON string { topicId, message: { userId: string, checkInDate: string, price: number, bookingId: number } }.`;

    const contractTool = new ContractCallTool(client, ContractId.fromString(config.escrowContractId));

    const allTools = [new HotelInfoTool(ragChain), hcsTool, contractTool];

    const memory = new BufferWindowMemory({ k: 5 });
    const agent = await createToolCallingAgent({ llm, tools: allTools, prompt: agentPrompt }); // Use agentPrompt
    const agentExecutor = new AgentExecutor({ agent, tools: allTools, memory });

    return new TravelAgent(config, agentExecutor, client);
  }

  public async run(input: string): Promise<string>{
    try{
      const result = await this.agentExecutor.invoke({ input });
      if(typeof result.output === 'string' && result.output.includes('transaction bytes')){
        const txBytes = result.output.match(/transaction bytes: ([\w\d\/+=]+)/)?.[1];
        // if (txBytes) {
        //   // Simulate wallet signing (e.g., HashPack)
        //   const signedTx = await this.client.signTransaction(Buffer.from(txBytes, 'base64'));
        //   const response = await signedTx.execute(this.client);
        //   const receipt = await response.getReceipt(this.client);
        //   let extraInfo = '';
        //   if (result.output.includes('bookHotel')) {
        //     const bookingId = receipt.contractFunctionResult?.getUint256(0);
        //     extraInfo = `Booking ID: ${bookingId}`;
        //   }
        //   return `${result.output}\nTransaction confirmed: Tx ID ${response.transactionId.toString()}, Status: ${receipt.status.toString()}${extraInfo ? `, ${extraInfo}` : ''}`;
        // }
      }
      return result.output;
    }catch (error){
      return `Error: ${error}`;
    }
  }

  public getAgentCard(){
    return {
      name: this.name,
      description: `AI Travel Agent for ${this.name}. Uses Hedera Agent Kit for HCS logging and BookingEscrow contract interactions.`,
      version: '1.0.0',
      capabilities: { hederaIntegration: true, smartContracts: true, nftBookings: true },
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      protocolVersion: '1.0',
      url: 'http://localhost:3000',
      skills: [
        { id: 'get_hotel_info', name: 'get_hotel_info', description: 'Answer hotel questions.', tags: ['rag'] },
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

async function main() {
  const config: TravelAgentConfig ={
    id: 'travel-1',
    name: 'AI Travel Booker',
    basicInfo: 'Handles hotel bookings, check-ins, cancellations, and queries via BookingEscrow on Hedera.',
    hederaAccountId: process.env.HEDERA_ACCOUNT_ID!,
    hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
    bookingTopicId: process.env.BOOKING_TOPIC_ID!,
    escrowContractId: process.env.ESCROW_CONTRACT_ID!,
  };

  const agent = await TravelAgent.create(config);
  const responses = await Promise.all([
    agent.run('What are the pool hours?'),
    agent.run('Book Grand Hotel for user123 on 2025-10-25 to 2025-10-27 for 100000000 tinybars.'),
    agent.run('Check in to booking ID 1.'),
    agent.run('Cancel booking ID 2.'),
    agent.run('Get booking details for booking ID 1.'),
    agent.run('Get bookings for user 0x1234567890abcdef1234567890abcdef12345678.'),
    agent.run('Get bookings for hotel ID 1.'),
  ]);
  console.log(responses.join('\n'));
}

main().catch(console.error);