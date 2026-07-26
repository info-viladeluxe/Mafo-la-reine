import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile } from '../lib/supabase';

type Goal = 'track_cycle' | 'conceive' | 'pregnancy' | 'wellbeing';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('profile load error', error);
      return;
    }
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      const uid = data.session?.user?.id;
      const finish = uid ? loadProfile(uid) : Promise.resolve();
      finish.finally(() => mounted && setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        const uid = newSession?.user?.id;
        if (uid) {
          await loadProfile(uid);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // Create a profile row on sign-up.
    const uid = data.user?.id;
    if (uid) {
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: uid,
        email,
        lang: (navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr',
      });
      if (profileErr && !profileErr.message.includes('duplicate')) {
        return { error: profileErr.message };
      }
      await loadProfile(uid);
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    const uid = session?.user?.id;
    if (uid) await loadProfile(uid);
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    const uid = session?.user?.id;
    if (!uid) return { error: 'No session' };

    // FIX: on utilise upsert() au lieu de update().
    // Avant, si la ligne `profiles` de cet utilisateur n'existait pas encore
    // (ex: l'insert lors du signUp avait échoué silencieusement, ou une
    // condition de course entre signUp et l'insert), .update() ne trouvait
    // aucune ligne à modifier. Cela ne renvoyait AUCUNE erreur (ce n'est pas
    // une erreur PostgreSQL de ne matcher aucune ligne), mais `data` restait
    // `null`, donc `setProfile` n'était jamais appelé. Résultat : l'état
    // local `profile` ne se mettait jamais à jour, l'app pensait que
    // l'onboarding n'était toujours pas terminé, et l'écran restait bloqué
    // sur la dernière étape sans aucun message d'erreur visible.
    // upsert() garantit que la ligne est créée si elle manque, ou mise à
    // jour si elle existe déjà.
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        { id: uid, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
      .select('*')
      .maybeSingle();

    if (error) return { error: error.message };
    if (data) {
      setProfile(data as Profile);
    } else {
      // Filet de sécurité : si pour une raison quelconque .select() ne
      // renvoie rien après l'upsert, on force un rechargement du profil
      // pour ne jamais rester bloqué silencieusement.
      await loadProfile(uid);
    }
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { Goal };
