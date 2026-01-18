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
        itemsPerPage: 32
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const calculate = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;

            // 1. Calculate columns dynamically based on min-width of cards
            // Min card width is 260px, gap is 16px (gap-4)
            const minCardWidth = 260;
            const gap = 16;

            // Calculate how many cards can fit
            let columns = Math.floor((width + gap) / (minCardWidth + gap));
            columns = Math.max(1, columns); // At least 1 column

            // 2. Calculate rows based on card height (approx 220px) + gap (approx 16px)
            // We want to fill the viewport, so we use container height.
            const cardHeightWithGap = 236;
            const rowsInViewport = Math.max(1, Math.floor(height / cardHeightWithGap));

            // 3. Recommended items per page (fill approx 3-4 viewports for better UX)
            // Must be multiple of columns to avoid jagged ends
            const targetRows = Math.max(rowsInViewport * 3, 6); // At least 6 rows or 3 viewports

            // IMPORTANT: itemsPerPage MUST be a multiple of columns
            const itemsPerPage = columns * targetRows;

            setDimensions({
                columns,
                rows: targetRows,
                itemsPerPage // Already guaranteed to be columns * targetRows
            });
        };

        // Initial calculation
        calculate();

        // Observe resize
        const observer = new ResizeObserver(calculate);
        observer.observe(container);

        return () => observer.disconnect();
    }, [containerRef]);

    return dimensions;
}
