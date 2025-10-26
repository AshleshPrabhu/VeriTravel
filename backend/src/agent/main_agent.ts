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
    // private agents: Map<string, AgentInfo> = new Map();
    private hotelSearchTool: HotelSearchTool;
    private systemPrompt: string = '';
    private tools: DynamicTool[] = [];
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
        this.initializeSystemPrompt();
    }
    
    public static async create(): Promise<RoutingAgentExecutor> {
        const executor = new RoutingAgentExecutor();
        await executor.initializeTools();
        // await executor.discoverAgents();
        return executor;
    }

    private async initializeTools(): Promise<void> {
        this.tools = [
            new DynamicTool({
                name: "search_hotels",
                description: `Search for hotels using Envio database. 
                Input should be a natural language query (e.g., "luxury hotels in Goa under 2 ETH").
                If the query is to show ALL hotels, pass an empty string or "all hotels".
                The tool will automatically parse the query and search the database.`,
                func: async (input: string) => {
                    try {
                        console.log('Search hotels tool input:', input);
                        
                        // Check for "show all" type queries
                        const showAllPatterns = [
                            /^(show|list|display|get|find|give|fetch)\s*(me\s*)?(all|every|available)\s*hotels?$/i,
                            /^all\s*hotels?$/i,
                            /^hotels?$/i
                        ];
                        
                        const isShowAll = showAllPatterns.some(pattern => pattern.test(input.trim()));
                        
                        let params: any = {};
                        
                        if (!isShowAll) {
                            // Parse specific search criteria
                            params = await this.parseSearchParams(input);
                            console.log('LLM parsed parameters:', params);
                        } else {
                            console.log('🌐 Detected "show all hotels" query - returning all hotels');
                            // Empty params = return all hotels
                            params = {};
                        }

                        const results = await this.hotelSearchTool.searchHotels(params);
                        console.log(`Found ${results.length} hotels matching criteria`);
                        
                        return JSON.stringify({ 
                            hotels: results,
                            searchParams: params,
                            isShowAll: isShowAll
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
               - User is looking for hotels with certain criteria OR wants to see all hotels
               - Keywords: "show me hotels", "find hotels", "search", "hotels in [location]", "all hotels", "list hotels"
               - Set responseType: "hotel_search"
               - hotels: will be populated after search
               - targetHotelId: null
               - targetHotelName: null
               Examples: "Show me hotels in Goa", "Find 5-star hotels", "Hotels under 2 ETH", "Give me all hotels"

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
               - metadata.requiresRouting: true
               - Extract and set targetHotelName from the query or context if mentioned
               Examples: "Yes, confirm my booking", "I want to book this", "Reserve the room"

            CRITICAL INSTRUCTIONS:
            - Always return VALID JSON only, no extra text
            - Use null for fields that don't apply to the responseType
            - For hotel_search, you'll need to call search tool (handled separately)
            - For hotel_specific, extract the exact hotel name from user's message
            - For booking_confirmation, extract the hotel name if mentioned (e.g., "book Seaside Inn")
            - "show all hotels", "list hotels", "give me all hotels" should be hotel_search, NOT conversation
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
            - Infer tags from context (e.g., "beachfront" implies ["beach", "sea"], "swimming pool" implies ["pool"])
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
                const cleanContent = content.replace(/```\n?/g, '').trim();
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

    private async processWithLLM(messageText: string): Promise<UnifiedAgentResponse> {
        try {
            // Get all available hotels for context
            const allHotels = await this.hotelSearchTool.searchHotels({});
            const hotelNamesContext = allHotels.map(h => `${h.name} (ID: ${h.id})`).join(', ');
            const pastMessages = await this.memory.loadMemoryVariables({});
            const context = pastMessages.history || "";


            // Ask LLM to classify and structure the response
            const classificationPrompt = `
                    context: ${context}

                    Available hotels in database: ${hotelNamesContext}

                    User query: "${messageText}"

                    Analyze this query and return a JSON response following the UnifiedAgentResponse schema.
                    
                    Determine the correct responseType:
                    - "conversation": general chat, greetings, travel info (no hotel search or specific hotel mention)
                    - "hotel_search": user wants to find/search for hotels (includes "show all hotels", "list hotels", "find hotels")
                    - "hotel_specific": user is asking about ONE specific hotel by name
                    - "booking_confirmation": user confirms they want to book

                    IMPORTANT: If the user asks for "all hotels", "show hotels", "list hotels" with no specific criteria,
                    this is STILL a hotel_search, not a conversation. Return empty search params to show all hotels.
                    
                    If responseType is "hotel_specific", extract the hotel name from the query and match it with available hotels to get the ID.
                    
                    If responseType is "booking_confirmation", extract the target hotel name from the query or context.
                    
                    Return ONLY valid JSON, no additional text.
                `;

            const classificationResponse = await llm.invoke([
                { role: "system", content: this.systemPrompt },
                { role: "user", content: classificationPrompt }
            ]);

            await this.memory.saveContext(
                {input : messageText},
                { output: typeof classificationResponse.content === 'string' ? classificationResponse.content : JSON.stringify(classificationResponse.content) },
            )

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
                    const hotels = parsed.hotels;
                    
                    // Check if this was a "show all" query with no filters
                    if (parsed.isShowAll || (Object.keys(parsed.searchParams).length === 0 && hotels.length > 0)) {
                        // Format message for showing all hotels
                        let message = `Here are all ${hotels.length} available hotels:\n\n`;
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
                            searchParams: {},
                            totalResults: hotels.length,
                            intent: 'show all hotels',
                            confidence: 0.95,
                            suggestedActions: ['Ask about a specific hotel', 'Filter by location', 'Filter by price']
                        };
                    } else {
                        // Format message for filtered search results
                        let message = hotels.length > 0 
                            ? `Found ${hotels.length} hotel(s) matching your criteria:\n\n`
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
                            searchParams: parsed.searchParams,
                            totalResults: hotels.length,
                            intent: 'hotel search',
                            confidence: 0.95,
                            suggestedActions: hotels.length > 0 
                                ? ['Ask about a specific hotel', 'Refine search criteria', 'Book a room']
                                : ['Try different search criteria', 'Browse all hotels']
                        };
                    }
                }
            }

            // If it's hotel_specific, verify the hotel exists and get its ID
            if (classification.responseType === 'hotel_specific' && classification.targetHotelName) {
                const matchedHotel = allHotels.find(h => 
                    h.name.toLowerCase().includes(classification.targetHotelName!.toLowerCase()) ||
                    classification.targetHotelName!.toLowerCase().includes(h.name.toLowerCase())
                );

                if (matchedHotel) {
                    const agentId = `hotel-${matchedHotel.id}`;
                    
                    classification.targetHotelId = agentId;
                    classification.targetHotelName = matchedHotel.name;
                    classification.message = `I'll connect you with the ${matchedHotel.name} agent who can help you with specific information about this property.`;
                    classification.metadata = {
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
                        suggestedActions: ['Search for hotels', 'View all available hotels']
                    };
                }
            }

            if(classification.responseType === 'booking_confirmation'){
                const pastMessages = await this.memory.loadMemoryVariables({});
                const fullContext = (pastMessages.history || '') + '\nCurrent query: ' + messageText;
                const extractPrompt = `
                    From this context, extract the target hotel name for booking: ${fullContext}
                    Return ONLY JSON: {"targetHotelName": "exact name or null"}
                `;
                const extractResponse = await llm.invoke([{ role: 'user', content: extractPrompt }]);
                
                let targetHotelName: string | null = null;
                try{
                    const extractContent = typeof extractResponse.content === 'string' ? extractResponse.content : JSON.stringify(extractResponse.content);
                    const cleanExtract = extractContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    const extracted = JSON.parse(cleanExtract);
                    targetHotelName = extracted.targetHotelName;
                }catch (e) {
                    console.error('Failed to parse hotel extraction:', extractResponse.content);
                }
                
                if(!targetHotelName && classification.targetHotelName){
                    targetHotelName = classification.targetHotelName;
                }
                
                if(targetHotelName){
                    const matchedHotel = allHotels.find(h => 
                        h.name.toLowerCase().includes(targetHotelName.toLowerCase()) ||
                        targetHotelName.toLowerCase().includes(h.name.toLowerCase())
                    );
                    
                    if(matchedHotel){
                        // Extract dates using LLM
                        const dateExtractPrompt = `
                            From this context, extract check-in and check-out dates for the booking.
                            Dates can be in natural language (e.g., "tomorrow", "next week", "from Oct 1 to Oct 5").
                            Return dates in YYYY-MM-DD format if possible, or null if not specified.
                            Assume current date is ${new Date().toISOString().split('T')[0]} for relative dates.
                            Return ONLY JSON: {"checkin": "YYYY-MM-DD or null", "checkout": "YYYY-MM-DD or null"}
                            Context: ${fullContext}
                        `;
                        const dateResponse = await llm.invoke([{ role: 'user', content: dateExtractPrompt }]);
                        
                        let checkinDate: string | null = null;
                        let checkoutDate: string | null = null;
                        try {
                            const dateContent = typeof dateResponse.content === 'string' ? dateResponse.content : JSON.stringify(dateResponse.content);
                            const cleanDate = dateContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                            const dates = JSON.parse(cleanDate);
                            checkinDate = dates.checkin;
                            checkoutDate = dates.checkout;
                        } catch (e) {
                            console.error('Failed to parse dates:', dateResponse.content);
                        }

                        // Convert to UNIX timestamps (milliseconds)
                        let checkinUnix: number | null = null;
                        let checkoutUnix: number | null = null;
                        if (checkinDate) {
                            checkinUnix = new Date(checkinDate).getTime();
                        }
                        if (checkoutDate) {
                            checkoutUnix = new Date(checkoutDate).getTime();
                        }

                        // Calculate total value if dates are available
                        let totalValueWei: string | null = null;
                        if (checkinUnix && checkoutUnix && matchedHotel.pricePerNight) {
                            const nights = Math.ceil((checkoutUnix - checkinUnix) / (1000 * 60 * 60 * 24));
                            if (nights > 0) {
                                const pricePerNightNum = parseInt(matchedHotel.pricePerNight, 10);
                                totalValueWei = (pricePerNightNum * nights).toString();
                            }
                        }

                        // If dates are missing, fallback message
                        if (!checkinUnix || !checkoutUnix) {
                            classification.message = `Great! I'd love to confirm your booking for ${matchedHotel.name}. Please provide check-in and check-out dates to proceed.`;
                            classification.targetHotelId = `hotel-${matchedHotel.id}`;
                            classification.targetHotelName = matchedHotel.name;
                        } else {
                            // Direct booking details for frontend
                            const bookingDetails = {
                                hotelId: `hotel-${matchedHotel.id}`,
                                checkinUnix,
                                checkoutUnix,
                                totalValueWei: totalValueWei || matchedHotel.pricePerNight // Fallback to per night if no total
                            };
                            classification.message = JSON.stringify(bookingDetails);
                            classification.targetHotelId = `hotel-${matchedHotel.id}`;
                            classification.targetHotelName = matchedHotel.name;
                            classification.metadata = {
                                ...classification.metadata,
                                bookingDetails
                            };
                        }

                        classification.metadata = {
                            ...classification.metadata,
                            requiresRouting: false, // Do not route; send directly to frontend
                            suggestedActions: ['Provide booking details', 'Confirm payment']
                        };
                    }else {
                        classification.targetHotelId = null;
                        classification.targetHotelName = null;
                        classification.message = `I'd love to help with your booking! Which hotel did you have in mind?`;
                    }
                }else{
                    classification.targetHotelId = null;
                    classification.targetHotelName = null;
                    classification.message = `Great, let's book a room! Please specify which hotel you'd like to book.`;
                }
                
                classification.metadata = {
                    ...classification.metadata,
                    requiresRouting: false, // Ensure no routing for booking_confirmation
                    suggestedActions: ['Provide booking details', 'Confirm payment']
                };
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