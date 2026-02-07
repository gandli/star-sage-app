import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsModal from './SettingsModal'

describe('SettingsModal', () => {
    const defaultProps = {
        show: true,
        onClose: vi.fn(),
        tempConfig: { type: 'username' as const, value: '' },
        setTempConfig: vi.fn(),
        onSave: vi.fn(),
        config: { type: 'username' as const, value: 'testuser', resolvedUsername: 'testuser' }
    }

    it('should have an accessible close button', () => {
        render(<SettingsModal {...defaultProps} />)
        // This should fail initially because the button has no aria-label
        const closeButton = screen.getByRole('button', { name: /close/i })
        expect(closeButton).toBeInTheDocument()
    })

    it('should have an accessible input for username', () => {
        render(<SettingsModal {...defaultProps} />)
        // This should fail initially because the label is not associated with the input
        const input = screen.getByLabelText(/GitHub Public User/i)
        expect(input).toBeInTheDocument()
    })
})
