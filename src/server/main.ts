import express from "express";
import ViteExpress from "vite-express";
import Anthropic from "@anthropic-ai/sdk";
import { InMemoryStorage } from "./storage";

const app = express();
const client = new Anthropic({});

const history = new InMemoryStorage();

app.use(express.json());

app.post("/chat", async (req, res) => {
  const { id, chat } = req.body;
  if (!chat) return res.status(400).send("missing chat field");

  // Add the new user message to history
  history.addMessageToConversation(id, { role: "user", content: chat });
  const messages = history.getConversation(id) ?? [];

  try {
    const message = await client.messages.create({
      max_tokens: 1024,
      messages: messages,
      model: "claude-haiku-4-5-20251001",
    });

    const block = message.content[0];
    if (block.type === "text") {
      history.addMessageToConversation(id, {
        role: "assistant",
        content: block.text,
      });
      res.send(block.text);
    } else {
      res.status(500).send("unexpected response format");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("failed to get response from claude");
  }
});

app.get("/chats", (_req, res) => {
  res.json(history.getConversations());
});

app.get("/chat/:id", (req, res) => {
  const messages = history.getConversation(req.params.id);
  if (!messages) return res.status(400).json({ error: "chat not found" });
  res.json(messages);
});

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
