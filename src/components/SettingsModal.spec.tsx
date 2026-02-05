import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsModal from './SettingsModal'

describe('SettingsModal', () => {
    const defaultProps = {
        show: true,
        onClose: vi.fn(),
        tempConfig: { type: 'username' as const, value: 'testuser' },
        setTempConfig: vi.fn(),
        onSave: vi.fn(),
        config: { type: 'username' as const, value: 'testuser', resolvedUsername: 'testuser' }
    }

    it('should export SettingsModal component', () => {
        expect(SettingsModal).toBeDefined()
    })

    it('should have an accessible close button when config is present', () => {
        render(<SettingsModal {...defaultProps} />)
        const closeButton = screen.getByLabelText('Close settings')
        expect(closeButton).toBeInTheDocument()
    })

    it('should associate label with input field for username', () => {
        render(<SettingsModal {...defaultProps} />)
        const input = screen.getByLabelText('GitHub Public User')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('id', 'settings-config-input')
    })

    it('should associate label with input field for token', () => {
        const props = {
            ...defaultProps,
            tempConfig: { type: 'token' as const, value: 'ghp_test' }
        }
        render(<SettingsModal {...props} />)
        const input = screen.getByLabelText('Personal Token')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('id', 'settings-config-input')
        expect(input).toHaveAttribute('type', 'password')
    })
})
