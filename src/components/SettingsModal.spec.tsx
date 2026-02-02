import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import SettingsModal from './SettingsModal';
import type { Config } from '../types';

describe('SettingsModal', () => {
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

    it('should be accessible', () => {
        render(<SettingsModal {...defaultProps} />);

        // Check for the Close button with aria-label
        const closeButton = screen.getByRole('button', { name: /close settings/i });
        expect(closeButton).toBeInTheDocument();

        // Check for the input field associated with its label
        // The label text changes based on type, but for username it is 'GitHub Public User'
        const input = screen.getByLabelText(/github public user/i);
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('id', 'settings-input');
    });

    it('should switch labels when type changes', () => {
        const props = {
            ...defaultProps,
            tempConfig: { type: 'token' as const, value: '' }
        };
        render(<SettingsModal {...props} />);

        const input = screen.getByLabelText(/personal token/i);
        expect(input).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
        render(<SettingsModal {...defaultProps} />);

        const closeButton = screen.getByRole('button', { name: /close settings/i });
        fireEvent.click(closeButton);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});
