/**
 * ViewManager
 * Handles view routing and rendering
 */

import { MyListsView } from './pages/MyListsView.js';
import { TemplatesView } from './pages/TemplatesView.js';
import { SettingsView } from './pages/SettingsView.js';
import { hideModal } from '../state/actions.js';
import { $, delegate } from '../utils/dom.js';

export class ViewManager {
    constructor(container) {
        this.container = container;
        this.currentView = null;
        this.currentViewName = null;

        // View registry
        this.views = {
            'my-lists': MyListsView,
            'templates': TemplatesView,
            'settings': SettingsView
        };

        // Initialize modal and toast containers
        this.initOverlays();
    }

    /**
     * Initialize overlay containers
     */
    initOverlays() {
        // Modal container
        if (!$('.modal-overlay')) {
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay hidden';
            document.body.appendChild(modalOverlay);

            // Close modal on overlay click
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    hideModal();
                }
            });
        }

        // Toast container
        if (!$('.toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container hidden';
            document.body.appendChild(toastContainer);
        }
    }

    /**
     * Render based on current state
     * @param {Object} state - Application state
     */
    render(state) {
        const { ui } = state;
        const ViewClass = this.views[ui.currentView];

        if (!ViewClass) {
            console.error(`Unknown view: ${ui.currentView}`);
            return;
        }

        // Only recreate view if view type changed
        if (this.currentViewName !== ui.currentView) {
            this.currentView = new ViewClass(this.container);
            this.currentViewName = ui.currentView;
        }

        // Update view with current state
        this.currentView.update(state);

        // Handle overlays
        this.renderModal(state.ui.modal);
        this.renderToast(state.ui.toast);
    }

    /**
     * Render modal
     * @param {Object|null} modalConfig
     */
    renderModal(modalConfig) {
        const modalOverlay = $('.modal-overlay');
        if (!modalOverlay) return;

        if (!modalConfig) {
            modalOverlay.classList.add('hidden');
            modalOverlay.innerHTML = '';
            return;
        }

        modalOverlay.classList.remove('hidden');
        modalOverlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>${modalConfig.title || ''}</h2>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    ${modalConfig.content || ''}
                </div>
                ${modalConfig.actions ? `
                    <div class="modal-actions">
                        ${modalConfig.actions}
                    </div>
                ` : ''}
            </div>
        `;

        // Bind close button
        const closeBtn = modalOverlay.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideModal);
        }

        // Call onRender callback if provided
        if (modalConfig.onRender) {
            setTimeout(() => modalConfig.onRender(modalOverlay), 0);
        }
    }

    /**
     * Render toast notification
     * @param {Object|null} toast
     */
    renderToast(toast) {
        const toastContainer = $('.toast-container');
        if (!toastContainer) return;

        if (!toast) {
            toastContainer.classList.add('hidden');
            return;
        }

        toastContainer.classList.remove('hidden');
        toastContainer.innerHTML = `
            <div class="toast toast-${toast.type || 'info'}">
                <span class="toast-icon">${this.getToastIcon(toast.type)}</span>
                <span class="toast-message">${toast.message}</span>
            </div>
        `;
    }

    /**
     * Get icon for toast type
     * @param {string} type
     * @returns {string}
     */
    getToastIcon(type) {
        const icons = {
            'success': '✓',
            'error': '✕',
            'warning': '⚠',
            'info': 'ℹ'
        };
        return icons[type] || icons.info;
    }
}
