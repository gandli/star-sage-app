import { useEffect } from 'react';

interface UseUrlSyncProps {
    activeView: 'overview' | 'list';
    currentPage: number;
    selectedLanguage: string | null;
    searchQuery: string;
    isMounted: boolean;
}

export function useUrlSync({
    activeView,
    currentPage,
    selectedLanguage,
    searchQuery,
    isMounted
}: UseUrlSyncProps) {

    useEffect(() => {
        if (!isMounted) return;

        const params = new URLSearchParams(window.location.search);

        // View - Always set to prevent ambiguity and cloud sync jumps
        params.set('view', activeView);
        localStorage.setItem('gh_stars_view', activeView);

        // Page
        if (currentPage > 1) params.set('page', currentPage.toString());
        else params.delete('page');
        localStorage.setItem('gh_stars_page', currentPage.toString());

        // Language
        if (selectedLanguage) {
            params.set('lang', selectedLanguage);
            localStorage.setItem('gh_stars_language', selectedLanguage);
        } else {
            params.delete('lang');
            localStorage.removeItem('gh_stars_language');
        }

        // Search
        if (searchQuery.trim()) {
            params.set('q', searchQuery);
            localStorage.setItem('gh_stars_search', searchQuery);
        } else {
            params.delete('q');
            localStorage.setItem('gh_stars_search', '');
        }

        // Update URL without adding to history
        const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        if (window.location.search !== `?${params.toString()}` && (params.toString() || window.location.search)) {
            window.history.replaceState({}, '', newUrl);
        }
    }, [activeView, currentPage, selectedLanguage, searchQuery, isMounted]);
}
