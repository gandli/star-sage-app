import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
    count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 12 }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonCard key={index} index={index} />
            ))}
        </div>
    );
};

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
            className="relative flex flex-col p-4 rounded-[1.75rem] premium-glass border-[var(--border-glass)] bg-[var(--bg-glass)] h-[260px] overflow-hidden"
        >
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]">
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col space-y-3">
                {/* Header skeleton */}
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse" />
                    <div className="flex flex-col gap-1.5">
                        {/* Owner name */}
                        <div className="h-2 w-20 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                        {/* Date */}
                        <div className="h-1.5 w-24 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                    </div>
                </div>

                {/* Title skeleton */}
                <div className="h-5 w-3/4 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />

                {/* Description skeleton */}
                <div className="flex flex-col gap-2 flex-grow">
                    <div className="h-3 w-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                </div>

                {/* Topics skeleton */}
                <div className="flex gap-2 h-[26px]">
                    <div className="h-5 w-16 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-5 w-20 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-5 w-14 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-lg animate-pulse" />
                </div>

                {/* Footer skeleton */}
                <div className="mt-auto pt-3 border-t border-[var(--border-main)] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Language */}
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse" />
                            <div className="h-2 w-16 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                        </div>
                        {/* Stars */}
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse" />
                            <div className="h-2 w-12 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded animate-pulse" />
                        </div>
                    </div>

                    {/* External links */}
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse" />
                        <div className="w-4 h-4 rounded bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 animate-pulse" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
