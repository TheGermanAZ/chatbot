import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	messages: {
		conversation: r.one.conversations({
			from: r.messages.conversationId,
			to: r.conversations.id,
		}),
	},
	conversations: {
		messages: r.many.messages(),
	},
	user: {
		sessions: r.many.session(),
		accounts: r.many.account(),
	},
	session: {
		user: r.one.user({
			from: r.session.userId,
			to: r.user.id,
		}),
	},
	account: {
		user: r.one.user({
			from: r.account.userId,
			to: r.user.id,
		}),
	},
	verification: {},
}));
