
import { createClient } from '@supabase/supabase-js';
import { exercises } from './exercises';
import { applyAction, emptyProgress } from './grading';
import type { Progress } from './grading';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const backendConfigured = Boolean(url.startsWith('https://') && key.startsWith('sb_publishable_'));
const client = backendConfigured ? createClient(url, key) : null;
const required = () => {
  if (!client) throw new Error('The site owner has not connected Supabase yet.');
  return client;
};
type LabUser = { userId: string; email?: string; name?: string };
const userView = (user: { id: string; email?: string }): LabUser => ({
  userId: user.id, email: user.email, name: user.email?.split('@')[0]
});

export const auth = {
  onSignedOut(callback: () => void) {
    if (!client) return () => {};
    const { data } = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') callback();
    });
    return () => data.subscription.unsubscribe();
  },
  async getUser(): Promise<LabUser | null> {
    if (!client) return null;
    const { data: session } = await client.auth.getSession();
    if (!session.session) return null;
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user ? userView(data.user) : null;
  },
  async signIn(email: string, password: string) {
    const { data, error } = await required().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: userView(data.user) };
  },
  async signOut() {
    const { error } = await required().auth.signOut();
    if (error) throw error;
  }
};

async function signedIn() {
  const user = await auth.getUser();
  if (!user) throw new Error('Sign in to access your progress.');
  return user;
}

export const api = {
  async get(path: string) {
    if (path !== '/api/progress') throw new Error('Unknown endpoint');
    const user = await signedIn();
    const { data, error } = await required().from('lab_progress')
      .select('exercise_id,data,revision').eq('user_id', user.userId).limit(10);
    if (error) throw error;
    return { data: { progress: exercises.map(e => {
      const saved = data?.find(row => row.exercise_id === e.id);
      return saved ? { ...saved.data, id: e.id, revision: saved.revision } as Progress : emptyProgress(e.id);
    }) } };
  },
  async post(path: string, body: { action: string; command: string; revision: number; requestId: string }) {
    const id = path.split('/').pop() || '';
    if (!exercises.some(e => e.id === id)) throw new Error('Unknown exercise');
    await signedIn();
    const { data } = await api.get('/api/progress');
    const prior = data.progress.find(p => p.id === id)!;
    if (prior.requestId === body.requestId) return { data: prior };
    if (prior.revision !== body.revision) throw new Error('Progress changed. Reload and retry.');
    const next = applyAction(prior, body.action, body.command, body.requestId);
    const { data: saved, error } = await required().rpc('save_lab_progress', {
      p_exercise_id: id, p_revision: body.revision, p_request_id: body.requestId, p_data: next
    });
    if (error) throw error;
    return { data: saved as Progress };
  }
};
