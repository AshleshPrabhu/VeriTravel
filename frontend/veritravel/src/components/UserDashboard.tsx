"use client"

import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRight, DollarSign, MapPin, Star } from "lucide-react"

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
}

const myBookings: StayDetails[] = [
  {
    name: "Luxury Beach Resort",
    price: 250,
    location: "Maldives",
    rating: 4.8,
    size: "400 sq feet",
    rooms: "2BHK",
    feature: "Infinity Pool",
    description: "Sun-drenched suites overlooking crystal-clear waters with private deck access.",
  },
  {
    name: "Mountain Retreat Hotel",
    price: 180,
    location: "Swiss Alps",
    rating: 4.6,
    size: "320 sq feet",
    rooms: "Loft",
    feature: "Fireplace",
    description: "Warm timber interiors and sweeping alpine views ideal for a cozy getaway.",
  },
]

const topDestinations: StayDetails[] = [
  {
    name: "Paradise Island Resort",
    price: 320,
    location: "Bora Bora",
    rating: 4.9,
    size: "450 sq feet",
    rooms: "Water Villa",
    feature: "Sun Deck",
    description: "Glass-bottom villas suspended above turquoise lagoons with 24/7 butler service.",
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
  },
]

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  consent: z.boolean(),
})

const shippingSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  location: z.string().min(1, "Select a location"),
  note: z.string().max(160, "Keep notes short").optional(),
})

type RegisterFormValues = z.infer<typeof registerSchema>
type ShippingFormValues = z.infer<typeof shippingSchema>

