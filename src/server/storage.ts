import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { conversations, messages } from "./db/schema";
import { and, eq } from "drizzle-orm";

// this is a ChatService
interface ChatStorage {
  createConversation(title: string, userId: string): Promise<string>;
  getConversation(
    id: string,
    userId: string,
  ): Promise<Anthropic.MessageParam[]>;
  getConversations(userId: string): Promise<{ id: string; title: string }[]>;
  addMessageToConversation(
    id: string,
    userId: string,
    message: Anthropic.MessageParam,
  ): Promise<void>;
}

export class PostgresStorage implements ChatStorage {
  async createConversation(title: string, userId: string): Promise<string> {
    const short = title.slice(0, 50) + (title.length > 50 ? "..." : "");
    const result = await db
      .insert(conversations)
      .values({ title: short, userId })
      .returning({ id: conversations.id });
    return result[0].id;
  }

  async getConversation(
    id: string,
    userId: string,
  ): Promise<Anthropic.MessageParam[]> {
    const result = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(eq(messages.conversationId, id), eq(conversations.userId, userId)),
      );

    return result.map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    }));
  }

  async getConversations(
    userId: string,
  ): Promise<{ id: string; title: string }[]> {
    const result = await db
      .select({ id: conversations.id, title: conversations.title })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    return result;
  }

  async addMessageToConversation(
    id: string,
    userId: string,
    message: Anthropic.MessageParam,
  ): Promise<void> {
    const owner = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));

    if (!owner.length) throw new Error("unauthorized");

    const content =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);

    await db
      .insert(messages)
      .values({ conversationId: id, role: message.role, content });
  }
}
