import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from './Sidebar'
import React from 'react'

describe('Sidebar', () => {
    const mockProps = {
        activeView: 'overview' as const,
        setActiveView: vi.fn(),
        repos: [],
        languageStats: [{ name: 'TypeScript', value: 10 }],
        selectedLanguage: null,
        setSelectedLanguage: vi.fn(),
        setCurrentPage: vi.fn(),
        syncProgress: null,
        onOpenSettings: vi.fn(),
        onSignOut: vi.fn(),
        profile: null,
        theme: 'light' as const,
        setTheme: vi.fn(),
        isOpen: true,
        onClose: vi.fn(),
        loading: false
    }

    it('should export Sidebar component', () => {
        expect(Sidebar).toBeDefined()
    })

    it('should render navigation items as buttons', () => {
        render(<Sidebar {...mockProps} />)

        // Data Overview button
        const overviewBtn = screen.getByText('Data Overview').closest('button')
        expect(overviewBtn).toBeTruthy()
        expect(overviewBtn?.getAttribute('type')).toBe('button')

        // Starred List button
        const listBtn = screen.getByText('Starred List').closest('button')
        expect(listBtn).toBeTruthy()

        // All Languages button
        const allBtn = screen.getByText('All').closest('button')
        expect(allBtn).toBeTruthy()

        // Language Stats button
        const langBtn = screen.getByText('TypeScript').closest('button')
        expect(langBtn).toBeTruthy()
    })

    it('should have aria-labels on key buttons', () => {
        render(<Sidebar {...mockProps} />)

        // Sign Out
        expect(screen.getByLabelText('Sign out')).toBeTruthy()

        // Settings
        expect(screen.getByLabelText('Settings')).toBeTruthy()

        // Theme Toggle (mobile only usually, but let's check if it's in DOM)
        expect(screen.getByLabelText('Switch to dark mode')).toBeTruthy()
    })
})
