import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) console.error("Session fetch error:", error.message);
            if (isMounted) {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log(`Auth event: ${_event}`);
            if (isMounted) {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);

                // Clean up the URL hash if it contains the auth token
                if (session && window.location.hash.includes('access_token')) {
                    let cleanUrl = window.location.origin + window.location.pathname;
                    if (cleanUrl.endsWith('.html')) {
                        cleanUrl = cleanUrl.substring(0, cleanUrl.lastIndexOf('/') + 1);
                    }
                    if (!cleanUrl.endsWith('/')) cleanUrl += '/';
                    window.history.replaceState(null, '', cleanUrl);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error: any) {
            console.warn("Sign out request failed (probably session already expired):", error.message);
            // Even if the server request fails (e.g. 403 session missing), we should still clear local state
            // Supabase auth client usually does this internally, but we can force it or just ignore the error.
        } finally {
            // Ensure session state is cleared locally even if network fails
            setSession(null);
            setUser(null);
        }
    };

    return { session, user, loading, signOut };
}
