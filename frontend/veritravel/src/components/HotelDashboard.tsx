"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { HotelDetailsDialog, type HotelDetails } from "./HotelDetailsDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Edit3,
  Filter,
  Loader2,
  LogOut,
  Star,
} from "lucide-react";

type ArrivalState = "awaiting" | "arrived" | "departed";
type NftState = "Queued" | "Minting" | "Minted";

type Stay = {
  id: string;
  guestName: string;
  walletId?: string;
  checkIn?: string;
  checkOut?: string;
  amount: string;
  nftStatus: NftState;
  nftCode?: string;
  arrivalState: ArrivalState;
};

const initialStays: Stay[] = [
  {
    id: "stay-1",
    guestName: "Lena Carter",
    amount: "1.20 ETH",
    nftStatus: "Queued",
    arrivalState: "awaiting",
  },
  {
    id: "stay-2",
    guestName: "Omar Salim",
    walletId: "0x3b91...9fae",
    checkIn: "08 Oct 2025 · 14:20",
    checkOut: "11 Oct 2025",
    amount: "0.84 ETH",
    nftStatus: "Minted",
    nftCode: "VR-2873",
    arrivalState: "departed",
  },
  {
    id: "stay-3",
    guestName: "Nia Rhodes",
    walletId: "0x57de...aa90",
    checkIn: "02 Oct 2025 · 16:05",
    amount: "0.96 ETH",
    nftStatus: "Minted",
    nftCode: "VR-2941",
    arrivalState: "arrived",
  },
  {
    id: "stay-4",
    guestName: "Marco Díaz",
    amount: "0.73 ETH",
    nftStatus: "Queued",
    arrivalState: "awaiting",
  },
  {
    id: "stay-5",
    guestName: "Priya Dutta",
    walletId: "0x91f4...0ccd",
    checkIn: "22 Sep 2025 · 13:11",
    checkOut: "27 Sep 2025",
    amount: "1.54 ETH",
    nftStatus: "Minted",
    nftCode: "VR-2710",
    arrivalState: "departed",
  },
  {
    id: "stay-6",
    guestName: "Cassie Bell",
    walletId: "0xad71...44e1",
    checkIn: "14 Sep 2025 · 09:42",
    checkOut: "18 Sep 2025",
    amount: "1.02 ETH",
    nftStatus: "Minted",
    nftCode: "VR-2604",
    arrivalState: "departed",
  },
];

const nftStatusStyles: Record<NftState, string> = {
  Minted: "bg-[#E1F4E7] text-[#236A42] border-[#B8E4C7]",
  Queued: "bg-[#FFF6E5] text-[#A76B1F] border-[#F7D9A4]",
  Minting: "bg-[#E5F0FF] text-[#1F4AA7] border-[#B4D3FF]",
};

const arrivalStyles: Record<ArrivalState, { label: string; className: string }> = {
  awaiting: {
    label: "Awaiting Arrival",
    className: "bg-[#FDEBDD] text-[#A45A1F] border-[#F5CBA7]",
  },
  arrived: {
    label: "Arrived",
    className: "bg-[#E1F4E7] text-[#236A42] border-[#B8E4C7]",
  },
  departed: {
    label: "Checked Out",
    className: "bg-[#EBE5F5] text-[#574196] border-[#D5CFF0]",
  },
};

type ArrivalFilter = "all" | "arrived" | "awaiting";

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", " ·");

