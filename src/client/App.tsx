import "./App.css";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const chatId = crypto.randomUUID();

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) {
      console.log("missing chat field");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chatId, chat: input }),
      });

      const data = await response.text();

      if (!response.ok) {
        console.log("invalid response");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", content: input },
        { role: "assistant", content: data },
      ]);
      setInput("");
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="chat">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <strong>{msg.role === "user" ? "You" : "Claude"}</strong>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          rows={3}
        />
        <button
          onClick={sendMessage}
          onKeyDown={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
