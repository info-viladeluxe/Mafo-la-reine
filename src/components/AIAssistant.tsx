import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Sparkles, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface Message { role: 'user' | 'assistant'; content: string; }
interface Conversation {
  id: string;
  title: string | null;
  messages: Message[];
  updated_at: string;
}

export function AIAssistant() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('ai_conversations').select('*').order('updated_at', { ascending: false });
    setLoading(false);
    const convs = (data as Conversation[]) ?? [];
    setConversations(convs);
    if (convs.length > 0 && !activeId) { setActiveId(convs[0].id); setActive(convs[0]); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [active?.messages]);
  useEffect(() => { setActive(conversations.find((c) => c.id === activeId) ?? null); }, [activeId, conversations]);

  const newChat = async () => {
    const { data, error: err } = await supabase.from('ai_conversations').insert({ messages: [] }).select('*').maybeSingle();
    if (err || !data) { setError(t('ai.error')); return; }
    const conv = data as Conversation;
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id); setActive(conv);
  };

  const removeChat = async (id: string) => {
    await supabase.from('ai_conversations').delete().eq('id', id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) { setActiveId(null); setActive(null); }
  };

  const generateLocalResponse = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes('douleur') || q.includes('pain') || q.includes('mal')) {
      return lang === 'fr'
        ? "Les douleurs en milieu de cycle peuvent être liées à l'ovulation (mittelschmerz) ou aux règles. Si elles sont intenses, persistantes ou accompagnées de fièvre, consulte un professionnel de santé. Je ne peux pas poser de diagnostic."
        : "Mid-cycle pain may be linked to ovulation (mittelschmerz) or your period. If pain is intense, persistent, or accompanied by fever, consult a healthcare professional. I cannot make a diagnosis.";
    }
    if (q.includes('cycle') || q.includes('cycles')) {
      return lang === 'fr'
        ? "Pour analyser tes cycles, j'ai besoin de tes données de suivi. En moyenne, un cycle dure 28 jours avec une ovulation vers J14. Des variations de 21 à 35 jours sont normales. Consulte un médecin si tes cycles sont très irréguliers."
        : "To analyze your cycles, I need your tracking data. On average, a cycle lasts 28 days with ovulation around day 14. Variations from 21 to 35 days are normal. See a doctor if your cycles are very irregular.";
    }
    if (q.includes('gynéco') || q.includes('gynecologist') || q.includes('consult')) {
      return lang === 'fr'
        ? "Questions utiles pour ton gynécologue : 1) Mes cycles sont-ils normaux ? 2) Quelle méthode contraceptive me convient ? 3) Faut-il faire un frottis ? 4) Quels examens préventifs recommandes-tu ? 5) J'ai des douleurs, que faire ?"
        : "Useful questions for your gynecologist: 1) Are my cycles normal? 2) Which contraceptive method suits me? 3) Should I get a Pap smear? 4) What preventive exams do you recommend? 5) I have pain, what should I do?";
    }
    return lang === 'fr'
      ? "Je suis ton assistant santé Mafo. Je peux t'aider à comprendre ton cycle, préparer tes consultations et suivre tes symptômes. Rappelle-toi : je ne remplace pas un médecin. Pour tout symptôme inquiétant, consulte un professionnel."
      : "I'm your Mafo health assistant. I can help you understand your cycle, prepare your consultations, and track your symptoms. Remember: I don't replace a doctor. For any worrying symptom, consult a professional.";
  };

  const send = async () => {
    if (!input.trim() || busy) return;
    const question = input.trim();
    setInput('');
    setBusy(true);
    setError(null);

    let conv = active;
    if (!conv) {
      const { data } = await supabase.from('ai_conversations').insert({ messages: [] }).select('*').maybeSingle();
      if (!data) { setBusy(false); setError(t('ai.error')); return; }
      conv = data as Conversation;
      setConversations((prev) => [conv!, ...prev]);
      setActiveId(conv.id);
    }

    const userMsg: Message = { role: 'user', content: question };
    const newMessages = [...conv.messages, userMsg];
    setActive({ ...conv, messages: newMessages });

    // Call AI edge function (falls back to local if no API key configured).
    let response: string;
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages: [...newMessages], lang }),
      });
      if (!resp.ok) throw new Error('AI request failed');
      const data = await resp.json();
      response = data.content || generateLocalResponse(question);
    } catch {
      await new Promise((r) => setTimeout(r, 600));
      response = generateLocalResponse(question);
    }
    const assistantMsg: Message = { role: 'assistant', content: response };
    const finalMessages = [...newMessages, assistantMsg];

    const { error: err } = await supabase.from('ai_conversations').update({
      messages: finalMessages,
      title: conv.title ?? question.slice(0, 40),
      updated_at: new Date().toISOString(),
    }).eq('id', conv.id);

    setBusy(false);
    if (err) { setError(t('ai.error')); return; }
    setActive({ ...conv, messages: finalMessages, title: conv.title ?? question.slice(0, 40) });
    setConversations((prev) => prev.map((c) => (c.id === conv!.id ? { ...c, messages: finalMessages, title: conv!.title ?? question.slice(0, 40) } : c)));
  };

  const suggestions = ['ai.suggestion1', 'ai.suggestion2', 'ai.suggestion3'];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('ai.title')}</h1>
        <p className="mt-1 text-sm text-neutral">{t('ai.subtitle')}</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-ocre-50 p-3 text-xs text-ocre-700 dark:bg-ocre-400/10 dark:text-ocre-200">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <span>{t('ai.disclaimer')}</span>
      </div>

      {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        {/* Sidebar: conversations */}
        <div className="space-y-2">
          <button onClick={newChat} className="btn-primary w-full px-3 py-2 text-sm"><Plus size={14} /> {t('ai.newChat')}</button>
          <div className="space-y-1">
            {conversations.map((c) => (
              <div key={c.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all ${activeId === c.id ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200' : 'text-aubergine-600 hover:bg-aubergine-50 dark:text-sable-100/70 dark:hover:bg-white/5'}`}>
                <button onClick={() => setActiveId(c.id)} className="flex-1 truncate text-left">{c.title ?? t('ai.newChat')}</button>
                <button onClick={() => removeChat(c.id)} className="opacity-0 transition-opacity group-hover:opacity-100"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="card flex h-[60vh] flex-col overflow-hidden p-0">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-neutral"><Loader2 size={16} className="animate-spin" /> {t('ai.thinking')}</div>
            ) : !active || active.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200"><Bot size={26} /></div>
                <p className="max-w-xs text-sm text-neutral">{t('ai.welcome')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => setInput(t(s as never))} className="rounded-full border border-aubergine-200 px-3 py-1.5 text-xs text-aubergine-600 transition-colors hover:border-rose-400 hover:text-rose-500 dark:border-white/10 dark:text-sable-100/70">
                      {t(s as never)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              active.messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === 'user' ? 'bg-aubergine-600 text-white' : 'bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200'}`}>
                    {m.role === 'user' ? t('ai.you')[0] : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-aubergine-600 text-white' : 'bg-aubergine-50 text-aubergine-700 dark:bg-white/5 dark:text-sable-100'}`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))
            )}
            {busy && (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200"><Bot size={16} /></div>
                <div className="flex items-center gap-1 rounded-2xl bg-aubergine-50 px-4 py-3 dark:bg-white/5">
                  <Loader2 size={14} className="animate-spin text-rose-500" />
                  <span className="text-xs text-neutral">{t('ai.thinking')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-aubergine-100 p-4 dark:border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={t('ai.placeholder')}
                className="flex-1 rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
              />
              <button onClick={send} disabled={busy || !input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500 text-white transition-colors hover:bg-rose-600 disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
