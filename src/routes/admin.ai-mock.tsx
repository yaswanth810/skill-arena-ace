import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generateMockTest } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ai-mock")({ component: AdminAiMockPage });

type Topic = { id: string; name: string; category: string };
type SectionSpec = {
  topicId: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  count: number;
  durationMinutes: number;
};

function AdminAiMockPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const gen = useServerFn(generateMockTest);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [mockType, setMockType] = useState<"company" | "weekly">("company");
  const [sections, setSections] = useState<SectionSpec[]>([
    { topicId: "", name: "", difficulty: "medium", count: 5, durationMinutes: 15 },
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("topics").select("id,name,category").order("name").then(({ data }) => setTopics(data ?? []));
  }, []);

  if (loading || !isAdmin) return null;

  const updateSection = (i: number, patch: Partial<SectionSpec>) => {
    setSections((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };
  const addSection = () =>
    setSections((s) => [...s, { topicId: "", name: "", difficulty: "medium", count: 5, durationMinutes: 15 }]);
  const removeSection = (i: number) => setSections((s) => s.filter((_, idx) => idx !== i));

  const run = async () => {
    if (!title.trim()) return toast.error("Give the mock a title");
    if (sections.some((s) => !s.topicId)) return toast.error("Pick a topic for every section");
    setBusy(true);
    try {
      const r = await gen({ data: { title, company, mockType, sections } });
      toast.success(`Mock created with ${r.totalQuestions} AI-generated questions`);
      navigate({ to: "/mocks/$slug", params: { slug: r.slug } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" /> AI Mock Test Builder
      </h1>
      <p className="text-muted-foreground mb-8">
        Describe the mock and its sections — AI generates every question and wires it into a timed, sectioned test.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Infosys Aptitude Drive #4" />
              </div>
              <div>
                <Label>Company (optional)</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Infosys" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={mockType} onValueChange={(v) => setMockType(v as "company" | "weekly")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Sections</h2>
              <Button size="sm" variant="secondary" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" /> Add section
              </Button>
            </div>

            {sections.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Section {i + 1}</div>
                  {sections.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => removeSection(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Topic</Label>
                    <Select value={s.topicId} onValueChange={(v) => updateSection(i, { topicId: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick topic" /></SelectTrigger>
                      <SelectContent>
                        {topics.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Section name (optional)</Label>
                    <Input value={s.name} onChange={(e) => updateSection(i, { name: e.target.value })} placeholder="Quantitative" />
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={s.difficulty} onValueChange={(v) => updateSection(i, { difficulty: v as SectionSpec["difficulty"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Questions</Label>
                      <Input type="number" min={1} max={15} value={s.count}
                        onChange={(e) => updateSection(i, { count: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label>Minutes</Label>
                      <Input type="number" min={1} max={120} value={s.durationMinutes}
                        onChange={(e) => updateSection(i, { durationMinutes: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-20 h-fit rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="text-sm font-semibold">Summary</div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Sections: <span className="text-foreground font-mono">{sections.length}</span></div>
            <div>Total questions: <span className="text-foreground font-mono">{sections.reduce((n, s) => n + Number(s.count || 0), 0)}</span></div>
            <div>Total duration: <span className="text-foreground font-mono">{sections.reduce((n, s) => n + Number(s.durationMinutes || 0), 0)} min</span></div>
          </div>
          <Button className="w-full" onClick={run} disabled={busy}>
            {busy ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating mock…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate mock with AI</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            This can take 15–45 seconds depending on the number of questions. The mock will appear under the Mocks tab.
          </p>
        </div>
      </div>
    </>
  );
}
