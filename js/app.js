/**
 * Packy Application
 * Main entry point and initialization
 */

import { store } from './state/store.js';
import * as actions from './state/actions.js';
import { ViewManager } from './views/ViewManager.js';
import { templateService } from './services/templateService.js';
import { fileService } from './services/fileService.js';
import { $, $$ } from './utils/dom.js';

class PackyApp {
    constructor() {
        this.viewManager = null;
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initialized) return;

        try {
            console.log('Initializing Packy...');

            // Initialize template service and load template list
            await templateService.initialize();
            const templates = await templateService.getTemplateList();
            store.setState({ templates });

            // Initialize view manager
            this.viewManager = new ViewManager(
                document.querySelector('.main-container')
            );

            // Set up navigation
            this.setupNavigation();

            // Set up keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Set up drag and drop handlers
            this.setupDragAndDrop();

            // Subscribe to state changes
            store.subscribe((state) => {
                this.viewManager.render(state);
                this.updateNavigation(state);
            });

            // Initial render
            actions.navigateTo('my-lists');

            this.initialized = true;
            console.log('Packy initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Packy:', error);
            actions.showToast('Failed to initialize application', 'error');
        }
    }

    /**
     * Set up navigation event listeners
     */
    setupNavigation() {
        $$('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const text = item.textContent.trim().toLowerCase();

                // Map nav text to view names
                const viewMap = {
                    'my lists': 'my-lists',
                    'templates': 'templates',
                    'settings': 'settings'
                };

                const viewName = viewMap[text] || text.replace(' ', '-');
                actions.navigateTo(viewName);
            });
        });
    }

    /**
     * Update navigation active state
     * @param {Object} state
     */
    updateNavigation(state) {
        const currentView = state.ui.currentView;

        $$('.nav-item').forEach(item => {
            const text = item.textContent.trim().toLowerCase();
            const viewMap = {
                'my lists': 'my-lists',
                'templates': 'templates',
                'settings': 'settings'
            };
            const viewName = viewMap[text] || text.replace(' ', '-');

            item.classList.toggle('active', viewName === currentView);
        });
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Z = Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (store.undo()) {
                    actions.showToast('Undone', 'info', 1500);
                }
            }

            // Escape = Close modal
            if (e.key === 'Escape') {
                const state = store.getState();
                if (state.ui.modal) {
                    actions.hideModal();
                }
            }
        });
    }

    /**
     * Set up drag and drop handlers for packing view
     */
    setupDragAndDrop() {
        // Store dragged item ID
        this.draggedItemId = null;

        // Make handlers available globally for inline event handlers
        window.Packy = window.Packy || {};

        window.Packy.handleDragStart = (event, itemId) => {
            this.draggedItemId = itemId;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', itemId);
            event.target.closest('.pack-item')?.classList.add('dragging');
        };

        window.Packy.handleDrop = (event, bagId) => {
            event.preventDefault();
            const itemId = this.draggedItemId || event.dataTransfer.getData('text/plain');

            if (itemId && bagId) {
                actions.moveItemToBag(itemId, bagId);
                actions.showToast('Item moved', 'success', 1500);
            }

            // Clean up
            $$('.pack-item.dragging').forEach(el => el.classList.remove('dragging'));
            this.draggedItemId = null;
        };

        // Global dragend handler
        document.addEventListener('dragend', () => {
            $$('.pack-item.dragging').forEach(el => el.classList.remove('dragging'));
            this.draggedItemId = null;
        });
    }

    // ========================================
    // PUBLIC API
    // ========================================

    /**
     * Get current state (for debugging)
     * @returns {Object}
     */
    getState() {
        return store.getState();
    }

    /**
     * Export current list
     * @returns {Promise}
     */
    async exportCurrentList() {
        const state = store.getState();
        if (state.currentList) {
            const filename = fileService.generateFilename(state.currentList.trip);
            return fileService.exportList(state.currentList, filename);
        }
        return Promise.reject(new Error('No active list to export'));
    }

    /**
     * Import a list
     * @returns {Promise}
     */
    async importList() {
        const result = await fileService.importList();
        if (result.success) {
            actions.loadList(result.data);
            actions.navigateTo('my-lists', 'pack');
            actions.showToast('List imported successfully', 'success');
        } else if (result.error) {
            actions.showToast(result.error, 'error');
        }
        return result;
    }

    /**
     * Undo last action
     * @returns {boolean}
     */
    undo() {
        return store.undo();
    }

    /**
     * Clear current list
     */
    clearList() {
        actions.clearCurrentList();
    }

    /**
     * Debug info
     * @returns {Object}
     */
    debug() {
        return store.debug();
    }
}

// Create and initialize app
const app = new PackyApp();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Expose for debugging and external access
window.Packy = window.Packy || {};
Object.assign(window.Packy, {
    app,
    getState: () => app.getState(),
    exportList: () => app.exportCurrentList(),
    importList: () => app.importList(),
    undo: () => app.undo(),
    clear: () => app.clearList(),
    debug: () => app.debug()
});

export default app;
