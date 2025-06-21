"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Role = "user" | "ai";

interface Message {
  role: Role;
  content: string;
}

type GeminiRole = "user" | "model";

interface GeminiMessage {
  role: GeminiRole;
  parts: { text: string }[];
}

interface GeminiAPIResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: "model";
    };
    finishReason: string;
  }[];
}

const ChatBubble = ({ message }: { message: Message }) => {
  return (
    <div
      className={cn(
        "max-w-[75%] px-4 py-2 rounded-2xl shadow-sm mb-4 whitespace-pre-wrap",
        message.role === "user"
          ? "bg-blue-500 text-white self-end"
          : "bg-gray-200 text-black self-start"
      )}
    >
      {message.content}
    </div>
  );
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const typingIndicator: Message = { role: "ai", content: "Typing..." };
    setMessages((prev) => [...prev, typingIndicator]);

    const geminiMessages: GeminiMessage[] = [...messages, userMessage]
      .filter((msg) => msg.content !== "Typing...")
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDMoA4RxpPDCTsPcn3uAcIBblS6n0KNYKE",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: geminiMessages }),
        }
      );

      const data: GeminiAPIResponse = await response.json();
      const aiText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        "AI could not respond.";

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", content: aiText },
      ]);
    } catch (error) {
      console.error("Gemini API error:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", content: "Failed to get response from AI." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="flex flex-col items-center h-screen p-4 bg-gray-50">
      <Card className="flex flex-col w-full max-w-2xl h-full">
        <CardContent className="flex flex-col flex-1 p-4 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col">
                {messages.map((msg, idx) => (
                  <ChatBubble key={idx} message={msg} />
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <Button onClick={sendMessage} disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
