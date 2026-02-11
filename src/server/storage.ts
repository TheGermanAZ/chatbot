import Anthropic from "@anthropic-ai/sdk";

interface chatStorage {
  createConversation(): string;
  getConversation(id: string): Anthropic.MessageParam[];
  getConversations(): { id: string; title: string }[];
  addMessageToConversation(id: string, message: Anthropic.MessageParam): void;
}

export class InMemoryStorage implements chatStorage {
  private history = new Map<string, Anthropic.MessageParam[]>();

  createConversation(): string {
    const id = crypto.randomUUID();
    this.history.set(id, []);
    return id;
  }

  getConversation(id: string): Anthropic.MessageParam[] {
    return this.history.get(id) ?? [];
  }

  getConversations(): { id: string; title: string }[] {
    let chats: { id: string; title: string }[] = [];
    for (const [id, messages] of this.history) {
      const first = messages.find((message) => message.role === "user");
      const title =
        typeof first?.content === "string"
          ? first.content.slice(0, 100)
          : "New Chat";
      chats = [...chats, { id, title }];
    }
    return chats;
  }

  addMessageToConversation(id: string, message: Anthropic.MessageParam): void {
    const messages = this.history.get(id) ?? [];
    this.history.set(id, [...messages, message]);
  }
}
