"use client"
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "ai";
  content: string;
}

const ChatBubble = ({ message }: { message: Message }) => {
  return (
    <div
      className={cn(
        "max-w-[75%] px-4 py-2 rounded-2xl shadow-sm mb-4",
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
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    // Simulate AI reply
    setTimeout(() => {
      const aiResponse: Message = {
        role: "ai",
        content: `AI says: "${newMessage.content}"`
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-50">
      <Card className="flex flex-col flex-1 max-w-2xl w-full mx-auto">
        <CardContent className="flex flex-col flex-1 p-4 overflow-hidden">
          <ScrollArea className="flex-1 overflow-y-auto pr-2">
            <div className="flex flex-col">
              {messages.map((msg, idx) => (
                <ChatBubble key={idx} message={msg} />
              ))}
            </div>
          </ScrollArea>

          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
