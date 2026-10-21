import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

export type ChatOutfit = { name: string; occasion: string; reason: string; item_ids: string[] };
export type ChatReply = { message: string; outfits: ChatOutfit[]; error: string | null };

export const askStylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<ChatReply> => {
    const { data: items, error } = await context.supabase
      .from("items")
      .select("id, name, category, color, style, favorite");
    if (error) {
      console.error(error);
      return { message: "", outfits: [], error: "Non riesco a leggere il tuo guardaroba." };
    }
    if (!items || items.length < 2) {
      return {
        message: "",
        outfits: [],
        error: "Aggiungi almeno qualche capo al guardaroba prima di chiedere un outfit.",
      };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { message: "", outfits: [], error: "Chat AI non configurata." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output, NoObjectGeneratedError } = await import("ai");

    let runId: string | undefined;
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
        const res = await fetch(input, { ...init, headers });
        runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
        return res;
      },
    });

    const schema = z.object({
      message: z.string(),
      outfits: z.array(
        z.object({
          name: z.string(),
          occasion: z.string(),
          reason: z.string(),
          item_ids: z.array(z.string()),
        }),
      ),
    });

    const wardrobe = items.map((i) => ({
      id: i.id,
      nome: i.name,
      categoria: i.category,
      colore: i.color,
      stile: i.style,
      preferito: i.favorite,
    }));

    const system = `Sei uno stylist personale italiano. Crei outfit usando SOLO i capi del guardaroba dell'utente, indicati per id.
Regole:
- Proponi da 2 a 3 outfit diversi, a meno che l'utente chieda di modificarne uno.
- Ogni outfit: al massimo un capo per categoria tra giubbotti, felpe, maglie, pantaloni, scarpe (puoi abbinare felpa o giubbotto sopra una maglia); fino a 2 accessori.
- Ogni outfit dovrebbe includere idealmente una maglia o felpa, pantaloni e scarpe se disponibili.
- Usa esclusivamente gli id elencati. Non inventare capi.
- "name": titolo breve e accattivante. "occasion": occasione in poche parole. "reason": 1-2 frasi sul perché funziona.
- "message": breve risposta amichevole in italiano.
Guardaroba: ${JSON.stringify(wardrobe)}`;

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        messages: [{ role: "system", content: system }, ...data.messages],
        output: Output.object({ schema }),
        maxRetries: 0,
        providerOptions: {
          openai: {
            store: false,
            forceReasoning: true,
            reasoningEffort: "low",
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const out = await result.output;
      const valid = new Map(items.map((i) => [i.id, i.category]));
      const outfits = out.outfits
        .map((o) => ({ ...o, item_ids: [...new Set(o.item_ids)].filter((id) => valid.has(id)) }))
        .filter((o) => o.item_ids.length >= 2)
        .slice(0, 3);
      return { message: out.message, outfits, error: null };
    } catch (e) {
      if (NoObjectGeneratedError.isInstance(e)) {
        return { message: "", outfits: [], error: "Non sono riuscito a creare outfit, riprova." };
      }
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("AI error", status, e);
      if (status === 429) return { message: "", outfits: [], error: "Troppe richieste, riprova tra poco." };
      if (status === 402) return { message: "", outfits: [], error: "Crediti AI esauriti." };
      return { message: "", outfits: [], error: "La Chat AI non è disponibile al momento." };
    }
  });
