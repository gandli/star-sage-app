import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppState } from './useAppState';

describe('useAppState', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        // Clear localStorage
        localStorage.clear();

        // Mock window.location
        // JSDOM usually allows history.pushState to update location
        window.history.pushState({}, '', '/');
    });

    afterEach(() => {
       // Cleanup
    });

    it('should sanitize currentPage if huge number is present in URL', () => {
        // Simulate URL with huge page number
        window.history.pushState({}, '', '/?page=15668040695809');

        const { result } = renderHook(() => useAppState());

        // Expect it to default to 1 due to sanitization
        expect(result.current.currentPage).toBe(1);
    });

    it('should initialize currentPage with 1 if page param is missing', () => {
        window.history.pushState({}, '', '/');
        const { result } = renderHook(() => useAppState());
        expect(result.current.currentPage).toBe(1);
    });
});
