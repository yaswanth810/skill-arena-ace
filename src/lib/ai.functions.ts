import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { jsonrepair } from "jsonrepair";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function callGateway(messages: Msg[], jsonMode = false): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const body: Record<string, unknown> = { model: MODEL, messages };
  if (jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI is busy right now — please retry in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace billing.");
  if (!res.ok) throw new Error(`AI error: ${res.status}`);
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

function sliceLastCompleteArrayItems(s: string): string {
  // s starts with '['. Walk and record end index after each top-level element.
  let depth = 0, inStr = false, esc = false, lastGood = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 1) lastGood = i; // just closed a top-level element inside the array
      if (depth === 0) return s.slice(0, i + 1);
    }
  }
  if (lastGood > 0) return s.slice(0, lastGood + 1) + "]";
  return s;
}

function parseJsonLoose(raw: string): unknown {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const firstArr = s.indexOf("["), firstObj = s.indexOf("{");
  const start = firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstArr, firstObj);
  if (start > 0) s = s.slice(start);
  const openChar = s[0];
  const closeChar = openChar === "[" ? "]" : "}";
  const lastClose = s.lastIndexOf(closeChar);
  if (lastClose > 0) s = s.slice(0, lastClose + 1);

  const tryParse = (x: string) => { try { return { ok: true as const, v: JSON.parse(x) }; } catch { return { ok: false as const }; } };

  let r = tryParse(s);
  if (r.ok) return r.v;
  r = tryParse(s.replace(/,\s*([}\]])/g, "$1"));
  if (r.ok) return r.v;
  try { return JSON.parse(jsonrepair(s)); } catch { /* fall through */ }
  if (openChar === "[") {
    const trimmed = sliceLastCompleteArrayItems(s);
    try { return JSON.parse(jsonrepair(trimmed)); } catch { /* fall through */ }
  }
  throw new Error("Invalid JSON from AI");
}

export const explainQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const v = d as { questionId?: string };
    if (!v?.questionId) throw new Error("questionId required");
    return { questionId: v.questionId };
  })
  .handler(async ({ data, context }) => {
    const { data: q, error } = await context.supabase
      .from("questions")
      .select("question, options, correct_answer, explanation")
      .eq("id", data.questionId)
      .maybeSingle();
    if (error || !q) throw new Error("Question not found");

    const opts = (q.options as string[])
      .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`)
      .join("\n");
    const correct = String.fromCharCode(65 + q.correct_answer);

    const reply = await callGateway([
      {
        role: "system",
        content:
          "You are a placement-prep tutor for Indian service-based company aptitude rounds (Infosys/TCS/Wipro/Accenture). Explain the correct approach in 4-6 short lines: identify the concept, show the key setup, do the math step-by-step, and state the answer. Use plain text. Avoid preamble.",
      },
      {
        role: "user",
        content: `Question: ${q.question}\n\nOptions:\n${opts}\n\nCorrect answer: ${correct}\n${q.explanation ? `Existing note: ${q.explanation}` : ""}`,
      },
    ]);
    return { explanation: reply };
  });

export const doubtChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const v = d as { questionId?: string; message?: string };
    if (!v?.message) throw new Error("message required");
    return { questionId: v.questionId ?? null, message: v.message };
  })
  .handler(async ({ data, context }) => {
    let context_q = "";
    if (data.questionId) {
      const { data: q } = await context.supabase
        .from("questions")
        .select("question, options, correct_answer")
        .eq("id", data.questionId)
        .maybeSingle();
      if (q) {
        const opts = (q.options as string[])
          .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`)
          .join("\n");
        context_q = `Current question context:\n${q.question}\n${opts}\nCorrect: ${String.fromCharCode(65 + q.correct_answer)}\n\n`;
      }
    }

    // Load recent chat history for this question
    const { data: history } = await context.supabase
      .from("doubt_messages")
      .select("role, content")
      .eq("user_id", context.userId)
      .eq("question_id", data.questionId ?? "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: true })
      .limit(20);

    const msgs: Msg[] = [
      {
        role: "system",
        content:
          "You are a friendly aptitude-prep coach. Answer the student's doubts about a specific question or concept clearly, in 3-6 short lines, using simple math notation. Never reveal answers to unrelated homework — stay focused on placement aptitude.",
      },
      ...(context_q ? [{ role: "user" as const, content: context_q }] : []),
      ...((history ?? []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content }))),
      { role: "user" as const, content: data.message },
    ];

    const reply = await callGateway(msgs);

    // Persist
    await context.supabase.from("doubt_messages").insert([
      { user_id: context.userId, question_id: data.questionId, role: "user", content: data.message },
      { user_id: context.userId, question_id: data.questionId, role: "assistant", content: reply },
    ]);

    return { reply };
  });

