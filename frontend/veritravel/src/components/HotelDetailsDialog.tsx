import { useEffect, useState, type ChangeEvent } from "react";
import { ethers } from "ethers";

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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import hotelRegistryContract from "@/contracts/HotelRegistry.json"

export type HotelDetails = {
  name: string;
  description: string;
  location: string;
  pricePerNight: string;
  tags: string;
  images: string;
  stars: string;
  totalRooms: string;
  phone: string;
  email: string;
};

export type HederaCredentials = {
  accountId: string;
  privateKey: string;
  bookingTopicId?: string; // Optional - auto-created during registration
  escrowContractId?: string; // Optional - uses platform escrow
};

type HotelDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: HotelDetails;
  initialCredentials?: HederaCredentials;
  onSubmit?: (values: HotelDetails, credentials: HederaCredentials) => void;
  title?: string;
  submitLabel?: string;
  isRegistering?: boolean;
  progressMessage?: string;
  registrationError?: string | null;
};

/**
 * Step 1: Register hotel on blockchain
 */
const getMetaMaskProvider = () => {
  if (window.ethereum?.providers) {
    return (window.ethereum.providers as Array<{ isMetaMask?: boolean }>).find((p) => p.isMetaMask);
  }
  if (window.ethereum?.isMetaMask) return window.ethereum;
  return null;
};
export async function registerHotelOnChain(details: HotelDetails) {
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
    
    const hotelRegistry = new ethers.Contract(
      hotelRegistryContract.address,
      hotelRegistryContract.abi,
      signer
    );

    const priceInWei = ethers.parseEther(details.pricePerNight);
    const stars = Math.round(parseFloat(details.stars));
    const totalRooms = parseInt(details.totalRooms);
    
    // Parse arrays and ensure they're never empty (provide default values)
    let tagsArray: string[] = [];
    if (details.tags && details.tags.trim().length > 0) {
      tagsArray = details.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    // If still empty, provide a default tag
    if (tagsArray.length === 0) {
      tagsArray = ["general"];
    }
    
    let imagesArray: string[] = [];
    if (details.images && details.images.trim().length > 0) {
      imagesArray = details.images.split(',').map(img => img.trim()).filter(img => img.length > 0);
    }
    // If still empty, provide a placeholder image URL
    if (imagesArray.length === 0) {
      imagesArray = ["https://via.placeholder.com/400x300?text=Hotel+Image"];
    }

    console.log("Registering hotel on-chain:", {
      name: details.name,
      location: details.location,
      pricePerNight: priceInWei.toString(),
      stars,
      totalRooms,
      tags: tagsArray,
      images: imagesArray,
      phone: details.phone,
      email: details.email,
    });

    const tx = await hotelRegistry.registerHotel(
      details.name,
      details.description,
      details.location,
      priceInWei,
      tagsArray,
      imagesArray,
      stars,
      totalRooms,
      details.phone,
      details.email
    );

    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Transaction confirmed");


  } catch (error: any) {
    console.error("On-chain registration failed:", error);
    
    if (error.code === 4001 || error.code === "ACTION_REJECTED") {
      throw new Error("Transaction rejected. Please approve to register your hotel.");
    }
    
    throw new Error(`Blockchain registration failed: ${error.message}`);
  }
}


const defaultHotelValues: HotelDetails = {
  name: "",
  description: "",
  location: "",
  pricePerNight: "",
  tags: "",
  images: "",
  stars: "",
  totalRooms: "",
  phone: "",
  email: "",
};

const defaultCredentials: HederaCredentials = {
  accountId: "",
  privateKey: "",
  // bookingTopicId and escrowContractId are auto-generated
};

