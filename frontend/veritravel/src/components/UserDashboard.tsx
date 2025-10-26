"use client"

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button"
import bookingEscrowContract from "@/contracts/BookingEscrow.json"
import HotelRegistryContract from "@/contracts/HotelRegistry.json"

import { CheckCircle, Clock, DollarSign, MapPin, Star, XCircle } from "lucide-react"
import type { Booking, Hotel } from "@/types";

type StayDetails = {
  name: string
  price: number
  location: string
  rating: number
  size: string
  rooms: string
  feature: string
  image?: string
  description: string
  bookingDate?: string
  hotelId?: string
  tokenId?: string
}

const myBookings: StayDetails[] = [
  {
    name: "Luxury Beach Resort",
    price: 250,
    location: "Malta",
    rating: 4.8,
    size: "400 sq feet",
    rooms: "2BHK",
    feature: "Infinity Pool",
    description: "Sun-drenched suites overlooking crystal-clear waters with private deck access.",
    image: "/assets/image/demo_hotels/Two_bhk_suite.jpg"
  },
  {
    name: "Mountain Retreat Hotel",
    price: 180,
    location: "Alps",
    rating: 4.6,
    size: "320 sq feet",
    rooms: "Loft",
    feature: "Fireplace",
    description: "Warm timber interiors and sweeping alpine views ideal for a cozy getaway.",
    image: "/assets/image/demo_hotels/Mountain_retreat.jpg"
  },
]

const topDestinations: StayDetails[] = [
  {
    name: "Paradise Island Resort",
    price: 320,
    location: "Fiji",
    rating: 4.9,
    size: "450 sq feet",
    rooms: "Water Villa",
    feature: "Sun Deck",
    description: "Glass-bottom villas suspended above turquoise lagoons with 24/7 butler service.",
    image: "/assets/image/demo_hotels/Paradise_island_resort.jpg"
  },
  {
    name: "Urban Luxury Suites",
    price: 220,
    location: "Tokyo",
    rating: 4.7,
    size: "280 sq feet",
    rooms: "Studio",
    feature: "Skyline View",
    description: "Minimalist design meets neon skyline views in the heart of Shibuya.",
    image: "/assets/image/demo_hotels/Urban.jpg"
  },
  {
    name: "Tropical Escape Villa",
    price: 190,
    location: "Bali",
    rating: 4.5,
    size: "360 sq feet",
    rooms: "Villa",
    feature: "Chef on Call",
    description: "Private plunge pools wrapped in lush jungle foliage for a serene retreat.",
    image: "/assets/image/demo_hotels/Tropical_escape.jpg"
  },
]

