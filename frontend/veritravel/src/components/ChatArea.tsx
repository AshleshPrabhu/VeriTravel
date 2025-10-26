import {
  Branch,
  BranchMessages,
} from "@/components/ai-elements/branch";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import { useEffect } from "react";
import { ethers } from "ethers";
import { Response } from "@/components/ai-elements/response";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import { X, Hotel, MapPin, Star, Wallet, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import agentService from "@/utils/agentService";
import type { UnifiedAgentResponse } from "@/utils/agentService";
import bookingEscrowContract from "@/contracts/BookingEscrow.json"

// Types
type MessageType = {
  key: string;
  from: "user" | "assistant";
  sources?: { href: string; title: string }[];
  versions: { id: string; content: string; agentResponse?: UnifiedAgentResponse; transactionData?: any }[];
  reasoning?: { content: string; duration: number };
  avatar: string;
  name: string;
};



interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails: {
    hotelId: string;
    hotelName: string;
    checkinUnix: number;
    checkoutUnix: number;
    totalValueWei: string;
  };
  onPaymentSuccess: (txHash: string) => void;
}

// Payment Modal Component
const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  bookingDetails,
  onPaymentSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const formatDate = (unixTimestamp: number) => {
    return new Date(unixTimestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateNights = () => {
    const nights = Math.ceil(
      (bookingDetails.checkoutUnix - bookingDetails.checkinUnix) / (1000 * 60 * 60 * 24)
    );
    return nights;
  };

  const getTotalInETH = () => {
    return ethers.formatEther(bookingDetails.totalValueWei);
  };

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      const ethereum = window.ethereum;
      if (!ethereum) {
        toast.error('MetaMask not found. Please install MetaMask to continue.');
        return;
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      const bookingescrow = new ethers.Contract(
        bookingEscrowContract.address,
        bookingEscrowContract.abi,
        signer
      )

      // TODO: Replace with your actual smart contract address and method
      const tx = await bookingescrow.bookHotel(
        bookingDetails.hotelId,
        bookingDetails.checkinUnix,
        bookingDetails.checkoutUnix,
        { value: bookingDetails.totalValueWei }
      )

      toast.loading('Processing payment...', { id: 'payment' });

      const receipt = await tx.wait();

      if (!receipt) {
        toast.error('Payment failed: no receipt returned', { id: 'payment' });
        return;
      }

      toast.success('Payment successful!', { id: 'payment' });
      onPaymentSuccess(receipt.hash);
      onClose();

    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.code === 4001) {
        toast.error('Payment cancelled by user');
      } else {
        toast.error(`Payment failed: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet size={24} />
            Confirm Booking
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Hotel className="text-blue-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {bookingDetails.hotelName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Hotel ID: {bookingDetails.hotelId}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium">Check-in</p>
                <p className="text-sm">{formatDate(bookingDetails.checkinUnix)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-700">
              <Calendar size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium">Check-out</p>
                <p className="text-sm">{formatDate(bookingDetails.checkoutUnix)}</p>
              </div>
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Nights</span>
                <span className="font-semibold">{calculateNights()} night(s)</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="text-green-600" size={20} />
                <span className="font-medium text-gray-700">Total Amount</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {getTotalInETH()} ETH
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {bookingDetails.totalValueWei} Wei
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-amber-800">
              This transaction will be processed on the Hedera network. Please ensure you
              have sufficient HBAR for gas fees.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet size={18} />
                  Pay with Wallet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Initial messages
const initialMessages: MessageType[] = [
  {
    key: nanoid(),
    from: "assistant",
    versions: [
      {
        id: nanoid(),
        content: "Welcome to VeriTravel! 🏨 I can help you search for hotels, answer questions about specific properties, or provide travel information. What would you like to know?",
      },
    ],
    avatar: "https://github.com/veritravel.png",
    name: "VeriTravel Agent",
  },
];

const suggestions = [
  "Show me hotels in Goa",
  "Find 5-star hotels under 2 ETH",
  "Tell me about Seaside Inn",
  "What's the best time to visit Bengaluru?",
];

// Hotel Card Component
const HotelCard = ({ hotel }: { hotel: any }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-3">
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1">
        <h3 className="font-semibold text-lg text-gray-900">{hotel.name}</h3>
        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
          <MapPin size={14} />
          <span>{hotel.location}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: hotel.stars }).map((_, i) => (
          <Star key={i} size={14} fill="#FFD700" stroke="#FFD700" />
        ))}
      </div>
    </div>
    
    <div className="flex items-center justify-between mt-3">
      <div className="text-sm">
        <span className="text-gray-600">Price: </span>
        <span className="font-semibold text-gray-900">
          {(parseFloat(hotel.pricePerNight) / 1e18).toFixed(4)} ETH/night
        </span>
      </div>
      {hotel.rating && (
        <div className="text-sm">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            ⭐ {hotel.rating}
          </span>
        </div>
      )}
    </div>
    
    {hotel.tags && hotel.tags.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-3">
        {hotel.tags.map((tag: string) => (
          <span
            key={tag}
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    )}
  </div>
);

// Agent Response Renderer
const AgentResponseRenderer = ({ 
  response, 
  onTriggerPayment
}: { 
  response: UnifiedAgentResponse;
  onTriggerPayment: (details: any) => void;
}) => {
  // Trigger payment modal when booking_confirmation is detected
  
  const getMetaMaskProvider = () => {
    if (window.ethereum?.providers) {
      return (window.ethereum.providers as Array<{ isMetaMask?: boolean }>).find((p) => p.isMetaMask);
    }
    if (window.ethereum?.isMetaMask) return window.ethereum;
    return null;
  };

  const [walletAddress, setWalletAddress] = useState<string|null>(null);
  const [bookingContract, setBookingContract] = useState<ethers.Contract | null>(null);

  
  const connectWallet = async()=>{
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
      setWalletAddress(address);

      const bookingescrow = new ethers.Contract(
        bookingEscrowContract.address,
        bookingEscrowContract.abi,
        signer
      )
      setBookingContract(bookingescrow);
      return bookingescrow;
        
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } 
  }

  const fn = async()=>{
    if (response.responseType === 'booking_confirmation' && (response.metadata as any)?.bookingDetails) {
      const details = (response.metadata as any)?.bookingDetails;
      // onTriggerPayment({
      //   hotelId: details.hotelId,
      //   hotelName: response.targetHotelName || 'Hotel',
      //   checkinUnix: details.checkinUnix,
      //   checkoutUnix: details.checkoutUnix,
      //   totalValueWei: details.totalValueWei,
      // });
      const bookingescrow = await connectWallet();
      console.log("Processing booking on-chain...", details , bookingescrow );
      console.log(details.totalValueWei *( details.checkoutUnix - details.checkinUnix) /86400000 );
      console.log({
        hotelId: BigInt(details.hotelId[details.hotelId.length -1]),  
        checkinUnix: (details.checkinUnix)/1000,
        checkoutUnix: (details.checkoutUnix)/1000,

      })
      const tx = await bookingescrow?.bookHotel(
        BigInt(details.hotelId[details.hotelId.length -1]),
        (details.checkinUnix)/1000,
        (details.checkoutUnix)/1000,
        { value: (details.totalValueWei *( details.checkoutUnix - details.checkinUnix) /86400000).toString }
      )
      console.log("transaction sent:", tx);
      await tx.wait();

    }
  }

  useEffect(() => {
    // cast metadata to any because UnifiedAgentResponse.metadata doesn't statically include bookingDetails
    fn();
  }, [response, onTriggerPayment]);

  // For booking_confirmation, show a simpler message in chat
  if (response.responseType === 'booking_confirmation') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-gray-700 font-medium mb-2">
          🎉 Booking ready for {response.targetHotelName}!
        </p>
        <p className="text-sm text-gray-600">
          Please review the booking details in the payment modal and confirm with your wallet.
        </p>
      </div>
    );
  }

  if (response.responseType === 'hotel_search' && response.hotels && response.hotels.length > 0) {
    return (
      <div>
        <p className="mb-4 text-gray-700">{response.message}</p>
        <div className="grid gap-3">
          {response.hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
        {response.metadata?.suggestedActions && (
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">You can:</p>
            <ul className="list-disc list-inside">
              {response.metadata.suggestedActions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return <p className="text-gray-700 whitespace-pre-line">{response.message}</p>;
};

// Main Component
const IntegratedChatArea = () => {
  const [walletAddress, setWalletAddress] = useState<string|null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    details: {
      hotelId: string;
      hotelName: string;
      checkinUnix: number;
      checkoutUnix: number;
      totalValueWei: string;
    } | null;
  }>({
    isOpen: false,
    details: null,
  });
  
  const getMetaMaskProvider = () => {
    if (window.ethereum?.providers) {
      return (window.ethereum.providers as Array<{ isMetaMask?: boolean }>).find((p) => p.isMetaMask);
    }
    if (window.ethereum?.isMetaMask) return window.ethereum;
    return null;
  };
  
  const connectWallet = async()=>{
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
      setWalletAddress(address);
      console.log("Wallet connected:", address);
      toast.success(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet");
    } 
  }

  useEffect(()=>{
    connectWallet()
  },[])

  const [text, setText] = useState("");
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stop = useCallback(() => {
    setStatus("ready");
    setCurrentStreamingId(null);
  }, []);

  const addUserMessage = useCallback((content: string) => {
    const userMessage: MessageType = {
      key: nanoid(),
      from: "user",
      versions: [{ id: nanoid(), content }],
      avatar: "https://github.com/haydenbleasel.png",
      name: "You",
    };

    setMessages((prev) => [...prev, userMessage]);
    return userMessage.key;
  }, []);

  const handleTriggerPayment = useCallback((details: any) => {
    setPaymentModal({
      isOpen: true,
      details,
    });
  }, []);

  const handlePaymentSuccess = useCallback(async (txHash: string) => {
    toast.success(`Booking confirmed! Transaction: ${txHash.slice(0, 10)}...`);
    
    // Add confirmation message to chat
    const confirmMessage: MessageType = {
      key: nanoid(),
      from: "assistant",
      versions: [{
        id: nanoid(),
        content: `✅ Payment successful!\n\nTransaction Hash: ${txHash}\n\nYour booking is confirmed. You'll receive a confirmation email shortly with all the details.`
      }],
      avatar: "https://github.com/veritravel.png",
      name: "VeriTravel Agent",
    };
    
    setMessages((prev) => [...prev, confirmMessage]);
    setPaymentModal({ isOpen: false, details: null });
  }, []);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (status === "streaming") {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    if (!hasText) return;

    setStatus("submitted");
    
    addUserMessage(message.text!);
    setText("");

    const assistantMessageId = nanoid();
    const assistantMessage: MessageType = {
      key: nanoid(),
      from: "assistant",
      versions: [{ 
        id: assistantMessageId, 
        content: "Processing..." 
      }],
      avatar: "https://github.com/veritravel.png",
      name: "VeriTravel Agent",
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setCurrentStreamingId(assistantMessageId);
    setStatus("streaming");

    try {
      await agentService.sendMessage(
        message.text ?? "",
        (agentResponse, isFinal) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.versions.some((v) => v.id === assistantMessageId)
                ? {
                    ...msg,
                    versions: msg.versions.map((v) =>
                      v.id === assistantMessageId
                        ? { 
                            ...v, 
                            content: agentResponse.message,
                            agentResponse 
                          }
                        : v
                    ),
                  }
                : msg
            )
          );

          if (isFinal) {
            setStatus("ready");
            setCurrentStreamingId(null);
          }
        },
        (error) => {
          console.error("Agent error:", error);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.versions.some((v) => v.id === assistantMessageId)
                ? {
                    ...msg,
                    versions: msg.versions.map((v) =>
                      v.id === assistantMessageId
                        ? { 
                            ...v, 
                            content: `Error: ${error}` 
                          }
                        : v
                    ),
                  }
                : msg
            )
          );
          setStatus("error");
          setCurrentStreamingId(null);
          toast.error("Failed to get response from agent");
        }
      );
    } catch (error) {
      console.error("Submit error:", error);
      setStatus("error");
      setCurrentStreamingId(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex flex-col h-full min-h-0 w-full overflow-hidden bg-[#E7E3D5] text-black">
      {walletAddress && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-sm">
          <Wallet size={16} className="text-blue-600" />
          <span className="text-gray-700">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24">
        <Conversation>
          <ConversationContent>
            {messages.map(({ versions, ...message }) => (
              <Branch defaultBranch={0} key={message.key}>
                <BranchMessages>
                  {versions.map((version) => (
                    <Message
                      from={message.from}
                      key={`${message.key}-${version.id}`}
                    >
                      <div>
                        <MessageContent>
                          {version.agentResponse ? (
                            <AgentResponseRenderer 
                              response={version.agentResponse}
                              onTriggerPayment={handleTriggerPayment}
                            />
                          ) : (
                            <Response>{version.content}</Response>
                          )}
                        </MessageContent>
                      </div>
                      <MessageAvatar name={message.name} src={message.avatar} />
                    </Message>
                  ))}
                </BranchMessages>
              </Branch>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="shrink-0 bg-[#E7E3D5] border-t border-gray-400/20">
        <Suggestions className="px-4 pt-3 pb-1 overflow-x-auto flex-nowrap">
          {suggestions.map((suggestion) => (
            <Suggestion
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              suggestion={suggestion}
            />
          ))}
        </Suggestions>

        <div className="w-full px-4 pb-4">
          <PromptInput 
            className="bg-[#FDFCF5]/75 rounded-2xl" 
            onSubmit={handleSubmit}
          >
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(event) => setText(event.target.value)}
                ref={textareaRef}
                value={text}
                className="bg-[#FDFCF5]/75"
                placeholder="Ask about hotels, search, or get travel info..."
              />
            </PromptInputBody>

            <PromptInputFooter className="bg-[#FDFCF5]/75">
              <PromptInputTools className="bg-[#FDFCF5]/75">
                <PromptInputSpeechButton
                  onTranscriptionChange={setText}
                  textareaRef={textareaRef}
                />
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!text.trim() || status === "streaming"}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      {paymentModal.details && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={() => setPaymentModal({ isOpen: false, details: null })}
          bookingDetails={paymentModal.details}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default IntegratedChatArea;