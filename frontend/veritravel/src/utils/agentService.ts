// services/agentService.ts - FIXED VERSION
import { A2AClient } from '@a2a-js/sdk/client';
import { v4 as uuidv4 } from 'uuid';

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

class AgentService {
  private client: A2AClient;
  private contextId: string;

  constructor(baseUrl: string = 'http://localhost:41240') {
    // Use A2AClient properly - it will discover endpoints from agent card
    this.client = new A2AClient(baseUrl);
    this.contextId = uuidv4();
  }

  /**
   * Send a message to the agent and get streaming responses
   */
  async sendMessage(
    text: string,
    onUpdate: (response: UnifiedAgentResponse, isFinal: boolean) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const messageId = uuidv4();
      console.log('Sending message to agent:', text, 'MessageID:', messageId);

      // Create the message object following A2A protocol
      const message = {
        kind: 'message' as const,
        role: 'user' as const,
        messageId,
        parts: [{ kind: 'text' as const, text }],
        contextId: this.contextId,
      };

      console.log('Full message object:', message);

      // Use the A2AClient's sendMessageStream method
      const stream = this.client.sendMessageStream({ message });

      // Iterate through the stream
      let receivedAnyEvents = false;
      
      for await (const event of stream) {
        receivedAnyEvents = true;
        console.log('Received event:', event.kind, event);

        if (event.kind === 'status-update') {
          const part = event.status?.message?.parts?.[0];
          const messageText = part && part.kind === 'text' ? part.text : '';
          console.log('Status update - State:', event.status?.state, 'Message:', messageText);

          if (messageText) {
            // Try to parse as UnifiedAgentResponse JSON
            try {
              const parsedResponse: UnifiedAgentResponse = JSON.parse(messageText);
              console.log('✅ Parsed as UnifiedAgentResponse:', parsedResponse);
              
              // Validate it has the expected structure
              if (parsedResponse.responseType && parsedResponse.message !== undefined) {
                onUpdate(parsedResponse, event.final || false);
              } else {
                throw new Error('Invalid UnifiedAgentResponse structure');
              }
            } catch (parseError) {
              // If not valid JSON or missing expected fields, treat as plain text
              console.log('⚠️ Not valid JSON or missing fields, treating as plain text:', messageText);
              const fallbackResponse: UnifiedAgentResponse = {
                responseType: 'conversation',
                message: messageText,
                hotels: null,
                targetHotelId: null,
                targetHotelName: null,
                metadata: null,
              };
              onUpdate(fallbackResponse, event.final || false);
            }
          } else if (event.status?.state === 'working') {
            // Handle "working" state without message (show loading)
            const workingResponse: UnifiedAgentResponse = {
              responseType: 'conversation',
              message: 'Processing...',
              hotels: null,
              targetHotelId: null,
              targetHotelName: null,
              metadata: null,
            };
            onUpdate(workingResponse, false);
          }
        } else if (event.kind === 'task') {
          console.log('Task created:', event.id);
        }
      }

      if (!receivedAnyEvents) {
        console.warn('⚠️ Stream completed but no events received!');
        onError('No response from agent - stream completed without events');
      } else {
        console.log('✅ Stream completed successfully');
      }
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get the agent card information
   */
  async getAgentCard() {
    try {
      return await this.client.getAgentCard();
    } catch (error) {
      console.error('Error fetching agent card:', error);
      throw error;
    }
  }

  /**
   * Test connection to the agent
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAgentCard();
      console.log('✅ Successfully connected to agent');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to agent:', error);
      return false;
    }
  }

  /**
   * Reset the conversation context
   */
  resetContext() {
    this.contextId = uuidv4();
    console.log('Context reset:', this.contextId);
  }
}

export const agentService = new AgentService();
export default agentService;