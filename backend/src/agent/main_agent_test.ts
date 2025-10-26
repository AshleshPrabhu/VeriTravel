import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from "url";
import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/memory";
import cors from 'cors';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
    AgentCard,
    Message,
    Task,
    TaskStatusUpdateEvent
} from '@a2a-js/sdk';
// import { EventEmitter } from 'events';
import { DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk/server';
// import { A2AClient } from '@a2a-js/sdk/client';
// import type { A2AClientOptions } from '@a2a-js/sdk/client';
import type { RequestContext } from '@a2a-js/sdk/server';
import type { ExecutionEventBus } from '@a2a-js/sdk/server';

import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { HotelSearchTool } from '../tools/hotelSearch.js';
// import { DynamicTool } from "@langchain/core/tools";

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
        bookingDetails?: {
            hotelId: string;
            checkinUnix: number;
            checkoutUnix: number;
            totalValueWei: string;
        } | null;
    } | null;
}

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey: process.env.GOOGLE_API_KEY!,
});


export class RoutingAgentExecutor {
    private hotelSearchTool: HotelSearchTool;
    private memory: BufferMemory;

    async cancelTask(taskId: string): Promise<void> {
        console.log(`Cancelling task ${taskId}`);
    }

    constructor() {
        this.hotelSearchTool = new HotelSearchTool();
        this.memory = new BufferMemory({
            memoryKey: "history",
            inputKey: "input",
            outputKey: "output",
            chatHistory: new ChatMessageHistory(),
        });
    }
    
    public static async create(): Promise<RoutingAgentExecutor> {
        const executor = new RoutingAgentExecutor();
        return executor;
    }

