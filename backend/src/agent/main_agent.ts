import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
    AgentCard,
    Message,
    Task,
    TaskStatusUpdateEvent
} from '@a2a-js/sdk';
import { EventEmitter } from 'events';
import { DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk/server';
import { A2AClient } from '@a2a-js/sdk/client';
import type { A2AClientOptions } from '@a2a-js/sdk/client';
import type { RequestContext } from '@a2a-js/sdk/server';
import type { ExecutionEventBus } from '@a2a-js/sdk/server';

import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { HotelSearchTool } from '../tools/hotelSearch.js';
import { DynamicTool } from "@langchain/core/tools";

interface AgentInfo {
    card: AgentCard;
    url: string;
}

export interface UnifiedAgentResponse {
    responseType: 'conversation' | 'hotel_search' | 'hotel_specific' | 'booking_confirmation';
    message: string; 
    hotels: Array<{
        id: string;
        name: string;
        location: string;
        stars: number;
        rating: number;
        pricePerNight: string;
        tags: string[];
    }> | null;  
    targetHotelId: string | null; 
    targetHotelName: string | null; 
    metadata: {
        searchParams?: any;
        totalResults?: number;
        intent?: string;
        confidence?: number;
        requiresRouting?: boolean;
        suggestedActions?: string[];
    } | null;
}

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey: process.env.GOOGLE_API_KEY!,
});


export class RoutingAgentExecutor {
    private agents: Map<string, AgentInfo> = new Map();
    private hotelSearchTool: HotelSearchTool;
    private systemPrompt: string = '';
    private tools: DynamicTool[] = [];

    async cancelTask(taskId: string): Promise<void> {
        console.log(`Cancelling task ${taskId}`);
    }

    constructor() {
        this.hotelSearchTool = new HotelSearchTool();
        this.initializeSystemPrompt();
    }
    
    public static async create(): Promise<RoutingAgentExecutor> {
        const executor = new RoutingAgentExecutor();
        await executor.initializeTools();
        await executor.discoverAgents(); // Discover hotel agents from registry
        return executor;
    }

    private async initializeTools(): Promise<void> {
        this.tools = [
            new DynamicTool({
                name: "search_hotels",
                description: `Search for hotels using Envio database. 
                Input should be a natural language query (e.g., "luxury hotels in Goa under 2 ETH").
                The tool will automatically parse the query and search the database.`,
                func: async (input: string) => {
                    try {
                        console.log('Search hotels tool input:', input);
                        const params = await this.parseSearchParams(input);
                        console.log('LLM parsed parameters:', params);
                        
                        if (Object.keys(params).length === 0) {
                            return JSON.stringify({ 
                                error: "Could not understand search criteria. Please specify location, price, star rating, or amenities."
                            });
                        }

                        const results = await this.hotelSearchTool.searchHotels(params);
                        console.log(`Found ${results.length} hotels matching criteria`);
                        
                        return JSON.stringify({ 
                            hotels: results,
                            searchParams: params
                        });
                    } catch (error) {
                        console.error('Error in search_hotels tool:', error);
                        throw error;
                    }
                },
            })
        ];
    }

