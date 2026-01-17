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
                    const cleanUrl = window.location.origin + window.location.pathname;
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
        await supabase.auth.signOut();
    };

    return { session, user, loading, signOut };
}
