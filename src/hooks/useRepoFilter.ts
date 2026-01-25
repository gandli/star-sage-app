import { useMemo } from 'react';
import type { Repo } from '../types';

interface UseRepoFilterProps {
    repos: Repo[];
    languageStats?: { name: string; value: number }[];
    topicStats?: { name: string; value: number }[];
    trendStats?: { month: string; count: number }[];
    searchQuery: string;
    selectedLanguage: string | null;
    sortOrder: 'starred_at' | 'updated_at' | 'stargazers_count' | 'name';
    sortDirection: 'asc' | 'desc';
    currentPage: number;
    itemsPerPage: number;
    isMobile: boolean;
}

export function useRepoFilter({
    repos,
    languageStats: providedStats,
    topicStats: providedTopicStats,
    trendStats: providedTrendStats,
    searchQuery,
    selectedLanguage,
    sortOrder,
    sortDirection,
    currentPage,
    itemsPerPage,
    isMobile,
}: UseRepoFilterProps) {

    const { languageStats, hotTopics, starTrends } = useMemo(() => {
        const hasLang = providedStats && providedStats.length > 0;
        const hasTopics = providedTopicStats && providedTopicStats.length > 0;
        const hasTrends = providedTrendStats && providedTrendStats.length > 0;

        if (hasLang && hasTopics && hasTrends) {
            return {
                languageStats: providedStats,
                hotTopics: providedTopicStats,
                starTrends: providedTrendStats
            };
        }

        const langCounts: Record<string, number> = {};
        const topicCounts: Record<string, number> = {};
        const trendCounts: Record<string, number> = {};

        // Single pass for all missing stats
        for (let i = 0; i < repos.length; i++) {
            const repo = repos[i];

            if (!hasLang) {
                const lang = repo.language || 'Unknown';
                langCounts[lang] = (langCounts[lang] || 0) + 1;
            }

            if (!hasTopics && repo.topics) {
                for (let j = 0; j < repo.topics.length; j++) {
                    const topic = repo.topics[j];
                    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                }
            }

            if (!hasTrends && repo.starred_at) {
                // Optimize: Use string slicing for ISO dates (YYYY-MM)
                // Fallback to Date parsing if not standard ISO
                let month;
                if (repo.starred_at.length >= 7) {
                    month = repo.starred_at.substring(0, 7);
                } else {
                     const date = new Date(repo.starred_at);
                     month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                }
                trendCounts[month] = (trendCounts[month] || 0) + 1;
            }
        }

        return {
            languageStats: hasLang ? providedStats : Object.entries(langCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value),

            hotTopics: hasTopics ? providedTopicStats : Object.entries(topicCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10),

            starTrends: hasTrends ? providedTrendStats : Object.entries(trendCounts)
                .map(([month, count]) => ({ month, count }))
                .sort((a, b) => a.month.localeCompare(b.month))
        };
    }, [repos, providedStats, providedTopicStats, providedTrendStats]);

    const filteredRepos = useMemo(() => {
        if (!selectedLanguage) return repos;
        return repos.filter(r => (r.language || 'Unknown') === selectedLanguage);
    }, [repos, selectedLanguage]);

    const searchedRepos = useMemo(() => {
        if (!searchQuery.trim()) return filteredRepos;
        const query = searchQuery.toLowerCase();
        return filteredRepos.filter(repo =>
            repo.name.toLowerCase().includes(query) ||
            repo.description?.toLowerCase().includes(query) ||
            (repo.owner?.login || '').toLowerCase().includes(query)
        );
    }, [filteredRepos, searchQuery]);

    const sortedRepos = useMemo(() => {
        return [...searchedRepos].sort((a, b) => {
            // Special handling for dates
            if (sortOrder === 'starred_at' || sortOrder === 'updated_at') {
                const dateA = a[sortOrder as 'starred_at' | 'updated_at'];
                const dateB = b[sortOrder as 'starred_at' | 'updated_at'];

                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;

                if (dateA < dateB) return sortDirection === 'asc' ? -1 : 1;
                if (dateA > dateB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            }

            let valA = a[sortOrder as keyof typeof a];
            let valB = b[sortOrder as keyof typeof b];

            // Handle missing values
            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [searchedRepos, sortOrder, sortDirection]);

    const paginatedRepos = useMemo(() => {
        // Mobile: Cumulative (Infinite Scroll)
        if (isMobile) {
            return sortedRepos.slice(0, currentPage * itemsPerPage);
        }
        // Desktop: Standard Pagination
        const start = (currentPage - 1) * itemsPerPage;
        return sortedRepos.slice(start, start + itemsPerPage);
    }, [sortedRepos, currentPage, itemsPerPage, isMobile]);

    const totalPages = Math.ceil(searchedRepos.length / itemsPerPage);

    const pieData = useMemo(() => {
        if (languageStats.length <= 8) return languageStats;
        const top = languageStats.slice(0, 7);
        const othersValue = languageStats.slice(7).reduce((acc, curr) => acc + curr.value, 0);
        return [...top, { name: 'Others', value: othersValue }];
    }, [languageStats]);


    return {
        languageStats,
        filteredRepos,
        searchedRepos,
        sortedRepos,
        paginatedRepos,
        totalPages,
        pieData,
        hotTopics,
        starTrends
    };
}
