import express from "express";
import ViteExpress from "vite-express";
import Anthropic from "@anthropic-ai/sdk";
import { PostgresStorage } from "./storage";

const app = express();
const client = new Anthropic({});

const history = new PostgresStorage();

app.use(express.json());

app.post("/chat", async (req, res) => {
  const { id, chat } = req.body;
  if (!chat) return res.status(400).send("missing chat field");

  // Create a new conversation if no id provided
  const conversationId = id ?? (await history.createConversation());

  await history.addMessageToConversation(conversationId, {
    role: "user",
    content: chat,
  });
  const messages = await history.getConversation(conversationId);

  try {
    const message = await client.messages.create({
      max_tokens: 1024,
      messages,
      model: "claude-haiku-4-5-20251001",
    });

    const block = message.content[0];
    if (block.type === "text") {
      await history.addMessageToConversation(conversationId, {
        role: "assistant",
        content: block.text,
      });
      res.json({ id: conversationId, text: block.text });
    } else {
      res.status(500).send("unexpected response format");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("failed to get response from claude");
  }
});

app.get("/chats", async (_req, res) => {
  res.json(await history.getConversations());
});

app.get("/chat/:id", async (req, res) => {
  const messages = await history.getConversation(req.params.id);
  if (!messages.length)
    return res.status(400).json({ error: "chat not found" });
  res.json(messages);
});

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
