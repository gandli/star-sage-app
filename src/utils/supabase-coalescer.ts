/**
 * A utility to coalesce concurrent identical Supabase queries.
 * This is particularly useful for count queries (HEAD requests) and profile fetches
 * that are triggered by multiple hooks or during rapid re-renders.
 */
class QueryCoalescer {
    private requests = new Map<string, Promise<any>>();

    /**
     * Executes a query or returns existing promise if an identical query is in flight.
     * @param key Unique key for the query (e.g., table:id:select)
     * @param fetcher Async function that performs the actual Supabase call
     */
    async coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
        if (this.requests.has(key)) {
            return this.requests.get(key) as Promise<T>;
        }

        const promise = fetcher();
        this.requests.set(key, promise);

        try {
            return await promise;
        } finally {
            this.requests.delete(key);
        }
    }
}

export const queryCoalescer = new QueryCoalescer();
