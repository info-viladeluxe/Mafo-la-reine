import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT_FR = `Tu es Mafo AI, un assistant santé féminine spécialisé dans le suivi du cycle menstruel, la fertilité, la grossesse et le bien-être. Tu parles avec empathie, chaleur et professionnalisme. Tu donnes des informations basées sur des preuves scientifiques mais tu ne poses JAMAIS de diagnostic. Tu rappelles toujours de consulter un professionnel de santé pour tout symptôme inquiétant. Réponds de manière concise (max 3-4 paragraphes).`;

const SYSTEM_PROMPT_EN = `You are Mafo AI, a women's health assistant specialized in menstrual cycle tracking, fertility, pregnancy, and wellbeing. You speak with empathy, warmth, and professionalism. You provide evidence-based information but NEVER make a diagnosis. You always remind users to consult a healthcare professional for any worrying symptom. Keep responses concise (max 3-4 paragraphs).`;

function localResponse(question: string, lang: string): string {
  const q = question.toLowerCase();
  if (q.includes("douleur") || q.includes("pain") || q.includes("mal")) {
    return lang === "fr"
      ? "Les douleurs en milieu de cycle peuvent être liées à l'ovulation (mittelschmerz) ou aux règles. Si elles sont intenses, persistantes ou accompagnées de fièvre, consulte un professionnel de santé. Je ne peux pas poser de diagnostic."
      : "Mid-cycle pain may be linked to ovulation (mittelschmerz) or your period. If pain is intense, persistent, or accompanied by fever, consult a healthcare professional. I cannot make a diagnosis.";
  }
  if (q.includes("cycle") || q.includes("cycles")) {
    return lang === "fr"
      ? "Pour analyser tes cycles, j'ai besoin de tes données de suivi. En moyenne, un cycle dure 28 jours avec une ovulation vers J14. Des variations de 21 à 35 jours sont normales. Consulte un médecin si tes cycles sont très irréguliers."
      : "To analyze your cycles, I need your tracking data. On average, a cycle lasts 28 days with ovulation around day 14. Variations from 21 to 35 days are normal. See a doctor if your cycles are very irregular.";
  }
  if (q.includes("gynéco") || q.includes("gynecologist") || q.includes("consult")) {
    return lang === "fr"
      ? "Questions utiles pour ton gynécologue : 1) Mes cycles sont-ils normaux ? 2) Quelle méthode contraceptive me convient ? 3) Faut-il faire un frottis ? 4) Quels examens préventifs recommandes-tu ? 5) J'ai des douleurs, que faire ?"
      : "Useful questions for your gynecologist: 1) Are my cycles normal? 2) Which contraceptive method suits me? 3) Should I get a Pap smear? 4) What preventive exams do you recommend? 5) I have pain, what should I do?";
  }
  return lang === "fr"
    ? "Je suis ton assistant santé Mafo. Je peux t'aider à comprendre ton cycle, préparer tes consultations et suivre tes symptômes. Rappelle-toi : je ne remplace pas un médecin. Pour tout symptôme inquiétant, consulte un professionnel."
    : "I'm your Mafo health assistant. I can help you understand your cycle, prepare your consultations, and track your symptoms. Remember: I don't replace a doctor. For any worrying symptom, consult a professional.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, lang = "fr" } = await req.json();
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      const lastUserMsg = [...messages].reverse().find((m: ChatMessage) => m.role === "user");
      const response = lastUserMsg ? localResponse(lastUserMsg.content, lang) : localResponse("", lang);
      return new Response(
        JSON.stringify({ content: response, provider: "local" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = lang === "fr" ? SYSTEM_PROMPT_FR : SYSTEM_PROMPT_EN;
    const payload = {
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 500,
      temperature: 0.7,
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const lastUserMsg = [...messages].reverse().find((m: ChatMessage) => m.role === "user");
      const response = lastUserMsg ? localResponse(lastUserMsg.content, lang) : localResponse("", lang);
      return new Response(
        JSON.stringify({ content: response, provider: "local" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? localResponse("", lang);

    return new Response(
      JSON.stringify({ content, provider: "openai" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