type GenQ = { question: string; options: string[]; correct_answer: number; explanation: string };

export const generateQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const v = d as { topicId?: string; difficulty?: string; count?: number; company?: string };
    if (!v?.topicId) throw new Error("topicId required");
    const count = Math.max(1, Math.min(10, Number(v.count ?? 5)));
    const difficulty = (v.difficulty ?? "medium") as "easy" | "medium" | "hard";
    return { topicId: v.topicId, difficulty, count, company: v.company ?? "" };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: topic } = await context.supabase
      .from("topics").select("name,category,description").eq("id", data.topicId).maybeSingle();
    if (!topic) throw new Error("Topic not found");

    const companyLine = data.company ? `Style: ${data.company} placement aptitude round.` : "Style: Indian service-based company placement aptitude round (TCS/Infosys/Wipro/Accenture).";

    const raw = await callGateway([
      {
        role: "system",
        content: `You generate placement-aptitude MCQs. Return STRICT JSON only — an array of ${data.count} objects, no prose, no markdown fences. Each object shape: {"question": string, "options": [string, string, string, string], "correct_answer": 0|1|2|3, "explanation": string}. Numeric answers must be exact and verifiable. All 4 options plausible. Explanation 2-4 short lines with the working.`,
      },
      {
        role: "user",
        content: `Topic: ${topic.name} (${topic.category})\nDifficulty: ${data.difficulty}\n${companyLine}\nGenerate ${data.count} fresh, non-duplicate MCQs.`,
      },
    ]);

    const parsedUnknown = parseJsonLoose(raw);
    const parsed = (Array.isArray(parsedUnknown)
      ? parsedUnknown
      : (parsedUnknown as { questions?: unknown }).questions) as GenQ[];
    if (!Array.isArray(parsed)) throw new Error("Expected array");

    const rows = parsed
      .filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.correct_answer) && q.correct_answer >= 0 && q.correct_answer <= 3)
      .map((q) => ({
        topic_id: data.topicId,
        difficulty: data.difficulty,
        company_tag: data.company || null,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation ?? null,
        created_by: context.userId,
      }));

    if (rows.length === 0) throw new Error("No valid questions generated");

    const { error, data: inserted } = await context.supabase.from("questions").insert(rows).select("id");
    if (error) throw new Error(error.message);
    return { inserted: inserted?.length ?? 0, preview: rows.slice(0, 3) };
  });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function generateQuestionsForTopic(
  topicName: string,
  topicCategory: string,
  difficulty: "easy" | "medium" | "hard",
  count: number,
  company: string,
): Promise<GenQ[]> {
  const companyLine = company
    ? `Style: ${company} placement aptitude round.`
    : "Style: Indian service-based company placement aptitude round.";
  const raw = await callGateway([
    {
      role: "system",
      content: `You generate placement-aptitude MCQs. Return STRICT JSON only — an array of ${count} objects, no prose, no markdown fences. Each object shape: {"question": string, "options": [string, string, string, string], "correct_answer": 0|1|2|3, "explanation": string}. Numeric answers must be exact and verifiable. All 4 options plausible.`,
    },
    {
      role: "user",
      content: `Topic: ${topicName} (${topicCategory})\nDifficulty: ${difficulty}\n${companyLine}\nGenerate ${count} fresh, non-duplicate MCQs.`,
    },
  ]);
  const parsedUnknown = parseJsonLoose(raw);
  const parsed = (Array.isArray(parsedUnknown)
    ? parsedUnknown
    : (parsedUnknown as { questions?: unknown }).questions) as GenQ[];
  if (!Array.isArray(parsed)) throw new Error("Expected array");
  return parsed.filter(
    (q) =>
      q &&
      typeof q.question === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      Number.isInteger(q.correct_answer) &&
      q.correct_answer >= 0 &&
      q.correct_answer <= 3,
  );
}

