type ObserverCallback = (entry: IntersectionObserverEntry) => void;

class SharedObserver {
    private observer: IntersectionObserver | null = null;
    private listeners = new Map<Element, ObserverCallback>();
    private options: IntersectionObserverInit;

    constructor(options: IntersectionObserverInit = { threshold: 0.1 }) {
        this.options = options;
    }

    private getObserver() {
        if (!this.observer) {
            this.observer = new IntersectionObserver(this.handleIntersections, this.options);
        }
        return this.observer;
    }

    private handleIntersections = (entries: IntersectionObserverEntry[]) => {
        entries.forEach(entry => {
            const listener = this.listeners.get(entry.target);
            if (listener) {
                listener(entry);
            }
        });
    };

    public observe(element: Element, callback: ObserverCallback) {
        this.getObserver();
        this.listeners.set(element, callback);
        this.observer?.observe(element);
    }

    public unobserve(element: Element) {
        if (this.listeners.has(element)) {
            this.listeners.delete(element);
            this.observer?.unobserve(element);
        }

        if (this.listeners.size === 0 && this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// Export a singleton instance with default options used in RepoList
export const repoCardObserver = new SharedObserver({ threshold: 0.1 });
