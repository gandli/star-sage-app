import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { Star, Code2, Languages } from 'lucide-react';
import { LanguageIcon } from './LanguageIcon';
import { StatCardsSkeleton } from './LoadingSkeleton';

interface StatCardProps {
    icon: React.ReactNode;
    value: string | number;
    label: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => (
    <GlassCard className="text-center group">
        <div className="mx-auto mb-4 flex justify-center transform group-hover:scale-110 transition-transform duration-500">
            {React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: 24 })}
        </div>
        <div className="text-3xl font-black tracking-tighter tabular-nums mb-1 truncate px-1">{value}</div>
        <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-70 transition-opacity">{label}</div>
    </GlassCard>
);

interface CoreMetricsProps {
    loading: boolean;
    totalRepos: number;
    languageStats: Array<{ name: string; value: number }>;
    translationPercentage: number;
    translatedRepos: number;
}

const CoreMetrics: React.FC<CoreMetricsProps> = ({
    loading,
    totalRepos,
    languageStats,
    translationPercentage,
    translatedRepos
}) => {
    return (
        <AnimatePresence mode="wait">
            {loading && totalRepos === 0 ? (
                <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <StatCardsSkeleton />
                </motion.div>
            ) : (
                <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
                >
                    <StatCard
                        icon={<Star size={32} className="text-yellow-500" />}
                        value={totalRepos}
                        label="Starred Repos"
                    />
                    <StatCard
                        icon={<Code2 size={32} className="text-purple-500" />}
                        value={languageStats.length}
                        label="Different Languages"
                    />
                    <StatCard
                        icon={languageStats[0]?.name ? <LanguageIcon name={languageStats[0].name} size={32} /> : <Code2 size={32} className="text-blue-500" />}
                        value={languageStats[0]?.name || '-'}
                        label="Dominant Language"
                    />
                    <StatCard
                        icon={<Languages size={32} className="text-green-500" />}
                        value={`${translationPercentage}%`}
                        label={`ZH/CN: ${translatedRepos} Projects`}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CoreMetrics;
