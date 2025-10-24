import axios from 'axios';

interface HotelQueryParams {
    maxPrice?: string;
    locations?: string[];
    tags?: string[];
    minStars?: number;
}

interface Hotel {
    id: string;
    name: string;
    location: string;
    stars: number;
    rating: number;
    pricePerNight: string;
    tags: string[];
}

export class HotelSearchTool {
    private readonly endpoint: string;

    constructor() {
        this.endpoint = 'https://indexer.dev.hyperindex.xyz/5eccd6f/v1/graphql';
    }

    async searchHotels(params: HotelQueryParams): Promise<Hotel[]> {
        const whereClause: any = {};
        
        if (params.maxPrice) {
            whereClause.pricePerNight = { _lt: params.maxPrice };
        }
        
        if (params.locations && params.locations.length > 0) {
            whereClause.location = { _in: params.locations };
        }
        
        if (params.tags && params.tags.length > 0) {
            whereClause.tags = { _contains: params.tags };
        }
        
        if (params.minStars) {
            whereClause.stars = { _gte: params.minStars };
        }

        const query = {
            query: `
                query SearchHotels($where: Hotel_bool_exp) {
                    Hotel(where: $where) {
                        id
                        name
                        location
                        stars
                        rating
                        pricePerNight
                        tags
                    }
                }
            `,
            variables: {
                where: whereClause
            }
        };

        console.log('🔍 Query being sent:', JSON.stringify(query, null, 2));

        try {
            const response = await axios.post(this.endpoint, query);
            
            // Debug: Log the full response to see structure
            console.log('📦 Full response:', JSON.stringify(response.data, null, 2));
            
            // Check if response has the expected structure
            if (!response.data || !response.data.data) {
                console.error('⚠️  Unexpected response structure:', response.data);
                return [];
            }
            
            // Return the Hotel array, or empty array if it doesn't exist
            return response.data.data.Hotel || [];
        } catch (error) {
            console.error('❌ Error fetching hotels:', error);
            if (axios.isAxiosError(error) && error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            throw new Error('Failed to fetch hotels from Envio database');
        }
    }

    async getHotelById(id: string): Promise<Hotel | null> {
        const query = {
            query: `
                query GetHotel($id: String!) {
                    Hotel(where: { id: { _eq: $id } }) {
                        id
                        name
                        location
                        stars
                        rating
                        pricePerNight
                        tags
                    }
                }
            `,
            variables: {
                id
            }
        };

        try {
            const response = await axios.post(this.endpoint, query);
            
            // Debug: Log the full response to see structure
            console.log('Full response:', JSON.stringify(response.data, null, 2));
            
            // Check if response has the expected structure
            if (!response.data || !response.data.data || !response.data.data.Hotel) {
                console.error('Unexpected response structure:', response.data);
                return null;
            }
            
            const hotels = response.data.data.Hotel;
            return hotels.length > 0 ? hotels[0] : null;
        } catch (error) {
            console.error('Error fetching hotel:', error);
            if (axios.isAxiosError(error) && error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            throw new Error('Failed to fetch hotel from Envio database');
        }
    }
}