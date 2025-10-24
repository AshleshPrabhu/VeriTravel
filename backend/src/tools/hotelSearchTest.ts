import { HotelSearchTool } from './hotelSearch.js';

async function testHotelSearch() {
    const hotelTool = new HotelSearchTool();

    console.log('🏨 Starting Hotel Search Tool Tests\n');

    // Test 1: Search hotels with max price
    console.log('Test 1: Search hotels with max price $200');
    try {
        const hotelsUnder200 = await hotelTool.searchHotels({
            maxPrice: '200'
        });
        if (hotelsUnder200) {
            console.log(`✅ Found ${hotelsUnder200.length} hotels under $200`);
            if (hotelsUnder200.length === 0) {
                console.log('⚠️  No hotels found matching criteria');
            } else {
                console.log(hotelsUnder200);
            }
        } else {
            console.log('❌ No data returned');
        }
    } catch (error) {
        console.error('❌ Test 1 failed:', error);
    }
    console.log('\n---\n');

    // Test 2: Search hotels by location
    console.log('Test 2: Search hotels in New York and Los Angeles');
    try {
        const hotelsByLocation = await hotelTool.searchHotels({
            locations: ['New York', 'Los Angeles']
        });
        console.log(`✅ Found ${hotelsByLocation.length} hotels`);
        if (hotelsByLocation.length === 0) {
            console.log('⚠️  No hotels found in these locations');
        } else {
            console.log(hotelsByLocation);
        }
    } catch (error) {
        console.error('❌ Test 2 failed:', error);
    }
    console.log('\n---\n');

    // Test 3: Search hotels by tags
    console.log('Test 3: Search hotels with "pool" and "wifi" tags');
    try {
        const hotelsByTags = await hotelTool.searchHotels({
            tags: ['pool', 'wifi']
        });
        console.log(`✅ Found ${hotelsByTags.length} hotels with pool and wifi`);
        console.log(hotelsByTags);
    } catch (error) {
        console.error('❌ Test 3 failed:', error);
    }
    console.log('\n---\n');

    // Test 4: Search hotels with minimum stars
    console.log('Test 4: Search hotels with at least 4 stars');
    try {
        const luxuryHotels = await hotelTool.searchHotels({
            minStars: 4
        });
        console.log(`✅ Found ${luxuryHotels.length} luxury hotels (4+ stars)`);
        console.log(luxuryHotels);
    } catch (error) {
        console.error('❌ Test 4 failed:', error);
    }
    console.log('\n---\n');

    // Test 5: Combined search
    console.log('Test 5: Combined search - 4+ stars, under $300, in Miami');
    try {
        const combinedSearch = await hotelTool.searchHotels({
            maxPrice: '300',
            locations: ['Miami'],
            minStars: 4
        });
        console.log(`✅ Found ${combinedSearch.length} matching hotels`);
        console.log(combinedSearch);
    } catch (error) {
        console.error('❌ Test 5 failed:', error);
    }
    console.log('\n---\n');

    // Test 6: Get hotel by ID
    console.log('Test 6: Get specific hotel by ID');
    try {
        // First, get some hotels to find a valid ID
        const someHotels = await hotelTool.searchHotels({});
        
        if (someHotels.length > 0) {
            const testId = someHotels[0]?.id;
            console.log(`Fetching hotel with ID: ${testId}`);
            if(!testId) {
                throw new Error('Test hotel ID is undefined');
            }
            const hotel = await hotelTool.getHotelById(testId);
            if (hotel) {
                console.log('✅ Successfully retrieved hotel:');
                console.log(hotel);
            } else {
                console.log('⚠️  Hotel not found');
            }
        } else {
            console.log('⚠️  No hotels available to test getHotelById');
        }
    } catch (error) {
        console.error('❌ Test 6 failed:', error);
    }
    console.log('\n---\n');

    // Test 7: Empty search (all hotels)
    console.log('Test 7: Search all hotels (no filters)');
    try {
        const allHotels = await hotelTool.searchHotels({});
        console.log(`✅ Found ${allHotels.length} total hotels`);
        console.log(allHotels.slice(0, 3)); // Show first 3
    } catch (error) {
        console.error('❌ Test 7 failed:', error);
    }
    console.log('\n---\n');

    // Test 8: Get non-existent hotel
    console.log('Test 8: Try to get non-existent hotel');
    try {
        const nonExistent = await hotelTool.getHotelById('non-existent-id-12345');
        if (nonExistent === null) {
            console.log('✅ Correctly returned null for non-existent hotel');
        } else {
            console.log('⚠️  Unexpectedly found a hotel');
        }
    } catch (error) {
        console.error('❌ Test 8 failed:', error);
    }

    console.log('\n🎉 All tests completed!');
}

// Run the tests
testHotelSearch().catch(console.error);