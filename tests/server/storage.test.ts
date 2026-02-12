import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgresStorage } from "../../src/server/storage";
import { db } from "../../src/server/db";
import { user, conversations, messages } from "../../src/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

const storage = new PostgresStorage();

// Test users — inserted directly, bypassing better-auth
const userAId = nanoid();
const userBId = nanoid();
const createdConversationIds: string[] = [];

beforeAll(async () => {
  await db.insert(user).values([
    {
      id: userAId,
      name: "Test User A",
      email: `test-a-${userAId}@test.com`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: userBId,
      name: "Test User B",
      email: `test-b-${userBId}@test.com`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
});

afterAll(async () => {
  // Clean up in FK order: messages → conversations → users
  if (createdConversationIds.length) {
    await db
      .delete(messages)
      .where(inArray(messages.conversationId, createdConversationIds));
    await db
      .delete(conversations)
      .where(inArray(conversations.id, createdConversationIds));
  }
  await db.delete(user).where(eq(user.id, userAId));
  await db.delete(user).where(eq(user.id, userBId));
});

// Helper to track conversations for cleanup
async function createConversation(title: string, userId: string) {
  const id = await storage.createConversation(title, userId);
  createdConversationIds.push(id);
  return id;
}

describe("PostgresStorage", () => {
  it("creates a conversation and returns a unique id", async () => {
    const id = await createConversation("first chat", userAId);
    const id2 = await createConversation("second chat", userAId);
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id).not.toBe(id2);
  });

  it("getConversation returns empty array for new conversation", async () => {
    const id = await createConversation("empty chat", userAId);
    expect(await storage.getConversation(id, userAId)).toEqual([]);
  });

  it("addMessageToConversation stores and retrieves messages", async () => {
    const id = await createConversation("test chat", userAId);
    await storage.addMessageToConversation(id, userAId, {
      content: "how are you",
      role: "user",
    });

    expect(await storage.getConversation(id, userAId)).toEqual([
      { content: "how are you", role: "user" },
    ]);
  });

  it("getConversation returns empty array for unknown id", async () => {
    const id = crypto.randomUUID();
    expect(await storage.getConversation(id, userAId)).toEqual([]);
  });

  it("getConversations only returns the user's own conversations", async () => {
    await createConversation("userA visible", userAId);
    await createConversation("userB hidden", userBId);

    const result = await storage.getConversations(userAId);
    const titles = result.map((c) => c.title);

    expect(titles).toContain("userA visible");
    expect(titles).not.toContain("userB hidden");
  });
});

describe("authorization", () => {
  it("user cannot read another user's conversation", async () => {
    const id = await createConversation("private chat", userAId);
    await storage.addMessageToConversation(id, userAId, {
      content: "secret message",
      role: "user",
    });

    // userB tries to read userA's conversation
    const result = await storage.getConversation(id, userBId);
    expect(result).toEqual([]);
  });

  it("user cannot write to another user's conversation", async () => {
    const id = await createConversation("userA only", userAId);

    // userB tries to write to userA's conversation
    await expect(
      storage.addMessageToConversation(id, userBId, {
        content: "hacked",
        role: "user",
      }),
    ).rejects.toThrow("unauthorized");
  });
});
