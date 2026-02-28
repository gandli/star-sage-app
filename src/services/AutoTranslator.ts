import { starService } from './StarDataService';

class AutoTranslator {
    private isProcessing = false;
    private enabled = false;
    private listeners: Set<(isTranslating: boolean) => void> = new Set();
    private userId: string | null = null;
    private githubUser: string | null = null;

    constructor() {
        // Subscribe to starService to sync local isProcessing state
        starService.subscribe((state) => {
            if (this.isProcessing !== state.isTranslating) {
                this.isProcessing = state.isTranslating;
                this.notifyListeners();
            }
        });
    }

    public start() {
        if (!this.userId || !this.githubUser) return;
        this.enabled = true;
        starService.triggerTranslation();
    }

    public stop() {
        this.enabled = false;
        starService.getWorker()?.postMessage({ type: 'STOP' });
    }

    public trigger() {
        if (!this.enabled) return;
        starService.triggerTranslation();
    }

    public subscribe(listener: (isTranslating: boolean) => void) {
        listener(this.isProcessing);
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.isProcessing));
    }

    public setAccount(userId: string | null, githubUser: string | null) {
        this.userId = userId;
        this.githubUser = githubUser;

        if (this.userId && this.githubUser) {
            this.start();
        } else {
            this.stop();
        }
    }
}

export const autoTranslator = new AutoTranslator();
