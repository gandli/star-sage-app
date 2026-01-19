import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
    count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 12 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonCard key={index} index={index} />
            ))}
        </>
    );
};

export const ChartsSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* 1. Pie Chart Skeleton */}
            <ChartCardSkeleton index={0} type="circle" />

            {/* 2. Area Chart Skeleton */}
            <ChartCardSkeleton index={1} type="area" />

            {/* 3. Bar Chart Skeleton */}
            <ChartCardSkeleton index={2} type="bar" />

            {/* 4. Horizontal Bar Skeleton */}
            <ChartCardSkeleton index={3} type="bar-horizontal" />
        </div>
    );
};

export const StatCardsSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} index={i} />
            ))}
        </div>
    );
};

const StatCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        className="premium-glass p-6 rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden bg-white/80 dark:bg-white/5 h-[140px]"
    >
        {/* Shimmer */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
        </div>

        {/* Icon */}
        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 animate-pulse mb-4" />

        {/* Value */}
        <div className="h-8 w-20 bg-black/5 dark:bg-white/5 rounded-lg mb-2 animate-pulse" />

        {/* Label */}
        <div className="h-2.5 w-24 bg-black/5 dark:bg-white/5 rounded animate-pulse opacity-50" />
    </motion.div>
);

const ChartCardSkeleton: React.FC<{ index: number; type: 'circle' | 'area' | 'bar' | 'bar-horizontal' }> = ({ index, type }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        className="premium-glass p-6 md:p-8 h-[380px] md:h-[450px] flex flex-col rounded-[2.5rem] relative overflow-hidden bg-white/5 dark:bg-black/5"
    >
        {/* Shimmer */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/5 dark:via-white/5 to-transparent" />
        </div>

        {/* Title */}
        <div className="h-4 w-32 bg-black/5 dark:bg-white/5 rounded-lg mb-8 animate-pulse" />

        {/* Content */}
        <div className="flex-1 w-full flex items-center justify-center p-4">
            {type === 'circle' && (
                <div className="w-48 h-48 rounded-full border-[16px] border-black/5 dark:border-white/5 animate-pulse" />
            )}
            {type === 'area' && (
                <div className="w-full h-full flex items-end gap-2">
                    <div className="w-full h-3/4 bg-gradient-to-t from-black/5 to-transparent dark:from-white/5 rounded-t-xl animate-pulse" />
                </div>
            )}
            {type === 'bar' && (
                <div className="w-full h-full flex items-end justify-between px-4 gap-4">
                    {[60, 80, 40, 90, 50, 70, 45].map((h, i) => (
                        <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-black/5 dark:bg-white/5 rounded-t-lg animate-pulse" />
                    ))}
                </div>
            )}
            {type === 'bar-horizontal' && (
                <div className="w-full h-full flex flex-col justify-center gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-4 w-16 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
                            <div style={{ width: `${Math.random() * 40 + 40}%` }} className="h-6 bg-black/5 dark:bg-white/5 rounded-r-lg animate-pulse" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    </motion.div>
);

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
                delay: (index % 12) * 0.05,
                type: "spring",
                stiffness: 100,
                damping: 15
            }}
            // Updated to match RepoCard: p-6, rounded-[2.5rem], min-h-[180px]
            className="relative flex flex-col p-6 rounded-[2.5rem] premium-glass transition-all duration-500 bg-[var(--bg-glass)] min-h-[180px] w-full overflow-hidden"
        >
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]">
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Avatar - matched to w-9 h-9 rounded-xl */}
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse" />
                        <div className="flex flex-col gap-1.5 min-w-0">
                            {/* Owner name */}
                            <div className="h-2.5 w-24 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                            {/* Date */}
                            <div className="h-2 w-28 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse opacity-60" />
                        </div>
                    </div>
                </div>

                {/* Title skeleton - matched text-lg */}
                <div className="h-6 w-3/4 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-lg animate-pulse mb-3" />

                {/* Description skeleton - flex-grow to push footer down */}
                <div className="flex flex-col gap-2.5 mb-4 flex-grow">
                    <div className="h-3.5 w-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse opacity-80" />
                    <div className="h-3.5 w-5/6 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse opacity-80" />
                </div>

                {/* Topics skeleton */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    <div className="h-5 w-16 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-full animate-pulse opacity-50" />
                    <div className="h-5 w-12 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-full animate-pulse opacity-50" />
                    <div className="h-5 w-20 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-full animate-pulse opacity-50" />
                </div>

                {/* Footer skeleton */}
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-[var(--border-main)]/50">
                    <div className="flex items-center gap-4">
                        {/* Language */}
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse" />
                            <div className="h-2.5 w-16 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                        </div>
                        {/* Stars */}
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse" />
                            <div className="h-2.5 w-10 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                        </div>
                    </div>

                    {/* External links - ZRead & DeepWiki logos */}
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse opacity-60" />
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse opacity-60" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
