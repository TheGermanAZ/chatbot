import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { conversations, messages } from "./db/schema";
import { eq } from "drizzle-orm";

interface ChatStorage {
  createConversation(title: string): Promise<string>;
  getConversation(id: string): Promise<Anthropic.MessageParam[]>;
  getConversations(): Promise<{ id: string; title: string }[]>;
  addMessageToConversation(
    id: string,
    message: Anthropic.MessageParam,
  ): Promise<void>;
}

export class PostgresStorage implements ChatStorage {
  async createConversation(title: string): Promise<string> {
    const short = title.slice(0, 50) + (title.length > 50 ? "..." : "");
    const result = await db
      .insert(conversations)
      .values({ title: short })
      .returning({ id: conversations.id });
    return result[0].id;
  }

  async getConversation(id: string): Promise<Anthropic.MessageParam[]> {
    const result = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, id));

    return result.map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    }));
  }

  async getConversations(): Promise<{ id: string; title: string }[]> {
    const result = await db
      .select({ id: conversations.id, title: conversations.title })
      .from(conversations);

    return result;
  }

  async addMessageToConversation(
    id: string,
    message: Anthropic.MessageParam,
  ): Promise<void> {
    const content =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);

    await db
      .insert(messages)
      .values({ conversationId: id, role: message.role, content });
  }
}
