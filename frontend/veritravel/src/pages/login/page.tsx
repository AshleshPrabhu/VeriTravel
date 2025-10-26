"use client"

import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"

import AnimatedButton from "@/components/AnimatedButton/AnimatedButton"
import { HotelDetailsDialog, type HotelDetails, type HederaCredentials } from "@/components/HotelDetailsDialog"
import { useRole } from "@/context/role-context"

export default function LoginPage() {
  const navigate = useNavigate()
  const { setRole } = useRole()
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false)
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [progressMessage, setProgressMessage] = useState("")
  const [registrationError, setRegistrationError] = useState<string | null>(null)

  const handleUserLogin = useCallback(() => {
    setRole("user")
    navigate("/dashboard")
  }, [navigate, setRole])

  const handleHotelLogin = useCallback(() => {
    setHotelDialogOpen(true)
    setRegistrationError(null)
  }, [])

  const handleHotelSubmit = useCallback(
    async (details: HotelDetails, credentials: HederaCredentials) => {
      try {
        setIsRegistering(true)
        setRegistrationError(null)
        setProgressMessage("Registering hotel on blockchain...")
        
        // Store hotel details
        setHotelDetails(details)
        
        // Set role and navigate after successful registration
        setRole("hotel")
        setProgressMessage("Registration successful! Redirecting...")
        
        // Small delay to show success message
        setTimeout(() => {
          setHotelDialogOpen(false)
          navigate("/hotel-ops")
        }, 1000)
        
      } catch (error: any) {
        console.error("Hotel registration error:", error)
        setRegistrationError(error.message || "Failed to register hotel")
      } finally {
        setIsRegistering(false)
      }
    },
    [navigate, setRole]
  )

  return (
    <div className="grid min-h-screen bg-black lg:grid-cols-5">
      {/* LEFT SECTION (1/3) */}
      <div className="relative flex items-center justify-center bg-black p-10 text-white md:p-16 lg:col-span-2">
        {/* Logo (Top Left) */}
        <div className="absolute left-10 top-10 flex items-center space-x-2">
          <span className="text-3xl font-extrabold leading-none tracking-tight">
            ✺ Trip<span className="text-gray-300">DAO</span>
          </span>
        </div>

        {/* Centered Block */}
        <div className="flex flex-col items-start">
          {/* Title */}
          <h1 className="text-left font-vogue tracking-tight text-[#E7E3D5] leading-tight md:text-5xl lg:text-7xl">
            WELCOME TO
            <br />
            TRIPDAO
          </h1>

          {/* Subheading */}
          <p className="mt-4 max-w-sm text-left font-monster text-gray-300/70 leading-relaxed md:text-lg lg:text-2xl">
            Ready to explore? Choose your login to begin your journey.
          </p>

          {/* Buttons */}
          <div className="mt-6 flex w-full max-w-xs flex-col gap-0 font-vogue">
            <AnimatedButton label="USER LOGIN" onClick={handleUserLogin} />
            <AnimatedButton label="HOTEL LOGIN" onClick={handleHotelLogin} />
          </div>
        </div>
      </div>

      {/* RIGHT SECTION (2/3) */}
      <div className="relative m-2 hidden flex-col items-center justify-end overflow-hidden rounded-l-[2rem] bg-[#E7E3D5] lg:col-span-3 lg:flex">
        <blockquote className="mb-12 max-w-md border-l-2 border-black pl-4 text-left text-2xl font-medium text-black">
          "I knew you'd come back. I've been waiting for you."
        </blockquote>
        <img
          src="/assets/image/Login.png"
          alt="TripDAO Illustration"
          className="object-contain w-auto lg:mb-2 pb-2"
        />
      </div>

      <HotelDetailsDialog
        open={hotelDialogOpen}
        onOpenChange={setHotelDialogOpen}
        initialValues={hotelDetails ?? undefined}
        onSubmit={handleHotelSubmit}
        title="Provide hotel details"
        submitLabel="Enter hotel ops"
      />
    </div>
  )
}