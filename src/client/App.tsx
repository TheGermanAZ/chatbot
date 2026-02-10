import "./App.css";

import { useState } from "react";
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
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { InputGroupAddon } from "@/components/ui/input-group";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BotIcon } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const chatId = crypto.randomUUID();

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
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

      const data = await response.text();
      setMessages((prev) => [...prev, { role: "assistant", content: data }]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col max-w-2xl mx-auto">
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
          <ConversationScrollButton />
        </Conversation>

        <div className="p-4">
          <PromptInput
            onSubmit={({ text }) => sendMessage(text)}
          >
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

export default App;
