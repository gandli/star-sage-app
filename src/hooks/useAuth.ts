import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { db } from '../utils/db';

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
                // Prevent duplicate state updates if data remains the same
                setSession(prev => prev?.access_token === session?.access_token ? prev : session);
                setUser(prev => prev?.id === session?.user?.id ? prev : (session?.user ?? null));
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
            // CRITICAL: Clear all localStorage data to prevent sensitive information leakage
            // This prevents the next user from accessing the previous user's GitHub token and config
            const keysToRemove = [
                'gh_stars_config',              // ⛔ CRITICAL: Contains GitHub Token/Username
                'gh_stars_last_sync_time',      // Privacy: Last sync timestamp
                'gh_stars_total_count',         // Privacy: Repository count
                'gh_stars_sync_state',          // Privacy: Sync state information
                'gh_stars_theme',               // Preference: Theme setting
                'gh_stars_sort_order',          // Preference: Sort order
                'gh_stars_sort_direction',      // Preference: Sort direction
                'gh_stars_page',                // Preference: Current page number
                'gh_stars_view',                // Preference: View mode (overview/list)
                'gh_stars_language',            // Preference: Selected language filter
                'gh_stars_search',              // Privacy: Search query history
                'gh_stars_sidebar_collapsed',   // Preference: Sidebar state
            ];

            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    console.warn(`Failed to remove ${key} from localStorage:`, e);
                }
            });

            // Clear IndexedDB data (starred repos, translations, etc.)
            try {
                await db.clearAllData();
                console.log('IndexedDB data cleared on sign out');
            } catch (e) {
                console.warn('Failed to clear IndexedDB:', e);
            }

            // Ensure session state is cleared locally even if network fails
            setSession(null);
            setUser(null);
        }
    };

    return { session, user, loading, signOut };
}
