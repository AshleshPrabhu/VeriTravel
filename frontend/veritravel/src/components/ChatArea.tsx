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
import { GlobeIcon, Hotel, MapPin, Star, Wallet } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import agentService from "@/utils/agentService";
import type { UnifiedAgentResponse } from "@/utils/agentService";

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

// Transaction Button Component
const TransactionButton = ({ 
  transactionData, 
  onSign 
}: { 
  transactionData: any;
  onSign: (signedTx: string) => void;
}) => {
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    try {
      setSigning(true);
      
      // Decode the base64 transaction
      const txBytes = Uint8Array.from(atob(transactionData.unsignedTxBase64), c => c.charCodeAt(0));
      
      // Get the provider
      const ethereum = window.ethereum;
      if (!ethereum) {
        toast.error("MetaMask not found");
        return;
      }

      // Request signature from wallet
      // Note: This is a simplified example. You'll need to adapt based on how Hedera transactions work
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // For Hedera, you might need to use a different signing method
      // This is a placeholder - adjust based on your actual Hedera integration
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [Array.from(txBytes).map(b => b.toString(16).padStart(2, '0')).join(''), account],
      });

      // Convert signature to base64
      const signedTxBase64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(signature))));
      
      toast.success("Transaction signed!");
      onSign(signedTxBase64);
      
    } catch (error: any) {
      console.error("Error signing transaction:", error);
      toast.error(`Failed to sign: ${error.message}`);
    } finally {
      setSigning(false);
    }
  };

  return (
    <button
      onClick={handleSign}
      disabled={signing}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors font-medium"
    >
      <Wallet size={18} />
      {signing ? "Signing..." : "Sign Transaction with Wallet"}
    </button>
  );
};

// Agent Response Renderer
const AgentResponseRenderer = ({ 
  response, 
  transactionData,
  onTransactionSigned 
}: { 
  response: UnifiedAgentResponse;
  transactionData?: any;
  onTransactionSigned?: (signedTx: string) => void;
}) => {
  // Check if response contains transaction data (base64 bytes)
  const hasTransaction = response.message.includes('base64 bytes:') || 
                         response.message.includes('unsignedTxBase64') ||
                         transactionData;

  if (hasTransaction && onTransactionSigned) {
    // Extract transaction data from message
    let txData = transactionData;
    if (!txData) {
      const base64Match = response.message.match(/`([A-Za-z0-9+/=]+)`/);
      if (base64Match) {
        txData = { unsignedTxBase64: base64Match[1] };
      }
    }

    return (
      <div>
        <p className="mb-4 text-gray-700">
          {response.responseType === 'booking_confirmation' 
            ? `Your booking at ${response.targetHotelName || 'the hotel'} is ready!`
            : response.message.split('base64 bytes:')[0].trim()
          }
        </p>
        
        {txData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              Please confirm and sign this transaction with your connected wallet to complete your booking.
            </p>
            <TransactionButton 
              transactionData={txData}
              onSign={onTransactionSigned}
            />
          </div>
        )}
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

  const handleTransactionSigned = useCallback(async (signedTxBase64: string, messageId: string) => {
    // Send the signed transaction back to the agent
    const confirmMessage = `Signed transaction: ${signedTxBase64}`;
    
    // Add user confirmation message
    addUserMessage("✅ Transaction signed");
    
    // Create placeholder for agent's confirmation response
    const confirmMessageId = nanoid();
    const confirmMessage2: MessageType = {
      key: nanoid(),
      from: "assistant",
      versions: [{ 
        id: confirmMessageId, 
        content: "Processing your signed transaction..." 
      }],
      avatar: "https://github.com/veritravel.png",
      name: "VeriTravel Agent",
    };

    setMessages((prev) => [...prev, confirmMessage2]);
    setStatus("streaming");

    // Send to agent
    try {
      await agentService.sendMessage(
        confirmMessage,
        (agentResponse, isFinal) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.versions.some((v) => v.id === confirmMessageId)
                ? {
                    ...msg,
                    versions: msg.versions.map((v) =>
                      v.id === confirmMessageId
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
            toast.success("Booking confirmed!");
          }
        },
        (error) => {
          console.error("Agent error:", error);
          toast.error("Failed to confirm booking");
          setStatus("error");
        }
      );
    } catch (error) {
      console.error("Error sending signed transaction:", error);
      toast.error("Failed to send signed transaction");
      setStatus("error");
    }
  }, [addUserMessage]);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (status === "streaming") {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    if (!hasText) return;

    setStatus("submitted");
    
    // Add user message
    addUserMessage(message.text!);
    setText("");

    // Create placeholder for assistant response
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

    // Send to agent
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
      {/* Wallet Status Bar */}
      {walletAddress && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-sm">
          <Wallet size={16} className="text-blue-600" />
          <span className="text-gray-700">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
      )}

      {/* Scrollable Conversation Area */}
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
                              transactionData={version.transactionData}
                              onTransactionSigned={(signedTx) => 
                                handleTransactionSigned(signedTx, version.id)
                              }
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

      {/* Suggestions + Input (fixed bottom) */}
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
    </div>
  );
};

export default IntegratedChatArea;