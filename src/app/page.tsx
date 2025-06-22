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

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const ChatBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "relative max-w-[75%] px-4 py-3 rounded-2xl shadow mb-4 whitespace-pre-wrap",
        isUser
          ? "bg-blue-600 text-white self-end"
          : "bg-neutral-700 text-neutral-100 self-start border border-neutral-600"
      )}
    >
      {!isUser && (
        <span className="absolute -top-2 left-3 text-xs text-blue-400 font-semibold bg-neutral-900 px-1 rounded">
          AI
        </span>
      )}
      {message.content}
    </div>
  );
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [fileUploaded, setFileUploaded] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  const parsePDF = async (file: File) => {
    if (!window.pdfjsLib) {
      console.error("pdfjsLib not loaded yet.");
      return;
    }

    const fileReader = new FileReader();

    fileReader.onload = async function () {
      const typedarray = new Uint8Array(this.result as ArrayBuffer);
      try {
        const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: any) => (typeof item.str === "string" ? item.str : ""))
            .join(" ");
          fullText += `\n\nPage ${i}:\n${pageText}`;
        }

        setPdfText(fullText);
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: `📄 Uploaded PDF: ${file.name}`,
          },
        ]);
      } catch (error) {
        console.error("PDF parsing error:", error);
      }
    };

    fileReader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setFileUploaded(file);
      parsePDF(file);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const typingIndicator: Message = { role: "ai", content: "Typing..." };
    setMessages((prev) => [...prev, typingIndicator]);

    const userFullMessage = `${input}\n\n[Context from uploaded PDF]\n${pdfText}`;

    const geminiMessages: GeminiMessage[] = [
      ...messages.filter((msg) => msg.content !== "Typing..."),
      { role: "user", content: userFullMessage },
    ].map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
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
    <div className="flex flex-col items-center h-screen p-4 bg-neutral-900 text-neutral-100 transition-colors duration-300">
      <h1 className="text-3xl font-bold mb-4 text-white">Ask AI</h1>

      <Card className="flex flex-col w-full max-w-2xl h-full bg-neutral-800 text-neutral-100 border border-neutral-700">
        <CardContent className="flex flex-col flex-1 p-4 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-2">
              <div className="flex flex-col">
                {messages.map((msg, idx) => (
                  <ChatBubble key={idx} message={msg} />
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="file:bg-neutral-700 file:text-white file:border-none"
            />
            {fileUploaded && (
              <div className="text-sm text-neutral-400 mb-2 ml-2">
                📎 1 file uploaded: <strong>{fileUploaded.name}</strong>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="bg-neutral-700 text-white border-none"
              />
              <Button
                onClick={sendMessage}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {loading ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