type SectionSpec = { topicId: string; name?: string; difficulty: "easy" | "medium" | "hard"; count: number; durationMinutes: number };

export const generateMockTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const v = d as {
      title?: string;
      company?: string;
      mockType?: "company" | "weekly";
      sections?: SectionSpec[];
    };
    if (!v?.title?.trim()) throw new Error("title required");
    if (!Array.isArray(v.sections) || v.sections.length === 0) throw new Error("At least one section required");
    const sections = v.sections.map((s) => ({
      topicId: String(s.topicId),
      name: s.name?.trim() || "",
      difficulty: (s.difficulty ?? "medium") as "easy" | "medium" | "hard",
      count: Math.max(1, Math.min(15, Number(s.count ?? 5))),
      durationMinutes: Math.max(1, Math.min(120, Number(s.durationMinutes ?? 15))),
    }));
    return {
      title: v.title.trim(),
      company: v.company?.trim() ?? "",
      mockType: (v.mockType ?? "company") as "company" | "weekly",
      sections,
    };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    // Fetch topic metadata (name+category)
    const topicIds = Array.from(new Set(data.sections.map((s) => s.topicId)));
    const { data: topicRows, error: tErr } = await context.supabase
      .from("topics").select("id,name,category").in("id", topicIds);
    if (tErr) throw new Error(tErr.message);
    const topicMap = new Map((topicRows ?? []).map((t) => [t.id, t]));

    const totalDuration = data.sections.reduce((s, x) => s + x.durationMinutes, 0);
    const baseSlug = slugify(data.title);
    const slug = `${baseSlug}-${Date.now().toString(36).slice(-5)}`;

    const { data: mock, error: mErr } = await context.supabase.from("mock_tests").insert({
      title: data.title,
      slug,
      company: data.company || null,
      mock_type: data.mockType,
      duration_minutes: totalDuration || 60,
      description: `AI-generated mock with ${data.sections.length} section(s).`,
      is_active: true,
      created_by: context.userId,
    }).select("id,slug").single();
    if (mErr || !mock) throw new Error(mErr?.message ?? "Failed to create mock");

    let totalInserted = 0;
    for (let i = 0; i < data.sections.length; i++) {
      const sec = data.sections[i];
      const topic = topicMap.get(sec.topicId);
      if (!topic) continue;
      const sectionName = sec.name || `${topic.name} (${sec.difficulty})`;

      const { data: sectionRow, error: sErr } = await context.supabase.from("mock_sections").insert({
        mock_test_id: mock.id,
        name: sectionName,
        section_order: i + 1,
        duration_minutes: sec.durationMinutes,
      }).select("id").single();
      if (sErr || !sectionRow) throw new Error(sErr?.message ?? "Failed to create section");

      const gen = await generateQuestionsForTopic(topic.name, topic.category, sec.difficulty, sec.count, data.company);
      if (gen.length === 0) continue;

      const qRows = gen.map((q) => ({
        topic_id: sec.topicId,
        difficulty: sec.difficulty,
        company_tag: data.company || null,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation ?? null,
        created_by: context.userId,
      }));
      const { data: qInserted, error: qErr } = await context.supabase
        .from("questions").insert(qRows).select("id");
      if (qErr) throw new Error(qErr.message);
      totalInserted += qInserted?.length ?? 0;

      const linkRows = (qInserted ?? []).map((q, idx) => ({
        section_id: sectionRow.id, question_id: q.id, question_order: idx + 1,
      }));
      if (linkRows.length > 0) {
        const { error: lErr } = await context.supabase.from("mock_section_questions").insert(linkRows);
        if (lErr) throw new Error(lErr.message);
      }
    }

    return { mockId: mock.id, slug: mock.slug, totalQuestions: totalInserted };
  });
