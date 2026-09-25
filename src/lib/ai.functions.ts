import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";

function model() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");
  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  return lovable.responses("openai/gpt-6-astra");
}

const providerOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
};

const detailGuide: Record<string, string> = {
  Concise: "Keep it brief and to the point.",
  Balanced: "Use a moderate level of detail.",
  Detailed: "Be thorough and include helpful specifics.",
};

function friendly(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (/402|credit/i.test(msg)) throw new Error("AI credits are used up. Please add credits to continue.");
  if (/429|rate/i.test(msg)) throw new Error("Too many requests right now. Please try again shortly.");
  throw new Error("The AI couldn't respond. Please try again.");
}

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        recipient: z.string().min(1),
        purpose: z.string().min(1),
        points: z.string().min(1),
        tone: z.string(),
        variation: z.number(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const result = streamText({
        model: model(),
        providerOptions,
        system:
          "You are an expert workplace communication writer. Write complete, ready-to-send professional emails. Output plain text only (no markdown): first line 'Subject: ...', blank line, greeting, body, sign-off ending with '[Your name]'. Cover every key point naturally, never invent facts, dates or numbers the user didn't give.",
        prompt: `Recipient: ${data.recipient}\nPurpose: ${data.purpose}\nKey points:\n${data.points}\nTone: ${data.tone}\n${data.variation > 0 ? `This is regeneration #${data.variation}: write a noticeably different version (different structure and wording).` : ""}`,
      });
      return { text: (await result.text).trim() };
    } catch (e) {
      friendly(e);
    }
  });

export const generateResearch = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        sourceType: z.string(),
        input: z.string().min(1),
        detail: z.string(),
        variation: z.number(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const result = streamText({
        model: model(),
        providerOptions,
        output: Output.object({
          schema: z.object({
            summary: z.string(),
            insights: z.array(z.string()),
            recommendations: z.array(z.string()),
          }),
        }),
        system: `You are a careful, factual research analyst. Give accurate, specific information (real figures, sources like official statistics bodies, and years where you know them). If data may be outdated, say which year it refers to. Never fabricate. For a URL you cannot browse, analyse what is known about that site/organisation and say so. Provide a 3-5 sentence summary, 4-6 key insights and 4-6 practical, actionable recommendations. ${detailGuide[data.detail] ?? ""}`,
        prompt: `Source type: ${data.sourceType}\nInput:\n${data.input}${data.variation > 0 ? "\n\nProvide a fresh angle with different insights than before." : ""}`,
      });
      return await result.output;
    } catch (e) {
      friendly(e);
    }
  });

export const chatReply = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        detail: z.string(),
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() })),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const result = streamText({
        model: model(),
        providerOptions,
        system: `You are a knowledgeable, practical workplace and productivity advisor. Answer the user's actual question directly and accurately, tailored to their situation, using markdown (short headings, lists) when helpful. Ask a clarifying question only if truly needed. ${detailGuide[data.detail] ?? ""}`,
        messages: data.messages.map((m) => ({ role: m.role, content: m.text })),
      });
      return { text: (await result.text).trim() };
    } catch (e) {
      friendly(e);
    }
  });
