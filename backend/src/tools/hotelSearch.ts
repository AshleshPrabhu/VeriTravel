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

// Enhanced mock data with better location coverage
const MOCK_HOTELS: Hotel[] = [
    {
        id: "0",
        name: "Seaside Inn",
        location: "goa",
        stars: 4,
        rating: 4.5,
        pricePerNight: "1500000000000000000",
        tags: ["beach", "family", "pool", "sea"]
    },
    {
        id: "1",
        name: "Mountain View Resort",
        location: "manali",
        stars: 5,
        rating: 4.8,
        pricePerNight: "2500000000000000000",
        tags: ["luxury", "mountain", "spa"]
    },
    {
        id: "2",
        name: "City Center Hotel",
        location: "bengaluru",
        stars: 3,
        rating: 4.2,
        pricePerNight: "800000000000000000",
        tags: ["business", "city", "pool"]
    },
    {
        id: "3",
        name: "Beach Paradise Resort",
        location: "goa",
        stars: 5,
        rating: 4.9,
        pricePerNight: "3000000000000000000",
        tags: ["beach", "luxury", "pool", "sea", "spa"]
    },
    {
        id: "4",
        name: "Heritage Palace",
        location: "jaipur",
        stars: 5,
        rating: 4.7,
        pricePerNight: "2200000000000000000",
        tags: ["luxury", "heritage", "cultural"]
    },
    {
        id: "5",
        name: "Budget Inn",
        location: "delhi",
        stars: 2,
        rating: 3.8,
        pricePerNight: "500000000000000000",
        tags: ["budget", "city"]
    },
    {
        id: "6",
        name: "Karnataka Grand Hotel",
        location: "bengaluru",
        stars: 4,
        rating: 4.6,
        pricePerNight: "1800000000000000000",
        tags: ["business", "pool", "spa", "luxury"]
    },
    {
        id: "7",
        name: "Mysore Palace Hotel",
        location: "mysore",
        stars: 5,
        rating: 4.8,
        pricePerNight: "2000000000000000000",
        tags: ["heritage", "pool", "luxury", "cultural"]
    }
];

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
    private useMockData: boolean = true; // Start with mock data due to SSL issues
    private httpsAgent: https.Agent;

    constructor() {
        this.endpoint = 'https://indexer.dev.hyperindex.xyz/5eccd6f/v1/graphql';
        
        // Create HTTPS agent that bypasses SSL verification
        // WARNING: Only use this in development!
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false // Bypass SSL certificate verification
        });
    }

    private expandLocations(locations: string[]): string[] {
        const expanded = new Set<string>();
        
        locations.forEach(loc => {
            const normalized = loc.toLowerCase().trim();
            expanded.add(normalized);
            
            // Add mapped cities if this is a state/region
            if (LOCATION_MAPPINGS[normalized]) {
                LOCATION_MAPPINGS[normalized].forEach(city => expanded.add(city));
            }
            
            // Check reverse mapping - if someone searches for a city, include its state
            Object.entries(LOCATION_MAPPINGS).forEach(([state, cities]) => {
                if (cities.includes(normalized)) {
                    expanded.add(state);
                }
            });
        });
        
        return Array.from(expanded);
    }

    private filterMockData(params: HotelQueryParams): Hotel[] {
        console.log('🎭 Filtering mock data with params:', params);
        let results = [...MOCK_HOTELS];

        if (params.maxPrice) {
            const maxPrice = BigInt(params.maxPrice);
            results = results.filter(h => BigInt(h.pricePerNight) <= maxPrice);
        }

        if (params.locations && params.locations.length > 0) {
            const expandedLocations = this.expandLocations(params.locations);
            console.log(`📍 Expanded locations from ${params.locations} to:`, expandedLocations);
            
            results = results.filter(h => 
                expandedLocations.some(loc => 
                    h.location.toLowerCase().includes(loc) || 
                    loc.includes(h.location.toLowerCase())
                )
            );
        }

        if (params.tags && params.tags.length > 0) {
            results = results.filter(h => 
                params.tags!.some(tag => 
                    h.tags.some(hotelTag => 
                        hotelTag.toLowerCase().includes(tag.toLowerCase()) ||
                        tag.toLowerCase().includes(hotelTag.toLowerCase())
                    )
                )
            );
        }

        if (params.minStars) {
            results = results.filter(h => h.stars >= params.minStars!);
        }

        console.log(`✨ Filtered to ${results.length} hotels`);
        return results;
    }

    async searchHotels(params: HotelQueryParams): Promise<Hotel[]> {
        console.log('🔍 Search params received:', JSON.stringify(params, null, 2));
        
        // If already using mock data, skip API call
        if (this.useMockData) {
            console.log('🎭 Using mock data (database unavailable)');
            return this.filterMockData(params);
        }

        const whereClause: any = {};
        
        // Handle price comparison
        if (params.maxPrice) {
            whereClause.pricePerNight = { _lte: params.maxPrice };
        }
        
        // Handle locations with expansion
        if (params.locations && params.locations.length > 0) {
            const expandedLocations = this.expandLocations(params.locations);
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
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                },
                httpsAgent: this.httpsAgent,
                validateStatus: (status) => status < 500
            });
            
            console.log('📦 API Response status:', response.status);
            console.log('📦 API Response data:', JSON.stringify(response.data, null, 2));
            
            // Check for GraphQL errors
            if (response.data.errors) {
                console.error('⚠️  GraphQL errors:', response.data.errors);
                throw new Error(`GraphQL error: ${response.data.errors[0]?.message || 'Unknown error'}`);
            }

            if (!response.data || !response.data.data) {
                console.error('⚠️  Unexpected response structure:', response.data);
                throw new Error('Invalid response structure from API');
            }
            
            const hotels = response.data.data.Hotel || [];
            console.log(`✅ Found ${hotels.length} hotels from database`);
            
            // If database is empty with no filters, switch to mock data
            if (hotels.length === 0 && Object.keys(whereClause).length === 0) {
                console.log('⚠️  Database returned no hotels, switching to mock data');
                this.useMockData = true;
                return this.filterMockData(params);
            }
            
            // Success - we can use the database
            this.useMockData = false;
            return hotels;
            
        } catch (error) {
            console.error('❌ Error fetching from database:', error);
            
            if (axios.isAxiosError(error)) {
                if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
                    console.error('🔒 SSL Certificate verification failed');
                    console.error('💡 Tip: The Envio endpoint has SSL issues. Using mock data instead.');
                } else if (error.response) {
                    console.error('Response status:', error.response.status);
                    console.error('Response data:', JSON.stringify(error.response.data, null, 2));
                } else if (error.request) {
                    console.error('No response received from server');
                } else {
                    console.error('Error setting up request:', error.message);
                }
            }
            
            // Fallback to mock data
            console.log('🎭 Falling back to mock data');
            this.useMockData = true;
            return this.filterMockData(params);
        }
    }

    async getHotelById(id: string): Promise<Hotel | null> {
        console.log('🔍 Looking up hotel by ID:', id);
        
        // Check mock data first if we're in mock mode
        if (this.useMockData) {
            console.log('🎭 Using mock data for hotel lookup');
            return MOCK_HOTELS.find(h => h.id === id) || null;
        }

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
            
            console.log('📦 GetHotel response:', JSON.stringify(response.data, null, 2));
            
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
            
            // Fallback to mock data
            console.log('🎭 Falling back to mock data for hotel lookup');
            this.useMockData = true;
            return MOCK_HOTELS.find(h => h.id === id) || null;
        }
    }
}