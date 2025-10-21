import { ArrowUpRight } from "lucide-react"
// @ts-ignore - AnimatedButton is a JS module without type declarations
import AnimatedButton from "@/components/AnimatedButton/AnimatedButton"

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-5 bg-black">
      {/* LEFT SECTION (1/3) */}
      <div className="bg-black text-white flex justify-center items-center p-10 md:p-16 relative lg:col-span-2">
        {/* Logo (Top Left) */}
        <div className="absolute top-10 left-10 flex items-center space-x-2">
          <span className="text-3xl font-extrabold tracking-tight leading-none">
            ✺ Trip<span className="text-gray-300">DAO</span>
          </span>
        </div>

        {/* Centered Block */}
        <div className="flex flex-col items-start">
          {/* Title */}
          <h1 className="md:text-5xl lg:text-7xl text-[#E7E3D5] text-left font-vogue tracking-tight leading-tight">
            WELCOME TO
            <br />
            TRIPDAO
          </h1>

          {/* Subheading */}
          <p className="text-gray-300/70 lg:text-2xl md:text-lg font-monster leading-relaxed max-w-sm text-left mt-4">
            Ready to explore? Choose your login to begin your journey.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-0 w-full max-w-xs mt-6 font-vogue">
            <AnimatedButton label="USER LOGIN" route="/connect" animate={false} />
            <AnimatedButton label="HOTEL LOGIN" route="/connect" animate={false} />
          </div>
        </div>
      </div>

      {/* RIGHT SECTION (2/3) */}
      <div className="bg-[#E7E3D5] m-2 relative hidden lg:flex flex-col justify-end items-center overflow-hidden rounded-l-[2rem] lg:col-span-3">
        <blockquote className="text-black text-2xl font-medium max-w-md mb-12 border-l-2 border-black text-left pl-4">
          “I knew you’d come back. I’ve been waiting for you.”
        </blockquote>
        <img
          src="/assets/image/Login.png"
          alt="TripDAO Illustration"
          className="object-contain w-auto lg:mb-2 pb-2"
        />
      </div>
    </div>
  )
}
