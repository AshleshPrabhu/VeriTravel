import { TravelAgent } from "./hotel_specific.js";
import type { TravelAgentConfig } from "./hotel_specific.js";
import type { RequestContext } from '@a2a-js/sdk/server';
import type { ExecutionEventBus } from '@a2a-js/sdk/server';

// Define a minimal Task type for compatibility
type Task = {
    requestContext: RequestContext;
    eventBus: ExecutionEventBus;
};

export class HotelHandler {
    private agents: Map<string, TravelAgent> = new Map();

    public async initialize(){
    const config1: TravelAgentConfig = {
        id: 'hotel1',
        name: 'Grand Hotel',
        basicInfo: `
            Name: Grand Hotel
            Location: 123 Main St, New York, NY
            Star Rating: 5 stars
            Contact: 555-1234
        `.trim(),
        hederaAccountId: '0.0.12345',
        hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
        bookingTopicId: '0.0.67890',
        escrowContractId: '0.0.11111',
        hotelId: 1234,
        agentBaseUrl: 'https://grandhotel.example.com/api'
    };

    const config2: TravelAgentConfig = {
        id: 'hotel2',
        name: 'Seaside Resort',
        basicInfo: `
            Name: Seaside Resort
            Location: 456 Beach Rd, Miami, FL
            Star Rating: 4 stars
            Contact: 555-5678
            Amenities: Pool, Free WiFi
        `.trim(),
        hederaAccountId: '0.0.54321',
        hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY!,
        bookingTopicId: '0.0.09876',
        escrowContractId: '0.0.22222',
        hotelId: 123,
        agentBaseUrl: 'https://seasideresort.example.com/api'
    };

        const agent1 = await TravelAgent.create(config1);
        const agent2 = await TravelAgent.create(config2);

        this.agents.set(config1.id, agent1);
        this.agents.set(config2.id, agent2);
    }

    public async handle(id: string, task: Task) {
        const agent = this.agents.get(id);
        if (!agent) {
            throw new Error(`Agent with id ${id} not found`);
        }
        return agent.execute(task.requestContext, task.eventBus);
    }
}