export default function HotelDashboard() {
  const [stays, setStays] = useState<Stay[]>(initialStays);
  const [hotelDetails, setHotelDetails] = useState<HotelDetails>({
    name: "Aurora Skyline Residency",
    location: "Lisbon, Portugal",
    pricePerNight: "1.20 ETH",
    rating: "4.2",
    description: "Panoramic skyline views with tailored concierge support for every guest.",
  });
  const [isHotelDialogOpen, setIsHotelDialogOpen] = useState(false);
  const [filter, setFilter] = useState<ArrivalFilter>("all");
  const [activeStayId, setActiveStayId] = useState<string | null>(null);
  const [checkInForm, setCheckInForm] = useState({ walletId: "", nftCode: "" });
  const mintTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeStay = useMemo(
    () => (activeStayId ? stays.find((stay) => stay.id === activeStayId) ?? null : null),
    [activeStayId, stays]
  );

  useEffect(() => {
    if (activeStay) {
      setCheckInForm({
        walletId: activeStay.walletId ?? "",
        nftCode: activeStay.nftCode ?? "",
      });
    } else {
      setCheckInForm({ walletId: "", nftCode: "" });
    }
  }, [activeStay]);

  useEffect(() => {
    return () => {
      Object.values(mintTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const filteredStays = useMemo(() => {
    if (filter === "arrived") {
      return stays.filter((stay) => stay.arrivalState === "arrived");
    }
    if (filter === "awaiting") {
      return stays.filter((stay) => stay.arrivalState === "awaiting");
    }
    return stays;
  }, [filter, stays]);

  const filterCounts = useMemo(
    () => ({
      all: stays.length,
      arrived: stays.filter((stay) => stay.arrivalState === "arrived").length,
      awaiting: stays.filter((stay) => stay.arrivalState === "awaiting").length,
    }),
    [stays]
  );

  const openCheckInDialog = (stayId: string) => {
    setActiveStayId(stayId);
  };

  const closeCheckInDialog = () => {
    setActiveStayId(null);
  };

  const handleHotelDetailsSubmit = (details: HotelDetails) => {
    setHotelDetails(details);
  };

  const handleCheckInSubmit = () => {
    if (!activeStay) return;

    const checkInTime = formatDateTime(new Date());
    setStays((prev) =>
      prev.map((stay) =>
        stay.id === activeStay.id
          ? {
              ...stay,
              checkIn: checkInTime,
              walletId: checkInForm.walletId,
              nftCode: checkInForm.nftCode,
              arrivalState: "arrived",
            }
          : stay
      )
    );
    closeCheckInDialog();
  };

  const handleCheckout = (stayId: string) => {
    const checkoutTime = formatDateTime(new Date());
    setStays((prev) =>
      prev.map((stay) =>
        stay.id === stayId
          ? {
              ...stay,
              checkOut: checkoutTime,
              arrivalState: "departed",
            }
          : stay
      )
    );
  };

  const handleMintNFT = (stayId: string) => {
    if (mintTimers.current[stayId]) return;

    setStays((prev) =>
      prev.map((stay) =>
        stay.id === stayId
          ? {
              ...stay,
              nftStatus: "Minting",
            }
          : stay
      )
    );

    mintTimers.current[stayId] = setTimeout(() => {
      setStays((prev) =>
        prev.map((stay) =>
          stay.id === stayId
            ? {
                ...stay,
                nftStatus: "Minted",
              }
            : stay
        )
      );
      delete mintTimers.current[stayId];
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-[#EFEBD9] font-sans">
      <main className="px-4 pb-16 pt-28 sm:px-8 lg:px-12">
        <div className="flex w-full flex-col gap-12">
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Hero showcase */}
            <section className="relative w-full overflow-hidden rounded-[36px] border border-black/12 bg-[#DAD7CE]">
              <div className="relative h-[320px] w-full">
                <div className="absolute left-10 top-8 flex gap-3">
                  <span className="rounded-full border border-black/12 bg-[#F3EEDB] px-6 py-2 text-xs font-semibold tracking-[0.08em] text-neutral-700">
                    400 SQ FEET
                  </span>
                  <span className="rounded-full border border-black/12 bg-[#F3EEDB] px-6 py-2 text-xs font-semibold tracking-[0.08em] text-neutral-700">
                    2BHK
                  </span>
                  <span className="rounded-full border border-black/12 bg-[#F3EEDB] px-6 py-2 text-xs font-semibold tracking-[0.08em] text-neutral-700">
                    POOL
                  </span>
                </div>

                <button
                  className="absolute right-10 top-8 flex h-11 w-11 items-center justify-center rounded-full border border-black/12 bg-white text-neutral-600"
                  aria-label="Edit listing"
                  onClick={() => setIsHotelDialogOpen(true)}
                >
                  <Edit3 className="h-4 w-4" />
                </button>

                <button
                  className="absolute bottom-25 right-10 flex h-12 w-12 items-center justify-center rounded-full border border-black/35 bg-[#F3F0E6] text-neutral-700"
                  aria-label="View details"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-8 left-10 flex max-w-xl flex-col gap-4 rounded-[28px] border border-black/12 bg-white/80 p-6 text-neutral-800 backdrop-blur-sm">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-serif tracking-tight text-neutral-900">
                      {hotelDetails.name || "Name your hotel"}
                    </h2>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
                      {hotelDetails.location || "Add a location"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em]">
                    <span className="rounded-full border border-black/12 bg-[#F3EEDB] px-4 py-2 text-neutral-800">
                      {hotelDetails.pricePerNight
                        ? `${hotelDetails.pricePerNight} / night`
                        : "Set nightly rate"}
                    </span>
                    <span className="flex items-center gap-2 rounded-full border border-black/12 bg-white px-4 py-2 text-neutral-800">
                      <Star className="h-4 w-4 text-[#F2C94C]" />
                      {hotelDetails.rating ? `${hotelDetails.rating} / 5` : "Rate your stay"}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-700">
                    {hotelDetails.description || "Add a short description to let guests know what makes this stay special."}
                  </p>
                </div>
              </div>
            </section>

            {/* Insights panel */}
            <aside className="flex w-full flex-col gap-9 rounded-[36px] border border-black/12 bg-[#F3F0E6] px-4 pb-10 pt-10">
              <div className="flex items-center justify-center gap-4">
                <h2 className="text-[34px] font-serif tracking-tight text-neutral-950">INSIGHTS</h2>
                <span className="rounded-full bg-black px-5 py-2 text-[13px] font-semibold tracking-[0.24em] text-white">
                  PANEL
                </span>
              </div>

              <div className="space-y-8 text-neutral-800">
                <div className="flex items-center justify-between text-[15px]">
                  <div className="uppercase tracking-[0.16em]">Number of Bookings</div>
                  <div className="flex items-center gap-3">
                    <span className="whitespace-nowrap text-[22px] font-semibold">128</span>
                    <span className="flex items-center gap-1 rounded-full border border-black/12 bg-white px-3 py-[6px] text-[12px] font-semibold text-neutral-600">
                      <ArrowUp className="h-3.5 w-3.5" />
                      <span className="whitespace-nowrap">20%</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[15px]">
                  <div className="uppercase tracking-[0.16em]">Generated Revenue</div>
                  <span className="whitespace-nowrap text-[22px] font-semibold">498.67 ETH</span>
                </div>
                <div className="flex items-center justify-between text-[15px]">
                  <div className="uppercase tracking-[0.16em]">Occupancy Rate</div>
                  <span className="whitespace-nowrap text-[22px] font-semibold">73%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex h-10 items-center gap-3 rounded-full border border-black/12 bg-white px-2">
                  <Star className="h-4 w-4 flex-shrink-0 text-[#F2C94C]" />
                  <span className="whitespace-nowrap text-sm font-medium uppercase tracking-[0.12em]">4.2 / 5</span>
                </div>
                <Button
                  variant="ghost"
                  className="group rounded-full border border-black/12 bg-[#EDE4CB] px-7 py-[18px] text-sm font-semibold uppercase tracking-[0.18em] text-neutral-900 hover:bg-[#E4D8BB]"
                >
                  Generate Insights
                  <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Button>
              </div>
            </aside>
          </div>

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
                      className={`rounded-full border border-black/12 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                        isActive
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
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead className="text-right">Amount Payable</TableHead>
                  <TableHead className="text-right">NFT Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStays.map((stay, index) => {
                  const arrivalBadge = arrivalStyles[stay.arrivalState];
                  return (
                    <TableRow
                      key={stay.id}
                      className={index % 2 === 0 ? "bg-white/60" : "bg-transparent"}
                    >
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-2 text-neutral-900">
                          <div className="text-sm font-semibold uppercase tracking-[0.16em]">
                            {stay.guestName}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {stay.walletId ? stay.walletId : "Wallet to be added at check-in"}
                          </div>
                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${arrivalBadge.className}`}
                          >
                            {arrivalBadge.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-neutral-700">
                        {stay.arrivalState === "awaiting" ? (
                          <Button
                            onClick={() => openCheckInDialog(stay.id)}
                            variant="outline"
                            className="rounded-full border-black/20 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-800 hover:bg-[#EDE4CB]"
                          >
                            Start Check-In
                          </Button>
                        ) : (
                          <span className="text-sm font-medium text-neutral-800">
                            {stay.checkIn ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-neutral-700">
                        {stay.arrivalState === "arrived" && !stay.checkOut ? (
                          <Button
                            onClick={() => handleCheckout(stay.id)}
                            variant="ghost"
                            className="flex items-center gap-2 rounded-full border border-black/12 bg-[#F3F0E6] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-800 hover:bg-[#E4D8BB]"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            Mark Checkout
                          </Button>
                        ) : (
                          <span className="text-sm font-medium text-neutral-800">
                            {stay.checkOut ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right font-semibold text-neutral-900">
                        {stay.amount}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${nftStatusStyles[stay.nftStatus]}`}
                          >
                            {stay.nftStatus === "Minting" && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            {stay.nftStatus}
                          </span>
                          {stay.nftStatus === "Queued" && (
                            <Button
                              onClick={() => handleMintNFT(stay.id)}
                              variant="ghost"
                              className="rounded-full border border-black/12 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-800 hover:bg-[#EDE4CB]"
                            >
                              Mint NFT
                            </Button>
                          )}
                          {stay.nftStatus === "Minted" && stay.nftCode && (
                            <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                              Code: {stay.nftCode}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableCaption className="pt-6 text-left text-xs uppercase tracking-[0.28em] text-neutral-500">
                Snapshot of on-chain stay settlements · Updated hourly
              </TableCaption>
            </Table>
          </section>
        </div>
      </main>

      <HotelDetailsDialog
        open={isHotelDialogOpen}
        onOpenChange={setIsHotelDialogOpen}
        initialValues={hotelDetails}
        onSubmit={handleHotelDetailsSubmit}
        title="Edit hotel listing"
        submitLabel="Save changes"
      />

      <Dialog open={!!activeStay} onOpenChange={(open) => (open ? null : closeCheckInDialog())}>
        <DialogContent className="max-w-lg rounded-3xl border-black/10 bg-[#F6F1DF] p-8">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-semibold uppercase tracking-[0.24em] text-neutral-900">
              Complete Check-In
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-600">
              Capture the guest wallet and NFT confirmation to mark their arrival. Check-in time locks to the current system clock once saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="walletId" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Wallet Address
              </Label>
              <Input
                id="walletId"
                value={checkInForm.walletId}
                onChange={(event) =>
                  setCheckInForm((prev) => ({ ...prev, walletId: event.target.value }))
                }
                placeholder="0x..."
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nftCode" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                NFT Receipt Code
              </Label>
              <Input
                id="nftCode"
                value={checkInForm.nftCode}
                onChange={(event) =>
                  setCheckInForm((prev) => ({ ...prev, nftCode: event.target.value.toUpperCase() }))
                }
                placeholder="VR-XXXX"
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>
          <DialogFooter className="mt-8 flex flex-row justify-end gap-3">
            <Button
              onClick={closeCheckInDialog}
              variant="ghost"
              className="rounded-full border border-black/12 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700 hover:bg-[#EDE4CB]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckInSubmit}
              disabled={!checkInForm.walletId || !checkInForm.nftCode}
              className="rounded-full bg-black px-7 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-neutral-500"
            >
              Lock Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
