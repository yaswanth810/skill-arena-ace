import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function callGateway(messages: Msg[]): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (res.status === 429) throw new Error("AI is busy right now — please retry in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your workspace billing.");
  if (!res.ok) throw new Error(`AI error: ${res.status}`);
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
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
