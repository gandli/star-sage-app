import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Sidebar from './Sidebar'

describe('Sidebar Accessibility', () => {
    const defaultProps = {
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
        theme: 'dark' as const,
        setTheme: vi.fn(),
        loading: false
    }

    it('renders navigation items as buttons', () => {
        render(<Sidebar {...defaultProps} />)

        // These should be buttons
        expect(screen.getByRole('button', { name: /Data Overview/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Starred List/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /TypeScript/i })).toBeInTheDocument()
    })
})
