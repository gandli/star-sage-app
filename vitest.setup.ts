import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn((cb) => {
    return setTimeout(() => cb({
        timeRemaining: () => 50,
        didTimeout: false,
    }), 0) as unknown as number
})

global.cancelIdleCallback = vi.fn((id) => {
    clearTimeout(id)
})
