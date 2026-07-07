import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/mocks/$slug")({ component: MockRunner });

type Section = { id: string; name: string; section_order: number; duration_minutes: number };
type Question = { id: string; question: string; options: string[]; correct_answer: number; explanation: string | null };
type SectionWithQs = Section & { questions: Question[] };

function MockRunner() {
  const { slug } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [mock, setMock] = useState<{ id: string; title: string; duration_minutes: number } | null>(null);
  const [sections, setSections] = useState<SectionWithQs[]>([]);
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secIdx, setSecIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState<{ score: number; total: number; breakdown: { name: string; score: number; total: number }[] } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase
        .from("mock_tests").select("id,title,duration_minutes").eq("slug", slug).maybeSingle();
      if (!m) return;
      setMock(m);
      const { data: secs } = await supabase
        .from("mock_sections").select("id,name,section_order,duration_minutes")
        .eq("mock_test_id", m.id).order("section_order");
      const withQs: SectionWithQs[] = [];
      for (const s of secs ?? []) {
        const { data: qs } = await supabase
          .from("mock_section_questions")
          .select("question_order, questions(id,question,options,correct_answer,explanation)")
          .eq("section_id", s.id).order("question_order");
        withQs.push({
          ...s,
          questions: (qs ?? []).map((r: { questions: Question | null }) => r.questions).filter(Boolean) as Question[],
        });
      }
      setSections(withQs);
      setRemaining(m.duration_minutes * 60);
    })();
  }, [slug]);

  const totalQs = useMemo(() => sections.reduce((n, s) => n + s.questions.length, 0), [sections]);

  const start = async () => {
    if (!user || !mock) return;
    const { data, error } = await supabase.from("mock_attempts").insert({
      user_id: user.id, mock_test_id: mock.id, total: totalQs,
    }).select("id").single();
    if (error || !data) return toast.error(error?.message ?? "Could not start");
    setAttemptId(data.id);
    setStarted(true);
  };

  useEffect(() => {
    if (!started) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void submit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started]);

  const submit = async (auto = false) => {
    if (!attemptId || !mock || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    const breakdown: { name: string; score: number; total: number }[] = [];
    const answerRows: { question_id: string; section_id: string; selected: number | null; correct: boolean }[] = [];
    for (const s of sections) {
      let sScore = 0;
      for (const q of s.questions) {
        const sel = answers[q.id];
        const correct = sel === q.correct_answer;
        if (correct) sScore++;
        answerRows.push({ question_id: q.id, section_id: s.id, selected: sel ?? null, correct });
      }
      score += sScore;
      breakdown.push({ name: s.name, score: sScore, total: s.questions.length });
    }

    await supabase.from("mock_attempts").update({
      submitted_at: new Date().toISOString(),
      score, total: totalQs,
      section_breakdown: breakdown,
      answers: answerRows,
    }).eq("id", attemptId);

    setReview({ score, total: totalQs, breakdown });
    if (auto) toast.info("Time's up — auto-submitted.");
    else toast.success("Submitted!");
  };

  if (loading || !user) return null;
  if (!mock) return <AppShell><div className="text-center py-16 text-muted-foreground">Loading…</div></AppShell>;

  if (review) {
    const pct = review.total ? Math.round((review.score / review.total) * 100) : 0;
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">{mock.title}</h1>
          <p className="text-muted-foreground mb-6">Results</p>
          <div className="rounded-xl border border-border bg-card p-6 text-center mb-6">
            <div className="text-5xl font-display font-bold text-primary">{review.score}<span className="text-2xl text-muted-foreground">/{review.total}</span></div>
            <div className="text-sm text-muted-foreground mt-1">{pct}% accuracy</div>
          </div>
          <div className="space-y-2 mb-6">
            {review.breakdown.map((b) => (
              <div key={b.name} className="rounded-lg border border-border bg-card p-3 flex justify-between text-sm">
                <span>{b.name}</span>
                <span className="font-mono">{b.score}/{b.total}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 mb-6">
            <div className="font-semibold mb-3">Review answers</div>
            <div className="space-y-3">
              {sections.flatMap((s) => s.questions.map((q) => {
                const sel = answers[q.id];
                const ok = sel === q.correct_answer;
                return (
                  <div key={q.id} className="text-sm">
                    <div className="flex gap-2">
                      {ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                      <div>
                        <div>{q.question}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Your answer: {sel != null ? q.options[sel] : "Skipped"} · Correct: {q.options[q.correct_answer]}
                        </div>
                        {q.explanation && <div className="text-xs mt-1 text-muted-foreground">💡 {q.explanation}</div>}
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild><Link to="/leaderboard">View leaderboard</Link></Button>
            <Button variant="secondary" asChild><Link to="/mocks">More mocks</Link></Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!started) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-2xl font-bold">{mock.title}</h1>
          <div className="grid grid-cols-3 gap-3 mt-6 mb-6 text-sm">
            <div><div className="text-2xl font-bold text-primary">{mock.duration_minutes}</div><div className="text-xs text-muted-foreground">minutes</div></div>
            <div><div className="text-2xl font-bold text-primary">{sections.length}</div><div className="text-xs text-muted-foreground">sections</div></div>
            <div><div className="text-2xl font-bold text-primary">{totalQs}</div><div className="text-xs text-muted-foreground">questions</div></div>
          </div>
          <p className="text-xs text-muted-foreground mb-6">Timer starts on click. Auto-submits at 00:00.</p>
          <Button size="lg" onClick={start} disabled={totalQs === 0}>Start mock</Button>
        </div>
      </AppShell>
    );
  }

  const sec = sections[secIdx];
  const q = sec?.questions[qIdx];
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const lowTime = remaining < 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="sticky top-14 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between mb-6">
          <div className="text-sm">
            <div className="font-semibold">{sec.name}</div>
            <div className="text-xs text-muted-foreground">Q {qIdx + 1} of {sec.questions.length} · {answeredCount}/{totalQs} answered</div>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-lg tabular-nums px-3 py-1 rounded-md ${lowTime ? "bg-destructive/20 text-destructive animate-pulse" : "bg-secondary"}`}>
            <Clock className="h-4 w-4" /> {mm}:{ss}
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {sections.map((s, i) => (
            <button key={s.id} onClick={() => { setSecIdx(i); setQIdx(0); }}
              className={`text-xs px-3 py-1.5 rounded-md whitespace-nowrap ${i === secIdx ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {s.name}
            </button>
          ))}
        </div>

        {q && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-lg font-medium mb-5">{q.question}</div>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button key={i}
                    onClick={() => setAnswers({ ...answers, [q.id]: i })}
                    className={`w-full text-left p-3 rounded-lg border transition flex items-center gap-3
                      ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"}`}>
                    <span className={`h-6 w-6 rounded-full border shrink-0 flex items-center justify-center text-xs font-semibold ${selected ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={() => {
            if (qIdx > 0) setQIdx(qIdx - 1);
            else if (secIdx > 0) { setSecIdx(secIdx - 1); setQIdx(sections[secIdx - 1].questions.length - 1); }
          }} disabled={secIdx === 0 && qIdx === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          {secIdx === sections.length - 1 && qIdx === sec.questions.length - 1 ? (
            <Button onClick={() => submit(false)} disabled={submitting}>
              <Flag className="h-4 w-4 mr-1" /> Submit mock
            </Button>
          ) : (
            <Button onClick={() => {
              if (qIdx + 1 < sec.questions.length) setQIdx(qIdx + 1);
              else { setSecIdx(secIdx + 1); setQIdx(0); }
            }}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
