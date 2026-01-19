import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ErrorToastProps {
    error: string;
    onClose: () => void;
    onConfigure: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ error, onClose, onConfigure }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 max-w-lg w-full px-6 z-[110]"
        >
            <div className="bg-white dark:bg-zinc-900 border border-red-500/20 dark:border-red-500/30 shadow-2xl rounded-[2rem] p-6 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500/10 dark:bg-red-500/20 rounded-2xl text-red-500 dark:text-red-400 flex-shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h4 className="font-black uppercase tracking-tighter text-lg text-gray-900 dark:text-white">
                            {error === 'TOKEN_INVALID' ? 'Authentication Failed' :
                                error === 'NO_PUBLIC_DATA' ? 'No Public Stars found' :
                                    error === 'NO_DATA' ? 'Empty Repository List' : 'Sync Interrupted'}
                        </h4>
                        <p className="text-sm opacity-60 dark:opacity-70 leading-relaxed text-gray-700 dark:text-gray-300">
                            {error === 'TOKEN_INVALID' ? 'Your Personal Access Token is invalid or has expired. Please check your token permissions.' :
                                error === 'NO_PUBLIC_DATA' ? 'No public starred repositories found for this user. If your stars are private, please use an API Token instead.' :
                                    error === 'NO_DATA' ? 'We couldn\'t find any starred repositories associated with this account. Try another source?' :
                                        'The GitHub API connection was lost. Please check your network or try again later.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { onClose(); onConfigure(); }}
                        className="flex-1 bg-red-500 dark:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-500/20 dark:shadow-red-500/30"
                    >
                        Configure {error === 'NO_PUBLIC_DATA' ? 'Token' : 'Source'}
                    </button>
                    {error === 'NO_PUBLIC_DATA' && (
                        <a
                            href="https://github.com/settings/tokens"
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 bg-black/5 dark:bg-white/10 font-black uppercase tracking-widest text-[10px] py-4 rounded-xl text-center hover:bg-black/10 dark:hover:bg-white/15 transition-all text-gray-900 dark:text-white"
                        >
                            Go to GitHub
                        </a>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
