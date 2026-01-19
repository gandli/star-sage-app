import { useState, useEffect, type RefObject } from 'react';

interface GridDimensions {
    columns: number;
    rows: number;
    itemsPerPage: number;
}

/**
 * Hook to calculate grid dimensions based on a container's size.
 * Useful for auto-filling pagination results.
 */
export function useResponsiveGrid(containerRef: RefObject<HTMLElement>): GridDimensions {
    const [dimensions, setDimensions] = useState<GridDimensions>({
        columns: 4,
        rows: 2,
        itemsPerPage: 48 // 4 * 12 = 48 (divisible by 3 and 4)
    });

    useEffect(() => {
        let observer: ResizeObserver | null = null;
        let retryCount = 0;
        const maxRetries = 10; // Try for ~1 second

        const init = () => {
            const container = containerRef.current;
            if (!container) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(init, 100);
                } else {
                    console.warn('[useResponsiveGrid] containerRef.current is null after retries');
                }
                return;
            }

            const calculate = () => {
                const style = window.getComputedStyle(container);
                const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
                const width = container.clientWidth - paddingX;

                // 1. Calculate columns based on actual gap and minimum card width
                // This strictly matches CSS: repeat(auto-fill, minmax(280px, 1fr)) with gap-6 (24px)
                const minCardWidth = 280;
                const gap = 24;

                // CSS auto-fill uses the content width of the container. 
                let columns = Math.floor((width + gap) / (minCardWidth + gap));
                columns = Math.max(1, columns);

                // 2. Recommended items per page. 
                // We want it to be large enough to fill the initial view and some scrolling,
                // but CRITICALLY it must be a multiple of columns to avoid empty cells in the grid.
                const targetRows = 12;
                const itemsPerPage = columns * targetRows;

                console.log('[useResponsiveGrid] Calculated:', { width, columns, itemsPerPage });

                setDimensions(prev => {
                    // Only update if changed to avoid loops
                    if (prev.columns === columns && prev.itemsPerPage === itemsPerPage) return prev;
                    return {
                        columns,
                        rows: targetRows,
                        itemsPerPage
                    };
                });
            };

            // Initial calculation
            calculate();

            // Observe resize
            observer = new ResizeObserver(calculate);
            observer.observe(container);
        };

        // Start initialization
        init();

        return () => {
            if (observer) observer.disconnect();
        };
    }, [containerRef]); // Keep dependency stable, relying on ref mutation

    return dimensions;
}
