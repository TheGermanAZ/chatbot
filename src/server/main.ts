import express, { NextFunction, Request, Response } from "express";
import ViteExpress from "vite-express";
import Anthropic from "@anthropic-ai/sdk";
import { RLLM } from "rllm";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { PostgresStorage } from "./storage";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth";
import rateLimit from "express-rate-limit";

const app = express();
const client = new Anthropic({});

// rename to chatStorage and PostgresChatStorage
const history = new PostgresStorage();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, try again later" },
});

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session) return res.status(401).json({ error: "unauthorized" });
  res.locals.user = session.user;
  next();
};

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (_req, res) => res.locals.user.id,
  message: { error: "Too many requests, slow down" },
});

app.all("/api/auth/{*any}", authLimiter, toNodeHandler(auth));

app.use(express.json({ limit: "5mb" }));

app.post("/chat", requireAuth, chatLimiter, async (req, res) => {
  const { id, chat } = req.body;
  if (!chat) return res.status(400).send("missing chat field");
  if (chat.length > 10_000)
    return res
      .status(400)
      .json({ error: "message too long (max 10,000 characters)" });

  // Create a new conversation if no id provided
  const userId = res.locals.user.id;
  const conversationId = id ?? (await history.createConversation(chat, userId));

  await history.addMessageToConversation(conversationId, userId, {
    role: "user",
    content: chat,
  });
  const messages = await history.getConversation(conversationId, userId);

  try {
    const message = await client.messages.create({
      max_tokens: 1024,
      messages,
      model: "claude-haiku-4-5-20251001",
    });

    const block = message.content[0];
    if (block.type === "text") {
      await history.addMessageToConversation(conversationId, userId, {
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

app.get("/chats", requireAuth, async (_req, res) => {
  const userId = res.locals.user.id;
  res.json(await history.getConversations(userId));
});

app.get("/chat/:id", requireAuth, async (req, res) => {
  const userId = res.locals.user.id;
  const chatId = req.params.id as string;
  const messages = await history.getConversation(chatId, userId);
  if (!messages.length)
    return res.status(400).json({ error: "chat not found" });
  res.json(messages);
});

app.get("/rllm/example", requireAuth, async (_req, res) => {
  const schemaPath = path.resolve(
    import.meta.dirname,
    "../../drizzle/schema.ts",
  );
  const content = await readFile(schemaPath, "utf-8");

  res.json({
    context: `=== drizzle/schema.ts ===\n${content}`,
    question:
      "What tables exist and how are they related? Identify all foreign key relationships.",
  });
});

const RLLM_FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  "rllm-fixture.json",
);

type RecordedEvent = { delay: number; event: any }; // no any types!!!

async function replayEvents(res: Response) {
  const raw = await readFile(RLLM_FIXTURE_PATH, "utf-8");
  const events: RecordedEvent[] = JSON.parse(raw);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < events.length; i++) {
    if (i > 0) {
      const gap = events[i].delay - events[i - 1].delay;
      await sleep(gap);
    }
    res.write(`data: ${JSON.stringify(events[i].event)}\n\n`);
  }
  res.write(`data: [DONE]\n\n`);
  res.end();
}

app.post("/rllm", requireAuth, async (req, res) => {
  const isRecording =
    req.query.record === "true" && process.env.NODE_ENV !== "production";
  const hasFixture = existsSync(RLLM_FIXTURE_PATH);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Replay from fixture if available (and not recording)
  if (hasFixture && !isRecording) {
    await replayEvents(res);
    return;
  }

  // Live mode: call the real API
  const { context, question } = req.body;
  if (!context || !question)
    return res.status(400).json({ error: "missing context or question" });

  const recorded: RecordedEvent[] = [];
  const startTime = Date.now();

  const rlm = new RLLM({
    maxIterations: 2,
    client: {
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
  });

  try {
    const result = await rlm.completion(question, {
      context,
      onEvent: (event) => {
        const entry = { delay: Date.now() - startTime, event };
        if (isRecording) recorded.push(entry);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
    });

    const resultEvent = {
      type: "result",
      answer: result.answer,
      usage: result.usage,
      iterations: result.iterations,
    };
    const entry = { delay: Date.now() - startTime, event: resultEvent };
    if (isRecording) recorded.push(entry);
    res.write(`data: ${JSON.stringify(resultEvent)}\n\n`);
  } catch (error) {
    const errorEvent = {
      type: "error",
      message: error instanceof Error ? error.message : "unknown error",
    };
    const entry = { delay: Date.now() - startTime, event: errorEvent };
    if (isRecording) recorded.push(entry);
    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
  }

  if (isRecording && recorded.length > 0) {
    await writeFile(RLLM_FIXTURE_PATH, JSON.stringify(recorded, null, 2));
    console.log(
      `Recorded ${recorded.length} RLLM events to ${RLLM_FIXTURE_PATH}`,
    );
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);