    private initializeSystemPrompt(): void {
        this.systemPrompt = `
            You are the main agent for VeriTravel, a Web3 hotel booking platform.
            
            You MUST respond with a JSON object following this EXACT schema:
            {
                "responseType": "conversation" | "hotel_search" | "hotel_specific" | "booking_confirmation",
                "message": "human-readable response text",
                "hotels": [...hotel objects...] | null,
                "targetHotelId": "hotel_id" | null,
                "targetHotelName": "hotel_name" | null,
                "metadata": {
                    "searchParams": {...} | null,
                    "totalResults": number | null,
                    "intent": "user's intent description" | null,
                    "confidence": number (0-1) | null,
                    "requiresRouting": boolean | null,
                    "suggestedActions": ["action1", "action2"] | null
                } | null
            }

            RESPONSE TYPES AND WHEN TO USE THEM:

            1. "hotel_search" - When user wants to search/find multiple hotels
               - User is looking for hotels with certain criteria
               - Keywords: "show me hotels", "find hotels", "search", "hotels in [location]"
               - Set responseType: "hotel_search"
               - hotels: will be populated after search
               - targetHotelId: null
               - targetHotelName: null
               Examples: "Show me hotels in Goa", "Find 5-star hotels", "Hotels under 2 ETH"

            2. "hotel_specific" - When user asks about ONE specific hotel by name
               - User mentions a specific hotel name and wants info about it
               - This will route to that hotel's dedicated agent
               - Set responseType: "hotel_specific"
               - message: acknowledge routing to hotel agent
               - hotels: null
               - targetHotelId: "extract from available hotels"
               - targetHotelName: "extracted hotel name"
               - metadata.requiresRouting: true
               Examples: "Tell me about Seaside Inn", "What amenities does Wonderla Resort have?", "Book at Seaside Inn"

            3. "conversation" - For general queries, greetings, or travel information
               - User is chatting generally, not searching or asking about specific hotel
               - Set responseType: "conversation"
               - Provide helpful, friendly message
               - hotels: null
               - targetHotelId: null
               - targetHotelName: null
               Examples: "Hi there", "What's the best time to visit Goa?", "Tell me about Bengaluru"

            4. "booking_confirmation" - When user confirms they want to book
               - User explicitly says they want to book/reserve/confirm booking
               - Set responseType: "booking_confirmation"
               - message: confirmation details
               - Keep relevant hotel info if available
               Examples: "Yes, confirm my booking", "I want to book this", "Reserve the room"

            CRITICAL INSTRUCTIONS:
            - Always return VALID JSON only, no extra text
            - Use null for fields that don't apply to the responseType
            - For hotel_search, you'll need to call search tool (handled separately)
            - For hotel_specific, extract the exact hotel name from user's message
            - Be confident in your classification
        `;
    }

    private async parseSearchParams(query: string): Promise<{ maxPrice?: string; locations?: string[]; tags?: string[]; minStars?: number }> {
        const parsePrompt = `
            You are a search parameter parser for a hotel booking system. Convert the user's query into structured search parameters.

            The available parameters are:
            1. locations: array of strings (e.g., ["goa", "bengaluru"])
            2. maxPrice: string (in Wei - multiply ETH by 1e18)
            3. minStars: number (1-5)
            4. tags: array of strings (e.g., ["beach", "luxury", "family"])

            Common tags include: beach, family, business, luxury, pool, spa, sea, mountain, city

            Rules:
            - Convert all prices from ETH to Wei (multiply by 1e18)
            - Location names should be lowercase
            - Star ratings should be numbers
            - Include only mentioned parameters
            - Infer tags from context (e.g., "beachfront" implies ["beach", "sea"])
            - If no parameters are found, return empty object

            Extract parameters from this query and return ONLY a JSON object with no additional text.
            Query: "${query}"

            Example output: {"locations": ["goa"], "maxPrice": "3000000000000000000", "minStars": 5, "tags": ["beach"]}
        `;

        try {
            const response = await llm.invoke([
                { role: "system", content: parsePrompt },
                { role: "user", content: query }
            ]);

            let params;
            try {
                const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
                const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                params = JSON.parse(cleanContent);
            } catch (e) {
                console.error('Failed to parse LLM response as JSON:', response.content);
                params = {};
            }

            console.log('LLM parsed search params:', params);
            return params;
        } catch (error) {
            console.error('Error in LLM parsing:', error);
            return {};
        }
    }

