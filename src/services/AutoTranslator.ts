import { starService } from './StarDataService';

class AutoTranslator {
    private isProcessing = false;
    private enabled = false;
    private listeners: Set<(isTranslating: boolean) => void> = new Set();

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
        this.enabled = true;
        starService.triggerTranslation();
    }

    public stop() {
        this.enabled = false;
        // Global stop is handled by starService/Worker INIT/STOP if needed
        // but for now we just stop triggering
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

    // Dummy for compatibility
    public setAccount(_userId: string | null, _githubUser: string | null) {
        this.start();
    }
}

export const autoTranslator = new AutoTranslator();
