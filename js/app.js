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
            $$('.item-row.dragging, .item-row.drop-above, .item-row.drop-below')
                .forEach(el => el.classList.remove('dragging', 'drop-above', 'drop-below'));
            $$('.task-row.dragging, .task-row.drop-above, .task-row.drop-below')
                .forEach(el => el.classList.remove('dragging', 'drop-above', 'drop-below'));
            $$('.stage-card.dragging, .stage-card.drop-above, .stage-card.drop-below')
                .forEach(el => el.classList.remove('dragging', 'drop-above', 'drop-below'));
            this.draggedItemId = null;
        });

        // Item reordering handlers (Items view)
        window.Packy.handleItemDragStart = (event, itemId) => {
            this.draggedItemId = itemId;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', itemId);
            event.target.closest('.item-row')?.classList.add('dragging');
        };

        window.Packy.handleItemDragOver = (event) => {
            event.preventDefault();
            // Clear previous drop indicators
            $$('.item-row.drop-above, .item-row.drop-below').forEach(el => {
                el.classList.remove('drop-above', 'drop-below');
            });
            const row = event.target.closest('.item-row');
            if (row && !row.classList.contains('dragging')) {
                const rect = row.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (event.clientY < midY) {
                    row.classList.add('drop-above');
                } else {
                    row.classList.add('drop-below');
                }
            }
        };

        window.Packy.handleItemDrop = (event, targetItemId) => {
            event.preventDefault();
            event.stopPropagation();
            const itemId = this.draggedItemId;
            if (itemId && targetItemId && itemId !== targetItemId) {
                const row = event.target.closest('.item-row');
                const rect = row.getBoundingClientRect();
                const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                actions.reorderItem(itemId, targetItemId, position);
            }
            this.cleanupItemDrag();
        };

        window.Packy.handleCategoryDrop = (event, categoryId) => {
            event.preventDefault();
            const itemId = this.draggedItemId;
            if (itemId) {
                actions.moveItemToCategory(itemId, categoryId);
            }
            this.cleanupItemDrag();
        };

        // Task reordering handlers
        this.draggedTaskData = null;

        window.Packy.handleTaskDragStart = (event, stageId, taskId) => {
            this.draggedTaskData = { stageId, taskId };
            event.dataTransfer.effectAllowed = 'move';
            event.target.classList.add('dragging');
            event.stopPropagation();
        };

        window.Packy.handleTaskDragOver = (event) => {
            event.preventDefault();
            event.stopPropagation();
            $$('.task-row.drop-above, .task-row.drop-below').forEach(el => {
                el.classList.remove('drop-above', 'drop-below');
            });
            const row = event.target.closest('.task-row');
            if (row && !row.classList.contains('dragging')) {
                const rect = row.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                row.classList.add(event.clientY < midY ? 'drop-above' : 'drop-below');
            }
        };

        window.Packy.handleTaskDrop = (event, targetStageId, targetTaskId) => {
            event.preventDefault();
            event.stopPropagation();
            const data = this.draggedTaskData;
            if (data && data.stageId === targetStageId && data.taskId !== targetTaskId) {
                const row = event.target.closest('.task-row');
                const rect = row.getBoundingClientRect();
                const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                actions.reorderTask(targetStageId, data.taskId, targetTaskId, position);
            }
            $$('.task-row.dragging, .task-row.drop-above, .task-row.drop-below')
                .forEach(el => el.classList.remove('dragging', 'drop-above', 'drop-below'));
            this.draggedTaskData = null;
        };

        // Stage reordering handlers
        this.draggedStageId = null;

        window.Packy.handleStageDragStart = (event, stageId) => {
            this.draggedStageId = stageId;
            event.dataTransfer.effectAllowed = 'move';
            event.target.classList.add('dragging');
        };

        window.Packy.handleStageDragOver = (event) => {
            event.preventDefault();
            $$('.stage-card.drop-above, .stage-card.drop-below').forEach(el => {
                el.classList.remove('drop-above', 'drop-below');
            });
            const card = event.target.closest('.stage-card');
            if (card && !card.classList.contains('dragging')) {
                const rect = card.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                card.classList.add(event.clientY < midY ? 'drop-above' : 'drop-below');
            }
        };

        window.Packy.handleStageDrop = (event, targetStageId) => {
            event.preventDefault();
            const stageId = this.draggedStageId;
            if (stageId && targetStageId && stageId !== targetStageId) {
                const card = event.target.closest('.stage-card');
                const rect = card.getBoundingClientRect();
                const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                actions.reorderStage(stageId, targetStageId, position);
            }
            $$('.stage-card.dragging, .stage-card.drop-above, .stage-card.drop-below')
                .forEach(el => el.classList.remove('dragging', 'drop-above', 'drop-below'));
            this.draggedStageId = null;
        };
    }

    cleanupItemDrag() {
        $$('.item-row.dragging, .item-row.drop-above, .item-row.drop-below')
            .forEach(el => el.classList.remove('dragging', 'drop-above', 'drop-below'));
        this.draggedItemId = null;
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