    private async discoverAgents() {
        try {
            // Fetch all registered hotel agents from the router/registry
            const registryUrl = 'http://localhost:7000/registry';
            const response = await fetch(registryUrl);
            
            if (!response.ok) {
                console.error('Failed to fetch agent registry');
                return;
            }

            const data = await response.json();
            
            if (data.agents && Array.isArray(data.agents)) {
                for (const agent of data.agents) {
                    try {
                        // Create A2A client for each hotel agent
                        const client = new A2AClient(agent.url);
                        const card = await client.getAgentCard();
                        
                        // Store by hotel ID (e.g., "hotel-1" -> agent info)
                        this.agents.set(agent.id, { 
                            card, 
                            url: agent.url 
                        });
                        
                        console.log(`✅ Discovered hotel agent: ${agent.name} (${agent.id}) at ${agent.url}`);
                    } catch (error) {
                        console.log(`⚠️  Failed to get card for ${agent.name}:`, error);
                    }
                }
                
                console.log(`📋 Total agents discovered: ${this.agents.size}`);
            }
        } catch (error) {
            console.error('❌ Error discovering agents from registry:', error);
        }
    }

    private async processWithLLM(messageText: string): Promise<UnifiedAgentResponse> {
        try {
            // Get all available hotels for context
            const allHotels = await this.hotelSearchTool.searchHotels({});
            const hotelNamesContext = allHotels.map(h => `${h.name} (ID: ${h.id})`).join(', ');

            // Ask LLM to classify and structure the response
            const classificationPrompt = `
                Available hotels in database: ${hotelNamesContext}

                User query: "${messageText}"

                Analyze this query and return a JSON response following the UnifiedAgentResponse schema.
                
                Determine the correct responseType:
                - "conversation": general chat, greetings, travel info (no hotel search or specific hotel mention)
                - "hotel_search": user wants to find/search for hotels with criteria
                - "hotel_specific": user is asking about ONE specific hotel by name
                - "booking_confirmation": user confirms they want to book

                If responseType is "hotel_specific", extract the hotel name from the query and match it with available hotels to get the ID.
                
                Return ONLY valid JSON, no additional text.
            `;

            const classificationResponse = await llm.invoke([
                { role: "system", content: this.systemPrompt },
                { role: "user", content: classificationPrompt }
            ]);

            let classification: UnifiedAgentResponse;
            try {
                const content = typeof classificationResponse.content === 'string' 
                    ? classificationResponse.content 
                    : JSON.stringify(classificationResponse.content);
                const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                classification = JSON.parse(cleanContent);
            } catch (e) {
                console.error('Failed to parse LLM classification:', classificationResponse.content);
                // Fallback to conversation type
                classification = {
                    responseType: 'conversation',
                    message: typeof classificationResponse.content === 'string' 
                        ? classificationResponse.content 
                        : 'I can help you search for hotels or answer questions. What would you like to know?',
                    hotels: null,
                    targetHotelId: null,
                    targetHotelName: null,
                    metadata: null
                };
            }

            // If it's a hotel search, execute the search
            if (classification.responseType === 'hotel_search') {
                const searchTool = this.tools.find(t => t.name === 'search_hotels');
                if (!searchTool) {
                    throw new Error('Search hotels tool not found');
                }
                
                const searchResult = await searchTool.func(messageText);
                const parsed = JSON.parse(searchResult);
                
                if (parsed.error) {
                    classification.message = parsed.error;
                    classification.hotels = null;
                    classification.metadata = {
                        totalResults: 0,
                        intent: 'hotel search',
                        confidence: 0.9
                    };
                } else if (parsed.hotels) {
                    // Format the message with search results
                    let message = `Found ${parsed.hotels.length} hotel(s) matching your criteria:\n\n`;
                    parsed.hotels.forEach((hotel: any, idx: number) => {
                        message += `${idx + 1}. ${hotel.name}\n`;
                        message += `   📍 ${hotel.location}\n`;
                        message += `   ${'⭐'.repeat(hotel.stars)}\n`;
                        message += `   💰 ${hotel.pricePerNight} Wei/night\n`;
                        if (hotel.tags && hotel.tags.length > 0) {
                            message += `   ✨ ${hotel.tags.join(', ')}\n`;
                        }
                        message += `\n`;
                    });

                    classification.message = message;
                    classification.hotels = parsed.hotels;
                    classification.metadata = {
                        searchParams: parsed.searchParams,
                        totalResults: parsed.hotels.length,
                        intent: 'hotel search',
                        confidence: 0.95,
                        suggestedActions: parsed.hotels.length > 0 
                            ? ['Ask about a specific hotel', 'Refine search criteria', 'Book a room']
                            : ['Try different search criteria', 'Browse all hotels']
                    };
                }
            }

            // If it's hotel_specific, verify the hotel exists and get its ID
            if (classification.responseType === 'hotel_specific' && classification.targetHotelName) {
                const matchedHotel = allHotels.find(h => 
                    h.name.toLowerCase().includes(classification.targetHotelName!.toLowerCase()) ||
                    classification.targetHotelName!.toLowerCase().includes(h.name.toLowerCase())
                );

                if (matchedHotel) {
                    // Map hotel ID from database to agent ID
                    // Assuming hotel IDs in database match agent IDs (e.g., "0" -> "hotel-0", "1" -> "hotel-1")
                    const agentId = `hotel-${matchedHotel.id}`;
                    
                    classification.targetHotelId = agentId; // Store agent ID for routing
                    classification.targetHotelName = matchedHotel.name;
                    classification.message = `I'll connect you with the ${matchedHotel.name} agent who can help you with specific information about this property.`;
                    classification.metadata = {
                        intent: 'specific hotel inquiry',
                        confidence: 0.95,
                        requiresRouting: true,
                        suggestedActions: ['Ask about amenities', 'Check availability', 'View pricing']
                    };
                } else {
                    // Hotel not found, convert to conversation
                    classification.responseType = 'conversation';
                    classification.message = `I couldn't find a hotel named "${classification.targetHotelName}". Would you like me to search for similar hotels?`;
                    classification.targetHotelId = null;
                    classification.targetHotelName = null;
                    classification.metadata = {
                        intent: 'hotel not found',
                        confidence: 0.8,
                        suggestedActions: ['Search for hotels', 'View all available hotels']
                    };
                }
            }

            console.log('Final classification:', JSON.stringify(classification, null, 2));
            return classification;
        } catch (error) {
            console.error('Error in processWithLLM:', error);
            throw error;
        }
    }