export default function UserDashboard() {
  const curatedHotels = [...myBookings, ...topDestinations]
  const [selectedHotel, setSelectedHotel] = useState<StayDetails | null>(curatedHotels[0] ?? null)

  const [bookingContract, setBookingContract] = useState<ethers.Contract | null>(null);
  const [hotelRegistryContract, setHotelRegistryContract] = useState<ethers.Contract | null>(null);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [booking, setBooking] = useState<any[]>([])
  const [isLoadingNfts, setIsLoadingNfts] = useState(true)

  if (!selectedHotel) {
    return null
  }

  const getMetaMaskProvider = () => {
    if (window.ethereum?.providers) {
      return (window.ethereum.providers as Array<{ isMetaMask?: boolean }>).find((p) => p.isMetaMask);
    }
    if (window.ethereum?.isMetaMask) return window.ethereum;
    return null;
  };

  const connectWallet = async () => {
    try {
      setIsLoadingNfts(true)
      const ethereum = getMetaMaskProvider();
      if (!ethereum) return alert("Please install or enable MetaMask");

      const targetChainId = "0x128"; // Hedera Testnet

      let chainId = await ethereum.request({ method: "eth_chainId" });
      if (chainId !== targetChainId) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainId }],
          });
        } catch (switchError) {
          if (
            typeof switchError === "object" &&
            switchError !== null &&
            "code" in switchError &&
            (switchError as { code?: unknown }).code === 4902
          ) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: targetChainId,
                  chainName: "Hedera Testnet",
                  rpcUrls: ["https://testnet.hashio.io/api"],
                  nativeCurrency: {
                    name: "HBAR",
                    symbol: "HBAR",
                    decimals: 8,
                  },
                  blockExplorerUrls: ["https://hashscan.io/testnet"],
                },
              ],
            });
          } else throw switchError;
        }
      }

      // const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      const bookingescrow = new ethers.Contract(
        bookingEscrowContract.address,
        bookingEscrowContract.abi,
        signer
      )
      setBookingContract(bookingescrow)

      const hotelregistry = new ethers.Contract(
        HotelRegistryContract.address,
        HotelRegistryContract.abi,
        signer
      )
      setHotelRegistryContract(hotelregistry)

      // Fetch raw Booking 
      const rawBookings = await bookingescrow.getUserBookings(address);

      // Map each booking and fetch hotel
      const bookingsWithHotel = await Promise.all(
        rawBookings.map(async (b: any) => {
          // Fetch the hotel corresponding to this booking
          const hotelData = await hotelregistry.getHotel(b.hotelId);
          const formatted: Hotel = {
            id: hotelData.id,
            name: hotelData.name,
            owner: hotelData.owner,
            location: hotelData.location,
            description: hotelData.description,
            pricePerNight: hotelData.pricepernight,
            ratings: hotelData.ratings,
            totalBookings: hotelData.totalbookings,
            totalRatingValue: hotelData.totalRatingValue,
            totalRatingCount: hotelData.totalRatingCount,
            stars: Number(hotelData.stars),
            totalRooms: Number(hotelData.totalRooms),
            phone: hotelData.phone,
            email: hotelData.email,
            tags: hotelData.tags,
            images: hotelData.images || [],
          };

          const formattedBooking: Booking & { hotel: Hotel } = {
            bookingId: b.bookingId,
            user: b.user,
            hotelId: b.hotelId,
            amount: b.amount,
            nftId: b.nftId,
            checkInDate: b.checkInDate,
            checkOutDate: b.checkOutDate,
            bookingStatus: Number(b.bookingStatus),
            hotel: formatted,
          };

          return formattedBooking;
        })
      );
      setBooking(bookingsWithHotel);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsLoadingNfts(false)
    }
  }

  useEffect(() => {
    connectWallet()
  }, [])

  // Unix Timestamp -> DD-MM-YYYY
  const formatDate = (ts: bigint) => {
    const date = new Date(Number(ts) * 1000);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      const res = confirm("Are you sure you want to cancel this booking?");
      if (!res) return;
      if (!bookingContract || !walletAddress) return;
      const tx = await bookingContract.cancelBooking(bookingId);
      await tx.wait();
      console.log("Booking cancelled:", bookingId);
      alert("Booking cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Error cancelling booking. See console for details.");
    }
  }

  const handleCheckIn = async (bookingId: number) => {
    try {
      if (!bookingContract || !walletAddress)
        return;
      const tx = await bookingContract.checkInHotel(bookingId);
      await tx.wait();
      console.log("Checked in to booking:", bookingId);
      alert("Check-in successful!");

    } catch (error) {
      console.error("Error during check-in:", error);
      alert("Error during check-in. See console for details.");
    }
  }

  const handleRate = async (currBooking: Booking) => {
    const bookingId = currBooking.bookingId;

    try {
      if (!hotelRegistryContract || !walletAddress)
        return;

      const hasStayed = await hotelRegistryContract.userStayed(currBooking.user, currBooking.hotelId);
      const hasRated = await hotelRegistryContract.hasRated(currBooking.user, currBooking.hotelId);

      if (!hasStayed) {
        alert("You need to have a proof of stay NFT to rate this booking")
        return;
      } if (hasRated) {
        alert("You have already rated this hotel")
        return;
      } else {
        const rating = prompt("Enter your rating (1-5):");
        if (rating) {
          const tx = await hotelRegistryContract.rateHotel(currBooking.hotelId, parseInt(rating));
          await tx.wait();
          console.log("Rated booking:", bookingId, "with rating:", rating);
          alert("You have rated the hotel successfully!");
        }
      }
    } catch (error) {
      console.error("Error rating booking:", error);
      alert("Error rating booking. See console for details.");
    }
  }

  return (
    <div className="min-h-screen bg-[#EDE7D6] text-neutral-900">
      <main className="px-4 pb-20 pt-32 md:px-10">
        <div className="mx-auto flex w-full flex-col gap-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <section className="rounded-[40px] border border-black/10 bg-[#DCD5C3] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="relative">
                  <div className="flex gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                    <span className="rounded-full border border-black/15 bg-[#F3EEDB] px-4 py-2 text-neutral-700">
                      {selectedHotel.size}
                    </span>
                    <span className="rounded-full border border-black/15 bg-[#F3EEDB] px-4 py-2 text-neutral-700">
                      {selectedHotel.rooms}
                    </span>
                    <span className="rounded-full border border-black/15 bg-[#F3EEDB] px-4 py-2 text-neutral-700">
                      {selectedHotel.feature}
                    </span>
                  </div>
                  <div className="relative h-72 overflow-hidden rounded-[34px] border border-black/10 bg-gradient-to-br from-[#D7D2BD] via-[#CFCAB4] to-[#D7D2BD] mt-4">
                    <div className="flex h-full items-center justify-center">
                      {selectedHotel.image ? (
                        <img
                          src={selectedHotel.image}
                          alt={selectedHotel.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-neutral-500">
                          {/* Image placeholder */}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-600">
                      Design Your Getaway
                    </span>
                    <h1 className="text-4xl font-serif tracking-tight text-neutral-900">{selectedHotel.name}</h1>
                    <p className="text-sm leading-relaxed text-neutral-700">{selectedHotel.description}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                        Location
                      </span>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-800">
                        <MapPin className="h-4 w-4 text-neutral-600" />
                        {selectedHotel.location}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                        Price.
                      </span>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-800">
                        <DollarSign className="h-4 w-4 text-neutral-600" />
                        {selectedHotel.price}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                        Rating
                      </span>
                      <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-neutral-800">
                        <Star className="h-4 w-4 fill-[#F2C94C] text-[#F2C94C]" />
                        {selectedHotel.rating.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <Link to="/agent">
                    <Button className="w-full rounded-full bg-black px-8 py-6 text-sm font-semibold uppercase tracking-[0.32em] text-white hover:bg-neutral-800">
                      Plan your stay
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-serif tracking-tight text-neutral-900">Explore more stays</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {curatedHotels.map((hotel, idx) => {
                    const isActive = hotel.name === selectedHotel.name
                    return (
                      <button
                        key={`${hotel.name}-${idx}`}
                        type="button"
                        onClick={() => setSelectedHotel(hotel)}
                        className={`group flex w-36 shrink-0 flex-col overflow-hidden rounded-[26px] border transition ${isActive
                          ? "border-black/60 bg-white/80 shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                          : "border-black/10 bg-white/40 hover:bg-white/70"
                          }`}
                        aria-pressed={isActive}
                      >
                        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-white/40 to-black/5">
                          {hotel.image ? (
                            <img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold uppercase tracking-[0.26em] text-neutral-500">
                              {hotel.rooms}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 px-3 pb-3 pt-2 text-left">
                          <p className="text-sm font-semibold leading-tight text-neutral-900">
                            {hotel.name}
                          </p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                            {hotel.location}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[36px] border border-black/12 bg-[#F8F6EC] p-6 shadow-[0_18px_34px_rgba(0,0,0,0.05)]">
              <div className="absolute -top-12 right-6 w-48 rounded-[22px] border border-black/10 bg-white/95 p-4 text-xs font-medium text-neutral-800 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
                <div className="absolute -bottom-3 right-8 h-4 w-7 rotate-12 rounded-br-[12px] border-b border-r border-black/10 bg-white/95" />
              </div>
              <div className="flex h-72 flex-col items-center justify-center gap-4 h-full">
                <img
                  src="/assets/image/AI_Agent.png"
                  alt="Slofy travel concierge"
                  className="h-62 w-auto max-w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
                />
                <div className="text-center text-sm font-medium text-neutral-600">
                  Relax and stretch - Slofy keeps your itinerary on track.
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[36px] border border-black/12 bg-white/70 p-7 shadow-[0_18px_38px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-serif tracking-tight text-neutral-900">My bookings</h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                {booking.length > 0 ? 'Manage your reservations' : 'Your NFT bookings will appear here'}
              </span>
            </div>
            {isLoadingNfts ? (
              <div className="mt-6 flex h-40 items-center justify-center">
                <div className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
                  Loading your bookings...
                </div>
              </div>
            ) : booking.length === 0 ? (
              <div className="mt-6 flex h-40 flex-col items-center justify-center rounded-[28px] border border-dashed border-black/20 bg-white/60">
                <div className="text-4xl">🏨</div>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.3em] text-neutral-600">
                  No bookings yet
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Your booking NFTs will appear here once you make a reservation
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {booking.map((booking, idx) => {
                  return (
                    <div
                      key={`${booking.bookingId}-${idx}`}
                      className="flex h-full flex-col justify-between rounded-[28px] border border-black/12 bg-[#F6F1E0] p-6 shadow-[0_12px_24px_rgba(0,0,0,0.06)]"
                    >
                      <div className="p-4 rounded-2xl shadow-sm border border-neutral-200 bg-white hover:shadow-md transition-all duration-200">
                        {/* Hotel Header */}
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-semibold text-neutral-900">{booking.hotel.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-neutral-600">
                            <MapPin className="h-4 w-4 text-neutral-500" />
                            <span className="capitalize">{booking.hotel.location}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="flex justify-between items-start gap-4">
                          <p className="flex-1 text-sm text-neutral-700 mb-2 line-clamp-2">
                            {booking.hotel.description}
                          </p>
                          <div className="text-xs text-neutral-500 font-medium whitespace-nowrap">
                            NFT #{booking.nftId}
                          </div>
                        </div>

                        {/* Dates Section */}
                        <div className="grid grid-cols-2 gap-y-2 my-6">
                          <div className="text-xs text-neutral-600">
                            <span className="block font-semibold uppercase tracking-widest text-neutral-500">
                              Check In
                            </span>
                            <span className="font-medium text-neutral-800">{formatDate(booking.checkInDate)}</span>
                          </div>
                          <div className="text-xs text-neutral-600 text-right">
                            <span className="block font-semibold uppercase tracking-widest text-neutral-500">
                              Check Out
                            </span>
                            <span className="font-medium text-neutral-800">{formatDate(booking.checkOutDate)}</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                            <span className="uppercase tracking-[0.18em] text-neutral-500">Status:</span>
                            <div className="flex items-center gap-2">
                              {booking.bookingStatus == 0 && (
                                <>
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                  <span className="text-yellow-600">Booked</span>
                                </>
                              )}
                              {booking.bookingStatus == 1 && (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-green-600">Checked In</span>
                                </>
                              )}
                              {booking.bookingStatus == 2 && (
                                <>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-red-600">Cancelled</span>
                                </>
                              )}
                            </div>
                          </div>

                          <span className="text-sm font-semibold text-neutral-800">
                            {Number(booking.hotel.pricePerNight) * 1e-8} HBAR / night
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {booking.bookingStatus == 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl border border-black/12 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-700 hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                              onClick={() => handleCheckIn(booking.bookingId)}
                            >
                              Check In
                            </Button>
                          )}
                          {booking.bookingStatus == 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl border border-black/12 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              onClick={() => handleCancelBooking(booking.bookingId)}
                            >
                              Cancel
                            </Button>
                          )
                          }
                          {booking.bookingStatus == 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl border border-black/12 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-700 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300"
                              onClick={() => handleRate(booking)}
                            >
                              Rate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div className="rounded-[32px] border border-black/12 bg-white/70 p-6 shadow-[0_18px_32px_rgba(0,0,0,0.05)]">
              <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-600">
                Discover top destinations
              </h3>
              <div className="mt-5 space-y-4">
                {topDestinations.map((destination, idx) => (
                  <div key={`${destination.name}-${idx}`} className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{destination.name}</p>
                      <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">{destination.location}</p>
                    </div>
                    <div className="text-right text-xs font-semibold uppercase tracking-[0.24em] text-neutral-600">
                      {destination.rating.toFixed(1)} ★
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-black/12 bg-[#F5F1E3] p-6 shadow-[0_18px_32px_rgba(0,0,0,0.05)]">
              <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-600">
                VeriTravel perks
              </h3>
              <ul className="mt-5 space-y-4 text-sm leading-relaxed text-neutral-700">
                <li>- Earn loyalty NFTs for every confirmed stay.</li>
                <li>- Access concierge powered by on-chain itineraries.</li>
                <li>- Instant upgrades when availability opens up.</li>
                <li>- Share experiences with friends via secure passes.</li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}