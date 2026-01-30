import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from './Sidebar';
import type { Repo, Profile } from '../types';

// Mock dependencies
const mockRepos: Repo[] = [];
const mockLanguageStats = [{ name: 'TypeScript', value: 10 }, { name: 'JavaScript', value: 5 }];
const mockProfile: Profile = {
    id: '123',
    username: 'testuser',
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.png',
    updated_at: new Date().toISOString()
};

const defaultProps = {
    activeView: 'overview' as const,
    setActiveView: vi.fn(),
    repos: mockRepos,
    languageStats: mockLanguageStats,
    selectedLanguage: null,
    setSelectedLanguage: vi.fn(),
    setCurrentPage: vi.fn(),
    syncProgress: null,
    onOpenSettings: vi.fn(),
    onSignOut: vi.fn(),
    profile: mockProfile,
    isOpen: true,
    onClose: vi.fn(),
    theme: 'light' as const,
    setTheme: vi.fn(),
    loading: false
};

describe('Sidebar Accessibility', () => {
    it('renders navigation items as semantic buttons', () => {
        render(<Sidebar {...defaultProps} />);

        // Check for main navigation items
        const overviewBtn = screen.getByRole('button', { name: /data overview/i });
        const listBtn = screen.getByRole('button', { name: /starred list/i });

        expect(overviewBtn).toBeInTheDocument();
        expect(listBtn).toBeInTheDocument();

        // Check for language filter buttons
        const allBtn = screen.getByRole('button', { name: /all/i });
        expect(allBtn).toBeInTheDocument();

        const tsBtn = screen.getByRole('button', { name: /typescript/i });
        expect(tsBtn).toBeInTheDocument();
    });

    it('has accessible labels in collapsed mode', () => {
        // Mock localStorage to force collapsed state
        const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
        getItemSpy.mockReturnValue('true');

        render(<Sidebar {...defaultProps} />);

        // In collapsed mode, text is hidden, so we rely on aria-labels or titles.
        // The component uses title attribute which acts as accessible name if aria-label is missing,
        // but explicit aria-label is better.
        // However, since my plan is to add aria-labels, I'll test for them.
        // For now, let's just see if we can find them by their accessible name (which will be title currently).

        const overviewBtn = screen.getByRole('button', { name: /data overview/i });
        expect(overviewBtn).toBeInTheDocument();

        getItemSpy.mockRestore();
    });
});
