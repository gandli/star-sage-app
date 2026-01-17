import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Github, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot_password';

export const AuthScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleGithubLogin = async () => {
        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    scopes: 'repo read:user', // Request repo access for the app functionality
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            } else if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else if (mode === 'forgot_password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                setMessage('Check your email for the password reset link!');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-primary)] relative overflow-hidden transition-colors duration-500">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="premium-glass p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl border border-white/10 dark:border-white/5">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black tracking-tighter mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                            StarSage
                        </h1>
                        <p className="text-sm opacity-60 font-medium">
                            {mode === 'signin' ? 'Welcome back! Login to continue.' :
                                mode === 'signup' ? 'Create an account to get started.' :
                                    'Reset your password.'}
                        </p>
                    </div>

                    {/* OAuth Buttons */}
                    {mode !== 'forgot_password' && (
                        <div className="mb-6">
                            <button
                                onClick={handleGithubLogin}
                                disabled={loading}
                                className="w-full h-12 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Github size={20} />}
                                <span>Continue with GitHub</span>
                            </button>

                            <div className="relative my-6 text-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[var(--border-main)] opacity-30"></div>
                                </div>
                                <span className="relative px-3 bg-[#f8f9fa] dark:bg-[#0a0a0a] text-xs font-bold opacity-40 uppercase tracking-widest rounded-lg">
                                    Or with email
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Email Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] transition-colors group-focus-within:text-blue-500" size={18} />
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-12 pl-12 pr-4 bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-gray-400 font-medium"
                                />
                            </div>

                            {mode !== 'forgot_password' && (
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] transition-colors group-focus-within:text-blue-500" size={18} />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full h-12 pl-12 pr-4 bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-gray-400 font-medium"
                                    />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    {/* Mode Toggles */}
                    <div className="mt-8 text-center text-xs font-medium space-y-2 text-[var(--text-secondary)]">
                        {mode === 'signin' ? (
                            <>
                                <p>
                                    Don't have an account?{' '}
                                    <button onClick={() => setMode('signup')} className="text-blue-500 hover:underline">Sign up</button>
                                </p>
                                <button onClick={() => setMode('forgot_password')} className="text-[var(--text-primary)] hover:underline opacity-60">
                                    Forgot password?
                                </button>
                            </>
                        ) : mode === 'signup' ? (
                            <p>
                                Already have an account?{' '}
                                <button onClick={() => setMode('signin')} className="text-blue-500 hover:underline">Sign in</button>
                            </p>
                        ) : (
                            <button onClick={() => setMode('signin')} className="text-blue-500 hover:underline flex items-center justify-center gap-1 mx-auto">
                                Back to login
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
