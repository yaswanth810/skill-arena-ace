import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({ component: LeaderboardPage });

type Row = { user_id: string; name: string | null; score: number; total: number; mock_title: string; submitted_at: string };

function LeaderboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"weekly" | "all">("weekly");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("mock_attempts")
        .select("user_id, score, total, submitted_at, mock_tests!inner(title, mock_type)")
        .not("submitted_at", "is", null)
        .order("score", { ascending: false })
        .limit(50);
      if (tab === "weekly") q = q.eq("mock_tests.mock_type", "weekly");
      const { data } = await q;
      const attempts = (data ?? []) as unknown as { user_id: string; score: number; total: number; submitted_at: string; mock_tests: { title: string } }[];
      const ids = Array.from(new Set(attempts.map((a) => a.user_id)));
      const { data: profs } = await (supabase.rpc as any)("get_profile_names", { _ids: ids });
      const nameOf = new Map((profs ?? []).map((p) => [p.id, p.name]));
      // best per user
      const best = new Map<string, Row>();
      for (const a of attempts) {
        const cur: Row = {
          user_id: a.user_id,
          name: nameOf.get(a.user_id) ?? null,
          score: a.score, total: a.total,
          mock_title: a.mock_tests.title,
          submitted_at: a.submitted_at,
        };
        const prev = best.get(a.user_id);
        if (!prev || cur.score / Math.max(cur.total, 1) > prev.score / Math.max(prev.total, 1)) best.set(a.user_id, cur);
      }
      setRows([...best.values()].sort((a, b) => (b.score / Math.max(b.total,1)) - (a.score / Math.max(a.total,1))));
    })();
  }, [tab]);

  if (loading || !user) return null;

  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>
      <p className="text-muted-foreground mb-6">Top scorers by accuracy across submitted mocks.</p>

      <div className="flex gap-2 mb-4">
        {(["weekly", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm px-4 py-1.5 rounded-md ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {t === "weekly" ? "Weekly mock" : "All mocks"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No submissions yet — be the first!</div>
        )}
        {rows.map((r, i) => {
          const isMe = r.user_id === user.id;
          const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
          return (
            <div key={r.user_id} className={`flex items-center gap-4 p-4 ${isMe ? "bg-primary/5" : ""}`}>
              <div className="w-8 text-center">
                {i < 3 ? <Medal className={`h-5 w-5 mx-auto ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : "text-amber-600"}`} /> : <span className="text-muted-foreground text-sm">{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.name ?? "Anonymous"} {isMe && <span className="text-xs text-primary">(you)</span>}</div>
                <div className="text-xs text-muted-foreground truncate">{r.mock_title}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold">{r.score}/{r.total}</div>
                <div className="text-xs text-muted-foreground">{pct}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
