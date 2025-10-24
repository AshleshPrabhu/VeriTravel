import { HotelAgent } from "./hotel_specific.js";
import type { HotelAgentConfig, Task } from "./hotel_specific.js";

export class HotelHandler {
    private agents: Map<string, HotelAgent> = new Map();

    public async initialize(){
        const config1: HotelAgentConfig = {
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
        };

    const config2: HotelAgentConfig = {
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
        };

        const agent1 = await HotelAgent.create(config1);
        const agent2 = await HotelAgent.create(config2);

        this.agents.set(config1.id, agent1);
        this.agents.set(config2.id, agent2);
    }

    public async handle(id: string, task: Task) {
        const agent = this.agents.get(id);
        if (!agent) {
            throw new Error(`Agent with id ${id} not found`);
        }
        return agent.run(task);
    }
}