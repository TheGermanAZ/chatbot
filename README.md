# Chatbot

A full-stack AI chat application powered by Claude, with a recursive LLM (RLLM) demo for document analysis.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, React Router v7
- **Backend:** Express 5, vite-express, Bun runtime
- **AI:** Anthropic Claude API (Haiku 4.5), RLLM for recursive document analysis
- **Database:** Supabase Postgres via Drizzle ORM
- **Auth:** better-auth (email/password + GitHub OAuth)

## Features

- Chat with Claude Haiku — streaming responses with markdown rendering
- RLLM demo — paste a document, ask a question, watch the LLM recursively write and execute code to find the answer
- Authentication — email/password and social sign-in
- Per-user data isolation — each user sees only their own conversations
- Rate limiting — per-user limits on chat and auth endpoints

## Setup

```bash
git clone https://github.com/TheGermanAZ/chatbot.git
cd chatbot
bun install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Push the database schema and start the dev server:

```bash
bun db:push
bun dev
```

## Scripts

| Script          | Description                         |
| --------------- | ----------------------------------- |
| `bun dev`       | Start dev server with file watching |
| `bun run build` | Build frontend for production       |
| `bun start`     | Run production server               |
| `bun db:push`   | Push Drizzle schema to database     |
| `bun db:studio` | Open Drizzle Studio (database GUI)  |
| `bun db:reset`  | Reset database                      |
| `bun test`      | Run tests with Vitest               |
