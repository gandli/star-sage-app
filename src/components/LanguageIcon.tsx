import React from 'react';
import { Code2, Database, Box, Globe, FileJson, Layers } from 'lucide-react';
import { getLanguageColor } from '../utils/theme';

interface LanguageIconProps {
    name: string;
    color?: string;
    size?: number;
    className?: string;
}

const LANGUAGE_MAPPINGS: Record<string, string> = {
    'javascript': 'javascript',
    'typescript': 'typescript',
    'python': 'python',
    'java': 'java',
    'c#': 'csharp',
    'c++': 'cplusplus',
    'cpp': 'cplusplus',
    'c': 'c',
    'go': 'go',
    'ruby': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'rust': 'rust',
    'scala': 'scala',
    'dart': 'dart',
    'shell': 'bash',
    'bash': 'bash',
    'powershell': 'powershell',
    'html': 'html5',
    'css': 'css3',
    'sass': 'sass',
    'scss': 'sass',
    'less': 'less',
    'vue': 'vuejs',
    'react': 'react',
    'angular': 'angularjs',
    'svelte': 'svelte',
    'dockerfile': 'docker',
    'sql': 'mysql',
    'pl/sql': 'oracle',
    'vim script': 'vim',
    'lua': 'lua',
    'r': 'r',
    'objective-c': 'objectivec',
    'clojure': 'clojure',
    'haskell': 'haskell',
    'elixir': 'elixir',
    'elm': 'elm',
    'julia': 'julia',
    'perl': 'perl',
    'markdown': 'markdown',
    'jupyter notebook': 'jupyter',
    'arduino': 'arduino',
    'nginx': 'nginx',
    'graphql': 'graphql',
    'solidity': 'solidity',
};

export const LanguageIcon: React.FC<LanguageIconProps> = ({ name, color, size = 16, className = '' }) => {
    const finalColor = color || getLanguageColor(name);
    const iconProps = { size, style: { color: finalColor }, className: `shrink-0 transition-transform group-hover:scale-110 ${className}` };

    // Map common languages to devicon classes
    const lowerName = name.toLowerCase();
    let deviconClass = '';

    // Direct lookup or fuzzy match
    if (LANGUAGE_MAPPINGS[lowerName]) {
        deviconClass = LANGUAGE_MAPPINGS[lowerName];
    } else {
        // Try to find a partial match
        for (const key in LANGUAGE_MAPPINGS) {
            if (lowerName.includes(key)) {
                deviconClass = LANGUAGE_MAPPINGS[key];
                break;
            }
        }
    }

    if (deviconClass) {
        // Use 'colored' class for original brand colors ONLY if no custom color is provided
        const useColored = !color;
        return (
            <i
                className={`devicon-${deviconClass}-plain ${useColored ? 'colored' : ''} shrink-0 transition-transform group-hover:scale-110 ${className}`}
                style={{ fontSize: `${size}px`, color: color || undefined }}
            ></i>
        );
    }

    // Fallback to Lucide icons for others
    if (lowerName === 'others') return <Layers {...iconProps} />;
    if (lowerName === 'unknown' || lowerName.includes('unknown')) return <Code2 {...iconProps} />;
    if (lowerName.includes('web')) return <Globe {...iconProps} />;
    if (lowerName.includes('json') || lowerName.includes('yaml')) return <FileJson {...iconProps} />;
    if (lowerName.includes('docker') || lowerName.includes('kube')) return <Box {...iconProps} />;
    if (lowerName.includes('db') || lowerName.includes('database')) return <Database {...iconProps} />;

    // Default fallback
    return <Code2 {...iconProps} />;
};
