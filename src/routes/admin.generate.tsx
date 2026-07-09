import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generateQuestions } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/generate")({ component: AdminGeneratePage });

type Topic = { id: string; name: string; category: string };
type Preview = { question: string; options: string[]; correct_answer: number; explanation: string | null };

function AdminGeneratePage() {
  const { isAdmin, loading } = useAuth();
  const gen = useServerFn(generateQuestions);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(5);
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview[]>([]);
  const [lastCount, setLastCount] = useState(0);

  useEffect(() => {
    supabase.from("topics").select("id,name,category").order("name").then(({ data }) => setTopics(data ?? []));
  }, []);

  if (loading || !isAdmin) return null;

  const run = async () => {
    if (!topicId) return toast.error("Pick a topic");
    setBusy(true); setPreview([]);
    try {
      const r = await gen({ data: { topicId, difficulty, count, company } });
      setLastCount(r.inserted);
      setPreview(r.preview as Preview[]);
      toast.success(`${r.inserted} questions added to the bank`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    }
    setBusy(false);
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" /> AI Question Generator
      </h1>
      <p className="text-muted-foreground mb-8">Auto-generate placement-style MCQs for any topic. Admin only.</p>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit">
          <div>
            <Label>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
              <SelectContent>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} <span className="text-xs text-muted-foreground">({t.category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Count (1–10)</Label>
              <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Company tag (optional)</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="TCS, Infosys, Wipro…" />
          </div>
          <Button className="w-full" onClick={run} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate & save</>}
          </Button>
          <p className="text-xs text-muted-foreground">
            Generated questions are inserted into the question bank and are immediately available in practice and mocks.
          </p>
        </div>

        <div>
          <div className="font-semibold mb-2">
            {lastCount > 0 ? `Preview — ${lastCount} saved` : "Preview appears here after generation"}
          </div>
          <div className="space-y-3">
            {preview.map((q, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="text-sm font-medium mb-2">{i + 1}. {q.question}</div>
                <ul className="text-sm space-y-1 mb-2">
                  {q.options.map((o, j) => (
                    <li key={j} className={j === q.correct_answer ? "text-primary font-medium" : "text-muted-foreground"}>
                      {String.fromCharCode(65 + j)}) {o} {j === q.correct_answer && "✓"}
                    </li>
                  ))}
                </ul>
                {q.explanation && <div className="text-xs text-muted-foreground border-t border-border pt-2">{q.explanation}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