    async execute(
        requestContext: RequestContext,
        eventBus: ExecutionEventBus
    ): Promise<void> {
        const userMessage = requestContext.userMessage;
        const taskId = requestContext.task?.id || uuidv4();
        const contextId = userMessage.contextId || requestContext.task?.contextId || uuidv4();
        const messageText = (userMessage?.parts && userMessage.parts[0]?.kind === 'text' && 'text' in userMessage.parts[0]) ? userMessage.parts[0].text : '';

        console.log(`[${taskId}] Processing request: "${messageText}"`);

        const hotelId = requestContext.task?.metadata?.hotelId;
        
        const workingUpdate: TaskStatusUpdateEvent = {
            kind: 'status-update',
            taskId,
            contextId,
            status: {
                state: 'working',
                message: {
                    kind: 'message',
                    role: 'agent',
                    messageId: uuidv4(),
                    parts: [{ kind: 'text', text: hotelId ? 'Routing to hotel agent...' : 'Processing your request...' }],
                    taskId,
                    contextId,
                },
                timestamp: new Date().toISOString(),
            },
            final: false,
        };
        eventBus.publish(workingUpdate);

        try {
            // Process the message and get unified response
            const result = await this.processWithLLM(messageText);
            console.log(`[${taskId}] Unified response:`, result);

            // If this is a hotel-specific query, route to hotel agent
            if (result.responseType === 'hotel_specific' && result.targetHotelId) {
                console.log(`[${taskId}] Routing to hotel agent for ${result.targetHotelName} (${result.targetHotelId})`);
                
                // Look up the hotel agent by its ID (e.g., "hotel-1")
                const hotelAgent = this.agents.get(result.targetHotelId);
                
                if (hotelAgent) {
                    console.log(`[${taskId}] Found hotel agent at ${hotelAgent.url}`);
                    
                    try {
                        const targetClient = new A2AClient(hotelAgent.url);
                        const stream = targetClient.sendMessageStream({ message: userMessage });

                        // Forward all events from hotel agent to the event bus
                        for await (const event of stream) {
                            eventBus.publish(event);
                        }
                        
                        console.log(`[${taskId}] Successfully completed routing to hotel agent`);
                        return; // Exit early since hotel agent handled the request
                    } catch (routingError) {
                        console.error(`[${taskId}] Error routing to hotel agent:`, routingError);
                        // Fall through to send error response
                        result.message = `I tried to connect you with ${result.targetHotelName}, but the agent is currently unavailable. Please try again later.`;
                        result.metadata = {
                            ...result.metadata,
                            intent: 'routing failed',
                            requiresRouting: false
                        };
                    }
                } else {
                    // Hotel agent not found in registry
                    console.log(`[${taskId}] Hotel agent ${result.targetHotelId} not found in registry`);
                    result.message = `The agent for ${result.targetHotelName} is not currently available. Please try again later or search for other hotels.`;
                    result.metadata = {
                        ...result.metadata,
                        intent: 'agent not available',
                        requiresRouting: false
                    };
                }
            }

            // Send the unified response as JSON
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
                        parts: [{ 
                            kind: 'text', 
                            text: JSON.stringify(result, null, 2)  // Send full unified response as JSON
                        }],
                        taskId,
                        contextId,
                    },
                    timestamp: new Date().toISOString(),
                },
                final: true,
            };
            eventBus.publish(successUpdate);
            console.log(`[${taskId}] Query processed successfully`);

        } catch (error: any) {
            console.error(`[${taskId}] Error:`, error);
            const errorResponse: UnifiedAgentResponse = {
                responseType: 'conversation',
                message: `Error processing request: ${error.message}`,
                hotels: null,
                targetHotelId: null,
                targetHotelName: null,
                metadata: {
                    intent: 'error',
                    confidence: 1.0
                }
            };

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
                        parts: [{ kind: 'text', text: JSON.stringify(errorResponse, null, 2) }],
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
}

