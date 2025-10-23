import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from "@/components/ai-elements/branch";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
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
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import { GlobeIcon } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { ToolUIPart } from "ai";
import { nanoid } from "nanoid";

// 🧠 Types
type MessageType = {
  key: string;
  from: "user" | "assistant";
  sources?: { href: string; title: string }[];
  versions: { id: string; content: string }[];
  reasoning?: { content: string; duration: number };
  tools?: {
    name: string;
    description: string;
    status: ToolUIPart["state"];
    parameters: Record<string, unknown>;
    result: string | undefined;
    error: string | undefined;
  }[];
  avatar: string;
  name: string;
};

// 💬 Initial messages
const initialMessages: MessageType[] = [
  {
    key: nanoid(),
    from: "assistant",
    versions: [
      {
        id: nanoid(),
        content: "Hey traveler! 👋 Ready to explore some AI insights?",
      },
    ],
    avatar: "https://github.com/openai.png",
    name: "OpenAI",
  },
];

// 🤖 Models + mock
const models = [
  { id: "gpt-4", name: "GPT-4" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "claude-2", name: "Claude 2" },
  { id: "mistral-7b", name: "Mistral 7B" },
];

const suggestions = [
  "Explain React hooks",
  "What is TailwindCSS?",
  "How to optimize React performance?",
  "Show an example of useEffect",
];

const mockResponses = [
  "That's a great question! Let me break it down for you...",
  "Good choice — here's how it works step by step...",
  "This concept is key in modern frontend dev — let’s explore it.",
];

// ✨ Component
const ChatArea = () => {
  const [model, setModel] = useState(models[0].id);
  const [text, setText] = useState("");
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const shouldCancelRef = useRef(false);
  const addMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stop = useCallback(() => {
    shouldCancelRef.current = true;
    if (addMessageTimeoutRef.current) {
      clearTimeout(addMessageTimeoutRef.current);
      addMessageTimeoutRef.current = null;
    }
    setStatus("ready");
    setStreamingMessageId(null);
  }, []);

  const streamResponse = useCallback(async (messageId: string, content: string) => {
    setStatus("streaming");
    setStreamingMessageId(messageId);
    shouldCancelRef.current = false;

    const words = content.split(" ");
    let currentContent = "";

    for (let i = 0; i < words.length; i++) {
      if (shouldCancelRef.current) {
        setStatus("ready");
        setStreamingMessageId(null);
        return;
      }

      currentContent += (i > 0 ? " " : "") + words[i];

      setMessages((prev) =>
        prev.map((msg) =>
          msg.versions.some((v) => v.id === messageId)
            ? {
                ...msg,
                versions: msg.versions.map((v) =>
                  v.id === messageId ? { ...v, content: currentContent } : v
                ),
              }
            : msg
        )
      );

      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 20));
    }

    setStatus("ready");
    setStreamingMessageId(null);
  }, []);

  const addUserMessage = useCallback(
    (content: string) => {
      const userMessage: MessageType = {
        key: `user-${Date.now()}`,
        from: "user",
        versions: [{ id: `user-${Date.now()}`, content }],
        avatar: "https://github.com/haydenbleasel.png",
        name: "You",
      };

      setMessages((prev) => [...prev, userMessage]);

      addMessageTimeoutRef.current = setTimeout(() => {
        const assistantMessageId = `assistant-${Date.now()}`;
        const randomResponse =
          mockResponses[Math.floor(Math.random() * mockResponses.length)];

        const assistantMessage: MessageType = {
          key: assistantMessageId,
          from: "assistant",
          versions: [{ id: assistantMessageId, content: "" }],
          avatar: "https://github.com/openai.png",
          name: "Assistant",
        };

        setMessages((prev) => [...prev, assistantMessage]);
        streamResponse(assistantMessageId, randomResponse);
        addMessageTimeoutRef.current = null;
      }, 600);
    },
    [streamResponse]
  );

  const handleSubmit = (message: PromptInputMessage) => {
    if (status === "streaming" || status === "submitted") {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) return;

    setStatus("submitted");

    if (message.files?.length) {
      toast.success("Files attached", {
        description: `${message.files.length} file(s) attached.`,
      });
    }

    addUserMessage(message.text || "Sent with attachments");
    setText("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setStatus("submitted");
    addUserMessage(suggestion);
  };

  return (
    <div
      className="
        relative flex flex-col
        h-full min-h-0 w-full
        overflow-hidden bg-[#E7E3D5]
        text-black
      "
    >
      {/* 💬 Scrollable Conversation Area */}
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
                        {message.sources?.length && (
                          <Sources>
                            <SourcesTrigger count={message.sources.length} />
                            <SourcesContent>
                              {message.sources.map((source) => (
                                <Source
                                  href={source.href}
                                  key={source.href}
                                  title={source.title}
                                />
                              ))}
                            </SourcesContent>
                          </Sources>
                        )}
                        {message.reasoning && (
                          <Reasoning duration={message.reasoning.duration}>
                            <ReasoningTrigger />
                            <ReasoningContent>
                              {message.reasoning.content}
                            </ReasoningContent>
                          </Reasoning>
                        )}
                        <MessageContent>
                          <Response>{version.content}</Response>
                        </MessageContent>
                      </div>
                      <MessageAvatar name={message.name} src={message.avatar} />
                    </Message>
                  ))}
                </BranchMessages>
                {versions.length > 1 && (
                  <BranchSelector from={message.from}>
                    <BranchPrevious />
                    <BranchPage />
                    <BranchNext />
                  </BranchSelector>
                )}
              </Branch>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* 🧠 Suggestions + Input (fixed bottom) */}
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
          <PromptInput className="bg-[#FDFCF5]/75 rounded-2xl" globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputBody >
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                onChange={(event) => setText(event.target.value)}
                ref={textareaRef}
                value={text}
                className="bg-[#FDFCF5]/75"
              />
            </PromptInputBody>

            <PromptInputFooter className="bg-[#FDFCF5]/75">
              <PromptInputTools className="bg-[#FDFCF5]/75">
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputSpeechButton
                  onTranscriptionChange={setText}
                  textareaRef={textareaRef}
                />
                <PromptInputButton
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  variant={useWebSearch ? "default" : "ghost"}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <PromptInputModelSelect onValueChange={setModel} value={model}>
                  <PromptInputModelSelectTrigger>
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  <PromptInputModelSelectContent>
                    {models.map((m) => (
                      <PromptInputModelSelectItem key={m.id} value={m.id}>
                        {m.name}
                      </PromptInputModelSelectItem>
                    ))}
                  </PromptInputModelSelectContent>
                </PromptInputModelSelect>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={(!text.trim() && !status) || status === "streaming"}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
