import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/topics")({ component: TopicsPage });

type Topic = { id: string; name: string; slug: string; category: string; description: string | null };

const LABELS: Record<string, string> = {
  quantitative: "Quantitative Aptitude",
  logical: "Logical Reasoning",
  verbal: "Verbal Ability",
  technical: "Technical",
};

function TopicsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from("topics").select("*").order("category").then(({ data }) => setTopics(data ?? []));
  }, []);

  if (loading || !user) return null;

  const byCat = topics.reduce<Record<string, Topic[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-2">Topics</h1>
      <p className="text-muted-foreground mb-8">Pick a topic to start untimed practice with instant feedback.</p>
      <div className="space-y-8">
        {Object.entries(byCat).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="text-lg font-semibold mb-3">{LABELS[cat] ?? cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <Link
                  key={t.id}
                  to="/practice/$slug"
                  params={{ slug: t.slug }}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/60 transition"
                >
                  <div className="font-semibold">{t.name}</div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                  <div className="text-xs text-primary mt-3">Start practice →</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
