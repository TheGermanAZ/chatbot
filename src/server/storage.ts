/// <reference types="bun-types" />
import Anthropic from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources";
import { Database } from "bun:sqlite";

const db = new Database();
db.run("PRAGMA journal_mode = WAL;");

const conversations = db.query(
  "create table if not exists conversations (id integer primary key autoincrement, title text not null)",
);
const messages = db.query(
  "create table if not exists messages(id integer primary key autoincrement, conversationId integer references conversations(id), role text not null, content text not null)",
);

conversations.run();
messages.run();
interface chatStorage {
  createConversation(): number | bigint;
  getConversation(id: number | bigint): Anthropic.MessageParam[];
  getConversations(): { id: string; title: string }[];
  addMessageToConversation(id: string, message: Anthropic.MessageParam): void;
}

export class SqlliteStorage implements chatStorage {
  private history = new Map<string, Anthropic.MessageParam[]>();

  createConversation(): number | bigint {
    const firstConversation = db.query(
      "insert into conversations (title) values ('new chat')",
    );
    const id = firstConversation.run();
    return id.lastInsertRowid;
  }

  getConversation(id: number | bigint): Anthropic.MessageParam[] {
    const getId = db
      .query(`select role, content from messages where conversationId = ?`)
      .all(id) as MessageParam[];

    return getId;
  }

  getConversations(): { id: string; title: string }[] {
    const rows = db
      .query<
        { id: number; title: string },
        []
      >("select id, title from conversations")
      .all();
    return rows.map((row) => ({ id: String(row.id), title: row.title }));
  }

  addMessageToConversation(id: string, message: Anthropic.MessageParam): void {
    const content =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);
    db.query(
      "insert into messages (conversationId, role, content) values (?, ?, ?)",
    ).run(Number(id), message.role, content);
  }
}
