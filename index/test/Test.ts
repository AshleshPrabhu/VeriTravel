import assert from "assert";
import { 
  TestHelpers,
  HotelRegistry_HotelRated
} from "generated";
const { MockDb, HotelRegistry } = TestHelpers;

describe("HotelRegistry contract HotelRated event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for HotelRegistry contract HotelRated event
  const event = HotelRegistry.HotelRated.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("HotelRegistry_HotelRated is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await HotelRegistry.HotelRated.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualHotelRegistryHotelRated = mockDbUpdated.entities.HotelRegistry_HotelRated.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedHotelRegistryHotelRated: HotelRegistry_HotelRated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      hotelId: event.params.hotelId,
      user: event.params.user,
      rating: event.params.rating,
      averageRating: event.params.averageRating,
      totalRatings: event.params.totalRatings,
      timestamp: event.params.timestamp,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualHotelRegistryHotelRated, expectedHotelRegistryHotelRated, "Actual HotelRegistryHotelRated should be the same as the expectedHotelRegistryHotelRated");
  });
});
