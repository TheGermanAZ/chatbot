import express from "express";
import ViteExpress from "vite-express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const client = new Anthropic({});

const history = new Map<string, Anthropic.MessageParam[]>();

app.use(express.json());

app.post("/chat", async (req, res) => {
  const { id, chat } = req.body;
  if (!chat) return res.status(400).send("missing chat field");

  const messages = history.get(id) ?? [];

  // Add the new user message to history
  const withUser = [...messages, { role: "user" as const, content: chat }];
  history.set(id, withUser);

  try {
    const message = await client.messages.create({
      max_tokens: 1024,
      messages: withUser,
      model: "claude-haiku-4-5-20251001",
    });

    const block = message.content[0];
    if (block.type === "text") {
      const withAssistant = [
        ...withUser,
        { role: "assistant" as const, content: block.text },
      ];
      history.set(id, withAssistant);
      res.send(block.text);
    } else {
      res.status(500).send("unexpected response format");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("failed to get response from claude");
  }
});

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
