import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartsSkeleton } from './LoadingSkeleton';
import CoreMetrics from './CoreMetrics';
import RepoList from './RepoList';
import type { Repo, Config, SyncProgress } from '../types';

const Charts = lazy(() => import('./Charts'));

interface MainContentProps {
    activeView: 'overview' | 'list';
    loading: boolean;
    totalRepos: number;
    languageStats: { name: string; value: number }[];
    translationPercentage: number;
    translatedRepos: number;
    pieData: any[]; // Charts expect specific structure
    starTrends: any[];
    hotTopics: any[];
    syncProgress: SyncProgress | null;
    paginatedRepos: Repo[];
    config: Config;
}

export const MainContent: React.FC<MainContentProps> = ({
    activeView,
    loading,
    totalRepos,
    languageStats,
    translationPercentage,
    translatedRepos,
    pieData,
    starTrends,
    hotTopics,
    syncProgress,
    paginatedRepos,
    config
}) => {
    return (
        <AnimatePresence mode="wait">
            {activeView === 'overview' ? (
                <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="max-w-6xl mx-auto space-y-8"
                >
                    <CoreMetrics
                        loading={loading}
                        totalRepos={totalRepos}
                        languageStats={languageStats}
                        translationPercentage={translationPercentage}
                        translatedRepos={translatedRepos}
                    />
                    <AnimatePresence mode="wait">
                        {loading && totalRepos === 0 ? (
                            <motion.div
                                key="charts-skeleton"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChartsSkeleton />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="charts-content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                <Suspense fallback={<ChartsSkeleton />}>
                                    <Charts
                                        pieData={pieData}
                                        languageStats={languageStats}
                                        starTrends={starTrends}
                                        hotTopics={hotTopics}
                                        isSyncing={!!syncProgress}
                                    />
                                </Suspense>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 relative overflow-hidden min-h-0"
                >
                    <div className="absolute inset-0">
                        <RepoList
                            repos={paginatedRepos}
                            token={config.type === 'token' ? config.value : undefined}
                            loading={loading}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
