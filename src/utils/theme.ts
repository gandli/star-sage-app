import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const getLanguageColor = (lang: string) => {
    const mapping: Record<string, string> = {
        TypeScript: '#3178c6',
        JavaScript: '#f7df1e',
        Python: '#3776ab',
        Rust: '#dea584',
        Go: '#00add8',
        Java: '#b07219',
        C: '#555555',
        'C++': '#f34b7d',
        PHP: '#4f5d95',
        Ruby: '#701516',
        Swift: '#ffac45',
        Kotlin: '#F18E33'
    };
    return mapping[lang] || '#8b949e';
};

export const THEME_VARS = {
    bg: 'var(--bg-main)',
    sidebar: 'var(--bg-sidebar)',
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    border: 'var(--border-main)',
    glassBg: 'var(--bg-glass)',
    glassBorder: 'var(--border-glass)',
    chartGrid: 'var(--chart-grid)',
    headerBg: 'var(--bg-header)',
};

export const CHART_PALETTE = ['#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#6366f1'];
