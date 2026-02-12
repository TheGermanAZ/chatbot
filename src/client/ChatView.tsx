import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { InputGroupAddon } from "@/components/ui/input-group";
import { TooltipProvider } from "@/components/ui/tooltip";
import Anthropic from "@anthropic-ai/sdk";
import { BotIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";

type ChatMessage = { role: "user" | "assistant"; content: string };
type LayoutContext = { refreshChatList: () => Promise<void> };

export default function ChatView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshChatList } = useOutletContext<LayoutContext>();

  const [chatId, setChatId] = useState<string | undefined>(id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const getChat = async () => {
      const response = await fetch(`/chat/${id}`);

      if (!response.ok) {
        console.error("error fetching chat with id:", id);
      }

      const data = await response.json();

      setMessages(
        data.map((m: Anthropic.Messages.MessageParam) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : "",
        })),
      );
    };
    getChat();
  }, [id]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chatId, chat: text }),
      });

      if (!response.ok) {
        console.log("invalid response");
        return;
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
      if (!chatId) {
        setChatId(data.id);
        await refreshChatList();
        navigate(`/chat/${data.id}`, { replace: true });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <TooltipProvider>
      <div className="flex h-full flex-col max-w-2xl mx-auto w-full">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<BotIcon className="size-8" />}
                title="Chat with Claude"
                description="Ask me anything to get started"
              />
            ) : (
              messages.map((msg, i) => (
                <Message key={i} from={msg.role}>
                  <MessageContent>
                    {msg.role === "assistant" ? (
                      <MessageResponse>{msg.content}</MessageResponse>
                    ) : (
                      msg.content
                    )}
                  </MessageContent>
                </Message>
              ))
            )}
            {loading && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Thinking...</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton variant="default" />
        </Conversation>

        <div className="p-4">
          <PromptInput onSubmit={({ text }) => sendMessage(text)}>
            <PromptInputTextarea disabled={loading} />
            <InputGroupAddon align="inline-end">
              <PromptInputSubmit
                status={loading ? "submitted" : "ready"}
                disabled={loading}
              />
            </InputGroupAddon>
          </PromptInput>
        </div>
      </div>
    </TooltipProvider>
  );
}