export function HotelDetailsDialog({
  open,
  onOpenChange,
  initialValues,
  initialCredentials,
  onSubmit,
  title = "Hotel Registration",
  submitLabel = "Register Hotel",
  isRegistering = false,
  progressMessage = "",
  registrationError = null,
}: HotelDetailsDialogProps) {
  const [formValues, setFormValues] = useState<HotelDetails>(defaultHotelValues);
  const [credentials, setCredentials] = useState<HederaCredentials>(defaultCredentials);

  useEffect(() => {
    if (open) {
      setFormValues(initialValues ?? defaultHotelValues);
      setCredentials(initialCredentials ?? defaultCredentials);
    }
  }, [open, initialValues, initialCredentials]);

  const handleChange = (field: keyof HotelDetails) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { value } = event.target;
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };
  const getMetaMaskProvider = () => {
  if (window.ethereum?.providers) {
    return (window.ethereum.providers as Array<{ isMetaMask?: boolean }>).find((p) => p.isMetaMask);
  }
  if (window.ethereum?.isMetaMask) return window.ethereum;
  return null;
};

  const handleCredentialChange = (field: keyof HederaCredentials) => (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { value } = event.target;
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    // Prevent default form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const hotelPayload = {
      ...defaultHotelValues,
      ...formValues,
    };
    const credentialPayload = {
      ...defaultCredentials,
      ...credentials,
    };

    try {
      const ethereum = getMetaMaskProvider();
      if (!ethereum) {
        alert("Please install or enable MetaMask");
        return;
      }

      // First, ensure we're connected and on the right network
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
          } else {
            console.error("Network switch error:", switchError);
            throw switchError;
          }
        }
      }

      // Request accounts after network is correct
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      console.log("Connected account:", accounts[0]);
      
      // Actually register the hotel on-chain
      await registerHotelOnChain(hotelPayload);

      // Then call parent's onSubmit if provided
      onSubmit?.(hotelPayload, credentialPayload);
      
      // Success - close dialog
      onOpenChange(false);
    } catch (error: any) {
      console.error("Registration failed:", error);
      
      // More detailed error handling
      let errorMessage = "Failed to register hotel";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      }
      
      alert(errorMessage);
      // Don't close the dialog on error
    }
  };
  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!isRegistering) {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-black/10 bg-[#F6F1DF] p-8 shadow-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold uppercase tracking-[0.22em] text-neutral-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-600">
            Provide hotel details and your Hedera credentials to register on blockchain and create an AI agent.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="hotel" className="mt-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="hotel">Hotel Details</TabsTrigger>
            
          </TabsList>

          {/* HOTEL DETAILS TAB */}
          <TabsContent value="hotel" className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="hotel-name" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Hotel Name *
              </Label>
              <Input
                id="hotel-name"
                value={formValues.name}
                onChange={handleChange("name")}
                placeholder="Op Hotel"
                disabled={isRegistering}
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel-description" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Description *
              </Label>
              <Textarea
                id="hotel-description"
                value={formValues.description}
                onChange={handleChange("description")}
                placeholder="Best hotel in Karnataka with modern amenities..."
                disabled={isRegistering}
                className="min-h-[100px] rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel-location" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Location *
              </Label>
              <Input
                id="hotel-location"
                value={formValues.location}
                onChange={handleChange("location")}
                placeholder="Karnataka"
                disabled={isRegistering}
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hotel-price" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                  Price per Night (ETH) *
                </Label>
                <Input
                  id="hotel-price"
                  type="number"
                  step="0.01"
                  value={formValues.pricePerNight}
                  onChange={handleChange("pricePerNight")}
                  placeholder="1.5"
                  disabled={isRegistering}
                  className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel-stars" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                  Stars (1-5) *
                </Label>
                <Input
                  id="hotel-stars"
                  type="number"
                  min="1"
                  max="5"
                  value={formValues.stars}
                  onChange={handleChange("stars")}
                  placeholder="3"
                  disabled={isRegistering}
                  className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hotel-tags" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                  Tags (comma-separated)
                </Label>
                <Input
                  id="hotel-tags"
                  value={formValues.tags}
                  onChange={handleChange("tags")}
                  placeholder="luxury, pool, spa"
                  disabled={isRegistering}
                  className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel-images" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                  Image URLs (comma-separated)
                </Label>
                <Input
                  id="hotel-images"
                  value={formValues.images}
                  onChange={handleChange("images")}
                  placeholder="https://example.com/img1.jpg"
                  disabled={isRegistering}
                  className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel-rooms" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Total Rooms *
              </Label>
              <Input
                id="hotel-rooms"
                type="number"
                value={formValues.totalRooms}
                onChange={handleChange("totalRooms")}
                placeholder="234"
                disabled={isRegistering}
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hotel-phone" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                  Phone *
                </Label>
                <Input
                  id="hotel-phone"
                  type="tel"
                  value={formValues.phone}
                  onChange={handleChange("phone")}
                  placeholder="1234567899"
                  disabled={isRegistering}
                  className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel-email" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                  Email *
                </Label>
                <Input
                  id="hotel-email"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange("email")}
                  placeholder="ashlesh@gmail.com"
                  disabled={isRegistering}
                  className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
                />
              </div>
            </div>
          </TabsContent>

          {/* HEDERA CREDENTIALS TAB */}
          <TabsContent value="hedera" className="space-y-5 mt-6">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4">
              <p className="text-sm text-blue-900 font-medium">🔐 Your Hedera Credentials</p>
              <p className="text-xs text-blue-700 mt-1">
                Provide your Hedera account details. We'll automatically create a dedicated booking topic for your hotel.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hedera-account" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Hedera Account ID *
              </Label>
              <Input
                id="hedera-account"
                value={credentials.accountId}
                onChange={handleCredentialChange("accountId")}
                placeholder="0.0.12345678"
                disabled={isRegistering}
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
              />
              <p className="text-xs text-neutral-500">Format: 0.0.xxxxx (Get from portal.hedera.com)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hedera-key" className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                Hedera Private Key *
              </Label>
              <Input
                id="hedera-key"
                type="password"
                value={credentials.privateKey}
                onChange={handleCredentialChange("privateKey")}
                placeholder="302e020100300506032b657004220420..."
                disabled={isRegistering}
                className="h-12 rounded-2xl border-black/20 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 disabled:opacity-50"
              />
              <p className="text-xs text-neutral-500">Your private key for signing transactions</p>
            </div>

            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-900 font-medium">✅ Auto-Generated</p>
              <p className="text-xs text-green-700 mt-1">
                <strong>Booking Topic ID</strong> and <strong>Escrow Contract ID</strong> will be automatically configured during registration.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Progress Message */}
        {isRegistering && progressMessage && (
          <div className="mt-4 rounded-lg bg-blue-900/20 border border-blue-500/30 p-4">
            <p className="text-sm font-medium text-blue-900">
              {progressMessage}
            </p>
            <div className="mt-2 h-1 w-full bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {/* Error Message */}
        {registrationError && (
          <div className="mt-4 rounded-lg bg-red-900/20 border border-red-500/30 p-4">
            <p className="text-sm font-semibold text-red-900">Registration Failed</p>
            <p className="text-xs text-red-800 mt-1">{registrationError}</p>
          </div>
        )}

        <DialogFooter className="mt-8 flex flex-row justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isRegistering}
            className="rounded-full border border-black/12 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700 hover:bg-[#EDE4CB] disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isRegistering}
            className="rounded-full bg-black px-7 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegistering ? "Registering..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}