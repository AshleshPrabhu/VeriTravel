import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createToolCallingAgent, AgentExecutor, Agent } from "langchain/agents";
import { BufferWindowMemory, type MemoryVariables } from "langchain/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod/v4";
import { BaseMessage } from "@langchain/core/messages"; 
import { hederaClient } from "../hedera/client.js";

import type { AgentCard } from "@a2a-js/sdk";
import {
  Client,
  PrivateKey,
  TopicMessageSubmitTransaction,
  AccountId,
} from '@hashgraph/sdk';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Document } from "@langchain/core/documents";
import type { Runnable } from "@langchain/core/runnables";
import { DynamicTool } from "langchain/tools";

export interface info_params{
    query: string
}

export interface booking_params{
    userId: string,
    checkInDate: string,
    price: number,
}

export interface Task{
    task: string,
    params: info_params | booking_params,
}

export interface HotelAgentConfig{
    id: string;
    name: string;
    basicInfo: string;
    hederaAccountId: string;
    hederaPrivateKey: string; 
    bookingTopicId: string;
}

export class HotelAgent{
    public readonly id: string;
    public readonly name: string;
    private basicInfo: string;
    public readonly hederaAccountId: AccountId;
    private hederaClient: Client;
    private bookingTopicId: string;
    private agentExecutor: AgentExecutor;

    private constructor(config: HotelAgentConfig, agentExecutor: AgentExecutor){
        this.id = config.id;
        this.name = config.name;
        this.basicInfo = config.basicInfo;
        this.hederaAccountId = AccountId.fromString(config.hederaAccountId);
        this.hederaClient = Client.forTestnet();
        this.hederaClient.setOperator(this.hederaAccountId, PrivateKey.fromStringECDSA(config.hederaPrivateKey))
        this.bookingTopicId = config.bookingTopicId;
        this.agentExecutor = agentExecutor;
    }

    public static async create(config: HotelAgentConfig){
        const embeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            apiKey: process.env.GEMINI_API_KEY!,
        });

        // TODO: this is just temporary. change later
        const docs = [
            new Document({ pageContent: 'The pool is open 9 AM to 9 PM.' }),
            new Document({
            pageContent: 'Checkout time is 11 AM. Late checkout costs $50.',
            }),
            new Document({ pageContent: 'Our cancellation policy is 48 hours.' }),
        ];

        
        const llm = new ChatGoogleGenerativeAI({
            model: "gemini-2.0-flash",
            apiKey: process.env.GEMINI_API_KEY!,
        });

        const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
        const retriever = vectorStore.asRetriever();
        const systemPrompt = `You are the expert assistant for the Hotel: ${config.name}.

                                Here is the basic information about the hotel:
                                ${config.basicInfo}

                                Answer the user's question based ONLY on this basic info and the following retrieved context. If the answer isn't in either, say so.

                                Context:
                                {context}`;

            const prompt = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            ['human', '{input}'],
            ]);

        const documentChain = await createStuffDocumentsChain({ llm, prompt });
        const ragChain = await createRetrievalChain({
            retriever,
            combineDocsChain: documentChain,
        });
        
        const tools = [
            new DynamicTool({
                name: "get_hotel_info",
                description: "Retrieve information about the hotel (e.g., pool hours, checkout time, cancellation policy).",
                func: async (input: string) => {
                    const { query } = JSON.parse(input) as {query:string};
                    const result = await ragChain.invoke({ input: query });
                    return result.answer;
                },
            }),
            // BELOW IS A DUMMY TOOL, I DIDNT WRITE THIS, CHANGE THIS LATER
            new DynamicTool({
                name: "create_booking_attestation",
                description: "Log a booking request to the Hedera Consensus Service (HCS).",
                func: async (input: string) => {
                    const { userId, checkInDate, price } = JSON.parse(input) as { userId: string, checkInDate: string, price: number };
                    const client = Client.forTestnet();
                    client.setOperator(
                        AccountId.fromString(config.hederaAccountId),
                        PrivateKey.fromStringECDSA(config.hederaPrivateKey)
                    );
                    const transaction = new TopicMessageSubmitTransaction()
                        .setTopicId(config.bookingTopicId)
                        .setMessage(JSON.stringify({ userId, checkInDate, price }));
                    const response = await transaction.execute(client);
                    const receipt = await response.getReceipt(client);
                    return `Booking attestation created with transaction ID: ${response.transactionId.toString()}`;
                },
            }),
        ];

        const memory = new BufferWindowMemory({k: 5});
        const agent = await createToolCallingAgent({
            llm,
            tools,
            prompt,
        });

        const agentExecutor = new AgentExecutor({
            agent,
            tools,
            memory
        })

        return new HotelAgent(config, agentExecutor);
    }

    public getAgentCard(): AgentCard{
        return{
            name: this.name,
            description: `The agent for ${this.name}. I can answer questions and process booking attestations.`,
            version: "1.0.0",
            capabilities: {},
            defaultInputModes: ['text'],
            defaultOutputModes: ['text'],
            protocolVersion: '1.0',
            url: 'http://localhost:3000', // TODO change later
            skills: [
                {
                id: 'get_hotel_info',
                name: 'get_hotel_info',
                description: 'Answer questions about the hotel (pool, checkout, etc.)',
                tags: [],
                },
                {
                id: 'create_booking_attestation',
                name: 'create_booking_attestation',
                description:
                    'Logs a booking request to the Hedera Consensus Service (HCS)',
                tags: [],
                },
            ],
        }
    }

    public async run(input: string){
        const result = await this.agentExecutor.invoke({ input });
        return result.output;
    }


}

