import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, CheckCircle2, Target, Flame } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type Stats = { total: number; correct: number; topics: number };

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ total: 0, correct: 0, topics: 0 });
  const [recentTopics, setRecentTopics] = useState<Array<{ id: string; name: string; slug: string; category: string }>>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: attempts }, { data: topics }] = await Promise.all([
        supabase.from("attempts").select("is_correct").eq("user_id", user.id),
        supabase.from("topics").select("id,name,slug,category").order("created_at").limit(6),
      ]);
      const total = attempts?.length ?? 0;
      const correct = attempts?.filter((a) => a.is_correct).length ?? 0;
      setStats({ total, correct, topics: topics?.length ?? 0 });
      setRecentTopics(topics ?? []);
    })();
  }, [user]);

  if (loading || !user) return null;

  const accuracy = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back 👋</h1>
        <p className="text-muted-foreground mt-1">Pick up where you left off, or hunt down a weak area.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <StatCard icon={BookOpen} label="Questions attempted" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Accuracy" value={`${accuracy}%`} tone="success" />
        <StatCard icon={Target} label="Correct answers" value={stats.correct} />
        <StatCard icon={Flame} label="Current streak" value="—" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Practice topics</h2>
        <Link to="/topics" className="text-sm text-primary hover:underline">View all →</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recentTopics.map((t) => (
          <Link
            key={t.id}
            to="/practice/$slug"
            params={{ slug: t.slug }}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/60 transition"
          >
            <div className="text-xs uppercase text-muted-foreground">{t.category}</div>
            <div className="font-semibold mt-1">{t.name}</div>
            <div className="text-xs text-primary mt-3">Start practice →</div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; tone?: "success" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Icon className={`h-5 w-5 mb-2 ${tone === "success" ? "text-[oklch(var(--success))]" : "text-primary"}`} />
      <div className="text-2xl font-bold font-display">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
