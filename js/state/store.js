/**
 * Packy State Store
 * Simple in-memory state management (no localStorage)
 * State resets on every page refresh
 */

class Store {
    constructor() {
        this.state = this.getInitialState();
        this.listeners = new Set();
        this.history = [];
        this.maxHistory = 50;
    }

    /**
     * Get initial application state
     * @returns {Object}
     */
    getInitialState() {
        return {
            // Current packing list being worked on
            currentList: null,

            // UI state
            ui: {
                currentView: 'my-lists',
                currentSubview: null,
                modal: null,
                toast: null,
                isLoading: false
            },

            // Loaded templates (from /config)
            templates: [],

            // Application settings
            settings: null
        };
    }

    /**
     * Get current state (deep copy for immutability)
     * Note: UI state (modal, toast) is not deep cloned to preserve callbacks
     * @returns {Object}
     */
    getState() {
        // Deep clone data state, but preserve UI state references (for callbacks)
        const clonedData = this.state.currentList
            ? JSON.parse(JSON.stringify({ currentList: this.state.currentList }))
            : { currentList: null };

        return {
            ...clonedData,
            ui: { ...this.state.ui }, // Shallow copy to preserve onRender callbacks
            templates: this.state.templates ? [...this.state.templates] : [],
            settings: this.state.settings ? { ...this.state.settings } : null
        };
    }

    /**
     * Get specific slice of state using selector function
     * @param {Function} selector
     * @returns {*}
     */
    select(selector) {
        return selector(this.getState());
    }

    /**
     * Update state and notify listeners
     * @param {Object|Function} updater - New state object or updater function
     */
    setState(updater) {
        // Save current state to history for undo (only data, not UI state)
        // UI state contains callbacks which can't be serialized
        const historyState = {
            currentList: this.state.currentList,
            templates: this.state.templates,
            settings: this.state.settings
        };
        this.history.push(JSON.stringify(historyState));
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Apply update
        if (typeof updater === 'function') {
            const newState = updater(this.getState());
            this.state = { ...this.state, ...newState };
        } else {
            this.state = { ...this.state, ...updater };
        }

        // Update modified timestamp if we have a current list
        if (this.state.currentList) {
            this.state.currentList.meta = {
                ...this.state.currentList.meta,
                modifiedAt: new Date().toISOString()
            };
        }

        // Notify all listeners
        this.notify();
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of state change
     */
    notify() {
        const state = this.getState();
        this.listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    /**
     * Undo last state change
     * @returns {boolean} Whether undo was successful
     */
    undo() {
        if (this.history.length > 0) {
            const previousData = JSON.parse(this.history.pop());
            // Restore data state but keep current UI state
            this.state = {
                ...previousData,
                ui: this.state.ui
            };
            this.notify();
            return true;
        }
        return false;
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.history.length > 0;
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.state = this.getInitialState();
        this.history = [];
        this.notify();
    }

    /**
     * Get state for debugging
     * @returns {Object}
     */
    debug() {
        return {
            state: this.getState(),
            historyLength: this.history.length,
            listenerCount: this.listeners.size
        };
    }
}

// Singleton instance
export const store = new Store();
