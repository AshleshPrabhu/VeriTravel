/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  HotelRegistry,
  Hotel
} from "generated";

HotelRegistry.HotelRated.handler(async ({ event, context }) => {
  const hotelId = event.params.hotelId.toString();
  const existing = await context.Hotel.get(hotelId);

  if (!existing) {
    console.warn(`Hotel with ID ${hotelId} not found`);
    return;
  }

  const entity: Hotel = {
    ...existing,
    rating: Number(event.params.averageRating),
    timestamp: event.params.timestamp,
  };

  context.Hotel.set(entity);
});

HotelRegistry.HotelRegistered.handler(async ({ event, context }) => {
  const hotelId = event.params.hotelId.toString();

  const entity: Hotel = {
    id: hotelId,
    name: event.params.name,
    location: event.params.location,
    stars: Number(event.params.stars),
    rating: 0,
    pricePerNight: event.params.pricePerNight,
    tags: event.params.tags,
    timestamp: event.params.timestamp,
  };

  context.Hotel.set(entity);
});

HotelRegistry.HotelUpdated.handler(async ({ event, context }) => {
  const hotelId = event.params.hotelId.toString();
  const existing = await context.Hotel.get(hotelId);
  
  if (!existing) {
    console.warn(`Hotel with ID ${hotelId} not found`);
    return;
  }

  const entity: Hotel = {
    id: hotelId,
    name: event.params.name,
    location: event.params.location,
    stars: Number(event.params.stars),
    rating: existing?.rating,
    pricePerNight: event.params.pricePerNight,
    tags: event.params.tags,
    timestamp: event.params.timestamp,
  };

  context.Hotel.set(entity);
});
