import { describe, it, expect } from "vitest";
import { PostgresStorage } from "../../src/server/storage";

describe("PostgresStorage", () => {
  it("creates a conversation and returns a unique id", async () => {
    const storage = new PostgresStorage();
    const id = await storage.createConversation("first chat");
    const id2 = await storage.createConversation("second chat");
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id).not.toBe(id2);
  });

  it("get conversation returns empty array for new conversation", async () => {
    const storage = new PostgresStorage();
    const id = await storage.createConversation("empty chat");
    expect(await storage.getConversation(id)).toEqual([]);
  });

  it("addMessageToConversation stores messages and returns messages", async () => {
    const storage = new PostgresStorage();
    const id = await storage.createConversation("test chat");
    await storage.addMessageToConversation(id, {
      content: "how are you",
      role: "user",
    });

    expect(await storage.getConversation(id)).toEqual([
      { content: "how are you", role: "user" },
    ]);
  });

  it("getConversation returns empty array for unknown id", async () => {
    const storage = new PostgresStorage();
    const id = crypto.randomUUID();
    expect(await storage.getConversation(id)).toEqual([]);
  });
});
