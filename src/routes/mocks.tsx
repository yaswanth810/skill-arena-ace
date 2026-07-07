import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Building2, Trophy, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/mocks")({ component: MocksPage });

type Mock = {
  id: string;
  title: string;
  slug: string;
  company: string | null;
  mock_type: "company" | "weekly";
  description: string | null;
  duration_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
};

function MocksPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mocks, setMocks] = useState<Mock[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase
      .from("mock_tests")
      .select("*")
      .eq("is_active", true)
      .order("mock_type")
      .order("created_at", { ascending: false })
      .then(({ data }) => setMocks((data ?? []) as Mock[]));
  }, []);

  if (loading || !user) return null;

  const weekly = mocks.filter((m) => m.mock_type === "weekly");
  const company = mocks.filter((m) => m.mock_type === "company");

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mock Tests</h1>
          <p className="text-muted-foreground mt-1">Timed, sectioned mocks to simulate real placement drives.</p>
        </div>
        <Link to="/leaderboard" className="text-sm text-primary hover:underline flex items-center gap-1">
          <Trophy className="h-4 w-4" /> Leaderboard
        </Link>
      </div>

      {weekly.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> This week's mock
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {weekly.map((m) => <MockCard key={m.id} m={m} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Company drives
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {company.map((m) => <MockCard key={m.id} m={m} />)}
          {company.length === 0 && (
            <div className="text-sm text-muted-foreground py-6">No company mocks yet.</div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function MockCard({ m }: { m: Mock }) {
  return (
    <Link
      to="/mocks/$slug"
      params={{ slug: m.slug }}
      className="rounded-xl border border-border bg-card p-5 hover:border-primary/60 transition"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase text-muted-foreground">
          {m.company ?? (m.mock_type === "weekly" ? "Weekly" : "Mock")}
        </div>
        <div className="text-xs flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> {m.duration_minutes} min
        </div>
      </div>
      <div className="font-semibold mt-1">{m.title}</div>
      {m.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.description}</p>}
      <div className="text-xs text-primary mt-3">Start mock →</div>
    </Link>
  );
}
