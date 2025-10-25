// services/agentService.ts
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

interface A2AMessage {
  kind: 'message';
  role: 'user' | 'agent';
  messageId: string;
  parts: Array<{ kind: 'text'; text: string }>;
  taskId?: string;
  contextId?: string;
}

interface TaskStatusUpdate {
  kind: 'status-update';
  taskId: string;
  contextId: string;
  status: {
    state: 'working' | 'completed' | 'failed';
    message: A2AMessage;
    timestamp: string;
  };
  final: boolean;
}

class AgentService {
  private baseUrl: string;
  private contextId: string;

  constructor(baseUrl: string = 'http://localhost:41240') {
    this.baseUrl = baseUrl;
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
      const message: A2AMessage = {
        kind: 'message',
        role: 'user',
        messageId: uuidv4(),
        parts: [{ kind: 'text', text }],
        contextId: this.contextId,
      };

      console.log('Sending message to agent:', message);

      // A2A SDK standard endpoint
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (!trimmedLine || trimmedLine === 'event: message') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonData = trimmedLine.slice(6);
              console.log('Received event data:', jsonData);
              
              const eventData = JSON.parse(jsonData) as TaskStatusUpdate;
              
              if (eventData.kind === 'status-update') {
                const messageText = eventData.status.message.parts[0]?.text || '';
                console.log('Message text:', messageText);
                
                // Try to parse as UnifiedAgentResponse
                try {
                  const parsedResponse: UnifiedAgentResponse = JSON.parse(messageText);
                  console.log('Parsed agent response:', parsedResponse);
                  onUpdate(parsedResponse, eventData.final);
                } catch (parseError) {
                  // If not JSON, treat as plain text conversation
                  console.log('Plain text response:', messageText);
                  const fallbackResponse: UnifiedAgentResponse = {
                    responseType: 'conversation',
                    message: messageText,
                    hotels: null,
                    targetHotelId: null,
                    targetHotelName: null,
                    metadata: null,
                  };
                  onUpdate(fallbackResponse, eventData.final);
                }
              }
            } catch (e) {
              console.error('Error parsing event data:', e, trimmedLine);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get the agent card information
   */
  async getAgentCard() {
    try {
      const response = await fetch(`${this.baseUrl}/.well-known/agent-card.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
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