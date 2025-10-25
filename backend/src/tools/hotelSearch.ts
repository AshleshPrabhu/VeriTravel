import axios from 'axios';
import https from 'https';

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

// Location mappings for broader searches
const LOCATION_MAPPINGS: { [key: string]: string[] } = {
    'karnataka': ['bengaluru', 'mysore', 'mangalore', 'hubli'],
    'goa': ['panaji', 'margao', 'vasco'],
    'rajasthan': ['jaipur', 'udaipur', 'jodhpur'],
    'maharashtra': ['mumbai', 'pune', 'nashik'],
    'kerala': ['kochi', 'trivandrum', 'munnar']
};

export class HotelSearchTool {
    private readonly endpoint: string;
    private httpsAgent: https.Agent;
    private connectionTested: boolean = false;

    constructor() {
        this.endpoint = 'https://indexer.dev.hyperindex.xyz/5eccd6f/v1/graphql';
        
        // Create HTTPS agent with SSL bypass for development
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true,
            timeout: 10000
        });
    }

    private expandLocations(locations: string[]): string[] {
        const expanded = new Set<string>();
        
        locations.forEach(loc => {
            const normalized = loc.toLowerCase().trim();
            expanded.add(normalized);
            
            if (LOCATION_MAPPINGS[normalized]) {
                LOCATION_MAPPINGS[normalized].forEach(city => expanded.add(city));
            }
            
            Object.entries(LOCATION_MAPPINGS).forEach(([state, cities]) => {
                if (cities.includes(normalized)) {
                    expanded.add(state);
                }
            });
        });
        
        return Array.from(expanded);
    }

    /**
     * Test the database connection on first use
     */
    private async testConnection(): Promise<boolean> {
        if (this.connectionTested) {
            return true;
        }

        console.log('🔌 Testing Envio database connection...');
        
        try {
            const testQuery = {
                query: `
                    query TestConnection {
                        Hotel(limit: 1) {
                            id
                        }
                    }
                `
            };

            const response = await axios.post(this.endpoint, testQuery, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                },
                httpsAgent: this.httpsAgent,
                validateStatus: (status) => status < 500
            });

            if (response.data && !response.data.errors) {
                console.log('✅ Envio database connection successful!');
                this.connectionTested = true;
                return true;
            } else {
                console.error('⚠️ Database returned errors:', response.data.errors);
                return false;
            }
        } catch (error) {
            console.error('❌ Database connection test failed:', error);
            return false;
        }
    }

    async searchHotels(params: HotelQueryParams): Promise<Hotel[]> {
        console.log('🔍 Search params received:', JSON.stringify(params, null, 2));
        
        // Test connection first
        const isConnected = await this.testConnection();
        if (!isConnected) {
            throw new Error('Unable to connect to Envio database. Please check your endpoint and network connection.');
        }

        const whereClause: any = {};
        
        // Handle price comparison
        if (params.maxPrice) {
            whereClause.pricePerNight = { _lte: params.maxPrice };
        }
        
        // Handle locations with expansion
        if (params.locations && params.locations.length > 0) {
            const expandedLocations = this.expandLocations(params.locations);
            console.log(`📍 Expanded locations:`, expandedLocations);
            whereClause.location = { _in: expandedLocations };
        }
        
        // Handle tags - use overlap for PostgreSQL arrays
        if (params.tags && params.tags.length > 0) {
            whereClause.tags = { _overlap: params.tags };
        }
        
        // Handle star rating
        if (params.minStars) {
            whereClause.stars = { _gte: params.minStars };
        }

        const query = {
            query: `
                query SearchHotels($where: Hotel_bool_exp) {
                    Hotel(
                        where: $where
                        order_by: { rating: desc }
                        limit: 50
                    ) {
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
                where: Object.keys(whereClause).length > 0 ? whereClause : {}
            }
        };

        console.log('🔍 GraphQL Query:', JSON.stringify(query, null, 2));

        try {
            const response = await axios.post(this.endpoint, query, {
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json',
                },
                httpsAgent: this.httpsAgent,
                validateStatus: (status) => status < 500
            });
            
            console.log('📦 API Response status:', response.status);
            
            // Check for GraphQL errors
            if (response.data.errors) {
                console.error('⚠️ GraphQL errors:', response.data.errors);
                throw new Error(`GraphQL error: ${response.data.errors[0]?.message || 'Unknown error'}`);
            }

            if (!response.data || !response.data.data) {
                console.error('⚠️ Unexpected response structure:', response.data);
                throw new Error('Invalid response structure from API');
            }
            
            const hotels = response.data.data.Hotel || [];
            console.log(`✅ Found ${hotels.length} hotels from Envio database`);
            
            return hotels;
            
        } catch (error) {
            console.error('❌ Error fetching from database:', error);
            
            if (axios.isAxiosError(error)) {
                if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
                    throw new Error('SSL certificate issue with Envio endpoint. Please contact Envio support or use a different endpoint.');
                } else if (error.response) {
                    throw new Error(`API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
                } else if (error.request) {
                    throw new Error('No response from Envio server. Please check your network connection.');
                } else {
                    throw new Error(`Request error: ${error.message}`);
                }
            }
            
            throw error;
        }
    }

    async getHotelById(id: string): Promise<Hotel | null> {
        console.log('🔍 Looking up hotel by ID:', id);
        
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
            variables: { id }
        };

        try {
            const response = await axios.post(this.endpoint, query, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                },
                httpsAgent: this.httpsAgent
            });
            
            console.log('📦 GetHotel response status:', response.status);
            
            if (response.data.errors) {
                throw new Error(`GraphQL error: ${response.data.errors[0]?.message || 'Unknown error'}`);
            }
            
            if (!response.data || !response.data.data || !response.data.data.Hotel) {
                throw new Error('Invalid response structure from API');
            }
            
            const hotels = response.data.data.Hotel;
            return hotels.length > 0 ? hotels[0] : null;
            
        } catch (error) {
            console.error('❌ Error fetching hotel by ID:', error);
            throw error;
        }
    }
}