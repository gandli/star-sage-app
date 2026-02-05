import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { cn } from '../utils/theme';
import type { Config } from '../types';

interface SettingsModalProps {
    show: boolean;
    onClose: () => void;
    tempConfig: Config;
    setTempConfig: (config: Config) => void;
    onSave: () => void;
    config: Config;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    show,
    onClose,
    tempConfig,
    setTempConfig,
    onSave,
    config
}) => {
    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={config.value ? onClose : undefined}
                    />
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        className="max-w-lg w-full premium-glass p-10 sm:p-14 rounded-[3rem] relative z-20 shadow-2xl transition-all duration-500"
                    >
                        <div className="flex items-center justify-between mb-12">
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black tracking-tighter uppercase text-balance">Initialization</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Configure your data source</p>
                            </div>
                            {config.value && (
                                <button
                                    onClick={onClose}
                                    className="p-3 bg-black/5 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-2xl cursor-pointer transition-all active:scale-90 shadow-sm"
                                    aria-label="Close settings"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-10">
                            <div className="flex p-1.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                                <button
                                    className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer",
                                        tempConfig.type === 'username' ? "bg-white dark:bg-white/10 shadow-xl shadow-black/5 text-blue-500" : "opacity-30 hover:opacity-60"
                                    )}
                                    onClick={() => setTempConfig({
                                        type: 'username',
                                        // 如果当前 tempConfig 已经是 username，保留其值；否则使用 resolvedUsername 或原 config 的值
                                        value: tempConfig.type === 'username' ? tempConfig.value : (config.resolvedUsername || (config.type === 'username' ? config.value : ''))
                                    })}
                                >Username</button>
                                <button
                                    className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer",
                                        tempConfig.type === 'token' ? "bg-white dark:bg-white/10 shadow-xl shadow-black/5 text-blue-500" : "opacity-30 hover:opacity-60"
                                    )}
                                    onClick={() => setTempConfig({
                                        type: 'token',
                                        // 如果当前 tempConfig 已经是 token，保留其值；否则只在原 config 也是 token 时使用其值
                                        value: tempConfig.type === 'token' ? tempConfig.value : (config.type === 'token' ? config.value : '')
                                    })}
                                >API Token</button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <label htmlFor="settings-config-input" className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                        {tempConfig.type === 'username' ? 'GitHub Public User' : 'Personal Token'}
                                    </label>
                                    {tempConfig.type === 'token' && (
                                        <a href="https://github.com/settings/tokens/new?description=GitHub%20Stars%20Dashboard&scopes=user:follow" target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline animate-pulse">Get Token</a>
                                    )}
                                </div>
                                <input
                                    id="settings-config-input"
                                    type={tempConfig.type === 'token' ? 'password' : 'text'}
                                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[1.5rem] px-6 py-5 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono text-sm placeholder:opacity-20 translate-z-0"
                                    value={tempConfig.value}
                                    onChange={(e) => setTempConfig({ ...tempConfig, value: e.target.value })}
                                    placeholder={tempConfig.type === 'username' ? "e.g. vercel" : "ghp_..."}
                                    spellCheck={false}
                                />
                                {tempConfig.type === 'token' && (
                                    <div className="space-y-2">
                                        <p className="px-2 text-[9px] font-black uppercase tracking-widest opacity-20">Requires 'read:user' or 'public_repo' scope to sync stars</p>
                                        {config.resolvedUsername && config.type === 'token' && (
                                            <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                                    Authenticated as: {config.resolvedUsername}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            className="w-full h-16 mt-12 bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-[1.5rem] flex items-center justify-center gap-4 hover:scale-[1.02] shadow-2xl shadow-blue-500/30 active:scale-[0.98] transition-all cursor-pointer"
                            onClick={onSave}
                        >
                            <Save size={18} />
                            Confirm & Sync
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SettingsModal;
