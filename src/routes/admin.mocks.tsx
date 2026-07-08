import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Timer, Layers, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/mocks")({ component: AdminMocksPage });

type Mock = {
  id: string; title: string; slug: string; company: string | null;
  mock_type: "company" | "weekly"; duration_minutes: number;
  description: string | null; is_active: boolean;
};
type Section = { id: string; mock_test_id: string; name: string; section_order: number; duration_minutes: number };
type Topic = { id: string; name: string; category: string };
type Question = { id: string; question: string; difficulty: string; topic_id: string };
type SQRow = { id: string; question_id: string; question_order: number; questions: { question: string; difficulty: string } | null };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminMocksPage() {
  const { user } = useAuth();
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => mocks.find((m) => m.id === selectedId) ?? null, [mocks, selectedId]);

  // Create-mock form
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [mockType, setMockType] = useState<"company" | "weekly">("company");
  const [duration, setDuration] = useState(60);
  const [description, setDescription] = useState("");

  const loadMocks = async () => {
    const { data } = await supabase.from("mock_tests").select("*").order("created_at", { ascending: false });
    setMocks((data ?? []) as Mock[]);
  };
  useEffect(() => { loadMocks(); }, []);

  const createMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title required");
    const slug = slugify(title);
    const { data, error } = await supabase.from("mock_tests").insert({
      title, slug, company: company || null, mock_type: mockType,
      duration_minutes: duration, description: description || null,
      is_active: true, created_by: user!.id,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Mock created");
    setTitle(""); setCompany(""); setDuration(60); setDescription("");
    await loadMocks();
    setSelectedId(data!.id);
  };

  const deleteMock = async (id: string) => {
    if (!confirm("Delete this mock and all its sections?")) return;
    const { error } = await supabase.from("mock_tests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (selectedId === id) setSelectedId(null);
    loadMocks();
  };

  const toggleActive = async (m: Mock) => {
    await supabase.from("mock_tests").update({ is_active: !m.is_active }).eq("id", m.id);
    loadMocks();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Mock Test Builder</h1>
          <p className="text-sm text-muted-foreground">Create timed, sectioned mocks and assign question sets.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] mt-6">
        {/* Left: mock list + create */}
        <div className="space-y-4">
          <form onSubmit={createMock} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="font-semibold text-sm flex items-center gap-1.5"><Plus className="h-4 w-4 text-primary" /> New mock test</div>
            <div>
              <Label>Title</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Infosys Aptitude Drive #3" />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Company (optional)</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Infosys" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Create mock</Button>
          </form>

          <div className="rounded-xl border border-border bg-card p-2">
            <div className="text-xs uppercase text-muted-foreground px-2 py-1.5">All mocks ({mocks.length})</div>
            {mocks.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-sm hover:bg-secondary
                  ${selectedId === m.id ? "bg-secondary" : ""}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-1.5">
                    {selectedId === m.id && <ChevronRight className="h-3 w-3 text-primary" />}
                    {m.title}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span>{m.company ?? m.mock_type}</span>
                    <span>· {m.duration_minutes}m</span>
                    {!m.is_active && <span className="text-destructive">· inactive</span>}
                  </div>
                </div>
                <span onClick={(e) => { e.stopPropagation(); toggleActive(m); }}
                  className="text-xs text-muted-foreground hover:text-primary px-1">
                  {m.is_active ? "hide" : "show"}
                </span>
                <span onClick={(e) => { e.stopPropagation(); deleteMock(m.id); }}
                  className="text-destructive hover:opacity-70 px-1"><Trash2 className="h-3.5 w-3.5" /></span>
              </button>
            ))}
            {mocks.length === 0 && <div className="text-xs text-muted-foreground p-3 text-center">No mocks yet.</div>}
          </div>
        </div>

        {/* Right: sections + question assignment */}
        <div>
          {selected ? (
            <MockEditor mock={selected} />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Select a mock on the left or create a new one to manage sections and questions.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MockEditor({ mock }: { mock: Mock }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionName, setSectionName] = useState("");
  const [sectionDuration, setSectionDuration] = useState(20);

  const loadSections = async () => {
    const { data } = await supabase.from("mock_sections").select("*").eq("mock_test_id", mock.id).order("section_order");
    setSections((data ?? []) as Section[]);
  };
  useEffect(() => { loadSections(); }, [mock.id]);

  const addSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim()) return;
    const nextOrder = (sections[sections.length - 1]?.section_order ?? 0) + 1;
    const { error } = await supabase.from("mock_sections").insert({
      mock_test_id: mock.id, name: sectionName, section_order: nextOrder, duration_minutes: sectionDuration,
    });
    if (error) return toast.error(error.message);
    setSectionName(""); setSectionDuration(20);
    loadSections();
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Delete section?")) return;
    await supabase.from("mock_sections").delete().eq("id", id);
    loadSections();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase text-muted-foreground">{mock.company ?? mock.mock_type}</div>
          <h2 className="text-xl font-bold">{mock.title}</h2>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Timer className="h-3 w-3" /> {mock.duration_minutes} min total
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="font-semibold text-sm flex items-center gap-1.5 mb-3"><Layers className="h-4 w-4 text-primary" /> Sections</div>
        <form onSubmit={addSection} className="flex gap-2 mb-4">
          <Input placeholder="Section name (e.g. Quantitative)" value={sectionName} onChange={(e) => setSectionName(e.target.value)} />
          <Input type="number" className="w-24" min={1} value={sectionDuration} onChange={(e) => setSectionDuration(Number(e.target.value))} />
          <Button type="submit" size="sm"><Plus className="h-4 w-4" /></Button>
        </form>

        <div className="space-y-4">
          {sections.map((s) => (
            <SectionEditor key={s.id} section={s} onDelete={() => deleteSection(s.id)} />
          ))}
          {sections.length === 0 && (
            <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
              Add at least one section to assign questions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ section, onDelete }: { section: Section; onDelete: () => void }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assigned, setAssigned] = useState<SQRow[]>([]);
  const [pool, setPool] = useState<Question[]>([]);
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [diffFilter, setDiffFilter] = useState<string>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const loadAssigned = async () => {
    const { data } = await supabase
      .from("mock_section_questions")
      .select("id, question_id, question_order, questions(question, difficulty)")
      .eq("section_id", section.id)
      .order("question_order");
    setAssigned((data ?? []) as unknown as SQRow[]);
  };

  useEffect(() => {
    supabase.from("topics").select("id,name,category").order("name").then(({ data }) => setTopics(data ?? []));
    loadAssigned();
  }, [section.id]);

  const searchPool = async () => {
    let q = supabase.from("questions").select("id, question, difficulty, topic_id").limit(100);
    if (topicFilter !== "all") q = q.eq("topic_id", topicFilter);
    if (diffFilter !== "all") q = q.eq("difficulty", diffFilter as "easy" | "medium" | "hard");
    const { data } = await q;
    const assignedIds = new Set(assigned.map((a) => a.question_id));
    setPool(((data ?? []) as Question[]).filter((qq) => !assignedIds.has(qq.id)));
    setPicked(new Set());
  };

  const togglePick = (id: string) => {
    setPicked((s) => {
      const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
  };

  const assignPicked = async () => {
    if (picked.size === 0) return;
    const baseOrder = (assigned[assigned.length - 1]?.question_order ?? 0) + 1;
    const rows = Array.from(picked).map((qid, i) => ({
      section_id: section.id, question_id: qid, question_order: baseOrder + i,
    }));
    const { error } = await supabase.from("mock_section_questions").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${picked.size} question(s) added`);
    setPool([]); setPicked(new Set());
    loadAssigned();
  };

  const unassign = async (id: string) => {
    await supabase.from("mock_section_questions").delete().eq("id", id);
    loadAssigned();
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-medium text-sm">{section.section_order}. {section.name}</div>
          <div className="text-xs text-muted-foreground">{section.duration_minutes} min · {assigned.length} question(s)</div>
        </div>
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>

      {assigned.length > 0 && (
        <div className="space-y-1 mb-4">
          {assigned.map((a) => (
            <div key={a.id} className="text-xs flex justify-between items-start gap-2 bg-secondary/40 rounded px-2 py-1.5">
              <div className="min-w-0">
                <span className="uppercase text-[10px] text-muted-foreground mr-1.5">{a.questions?.difficulty}</span>
                <span className="line-clamp-1">{a.questions?.question}</span>
              </div>
              <button onClick={() => unassign(a.id)} className="text-destructive shrink-0"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-3">
        <div className="text-xs font-semibold text-muted-foreground mb-2">Add questions</div>
        <div className="flex gap-2 mb-2 flex-wrap">
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={diffFilter} onValueChange={setDiffFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any difficulty</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" onClick={searchPool}>Search</Button>
          {picked.size > 0 && (
            <Button size="sm" onClick={assignPicked}>Add {picked.size} to section</Button>
          )}
        </div>
        {pool.length > 0 && (
          <div className="max-h-72 overflow-y-auto space-y-1 border border-border rounded-md p-2">
            {pool.map((q) => (
              <label key={q.id} className="flex gap-2 items-start text-xs cursor-pointer hover:bg-secondary/50 rounded px-2 py-1.5">
                <input type="checkbox" className="mt-0.5" checked={picked.has(q.id)} onChange={() => togglePick(q.id)} />
                <span className="uppercase text-[10px] text-muted-foreground mr-1">{q.difficulty}</span>
                <span className="line-clamp-2">{q.question}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
