/**
 * SettingsView
 * Application settings and preferences
 */

import { store } from '../../state/store.js';
import * as actions from '../../state/actions.js';
import { $ } from '../../utils/dom.js';
import { ICONS } from './icons.js';

export class SettingsView {
    constructor(container) {
        this.container = container;
    }

    /**
     * Update view with current state
     * @param {Object} state
     */
    update(state) {
        this.container.innerHTML = `
            <div class="content-placeholder settings-view">
                <div class="view-header">
                    <h2>${ICONS.settings} Settings</h2>
                </div>

                <div class="settings-section">
                    <h3>About Packy</h3>
                    <div class="about-info">
                        <p><strong>Packy</strong> - Your friendly packing assistant</p>
                        <p>Version: 0.0.1 (Open Beta)</p>
                        <p>
                            Packy helps you organize your packing lists for trips.
                            Create lists from templates, customize items with smart quantities,
                            and track your packing progress.
                        </p>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>Data Management</h3>
                    <p class="settings-note">
                        Packy does not use browser storage. Your data is only saved when you export it.
                        Remember to export your packing list before closing the browser!
                    </p>

                    ${state.currentList ? `
                        <div class="settings-actions">
                            <button class="btn btn-primary" id="export-current-btn">
                                ${ICONS.download} Export Current List
                            </button>
                            <button class="btn btn-danger" id="clear-current-btn">
                                ${ICONS.trash} Clear Current List
                            </button>
                        </div>
                    ` : `
                        <p class="no-list-message">No active list. Create or import a list to get started.</p>
                    `}
                </div>

                <div class="settings-section">
                    <h3>Keyboard Shortcuts</h3>
                    <div class="shortcuts-list">
                        <div class="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                            <span>Undo last action</span>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>Expression Syntax Guide</h3>
                    <p>When setting item quantities based on trip days, use these expressions:</p>
                    <table class="expression-guide">
                        <thead>
                            <tr>
                                <th>Expression</th>
                                <th>Meaning</th>
                                <th>Example (5 days)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>d</code></td>
                                <td>Number of days</td>
                                <td>5</td>
                            </tr>
                            <tr>
                                <td><code>d+1</code></td>
                                <td>Days plus one</td>
                                <td>6</td>
                            </tr>
                            <tr>
                                <td><code>d+2</code></td>
                                <td>Days plus two</td>
                                <td>7</td>
                            </tr>
                            <tr>
                                <td><code>2d</code></td>
                                <td>Two per day</td>
                                <td>10</td>
                            </tr>
                            <tr>
                                <td><code>2d+1</code></td>
                                <td>Two per day plus one</td>
                                <td>11</td>
                            </tr>
                            <tr>
                                <td><code>d/2</code></td>
                                <td>Every two days (rounded up)</td>
                                <td>3</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="settings-section">
                    <h3>Links</h3>
                    <div class="settings-links">
                        <a href="https://github.com/HedonisticProse/Packy#" class="settings-link" id="github-link">
                            GitHub Repository
                        </a>
                        <a href="https://github.com/HedonisticProse/Packy/issues" class="settings-link" id="issues-link">
                            Report an Issue
                        </a>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(state);
    }

    /**
     * Bind event listeners
     * @param {Object} state
     */
    bindEvents(state) {
        if (state.currentList) {
            $('#export-current-btn', this.container)?.addEventListener('click', async () => {
                const { fileService } = await import('../../services/fileService.js');
                const list = store.getState().currentList;
                const filename = fileService.generateFilename(list.trip);
                const result = await fileService.exportList(list, filename);
                if (result.success) {
                    actions.showToast('List exported successfully', 'success');
                }
            });

            $('#clear-current-btn', this.container)?.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the current list? Make sure you\'ve exported it first!')) {
                    actions.clearCurrentList();
                    actions.showToast('List cleared', 'info');
                }
            });
        }
    }
}
