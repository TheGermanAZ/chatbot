import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
  id: uuid().primaryKey().defaultRandom(),
  title: varchar().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid().references(() => conversations.id),
  role: varchar().notNull(),
  content: varchar().notNull(),
});

type SelectConversation = InferSelectModel<typeof conversations>;
type InsertConveration = InferInsertModel<typeof conversations>;

type SelectMessage = InferSelectModel<typeof messages>;
type InsertMessage = InferInsertModel<typeof messages>;
