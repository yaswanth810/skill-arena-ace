import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminPage });

type Topic = { id: string; name: string; category: string; slug: string };
type QRow = { id: string; question: string; difficulty: string; topic_id: string; topics?: { name: string } | null };

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();


  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [company, setCompany] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [explanation, setExplanation] = useState("");

  const load = async () => {
    const { data: t } = await supabase.from("topics").select("id,name,category,slug").order("name");
    setTopics(t ?? []);
    const { data: q } = await supabase.from("questions").select("id,question,difficulty,topic_id,topics(name)").order("created_at", { ascending: false }).limit(50);
    setQuestions((q ?? []) as QRow[]);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicId) return toast.error("Pick a topic");
    if (options.some((o) => !o.trim())) return toast.error("Fill all 4 options");
    const { error } = await supabase.from("questions").insert({
      topic_id: topicId,
      difficulty: difficulty as "easy" | "medium" | "hard",
      company_tag: company || null,
      question,
      options,
      correct_answer: correct,
      explanation: explanation || null,
      created_by: user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Question added");
    setQuestion(""); setOptions(["", "", "", ""]); setCorrect(0); setExplanation(""); setCompany("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (loading || !isAdmin) return null;

  return (
    <>
      <h1 className="text-3xl font-bold mb-1">Admin — Question Bank</h1>
      <p className="text-muted-foreground mb-8">Add and manage practice questions.</p>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <form onSubmit={addQuestion} className="rounded-xl border border-border bg-card p-5 space-y-3 h-fit">
          <div className="font-semibold mb-2 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> New question</div>
          <div>
            <Label>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
              <SelectContent>
                {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-xs text-muted-foreground">({t.category})</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Company tag</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="TCS, Infosys…" />
            </div>
          </div>
          <div>
            <Label>Question</Label>
            <Textarea rows={3} required value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setCorrect(i)}
                className={`h-8 w-8 rounded-full border shrink-0 text-xs font-semibold flex items-center justify-center transition
                  ${correct === i ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                title="Mark as correct"
              >{String.fromCharCode(65 + i)}</button>
              <Input
                required
                value={opt}
                onChange={(e) => setOptions(options.map((o, j) => j === i ? e.target.value : o))}
                placeholder={`Option ${i + 1}`}
              />
            </div>
          ))}
          <div>
            <Label>Explanation</Label>
            <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>
          <Button className="w-full" type="submit">Add question</Button>
        </form>

        <div>
          <div className="font-semibold mb-2">Recent questions ({questions.length})</div>
          <div className="space-y-2">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-border bg-card p-3 flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span>{q.topics?.name}</span>
                    <span className="uppercase">{q.difficulty}</span>
                  </div>
                  <div className="text-sm mt-1 line-clamp-2">{q.question}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(q.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {questions.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center">No questions yet.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
