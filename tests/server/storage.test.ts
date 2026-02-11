import { describe, it, expect } from "vitest";
import { InMemoryStorage } from "../../src/server/storage";

describe("InMemoryStorage", () => {
  it("creates a conversation and returns a unique id", () => {
    const storage = new InMemoryStorage();
    const id = storage.createConversation();
    const id2 = storage.createConversation();
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id).not.toBe(id2);
  });

  it("get conversation returns empty array for new conversation", () => {
    const storage = new InMemoryStorage();
    const id = storage.createConversation();
    expect(storage.getConversation(id)).toEqual([]);
  });

  it("addMessageToConversation stores messages and returns messages", () => {
    const storage = new InMemoryStorage();
    const id = storage.createConversation();
    storage.addMessageToConversation(id, {
      content: "how are you",
      role: "user",
    });

    expect(storage.getConversation(id)).toEqual([
      { content: "how are you", role: "user" },
    ]);
  });

  it("getconversations returns empty array for unknown id", () => {
    const storage = new InMemoryStorage();
    const id = crypto.randomUUID();
    expect(storage.getConversation(id)).toEqual([]);
  });
});
