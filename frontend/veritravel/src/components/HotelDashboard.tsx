"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import hotelRegistryContract from "@/contracts/HotelRegistry.json"
import bookingEscrowContract from "@/contracts/BookingEscrow.json"
import type { Hotel, Booking } from "@/types";

import Header, { type HeaderView } from "./Header/Header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUp,
  ArrowUpRight,
  Edit3,
  Filter,
  LogOut,
  Star,
} from "lucide-react";

type ArrivalState = "awaiting" | "arrived" | "cancelled";

// Map from bookingStatus enum to arrivalState
const arrivalStateMap: ArrivalState[] = ["awaiting", "arrived", "cancelled"];
const arrivalStyles: Record<ArrivalState, { label: string; className: string }> = {
  awaiting: {
    label: "Awaiting Arrival",
    className: "bg-[#FDEBDD] text-[#A45A1F] border-[#F5CBA7]",
  },
  arrived: {
    label: "Arrived",
    className: "bg-[#E1F4E7] text-[#236A42] border-[#B8E4C7]",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-[#EBE5F5] text-[#574196] border-[#D5CFF0]",
  },
};

type ArrivalFilter = "all" | "arrived" | "awaiting";

type HotelDashboardProps = {
  activeView?: HeaderView;
  onNavigate?: (view: HeaderView) => void;
};

export default function HotelDashboard({
  activeView = "hotel"
}: HotelDashboardProps) {
  // const [stays, setStays] = useState<Stay[]>(initialStays);
  const [filter, setFilter] = useState<ArrivalFilter>("all");

  // Wallet + Contract states
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [hotelContract, setHotelContract] = useState<ethers.Contract | null>(null);
  const [bookingContract, setBookingContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState(true);

  // Data retrieved from Smart Contracts
  const [hotel, setHotel] = useState<Hotel>();
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Has nft corresponding to user been minted for that Hotel or not
  const [bookingMintedMap, setBookingMintedMap] = useState<Map<bigint, boolean>>(new Map());

  // Connect Wallet & Load Contract
  const getMetaMaskProvider = () => {
    if (window.ethereum?.providers) {
      return (window.ethereum.providers as Array<{ isMetaMask?: boolean }>).find((p) => p.isMetaMask);
    }
    if (window.ethereum?.isMetaMask) return window.ethereum;
    return null;
  };
  const connectWallet = async () => {
    try {
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

      const hotelContract = new ethers.Contract(
        hotelRegistryContract.address,
        hotelRegistryContract.abi,
        signer
      );
      setHotelContract(hotelContract);

      const bookingContract = new ethers.Contract(
        bookingEscrowContract.address,
        bookingEscrowContract.abi,
        signer
      );
      setBookingContract(bookingContract);
    } catch (err) {
      console.error(err);
      alert("Failed to connect wallet");
    }
  };

  // === Hotel Contract Functions ====
  // async function registerHotel() {
  //   if (!hotelContract)
  //     return alert("Connect wallet first");
  //   setLoading(true);
  //   try {
  //     const tx = await hotelContract.registerHotel(
  //       "Sea View Inn",
  //       "A beautiful beachside hotel",
  //       "Goa",
  //       ethers.parseEther("0.05"),
  //       ["sea", "wifi"],
  //       ["img1.jpg"],
  //       4,
  //       20,
  //       "9999999999",
  //       "seaview@example.com"
  //     );
  //     await tx.wait();
  //     alert("Hotel registered!");
  //   } catch (err) {
  //     console.error(err);
  //     alert("Error registering hotel");
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  async function confirmStay(booking: Booking) {
    if (!hotelContract)
      return alert("Connect wallet first");
    setLoading(true);
    try {
      const tx = await hotelContract.ConfirmStay(hotel?.id, booking.user);
      await tx.wait();
      alert("Stay confirmed, NFT minted!");
    } catch (err) {
      console.error(err);
      alert("Error confirming stay");
    } finally {
      const newMap = new Map(bookingMintedMap); // create a copy
      newMap.set(booking.bookingId, true); // set the value
      setBookingMintedMap(newMap)

      console.log(bookingMintedMap);

      setLoading(false);
    }
  }

  // === Load Hotel & Booking Details ===
  const loadHotelBookings = async () => {
    if (!hotelContract || !bookingContract) {
      console.warn("Wallet not connected or contract not initialized");
      return;
    }

    try {
      setLoading(true);
      const hotelData = await hotelContract.getHotelsByOwner(walletAddress);
      console.log(hotelData);

      if (hotelData) {
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

        const bookingData = await bookingContract.getHotelBookings(formatted.id);

        // Once hotel data loads
        if (bookingData && bookingData.length > 0) {
          const formattedBookings: Booking[] = bookingData.map((b: any) => ({
            bookingId: b.bookingId,
            user: b.user,
            hotelId: b.hotelId,
            amount: b.amount,
            nftId: b.nftId,
            checkInDate: b.checkInDate,
            checkOutDate: b.checkOutDate,
            bookingStatus: b.bookingStatus
          }));

          // Once bookings load
          const map = new Map<bigint, boolean>();
          await Promise.all(
            formattedBookings.map(async (b) => {
              const stayed: boolean = await hotelContract.userStayed(b.user, formatted.id);
              map.set(b.bookingId, stayed);
            })
          );
          setHotel(formatted);
          setBookings(formattedBookings);
          setBookingMintedMap(map);
        }
      }
    } catch (err) {
      console.error("Error fetching hotel or bookings", err);
    } finally {
      setLoading(false);
    }
  };

  // Loading Hotel Data 
  // (When contract changes -> Signer)
  useEffect(() => {
    loadHotelBookings();
  }, [hotelContract, bookingContract]);

  useEffect(() => {
    connectWallet();
  }, [])

  const filteredBookings = useMemo(() => {
    if (filter === "arrived") {
      return bookings.filter((booking) => booking.bookingStatus == 1);
    }
    if (filter === "awaiting") {
      return bookings.filter((booking) => booking.bookingStatus == 0);
    }
    return bookings;
  }, [filter, bookings]);

  const filterCounts = useMemo(
    () => ({
      all: bookings.length,
      arrived: bookings.filter((booking) => booking.bookingStatus == 1).length,
      awaiting: bookings.filter((booking) => booking.bookingStatus == 0).length,
    }),
    [bookings]
  );

  const formatDate = (ts: bigint) => {
    const date = new Date(Number(ts) * 1000);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="min-h-screen bg-[#EFEBD9] font-sans">
      <Header activeView={activeView} />

      <main className="px-4 pb-16 pt-28 sm:px-8 lg:px-12">
        <div className="flex w-full flex-col gap-12">

          {/* {!loading && hotel && ( */}
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_500px]">
            {/* Hero showcase */}
            <div
              className="relative w-full overflow-hidden rounded-[36px] border border-black/12 bg-cover bg-center"
              style={{
                backgroundImage: `url(${hotel?.images[0]?.startsWith("ipfs://")
                  ? hotel.images[0].replace("ipfs://", "https://ipfs.io/ipfs/")
                  : hotel?.images[0]
                  })`,
              }}
            >
              <div className="relative h-[320px] w-full">
                <div className="absolute left-10 top-8 flex gap-3">
                  {
                    hotel?.tags.map((tag, index) => (
                      <span key={index} className="rounded-full border border-black/12 bg-[#F3EEDB] px-6 py-2 text-xs font-semibold tracking-[0.08em] text-neutral-700">
                        {tag}
                      </span>
                    ))
                  }
                </div>

                <button
                  className="absolute right-10 top-8 flex h-11 w-11 items-center justify-center rounded-full border border-black/12 bg-white text-neutral-600"
                  aria-label="Edit listing"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Insights panel */}
            <aside className="flex w-full flex-col gap-9 rounded-[36px] border border-black/12 bg-[#F3F0E6] px-4 pb-10 pt-10">
              {loading ? (
                <div className="mt-6 flex h-40 items-center justify-center">
                  <div className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
                    Loading hotel data...
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-4">
                    <h2 className="text-[30px] font-serif tracking-tight text-neutral-950">Hotel</h2>
                    <span className="rounded-full bg-black px-5 py-2 text-[14px] font-semibold tracking-[0.24em] text-white">
                      {hotel?.name}
                    </span>
                  </div>

                  <div className="space-y-5 text-neutral-800">
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="uppercase tracking-[0.16em]">Number of Bookings</div>
                      <div className="flex items-center gap-3">
                        <span className="whitespace-nowrap text-[16px] font-semibold">{hotel?.totalBookings}</span>
                        <span className="flex items-center gap-1 rounded-full border border-black/12 bg-white px-3 py-[4px] text-[10px] font-semibold text-neutral-600">
                          <ArrowUp className="h-3.5 w-3.5" />
                          <span className="whitespace-nowrap">20%</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="uppercase tracking-[0.16em]">Generated Revenue (HBAR)</div>
                      <span className="whitespace-nowrap text-[16px] font-semibold">
                        {bookings.reduce((total, booking) => {
                          return booking.bookingStatus == 1
                            ? total + Number((Number(booking.amount) * 1e-8).toFixed(2))
                            : total;
                        }, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="uppercase tracking-[0.16em]">Location</div>
                      <span className="whitespace-nowrap text-[16px] font-semibold capitalize">{hotel?.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="uppercase tracking-[0.16em]">Price Per Night (HBAR)</div>
                      <span className="whitespace-nowrap text-[16px] font-semibold">{Number(hotel?.pricePerNight) * 1e-8}</span>
                    </div>
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="uppercase tracking-[0.16em]">Total Rooms</div>
                      <span className="whitespace-nowrap text-[16px] font-semibold">{hotel?.totalRooms}</span>
                    </div>
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="uppercase tracking-[0.16em]">Stars</div>
                      <span className="whitespace-nowrap text-[16px] font-semibold">{hotel?.stars}</span>
                    </div>
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="uppercase tracking-[0.16em]">Phone</div>
                      <span className="whitespace-nowrap text-[16px] font-semibold">{hotel?.phone}</span>
                    </div>
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="uppercase tracking-[0.16em]">Email</div>
                      <span className="whitespace-nowrap text-[16px] font-semibold">{hotel?.email}</span>
                    </div>
                  </div>
                </>)
              }

              <div className="flex items-center justify-between">
                <div className="flex h-10 items-center gap-3 rounded-full border border-black/12 bg-white px-2">
                  <Star className="h-4 w-4 flex-shrink-0 text-[#F2C94C]" />
                  <span className="whitespace-nowrap text-sm font-medium uppercase tracking-[0.12em]">{hotel?.ratings} / 5</span>
                </div>
                <Button
                  onClick={connectWallet}
                  variant="ghost"
                  className="group rounded-full border border-black/12 bg-[#EDE4CB] px-7 py-[18px] text-sm font-semibold uppercase tracking-[0.18em] text-neutral-900 hover:bg-[#E4D8BB]"
                >
                  {/* Generate Insights */}
                  {walletAddress ? "Wallet Connected" : "Connect Wallet"}
                  <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Button>
              </div>
            </aside>
          </div>
          {/* )} */}

          {/* Reservations table */}
          <section className="w-full rounded-[36px] border border-black/12 bg-[#F6F1DF] px-8 pb-10 pt-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-700">
                <Filter className="h-4 w-4 text-neutral-500" />
                <span>Filter By Arrival</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { value: "all" as ArrivalFilter, label: "All" },
                    { value: "arrived" as ArrivalFilter, label: "Arrived" },
                    { value: "awaiting" as ArrivalFilter, label: "Not Arrived" },
                  ] satisfies { value: ArrivalFilter; label: string }[]
                ).map((option) => {
                  const isActive = filter === option.value;
                  return (
                    <Button
                      key={option.value}
                      onClick={() => setFilter(option.value)}
                      variant={isActive ? "default" : "ghost"}
                      className={`rounded-full border border-black/12 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${isActive
                        ? "bg-black text-white hover:bg-black/90"
                        : "bg-white text-neutral-700 hover:bg-[#EDE4CB]"
                        }`}
                    >
                      {option.label}
                      <span className="ml-2 text-[11px] font-medium text-neutral-500">
                        {filterCounts[option.value] ?? 0}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-black/20 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
                  <TableHead>Guest</TableHead>
                  <TableHead>Check In Date</TableHead>
                  <TableHead>Check Out Date</TableHead>
                  <TableHead className="text-right">Booking Amount</TableHead>
                  <TableHead className="text-right">NFT Status</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <div className="mt-6 flex h-40 items-center justify-center">
                  <div className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
                    Loading hotel bookings...
                  </div>
                </div>
              ) : (
                <TableBody>
                  {filteredBookings.map((booking, index) => {
                    const arrivalBadge = arrivalStyles[arrivalStateMap[booking.bookingStatus]];
                    return (
                      <TableRow
                        key={booking.bookingId}
                        className={index % 2 === 0 ? "bg-white/60" : "bg-transparent"}
                      >
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2 text-neutral-900">
                            <div className="text-sm font-semibold uppercase tracking-[0.16em]">
                              {booking.user}
                            </div>
                            <span
                              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${arrivalBadge.className}`}
                            >
                              {arrivalBadge.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-neutral-700">
                          <span className="text-sm font-medium text-neutral-800">
                            {formatDate(booking.checkInDate)}
                          </span>
                        </TableCell>
                        <TableCell className="align-top text-neutral-700">
                          <span className="text-sm font-medium text-neutral-800">
                            {formatDate(booking.checkOutDate)}
                          </span>
                        </TableCell>
                        <TableCell className="align-top text-right font-semibold text-neutral-900">
                          {(Number(booking.amount) * 1e-8).toFixed(2)} HBAR
                        </TableCell>
                        <TableCell className="align-top flex justify-end">
                          {Number(booking.bookingStatus) == 0 ? (
                            // Awaiting — button disabled
                            <Button
                              disabled
                              variant="ghost"
                              className="flex items-center gap-2 rounded-full border border-black/12 bg-[#F3F0E6] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400 cursor-not-allowed opacity-60"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              Mint
                            </Button>
                          ) : !bookingMintedMap.get(booking.bookingId) ? (
                            // Nft has not been minted
                            <Button
                              onClick={() => confirmStay(booking)}
                              variant="ghost"
                              className="flex items-center gap-2 rounded-full border border-black/12 bg-[#F3F0E6] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-800 hover:bg-[#E4D8BB]"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              Mint
                            </Button>
                          ) : (
                            // Has been minted (has stayed)
                            <span className="flex items-center gap-2 rounded-full border border-black/12 bg-[#EBE5F5] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-800">
                              Minted
                            </span>
                          )}

                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </section>
        </div>
      </main >
    </div >
  );
}