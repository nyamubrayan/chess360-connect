import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string }

export const ChessafariAIWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm Chessafari AI ♟️ Ask me anything about chess — openings, tactics, endgames, or this platform." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prompt?: string } | undefined;
      setOpen(true);
      if (detail?.prompt) setInput(detail.prompt);
    };
    window.addEventListener("open-chessafari-ai", handler);
    return () => window.removeEventListener("open-chessafari-ai", handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chessafari-ai", {
        body: { messages: next.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      setMessages([...next, { role: "assistant", content: data?.reply ?? "Sorry, no response." }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Hanging button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed right-4 top-1/2 -translate-y-1/2 z-40 group",
          "flex flex-col items-center gap-2"
        )}
        aria-label="Open Chessafari AI"
      >
        {/* String */}
        <div className="w-px h-16 bg-gradient-to-b from-transparent to-primary/60" />
        {/* Pendant */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/40 blur-xl animate-pulse" />
          <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform animate-[swing_3s_ease-in-out_infinite] origin-top">
            <Sparkles className="h-6 w-6" />
          </div>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-primary whitespace-nowrap">
            Chessafari AI
          </span>
        </div>
        <style>{`
          @keyframes swing {
            0%, 100% { transform: rotate(-6deg); }
            50% { transform: rotate(6deg); }
          }
        `}</style>
      </button>

      {/* Chat panel */}
      {open && (
        <Card className="fixed right-4 bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-50 w-[92vw] sm:w-96 h-[70vh] sm:h-[520px] flex flex-col shadow-2xl border-primary/30">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Chessafari AI</h3>
                <p className="text-[10px] text-muted-foreground">Chess-only assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about chess..."
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};
