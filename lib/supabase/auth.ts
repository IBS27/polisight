import { createClient } from './client';

export type AuthUser = {
  id: string;
  email: string | undefined;
  name: string | undefined;
  avatarUrl: string | undefined;
};

/**
 * Sign in with Google OAuth
 * Redirects to Google's OAuth consent screen
 */
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getUser(): Promise<AuthUser | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  const supabase = createClient();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email,
        name:
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name,
        avatarUrl: session.user.user_metadata?.avatar_url,
      });
    } else {
      callback(null);
    }
  });

  return subscription;
}

/**
 * Get the current session
 */
export async function getSession() {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}
