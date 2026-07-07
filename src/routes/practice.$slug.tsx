import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { DoubtChat } from "@/components/DoubtChat";

export const Route = createFileRoute("/practice/$slug")({ component: Practice });

type Question = {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  difficulty: string;
};

function Practice() {
  const { slug } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<{ id: string; name: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("topics").select("id,name").eq("slug", slug).maybeSingle();
      if (!t) return;
      setTopic(t);
      const { data: qs } = await supabase.from("questions").select("*").eq("topic_id", t.id);
      const shuffled = (qs ?? []).sort(() => Math.random() - 0.5) as Question[];
      setQuestions(shuffled);
      setStartedAt(Date.now());
    })();
  }, [slug]);

  const q = questions[idx];
  const total = questions.length;

  const submit = async (choice: number) => {
    if (!q || locked || !user) return;
    setSelected(choice);
    setLocked(true);
    const isCorrect = choice === q.correct_answer;
    if (isCorrect) setCorrectCount((c) => c + 1);
    await supabase.from("attempts").insert({
      user_id: user.id,
      question_id: q.id,
      selected_answer: choice,
      is_correct: isCorrect,
      time_taken_ms: Date.now() - startedAt,
    });
  };

  const next = () => {
    if (idx + 1 >= total) {
      toast.success(`Session complete! ${correctCount + (selected === q?.correct_answer ? 0 : 0)} / ${total} correct.`);
      navigate({ to: "/topics" });
      return;
    }
    setIdx(idx + 1);
    setSelected(null);
    setLocked(false);
    setStartedAt(Date.now());
  };

  const progress = useMemo(() => (total ? ((idx + (locked ? 1 : 0)) / total) * 100 : 0), [idx, locked, total]);

  if (loading || !user) return null;

  if (topic && total === 0) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto text-center py-16">
          <h1 className="text-2xl font-bold">{topic.name}</h1>
          <p className="text-muted-foreground mt-2">No questions yet for this topic. Check back soon.</p>
          <Button asChild className="mt-6"><Link to="/topics">Back to topics</Link></Button>
        </div>
      </AppShell>
    );
  }

  if (!q) return <AppShell><div className="text-center py-16 text-muted-foreground">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase text-muted-foreground">{topic?.name}</div>
            <div className="text-sm">Question {idx + 1} of {total}</div>
          </div>
          <span className="text-xs uppercase px-2 py-1 rounded bg-secondary">{q.difficulty}</span>
        </div>
        <div className="h-1 w-full bg-secondary rounded mb-6 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-lg font-medium mb-5">{q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const isCorrect = locked && i === q.correct_answer;
              const isWrong = locked && selected === i && i !== q.correct_answer;
              return (
                <button
                  key={i}
                  disabled={locked}
                  onClick={() => submit(i)}
                  className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between
                    ${isCorrect ? "border-success bg-success/10" :
                      isWrong ? "border-destructive bg-destructive/10" :
                      "border-border hover:border-primary/60"}
                    ${locked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span>{opt}</span>
                  {isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                  {isWrong && <XCircle className="h-4 w-4 text-destructive" />}
                </button>
              );
            })}
          </div>

          {locked && (
            <div className="mt-5 rounded-lg bg-secondary/60 p-4">
              <div className="text-sm font-semibold mb-1">Explanation</div>
              <p className="text-sm text-muted-foreground">{q.explanation || "No explanation provided."}</p>
            </div>
          )}

          {locked && (
            <div className="mt-5 flex justify-end">
              <Button onClick={next}>
                {idx + 1 >= total ? "Finish" : "Next question"} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {locked && q && <DoubtChat questionId={q.id} userId={user.id} />}
      </div>
    </AppShell>
  );
}
