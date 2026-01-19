import { useState, useTransition, useEffect } from 'react';

export function useAppState() {
    const [, startTransition] = useTransition();

    const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('gh_stars_theme') as 'light' | 'dark') || 'light';
    });

    const [activeView, setActiveView] = useState<'overview' | 'list'>(() => {
        const params = new URLSearchParams(window.location.search);
        const urlView = params.get('view');
        if (urlView === 'overview' || urlView === 'list') return urlView;
        if (params.has('q') || params.has('lang')) return 'list';
        return (localStorage.getItem('gh_stars_view') as 'overview' | 'list') || 'overview';
    });

    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('lang') || localStorage.getItem('gh_stars_language');
    });

    const [currentPage, setCurrentPage] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const urlPage = params.get('page');
        if (urlPage) return parseInt(urlPage, 10);
        return parseInt(localStorage.getItem('gh_stars_page') || '1', 10);
    });

    const [searchQuery, setSearchQuery] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('q') || localStorage.getItem('gh_stars_search') || '';
    });

    const [sortOrder, setSortOrder] = useState<'starred_at' | 'updated_at' | 'stargazers_count' | 'name'>(() => {
        return (localStorage.getItem('gh_stars_sort_order') as 'starred_at' | 'updated_at' | 'stargazers_count' | 'name') || 'starred_at';
    });

    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
        return (localStorage.getItem('gh_stars_sort_direction') as 'asc' | 'desc') || 'desc';
    });

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Helpers to wrapping state updates
    const setTheme = (t: 'light' | 'dark') => {
        startTransition(() => setThemeState(t));
    };

    // Persistence effects
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('gh_stars_theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('gh_stars_sort_order', sortOrder);
    }, [sortOrder]);

    useEffect(() => {
        localStorage.setItem('gh_stars_sort_direction', sortDirection);
    }, [sortDirection]);

    useEffect(() => {
        if (activeView || selectedLanguage) setIsMobileMenuOpen(false);
    }, [activeView, selectedLanguage]);

    return {
        theme, setTheme,
        activeView, setActiveView,
        selectedLanguage, setSelectedLanguage,
        currentPage, setCurrentPage,
        searchQuery, setSearchQuery,
        sortOrder, setSortOrder,
        sortDirection, setSortDirection,
        isMobileMenuOpen, setIsMobileMenuOpen,
        showSettings, setShowSettings
    };
}
