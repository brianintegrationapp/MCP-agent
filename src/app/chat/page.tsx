"use client";

import React, { useState } from "react";

type Message = {
  role: "user" | "assistant" | "function";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I can call MCP-based tools if needed." },
  ]);
  const [userInput, setUserInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const text = userInput.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setUserInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/mcp-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text, history: messages }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newMsgs: Message[] = data.newMessages;
      setMessages((prev) => [...prev, ...newMsgs]);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">MCP Chat</h1>
      <div className="border p-3 bg-white h-64 overflow-y-auto">
        {messages.map((m, idx) => (
          <div key={idx} className="mb-2">
            <b>{m.role === "assistant" ? "AI" : m.role}:</b> {m.content}
          </div>
        ))}
      </div>
      {error && <p className="text-red-500">Error: {error}</p>}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Ask me anything..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
