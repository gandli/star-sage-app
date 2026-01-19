import { useMemo } from 'react';
import type { Repo } from '../types';

interface UseRepoFilterProps {
    repos: Repo[];
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
    searchQuery,
    selectedLanguage,
    sortOrder,
    sortDirection,
    currentPage,
    itemsPerPage,
    isMobile,
}: UseRepoFilterProps) {

    const languageStats = useMemo(() => {
        const stats: Record<string, number> = {};
        repos.forEach(repo => {
            const lang = repo.language || 'Unknown';
            stats[lang] = (stats[lang] || 0) + 1;
        });
        return Object.entries(stats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [repos]);

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
            let valA = a[sortOrder as keyof typeof a];
            let valB = b[sortOrder as keyof typeof b];

            // Handle missing values
            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            // Special handling for dates
            if (sortOrder === 'starred_at' || sortOrder === 'updated_at') {
                const dateA = a[sortOrder as 'starred_at' | 'updated_at'];
                const dateB = b[sortOrder as 'starred_at' | 'updated_at'];
                valA = dateA ? new Date(dateA).getTime() : 0;
                valB = dateB ? new Date(dateB).getTime() : 0;
            }

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

    const hotTopics = useMemo(() => {
        const topicCounts: Record<string, number> = {};
        repos.forEach(repo => {
            repo.topics?.forEach(topic => {
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            });
        });
        return Object.entries(topicCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [repos]);

    const starTrends = useMemo(() => {
        const trends: Record<string, number> = {};
        repos.forEach(repo => {
            if (repo.starred_at) {
                const date = new Date(repo.starred_at);
                const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                trends[month] = (trends[month] || 0) + 1;
            }
        });
        return Object.entries(trends)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }, [repos]);

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
