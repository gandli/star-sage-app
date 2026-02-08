import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsModal from './SettingsModal';
import type { Config } from '../types';

describe('SettingsModal', () => {
    afterEach(() => {
        cleanup();
    });

    const mockConfig: Config = {
        type: 'username',
        value: 'testuser',
        resolvedUsername: 'testuser'
    };

    const defaultProps = {
        show: true,
        onClose: vi.fn(),
        tempConfig: { ...mockConfig },
        setTempConfig: vi.fn(),
        onSave: vi.fn(),
        config: mockConfig
    };

    it('should be accessible by label for username', () => {
        render(<SettingsModal {...defaultProps} />);

        // Check for the input associated with the label "GitHub Public User"
        // The id association allows getByLabelText to work
        const input = screen.getByLabelText(/GitHub Public User/i);
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('id', 'settings-config-input');
        expect(input).toHaveValue('testuser');
    });

    it('should be accessible by label for token', () => {
        const tokenConfig: Config = { ...mockConfig, type: 'token', value: 'ghp_token' };
        render(<SettingsModal {...defaultProps} tempConfig={tokenConfig} />);

        // Label changes to "Personal Token"
        const input = screen.getByLabelText(/Personal Token/i);
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue('ghp_token');
        expect(input).toHaveAttribute('type', 'password');
    });

    it('should have an accessible close button', () => {
        render(<SettingsModal {...defaultProps} />);

        // Find button by its aria-label
        const closeButton = screen.getByRole('button', { name: /close settings/i });
        expect(closeButton).toBeInTheDocument();
    });

    it('should render confirm button with text', () => {
        render(<SettingsModal {...defaultProps} />);

        const confirmButton = screen.getByRole('button', { name: /confirm & sync/i });
        expect(confirmButton).toBeInTheDocument();
    });
});
