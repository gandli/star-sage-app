import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SettingsModal from './SettingsModal'
import type { Config } from '../types'

// Mock framer-motion to render children immediately
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('SettingsModal', () => {
    const mockConfig: Config = {
        type: 'username',
        value: 'testuser',
        resolvedUsername: 'testuser'
    }

    const defaultProps = {
        show: true,
        onClose: vi.fn(),
        tempConfig: { ...mockConfig },
        setTempConfig: vi.fn(),
        onSave: vi.fn(),
        config: mockConfig
    }

    it('should export SettingsModal component', () => {
        expect(SettingsModal).toBeDefined()
    })

    it('should have an accessible close button', () => {
        render(<SettingsModal {...defaultProps} />)

        // Check for the close button by its accessible name
        // This will throw an error if the element is not found
        const closeButton = screen.getByRole('button', { name: /close settings/i })
        expect(closeButton).toBeDefined()
    })
})
