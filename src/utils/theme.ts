import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Official Devicon/Brand Colors
const LANGUAGE_COLOR_MAPPING: Record<string, string> = {
    // Frontend & Web
    'html': '#e34f26',
    'html5': '#e34f26',
    'css': '#1572b6',
    'css3': '#1572b6',
    'javascript': '#f7df1e',
    'js': '#f7df1e',
    'typescript': '#3178c6',
    'ts': '#3178c6',
    'react': '#61dafb',
    'vue': '#4fc08d',
    'vuejs': '#4fc08d',
    'angular': '#dd0031',
    'svelte': '#ff3e00',
    'sass': '#cc6699',
    'scss': '#cc6699',
    'less': '#1d365d',
    'tailwind': '#06b6d4',
    'bootstrap': '#7952b3',

    // Backend & Languages
    'python': '#3776ab',
    'ruby': '#cc342d',
    'php': '#777bb4',
    'java': '#b07219',
    'kotlin': '#7f52ff',
    'swift': '#f05138',
    'go': '#00add8',
    'golang': '#00add8',
    'rust': '#dea584',
    'c': '#555555',
    'c++': '#f34b7d',
    'cpp': '#f34b7d',
    'cplusplus': '#f34b7d',
    'c#': '#178600',
    'csharp': '#178600',
    'objective-c': '#438eff',
    'clojure': '#db5855',
    'elixir': '#4e2a8e',
    'haskell': '#5e5086',
    'lua': '#000080',
    'perl': '#0298c3',
    'r': '#276dc3',
    'scala': '#dc322f',
    'dart': '#0175c2',
    'shell': '#89e051',
    'bash': '#4eaa25',
    'powershell': '#012456',

    // DevOps & Tools
    'docker': '#2496ed',
    'kubernetes': '#326ce5',
    'k8s': '#326ce5',
    'git': '#f05032',
    'github': '#181717',
    'vim': '#019733',
    'neovim': '#57a143',
    'nginx': '#009639',
    'apache': '#d22128',
    'linux': '#fcc624',
    'ubuntu': '#e95420',
    'debian': '#a80030',
    'arch': '#1793d1',
    'macos': '#000000', // Using black/dark for MacOS
    'apple': '#000000',
    'windows': '#0078d6',
    'android': '#3ddc84',
    'ios': '#000000',

    // Data & Astro
    'sql': '#e38c00',
    'mysql': '#4479a1',
    'postgresql': '#336791',
    'postgres': '#336791',
    'mongodb': '#47a248',
    'redis': '#dc382d',
    'sqlite': '#003b57',
    'graphql': '#e10098',
    'json': '#000000',
    'yaml': '#cb171e',
    'markdown': '#000000',
    'jupyter': '#f37626',
    'notebook': '#f37626',

    // AI & Others
    'ai': '#ff6b6b', // Custom AI color
    'llm': '#ff6b6b',
    'machine learning': '#f37626',
    'deep learning': '#f37626',
    'huggingface': '#ffd21e',
    'openai': '#412991',

    // Special cases
    'unknown': '#8b949e',
    'other': '#8b949e',
    'others': '#8b949e',
};

export const getLanguageColor = (lang: string) => {
    const lower = lang.toLowerCase();
    return LANGUAGE_COLOR_MAPPING[lower] || '#8b949e';
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
