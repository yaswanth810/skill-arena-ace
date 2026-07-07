import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { doubtChat, explainQuestion } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export function DoubtChat({ questionId, userId }: { questionId: string; userId: string }) {
  const explainFn = useServerFn(explainQuestion);
  const chatFn = useServerFn(doubtChat);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs([]); setAiExplanation(null); setInput("");
    supabase.from("doubt_messages")
      .select("role,content").eq("user_id", userId).eq("question_id", questionId)
      .order("created_at").then(({ data }) => setMsgs((data ?? []) as Msg[]));
  }, [questionId, userId]);

  useEffect(() => { boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  const explain = async () => {
    setExplaining(true);
    try {
      const r = await explainFn({ data: { questionId } });
      setAiExplanation(r.explanation);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setExplaining(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const r = await chatFn({ data: { questionId, message: text } });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setMsgs((m) => m.slice(0, -1));
      setInput(text);
    }
    setBusy(false);
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> AI Tutor</div>
        {!aiExplanation && (
          <Button size="sm" variant="secondary" onClick={explain} disabled={explaining}>
            {explaining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Explain this answer"}
          </Button>
        )}
      </div>

      {aiExplanation && (
        <div className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3 whitespace-pre-wrap">{aiExplanation}</div>
      )}

      <div ref={boxRef} className="max-h-64 overflow-y-auto space-y-2 mb-3">
        {msgs.map((m, i) => (
          <div key={i} className={`text-sm rounded-lg p-2.5 ${m.role === "user" ? "bg-secondary ml-8" : "bg-primary/5 mr-8 whitespace-pre-wrap"}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> thinking…</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Ask a doubt about this question…"
          className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary"
        />
        <Button size="sm" onClick={send} disabled={busy || !input.trim()}><Send className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