    private async processWithLLM(messageText: string): Promise<UnifiedAgentResponse> {
        try {
            // Get all available hotels for context
            const allHotels = await this.hotelSearchTool.searchHotels({});
            const hotelNamesContext = allHotels.map(h => `${h.name} (ID: ${h.id}, Location: ${h.location})`).join(', ');
            const pastMessages = await this.memory.loadMemoryVariables({});
            const context = pastMessages.history || "";

            // Single comprehensive prompt with the complete schema
            const unifiedPrompt = `
                You are the main agent for VeriTravel, a Web3 hotel booking platform.

                CONVERSATION CONTEXT:
                ${context ? `Previous conversation: ${context}` : 'No previous context'}

                AVAILABLE HOTELS:
                ${hotelNamesContext}

                USER QUERY: "${messageText}"

                ---

                You MUST respond with a JSON object following this EXACT schema:

                {
                    "responseType": "conversation" | "hotel_search" | "hotel_specific" | "booking_confirmation",
                    "message": "human-readable response text",
                    "hotels": null,
                    "targetHotelId": "hotel_id" | null,
                    "targetHotelName": "hotel_name" | null,
                    "metadata": {
                        "searchParams": {
                            "locations": ["string"] | undefined,
                            "maxPrice": "string" | undefined,
                            "minStars": number | undefined,
                            "tags": ["string"] | undefined
                        } | null,
                        "totalResults": number | null,
                        "intent": "string",
                        "confidence": number,
                        "requiresRouting": boolean | null,
                        "suggestedActions": ["string"] | null
                    }
                }

                RESPONSE TYPE CLASSIFICATION:

                1. "conversation" - General chat, greetings, travel information
                - No hotel search or specific hotel mentioned
                - Examples: "Hello", "What's the weather in Goa?", "Tell me about Mumbai"
                - Set: hotels=null, targetHotelId=null, targetHotelName=null, metadata.searchParams=null

                2. "hotel_search" - User wants to search/find hotels
                - Keywords: "show", "find", "search", "list", "hotels in", "all hotels"
                - CRITICAL: Extract search parameters into metadata.searchParams:
                    * locations: ["goa"] if user mentions "goa", ["mumbai", "goa"] for multiple, or omit for all hotels
                    * maxPrice: "3000000000000000000" (in Wei, 1 ETH = 1e18 Wei) if user mentions price
                    * minStars: 5 if user mentions star rating
                    * tags: ["beach", "luxury"] inferred from context (beach, family, business, luxury, pool, spa, sea, mountain, city)
                - If user wants ALL hotels (no filters), set metadata.searchParams={}
                - Examples: 
                    * "Hotels in Goa" → searchParams: {"locations": ["goa"]}
                    * "5-star hotels under 2 ETH" → searchParams: {"minStars": 5, "maxPrice": "2000000000000000000"}
                    * "Show all hotels" → searchParams: {}
                - Set: hotels=null, targetHotelId=null, targetHotelName=null

                3. "hotel_specific" - User asks about ONE specific hotel by name
                - User mentions a hotel name from the available hotels list
                - Match the hotel name to get the ID
                - Examples: "Tell me about Seaside Inn", "What amenities does op hotel have?"
                - Set: hotels=null, targetHotelId="hotel-X", targetHotelName="Exact Name", metadata.requiresRouting=true

                4. "booking_confirmation" - User confirms they want to book
                - Keywords: "book", "reserve", "confirm", "yes book it"
                - Extract hotel name from query or context
                - Examples: "Book Seaside Inn", "Yes, I want to reserve"
                - Set: metadata.requiresRouting=false (handled by main agent)

                RULES:
                - Return ONLY valid JSON, no markdown, no code blocks, no extra text
                - Use null for fields that don't apply
                - For hotel_search, ALWAYS populate metadata.searchParams (even if empty {})
                - For hotel_specific, ALWAYS extract exact hotel name and match to available hotels
                - Location names should be lowercase in searchParams
                - Be confident in your classification

                Analyze the user query and return the JSON response now:
            `;

            const response = await llm.invoke([
                { role: "user", content: unifiedPrompt }
            ]);

            // Save to memory
            await this.memory.saveContext(
                { input: messageText },
                { output: typeof response.content === 'string' ? response.content : JSON.stringify(response.content) }
            );

            // Parse LLM response
            let classification: UnifiedAgentResponse;
            try {
                const content = typeof response.content === 'string' 
                    ? response.content 
                    : JSON.stringify(response.content);
                
                // Remove all markdown formatting
                const cleanContent = content
                    .replace(/```json\n?/g, '')
                    .replace(/```typescript\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();
                
                classification = JSON.parse(cleanContent);
                console.log('✅ Successfully parsed LLM classification');
            } catch (e) {
                console.error('❌ Failed to parse LLM classification:', response.content);
                console.error('Parse error:', e);
                // Fallback
                classification = {
                    responseType: 'conversation',
                    message: 'I can help you search for hotels or answer questions. What would you like to know?',
                    hotels: null,
                    targetHotelId: null,
                    targetHotelName: null,
                    metadata: {
                        intent: 'parse_error',
                        confidence: 0.5
                    }
                };
            }

            // Execute hotel search if needed
            if (classification.responseType === 'hotel_search') {
                // LLM already extracted searchParams!
                const searchParams = classification.metadata?.searchParams || {};
                
                console.log('🔍 Executing hotel search with LLM-extracted params:', searchParams);
                
                const hotels = await this.hotelSearchTool.searchHotels(searchParams);
                console.log(`✅ Found ${hotels.length} hotels`);
                
                const isShowAll = Object.keys(searchParams).length === 0;
                
                // Format message
                let message = hotels.length > 0 
                    ? (isShowAll 
                        ? `Here are all ${hotels.length} available hotels:\n\n`
                        : `Found ${hotels.length} hotel(s) matching your criteria:\n\n`)
                    : `No hotels found matching your criteria. Try adjusting your search.\n\n`;
                
                hotels.forEach((hotel: any, idx: number) => {
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
                classification.hotels = hotels;
                classification.metadata = {
                    ...classification.metadata,
                    searchParams,
                    totalResults: hotels.length,
                    intent: isShowAll ? 'show all hotels' : 'filtered hotel search',
                    confidence: 0.95,
                    suggestedActions: hotels.length > 0 
                        ? ['Ask about a specific hotel', 'Refine search', 'Book a room']
                        : ['Try different criteria', 'Browse all hotels']
                };
            }

            // Verify hotel_specific
            if (classification.responseType === 'hotel_specific' && classification.targetHotelName) {
                const matchedHotel = allHotels.find(h => 
                    h.name.toLowerCase().includes(classification.targetHotelName!.toLowerCase()) ||
                    classification.targetHotelName!.toLowerCase().includes(h.name.toLowerCase())
                );

                if (matchedHotel) {
                    classification.targetHotelId = `hotel-${matchedHotel.id}`;
                    classification.targetHotelName = matchedHotel.name;
                    classification.message = `I'll connect you with the ${matchedHotel.name} agent who can help you with specific information.`;
                    classification.metadata = {
                        ...classification.metadata,
                        intent: 'specific hotel inquiry',
                        confidence: 0.95,
                        requiresRouting: true,
                        suggestedActions: ['Ask about amenities', 'Check availability', 'View pricing']
                    };
                } else {
                    classification.responseType = 'conversation';
                    classification.message = `I couldn't find a hotel named "${classification.targetHotelName}". Would you like me to search for similar hotels?`;
                    classification.targetHotelId = null;
                    classification.targetHotelName = null;
                    classification.metadata = {
                        intent: 'hotel not found',
                        confidence: 0.8,
                        suggestedActions: ['Search for hotels', 'View all hotels']
                    };
                }
            }

            // Handle booking_confirmation
            if (classification.responseType === 'booking_confirmation') {
                const pastMessages = await this.memory.loadMemoryVariables({});
                const fullContext = (pastMessages.history || '') + '\nCurrent query: ' + messageText;
                
                const extractPrompt = `
                    From this context, extract the target hotel name for booking: ${fullContext}
                    Return ONLY JSON with no markdown: {"targetHotelName": "exact name or null"}
                `;
                const extractResponse = await llm.invoke([{ role: 'user', content: extractPrompt }]);
                
                let targetHotelName: string | null = null;
                try {
                    const extractContent = typeof extractResponse.content === 'string' 
                        ? extractResponse.content 
                        : JSON.stringify(extractResponse.content);
                    const cleanExtract = extractContent
                        .replace(/```json\n?/g, '')
                        .replace(/```\n?/g, '')
                        .trim();
                    const extracted = JSON.parse(cleanExtract);
                    targetHotelName = extracted.targetHotelName;
                } catch (e) {
                    console.error('Failed to parse hotel extraction:', extractResponse.content);
                }
                
                if (!targetHotelName && classification.targetHotelName) {
                    targetHotelName = classification.targetHotelName;
                }
                
                if (targetHotelName) {
                    const matchedHotel = allHotels.find(h => 
                        h.name.toLowerCase().includes(targetHotelName.toLowerCase()) ||
                        targetHotelName.toLowerCase().includes(h.name.toLowerCase())
                    );
                    
                    if (matchedHotel) {
                        const dateExtractPrompt = `
                            From this context, extract check-in and check-out dates.
                            Dates can be in natural language (e.g., "tomorrow", "next week", "Oct 1 to Oct 5").
                            Return dates in YYYY-MM-DD format or null if not specified.
                            Current date: ${new Date().toISOString().split('T')[0]}
                            Return ONLY JSON: {"checkin": "YYYY-MM-DD or null", "checkout": "YYYY-MM-DD or null"}
                            Context: ${fullContext}
                        `;
                        const dateResponse = await llm.invoke([{ role: 'user', content: dateExtractPrompt }]);
                        
                        let checkinDate: string | null = null;
                        let checkoutDate: string | null = null;
                        try {
                            const dateContent = typeof dateResponse.content === 'string' 
                                ? dateResponse.content 
                                : JSON.stringify(dateResponse.content);
                            const cleanDate = dateContent
                                .replace(/```json\n?/g, '')
                                .replace(/```\n?/g, '')
                                .trim();
                            const dates = JSON.parse(cleanDate);
                            checkinDate = dates.checkin;
                            checkoutDate = dates.checkout;
                        } catch (e) {
                            console.error('Failed to parse dates:', dateResponse.content);
                        }

                        let checkinUnix: number | null = null;
                        let checkoutUnix: number | null = null;
                        if (checkinDate) checkinUnix = new Date(checkinDate).getTime();
                        if (checkoutDate) checkoutUnix = new Date(checkoutDate).getTime();

                        let totalValueWei: string | null = null;
                        if (checkinUnix && checkoutUnix && matchedHotel.pricePerNight) {
                            const nights = Math.ceil((checkoutUnix - checkinUnix) / (1000 * 60 * 60 * 24));
                            if (nights > 0) {
                                const pricePerNightNum = parseInt(matchedHotel.pricePerNight, 10);
                                totalValueWei = (pricePerNightNum * nights).toString();
                            }
                        }

                        if (!checkinUnix || !checkoutUnix) {
                            classification.message = `Great! I'd love to confirm your booking for ${matchedHotel.name}. Please provide check-in and check-out dates.`;
                        } else {
                            const bookingDetails = {
                                hotelId: `hotel-${matchedHotel.id}`,
                                checkinUnix,
                                checkoutUnix,
                                totalValueWei: totalValueWei || matchedHotel.pricePerNight
                            };
                            classification.message = JSON.stringify(bookingDetails);
                            classification.metadata = {
                                ...classification.metadata,
                                bookingDetails
                            };
                        }

                        classification.targetHotelId = `hotel-${matchedHotel.id}`;
                        classification.targetHotelName = matchedHotel.name;
                        classification.metadata = {
                            ...classification.metadata,
                            requiresRouting: false,
                            suggestedActions: ['Provide booking details', 'Confirm payment']
                        };
                    } else {
                        classification.message = `I'd love to help with your booking! Which hotel did you have in mind?`;
                    }
                } else {
                    classification.message = `Great, let's book a room! Please specify which hotel.`;
                }
            }

            console.log('📊 Final classification:', JSON.stringify(classification, null, 2));
            return classification;
        } catch (error) {
            console.error('❌ Error in processWithLLM:', error);
            throw error;
        }
    }

    // ... rest of execute() method stays the same ...
    async execute(
        requestContext: RequestContext,
        eventBus: ExecutionEventBus
    ): Promise<void> {
        console.log('🚀 EXECUTE METHOD CALLED');
        console.log('Request context:', JSON.stringify(requestContext, null, 2));

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


            // Only route for hotel_specific (exclude booking_confirmation)
            if (result.responseType === 'hotel_specific' && 
                result.targetHotelId && 
                result.metadata?.requiresRouting) {
                console.log(`[${taskId}] Routing to API Gateway for ${result.targetHotelName} (${result.targetHotelId})`);
                const gatewayUrl = 'http://localhost:7000';
                
                try {
                    const response = await fetch(gatewayUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentId: result.targetHotelId,
                            message: userMessage
                        })
                    });

                    if (!response.ok || !response.body) {
                        throw new Error(`API Gateway returned ${response.status}`);
                    }

                    // Manually parse the Server-Sent Event (SSE) stream
                    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
                    let buffer = '';

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;

                        buffer += value;
                        // SSE messages are separated by \n\n
                        let lines = buffer.split('\n\n');

                        // Process all complete messages, keep the last partial one
                        for (let i = 0; i < lines.length - 1; i++) {
                            const line = lines[i];
                            if (line && line.startsWith('data: ')) {
                                const data = line.substring(6); // Get JSON string
                                try {
                                    const event = JSON.parse(data);
                                    eventBus.publish(event); // Publish to original caller
                                } catch (e) {
                                    console.error(`[${taskId}] Failed to parse SSE event:`, data);
                                }
                            }
                        }
                        buffer = lines[lines.length - 1] || ''; // Keep remainder
                    }
                    
                    console.log(`[${taskId}] Successfully completed routing via API Gateway`);
                    return; // Exit here - routing is complete
                    
                } catch (routingError: any) {
                    console.error(`[${taskId}] Error routing via API Gateway:`, routingError);
                    result.message = `I tried to connect you with ${result.targetHotelName}, but the routing service is unavailable. Please try again later.`;
                    result.metadata = {
                        ...result.metadata,
                        intent: 'routing failed',
                        requiresRouting: false
                    };
                    // Fall through to send a normal 'completed' response below
                }
            }

            // Send the unified response as JSON (for non-routed or failed routing cases)
            // For booking_confirmation, the message is already the JSON details
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
                            text: JSON.stringify(result, null, 2)
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
    
    routerApp.use(cors({
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));

    routerApp.use(express.json());

    const app = new A2AExpressApp(requestHandler);
    app.setupRoutes(routerApp, '');

    const PORT = process.env.ROUTING_AGENT_PORT || 41240;
    routerApp.listen(PORT, () => {
        console.log(`[RoutingAgent] Server started on http://localhost:${PORT}`);
        console.log(`[RoutingAgent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
        console.log(`[RoutingAgent] Messages endpoint: http://localhost:${PORT}/messages`);
    });
}

main().catch((err) => {
    console.error("Error starting RoutingAgent:", err);
});