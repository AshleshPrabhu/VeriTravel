"use client"

import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ethers } from "ethers";
import AnimatedButton from "@/components/AnimatedButton/AnimatedButton"
import { HotelDetailsDialog, type HotelDetails } from "@/components/HotelDetailsDialog"
import { useRole } from "@/context/role-context"

export default function LoginPage() {
  const navigate = useNavigate()
  const { setRole } = useRole()
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false)
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null)
const getMetaMaskProvider = () => {
  if (window.ethereum?.providers) {
    return (window.ethereum.providers as Array<{ isMetaMask?: boolean }>).find((p) => p.isMetaMask);
  }
  if (window.ethereum?.isMetaMask) return window.ethereum;
  return null;
};
  const handleUserLogin = useCallback(async () => {
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
                  decimals: 18,
                },
                blockExplorerUrls: ["https://hashscan.io/testnet"],
              },
            ],
          });
        } else throw switchError;
      }
    }

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    console.log("✅ Connected to MetaMask:", address);
    setRole("user");
    navigate("/dashboard");
  } catch (err) {
    console.error(err);
    alert("Failed to connect wallet");
  }
}, [navigate, setRole]);



  const handleHotelLogin = useCallback(() => {
    setHotelDialogOpen(true)
  }, [])

  const handleHotelSubmit = useCallback(
    (details: HotelDetails) => {
      setHotelDetails(details)
      setRole("hotel")
      setHotelDialogOpen(false)
      navigate("/hotel-ops")
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
          “I knew you’d come back. I’ve been waiting for you.”
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
