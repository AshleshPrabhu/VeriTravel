export interface Hotel {
  id: bigint;
  name: string;
  owner: string;
  location: string;
  description: string;
  pricePerNight: string;
  ratings: bigint;
  totalBookings: bigint;
  totalRatingValue: bigint;
  totalRatingCount: bigint;
  images: string[];
  tags: string[];
  stars: number;
  totalRooms: number;
  phone: string;
  email: string;
}

export interface Booking {
  bookingId: bigint;
  user: string;
  hotelId: bigint;
  amount: string;
  nftId: bigint;
  checkInDate: bigint;
  checkOutDate: bigint;
  bookingStatus: number;
}