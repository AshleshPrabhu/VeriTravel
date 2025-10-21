"use client";

import Header from "./Header/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowUpRight,
  ArrowUp,
  Edit3,
  Filter,
  Star,
} from "lucide-react";

export default function HotelDashboard() {
  const stays = [
    {
      walletId: "0x8a4c...c21b",
      checkIn: "12 Oct 2025",
      checkOut: "18 Oct 2025",
      amount: "1.20 ETH",
      nft: "Minted",
    },
    {
      walletId: "0x3b91...9fae",
      checkIn: "08 Oct 2025",
      checkOut: "11 Oct 2025",
      amount: "0.84 ETH",
      nft: "Pending",
    },
    {
      walletId: "0x57de...aa90",
      checkIn: "02 Oct 2025",
      checkOut: "05 Oct 2025",
      amount: "0.96 ETH",
      nft: "Minted",
    },
    {
      walletId: "0x24f8...7bc3",
      checkIn: "28 Sep 2025",
      checkOut: "01 Oct 2025",
      amount: "0.73 ETH",
      nft: "Queued",
    },
    {
      walletId: "0x91f4...0ccd",
      checkIn: "22 Sep 2025",
      checkOut: "27 Sep 2025",
      amount: "1.54 ETH",
      nft: "In Review",
    },
    {
      walletId: "0xad71...44e1",
      checkIn: "14 Sep 2025",
      checkOut: "18 Sep 2025",
      amount: "1.02 ETH",
      nft: "Minted",
    },
  ];

  const statusStyles: Record<string, string> = {
    Minted: "bg-[#E1F4E7] text-[#236A42] border-[#B8E4C7]",
    Pending: "bg-[#FFF6E5] text-[#A76B1F] border-[#F7D9A4]",
    Queued: "bg-[#E5F0FF] text-[#1F4AA7] border-[#B4D3FF]",
    "In Review": "bg-[#F0E9FF] text-[#5C36A8] border-[#D4C4FF]",
  };

  return (
    <div className="min-h-screen bg-[#EFEBD9] font-sans">
      <Header />

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
                >
                  <Edit3 className="h-4 w-4" />
                </button>

                <button
                  className="absolute bottom-25 right-10 flex h-12 w-12 items-center justify-center rounded-full border border-black/35 bg-[#F3F0E6] text-neutral-700"
                  aria-label="View details"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
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
                <span>Wallet Id</span>
                <Filter className="h-4 w-4 text-neutral-500" />
              </div>
              <div className="flex items-center gap-3">
                <Badge className="rounded-full bg-black px-5 py-2 text-xs font-semibold tracking-[0.2em] text-white">
                  ARRIVED
                </Badge>
                <Button className="rounded-full bg-[#1D80FF] px-7 py-5 text-xs font-semibold uppercase tracking-[0.24em] text-white hover:bg-[#196adb]">
                  Mint Now
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-black/20 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
                  <TableHead>Wallet Id</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead className="text-right">Amount Payable</TableHead>
                  <TableHead className="text-right">NFT Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stays.map((stay, index) => (
                  <TableRow
                    key={stay.walletId}
                    className={index % 2 === 0 ? "bg-white/60" : "bg-transparent"}
                  >
                    <TableCell className="font-medium tracking-wide text-neutral-900">
                      {stay.walletId}
                    </TableCell>
                    <TableCell className="text-neutral-700">{stay.checkIn}</TableCell>
                    <TableCell className="text-neutral-700">{stay.checkOut}</TableCell>
                    <TableCell className="text-right font-semibold text-neutral-900">
                      {stay.amount}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center justify-center rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusStyles[stay.nft] ?? "bg-white text-neutral-700 border-black/12"}`}
                      >
                        {stay.nft}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="pt-6 text-left text-xs uppercase tracking-[0.28em] text-neutral-500">
                Snapshot of on-chain stay settlements · Updated hourly
              </TableCaption>
            </Table>
          </section>
        </div>
      </main>
    </div>
  );
}