export default function UserDashboard() {
  const curatedHotels = [...myBookings, ...topDestinations]
  const [selectedHotel, setSelectedHotel] = useState<StayDetails | null>(curatedHotels[0] ?? null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [registerOpen, setRegisterOpen] = useState(false)
  const [shippingOpen, setShippingOpen] = useState(false)

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      consent: false,
    },
  })

  const shippingForm = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "",
      location: "",
      note: "",
    },
  })

  const handleRating = (hotelName: string, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [hotelName]: value,
    }))
  }

  const handleRegisterSubmit: SubmitHandler<RegisterFormValues> = (values) => {
    console.log("register", values)
    registerForm.reset()
    setRegisterOpen(false)
  }

  const handleShippingSubmit: SubmitHandler<ShippingFormValues> = (values) => {
    console.log("shipping", values)
    shippingForm.reset()
    setShippingOpen(false)
  }

  if (!selectedHotel) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#EDE7D6] text-neutral-900">
      <main className="px-4 pb-20 pt-32 md:px-10">
        <div className="mx-auto flex w-full flex-col gap-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <section className="rounded-[40px] border border-black/10 bg-[#DCD5C3] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="relative">
                  <div className="relative h-72 overflow-hidden rounded-[34px] border border-black/10 bg-gradient-to-br from-[#D7D2BD] via-[#CFCAB4] to-[#D7D2BD]">
                    <div className="flex justify-center gap-3 px-4 pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
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

                    <div className="flex h-full items-center justify-center">
                      {selectedHotel.image ? (
                        <img
                          src={selectedHotel.image}
                          alt={selectedHotel.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-neutral-500">
                            //Image placeholder
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full border border-black/30 bg-[#F4EFE1] text-neutral-700 "
                      aria-label="Open detailed view"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-600">
                      Featured stay
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
                        Avg. nightly
                      </span>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-800">
                        <DollarSign className="h-4 w-4 text-neutral-600" />
                        {selectedHotel.price} ETH
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

                  <Button className="w-full rounded-full bg-black px-8 py-6 text-sm font-semibold uppercase tracking-[0.32em] text-white hover:bg-neutral-800">
                    Plan your stay
                  </Button>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-serif tracking-tight text-neutral-900">Explore more stays</h2>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                    Click an image to preview
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {curatedHotels.map((hotel, idx) => {
                    const isActive = hotel.name === selectedHotel.name
                    return (
                      <button
                        key={`${hotel.name}-${idx}`}
                        type="button"
                        onClick={() => setSelectedHotel(hotel)}
                        className={`group flex w-36 shrink-0 flex-col overflow-hidden rounded-[26px] border transition ${
                          isActive
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

            <aside className="flex flex-col gap-8">
              <section className="rounded-[36px] border border-black/12 bg-[#F3F0E4] p-6 shadow-[0_18px_34px_rgba(0,0,0,0.06)]">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-serif tracking-tight text-neutral-900">NFT&apos;s</h2>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/20 bg-white text-neutral-700">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex h-56 flex-col items-center justify-center rounded-[28px] border border-dashed border-black/20 bg-white/60 text-center">
                  <div className="text-5xl">🎨</div>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.3em] text-neutral-600">
                    Curated collection
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    Unlock travel perks via tokenized experiences.
                  </p>
                </div>
              </section>

              <section className="relative overflow-hidden rounded-[36px] border border-black/12 bg-[#F8F6EC] p-6 shadow-[0_18px_34px_rgba(0,0,0,0.05)]">
                <div className="absolute -top-12 right-6 w-48 rounded-[22px] border border-black/10 bg-white/95 p-4 text-xs font-medium text-neutral-800 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
                  <div className="absolute -bottom-3 right-8 h-4 w-7 rotate-12 rounded-br-[12px] border-b border-r border-black/10 bg-white/95" />
                </div>
                <div className="flex h-72 flex-col items-center justify-end gap-4">
                  <img
                    src="/assets/image/AI_Agent.png"
                    alt="Slofy travel concierge"
                    className="h-62 w-auto max-w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
                  />
                  <div className="text-center text-sm font-medium text-neutral-600">
                    Relax and stretch - Slofy keeps your itinerary on track.
                  </div>
                </div>
                <div className="absolute -bottom-3 right-8 text-3xl text-neutral-500">+</div>
                <div className="absolute -bottom-8 right-3 text-4xl text-neutral-500">.</div>
              </section>
            </aside>
          </div>

          <section className="rounded-[36px] border border-black/12 bg-white/70 p-7 shadow-[0_18px_38px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-serif tracking-tight text-neutral-900">My bookings</h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                Tap the stars to rate your stay
              </span>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {myBookings.map((booking, idx) => {
                const activeRating = ratings[booking.name] ?? 0
                return (
                  <div
                    key={`${booking.name}-${idx}`}
                    className="flex h-full flex-col justify-between rounded-[28px] border border-black/12 bg-[#F6F1E0] p-6 shadow-[0_12px_24px_rgba(0,0,0,0.06)]"
                  >
                    <div className="space-y-3">
                      <p className="text-lg font-serif tracking-tight text-neutral-900">{booking.name}</p>
                      <p className="text-xs uppercase tracking-[0.28em] text-neutral-600">{booking.location}</p>
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                        <MapPin className="h-4 w-4 text-neutral-600" />
                        {booking.rooms} · {booking.size}
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-700">
                        {booking.price} ETH
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={`${booking.name}-rate-${value}`}
                            type="button"
                            className="rounded-full p-1 transition hover:scale-110"
                            onClick={() => handleRating(booking.name, value)}
                            aria-label={`Rate ${booking.name} ${value} star${value > 1 ? "s" : ""}`}
                            title={`Rate ${value}`}
                          >
                            <Star
                              className={`h-5 w-5 ${
                                value <= activeRating
                                  ? "fill-[#E2BA67] text-[#E2BA67]"
                                  : "text-neutral-400"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="relative">
            <div className="relative grid gap-10 lg:grid-cols-2">
              <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                <DialogTrigger asChild>
                  <div className="cursor-pointer rounded-[32px] border border-black/12 bg-white/70 p-7 shadow-[0_22px_38px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_26px_44px_rgba(0,0,0,0.12)]">
                    <h3 className="text-xl font-serif tracking-tight text-neutral-900">Register</h3>
                    <p className="mt-3 text-sm text-neutral-600">
                      Unlock member-only discounts and NFT drops.
                    </p>
                    <Button
                      type="button"
                      className="mt-7 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white hover:bg-neutral-800"
                    >
                      Open form
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-[32px] border border-black/12 bg-[#F7F3E5] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.18)]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-serif tracking-tight text-neutral-900">
                      Join TripDAO
                    </DialogTitle>
                    <DialogDescription className="text-sm text-neutral-600">
                      Complete the form to reserve NFT-powered perks.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
                      className="mt-6 space-y-6"
                    >
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Value"
                                className="mt-2 rounded-2xl border border-black/12 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                              Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Value"
                                className="mt-2 rounded-2xl border border-black/12 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="consent"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-black/20 bg-white/60 px-4 py-3">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded border border-black/30"
                                  checked={field.value}
                                  onChange={(event) => field.onChange(event.target.checked)}
                                />
                              </FormControl>
                              <div className="text-xs text-neutral-600">
                                <span className="block font-semibold uppercase tracking-[0.28em] text-neutral-700">
                                  Label
                                </span>
                                Description
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button className="w-full rounded-2xl bg-black px-8 py-3 text-sm font-semibold uppercase tracking-[0.32em] text-white hover:bg-neutral-800">
                        Register
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={shippingOpen} onOpenChange={setShippingOpen}>
                <DialogTrigger asChild>
                  <div className="cursor-pointer rounded-[32px] border border-black/12 bg-white/80 p-7 shadow-[0_22px_38px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_26px_44px_rgba(0,0,0,0.12)]">
                    <h3 className="text-xl font-serif tracking-tight text-neutral-900">Shipping information</h3>
                    <p className="mt-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
                      We ship within 2 working days
                    </p>
                    <Button
                      type="button"
                      className="mt-7 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white hover:bg-neutral-800"
                    >
                      Open form
                    </Button>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-[32px] border border-black/12 bg-[#F4F0E2] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.18)]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-serif tracking-tight text-neutral-900">
                      Shipping details
                    </DialogTitle>
                    <DialogDescription className="text-sm text-neutral-600">
                      Provide your delivery preferences so we can send merch your way.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...shippingForm}>
                    <form
                      onSubmit={shippingForm.handleSubmit(handleShippingSubmit)}
                      className="mt-6 space-y-6"
                    >
                      <FormField
                        control={shippingForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                              Full name
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Value"
                                className="mt-2 rounded-2xl border border-black/12 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={shippingForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                              Location
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="mt-2 w-full rounded-2xl border border-black/12 bg-white px-4 py-3 text-sm text-neutral-800">
                                  <SelectValue placeholder="Value" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-2xl border border-black/12 bg-white/95">
                                <SelectItem value="maldives">Maldives</SelectItem>
                                <SelectItem value="tokyo">Tokyo</SelectItem>
                                <SelectItem value="bali">Bali</SelectItem>
                                <SelectItem value="bora-bora">Bora Bora</SelectItem>
                                <SelectItem value="swiss-alps">Swiss Alps</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={shippingForm.control}
                        name="note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                              Delivery note
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                rows={3}
                                placeholder="Value"
                                className="mt-2 rounded-2xl border border-black/12 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button className="w-full rounded-2xl bg-black px-8 py-3 text-sm font-semibold uppercase tracking-[0.32em] text-white hover:bg-neutral-800">
                        Submit details
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
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
                TripDAO perks
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