const routingAgentCard: AgentCard = {
    name: 'VeriTravel Main Agent',
    description: 'Main agent for hotel search and routing in the VeriTravel Web3 booking platform.',
    url: 'http://localhost:41240/',
    provider: {
        organization: 'VeriTravel',
        url: 'https://veritravel.xyz',
    },
    version: '1.0.0',
    protocolVersion: '1.0',
    capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true,
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [
        {
            id: 'hotel-search',
            name: 'Hotel Search',
            description: 'Search for hotels with filters like location, price, stars, and amenities',
            examples: [
                'Show me 5-star hotels in Goa',
                'Find beachfront hotels under 2 ETH',
                'Luxury hotels in Bengaluru with a pool',
            ],
            tags: [],
        },
        {
            id: 'hotel-routing',
            name: 'Hotel Specific Routing',
            description: 'Routes queries about specific hotels to their dedicated agents',
            examples: [
                'Tell me about the pool at Hotel Seaside',
                'What are the check-in times at Mountain View Resort?',
                'Book a room at The Grand Hotel',
            ],
            tags: [],
        },
        {
            id: 'general-info',
            name: 'General Information',
            description: 'Handles general queries about locations and travel',
            examples: [
                "What's the best time to visit Goa?",
                'Tell me about popular tourist spots in Mumbai',
                'How far is Bengaluru airport from the city?',
            ],
            tags: [],
        },
    ],
};

async function main() {
    const taskStore = new InMemoryTaskStore();
    const agentExecutor = await RoutingAgentExecutor.create();
    const requestHandler = new DefaultRequestHandler(
        routingAgentCard,
        taskStore,
        agentExecutor
    );

    const routerApp = express();
    const app = new A2AExpressApp(requestHandler);
    const expressApp = app.setupRoutes(routerApp, '');

    const PORT = process.env.ROUTING_AGENT_PORT || 41240;
    expressApp.listen(PORT, () => {
        console.log(`[RoutingAgent] Server started on http://localhost:${PORT}`);
        console.log(`[RoutingAgent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    });
}

main().catch((err) => {
    console.error("Error starting RoutingAgent:", err);
});