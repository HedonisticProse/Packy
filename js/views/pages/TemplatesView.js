/**
 * TemplatesView
 * Browse and manage packing templates
 */

import { store } from '../../state/store.js';
import * as actions from '../../state/actions.js';
import { templateService } from '../../services/templateService.js';
import { fileService } from '../../services/fileService.js';
import { $, $$ } from '../../utils/dom.js';
import { sanitize } from '../../utils/validation.js';
import { ICONS } from './icons.js';
import { getToday, getDateFromToday, getDurationString, calculateDays } from '../../services/dateService.js';

export class TemplatesView {
    constructor(container) {
        this.container = container;
    }

    /**
     * Update view with current state
     * @param {Object} state
     */
    update(state) {
        const { templates } = state;

        this.container.innerHTML = `
            <div class="content-placeholder templates-view">
                <div class="view-header">
                    <h2>Packing Templates</h2>
                    <p>Choose a template to start your packing list, or import a custom template.</p>
                </div>

                <div class="templates-grid">
                    ${templates.map(template => `
                        <div class="template-card-large" data-template-id="${template.id}">
                            <div class="template-icon-large">
                                ${ICONS[template.icon] || ICONS.box}
                            </div>
                            <div class="template-info">
                                <h3>${sanitize(template.name)}</h3>
                                <p>${sanitize(template.description)}</p>
                                ${template.tags ? `
                                    <div class="template-tags">
                                        ${template.tags.map(tag => `
                                            <span class="tag">${sanitize(tag)}</span>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            <button class="btn btn-primary use-template-btn" data-template-id="${template.id}">
                                Use Template
                            </button>
                        </div>
                    `).join('')}
                </div>

                <div class="templates-actions">
                    <h3>Custom Templates</h3>
                    <p>Import a template file you've previously exported or received from someone.</p>
                    <button class="btn btn-secondary" id="import-template-btn">
                        ${ICONS.upload} Import Template
                    </button>
                </div>

                ${state.currentList ? `
                    <div class="templates-actions">
                        <h3>Save Current List as Template</h3>
                        <p>Export your current packing list as a reusable template.</p>
                        <button class="btn btn-secondary" id="export-template-btn">
                            ${ICONS.download} Export as Template
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        this.bindEvents();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Use template buttons
        $$('.use-template-btn', this.container).forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = btn.dataset.templateId;
                this.showCreateFromTemplateModal(templateId);
            });
        });

        // Template cards (whole card click)
        $$('.template-card-large', this.container).forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.use-template-btn')) {
                    const templateId = card.dataset.templateId;
                    this.showTemplatePreview(templateId);
                }
            });
        });

        // Import template
        $('#import-template-btn', this.container)?.addEventListener('click', async () => {
            const result = await fileService.importList();
            if (result.success) {
                // Check if it's a template
                if (result.data.meta?.isTemplate) {
                    // It's a template - offer to use it
                    this.showUseImportedTemplateModal(result.data, result.filename);
                } else {
                    // It's a regular list - load it directly
                    actions.loadList(result.data);
                    actions.navigateTo('my-lists', 'pack');
                    actions.showToast('List imported successfully', 'success');
                }
            } else if (result.error) {
                actions.showToast(result.error, 'error');
            }
        });

        // Export as template
        $('#export-template-btn', this.container)?.addEventListener('click', () => {
            this.showExportAsTemplateModal();
        });
    }

    /**
     * Show modal to create a new trip from template
     * @param {string} templateId
     */
    showCreateFromTemplateModal(templateId) {
        const template = store.getState().templates.find(t => t.id === templateId);

        actions.showModal({
            title: `Create Trip from "${template?.name || 'Template'}"`,
            content: `
                <form id="create-from-template-form">
                    <div class="form-group">
                        <label for="trip-name">Trip Name *</label>
                        <input type="text" id="trip-name" required placeholder="e.g., Beach Vacation 2024">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="departure-date">Departure *</label>
                            <input type="date" id="departure-date" required value="${getToday()}">
                        </div>
                        <div class="form-group">
                            <label for="return-date">Return *</label>
                            <input type="date" id="return-date" required value="${getDateFromToday(3)}">
                        </div>
                    </div>
                    <div class="trip-duration-preview">
                        Trip duration: <strong id="duration-preview">4 days</strong>
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-create">Create Trip</button>
            `,
            onRender: (overlay) => {
                const depInput = $('#departure-date', overlay);
                const retInput = $('#return-date', overlay);
                const preview = $('#duration-preview', overlay);

                const updateDuration = () => {
                    if (depInput.value && retInput.value) {
                        const days = calculateDays(depInput.value, retInput.value);
                        preview.textContent = getDurationString(days);
                    }
                };

                depInput.addEventListener('change', updateDuration);
                retInput.addEventListener('change', updateDuration);
                updateDuration();

                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);

                $('#modal-create', overlay).addEventListener('click', async () => {
                    const form = $('#create-from-template-form', overlay);
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const tripData = {
                        name: $('#trip-name', overlay).value,
                        departureDate: depInput.value,
                        returnDate: retInput.value
                    };

                    try {
                        actions.setLoading(true);
                        const list = await templateService.createFromTemplate(templateId, tripData);
                        actions.loadList(list);
                        actions.hideModal();
                        actions.navigateTo('my-lists', 'pack');
                        actions.showToast('Trip created from template', 'success');
                    } catch (error) {
                        actions.showToast('Failed to create trip: ' + error.message, 'error');
                    } finally {
                        actions.setLoading(false);
                    }
                });
            }
        });
    }

    /**
     * Show template preview modal
     * @param {string} templateId
     */
    async showTemplatePreview(templateId) {
        const templateMeta = store.getState().templates.find(t => t.id === templateId);

        try {
            const template = await templateService.loadTemplate(templateId);

            const bagsList = template.bags.map(b => b.name).join(', ');
            const categoriesList = template.categories.map(c => c.name).join(', ');
            const itemCount = template.items.length;
            const stageCount = template.stages?.length || 0;

            actions.showModal({
                title: templateMeta?.name || 'Template Preview',
                content: `
                    <div class="template-preview">
                        <p>${sanitize(templateMeta?.description || '')}</p>

                        <div class="preview-section">
                            <h4>Bags (${template.bags.length})</h4>
                            <p>${sanitize(bagsList) || 'None'}</p>
                        </div>

                        <div class="preview-section">
                            <h4>Categories (${template.categories.length})</h4>
                            <p>${sanitize(categoriesList) || 'None'}</p>
                        </div>

                        <div class="preview-section">
                            <h4>Items</h4>
                            <p>${itemCount} items pre-configured</p>
                        </div>

                        <div class="preview-section">
                            <h4>Preparation Stages</h4>
                            <p>${stageCount} stages with checklists</p>
                        </div>
                    </div>
                `,
                actions: `
                    <button type="button" class="btn btn-secondary" id="modal-cancel">Close</button>
                    <button type="button" class="btn btn-primary" id="modal-use">Use This Template</button>
                `,
                onRender: (overlay) => {
                    $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);
                    $('#modal-use', overlay).addEventListener('click', () => {
                        actions.hideModal();
                        this.showCreateFromTemplateModal(templateId);
                    });
                }
            });
        } catch (error) {
            actions.showToast('Failed to load template preview', 'error');
        }
    }

    /**
     * Show modal for using an imported template
     * @param {Object} templateData
     * @param {string} filename
     */
    showUseImportedTemplateModal(templateData, filename) {
        actions.showModal({
            title: 'Use Imported Template',
            content: `
                <p>You've imported the template: <strong>${sanitize(templateData.meta?.templateName || filename)}</strong></p>
                <p>${sanitize(templateData.meta?.description || '')}</p>

                <form id="use-imported-form">
                    <div class="form-group">
                        <label for="trip-name">Trip Name *</label>
                        <input type="text" id="trip-name" required placeholder="e.g., My Trip">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="departure-date">Departure *</label>
                            <input type="date" id="departure-date" required value="${getToday()}">
                        </div>
                        <div class="form-group">
                            <label for="return-date">Return *</label>
                            <input type="date" id="return-date" required value="${getDateFromToday(3)}">
                        </div>
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-create">Create Trip</button>
            `,
            onRender: (overlay) => {
                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);

                $('#modal-create', overlay).addEventListener('click', () => {
                    const form = $('#use-imported-form', overlay);
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const tripData = {
                        name: $('#trip-name', overlay).value,
                        departureDate: $('#departure-date', overlay).value,
                        returnDate: $('#return-date', overlay).value
                    };

                    // Create list from imported template data
                    const list = {
                        meta: {
                            version: '1.0.0',
                            createdAt: new Date().toISOString(),
                            modifiedAt: new Date().toISOString(),
                            isTemplate: false
                        },
                        trip: {
                            ...tripData,
                            calculatedDays: calculateDays(tripData.departureDate, tripData.returnDate)
                        },
                        bags: templateData.bags || [],
                        categories: templateData.categories || [],
                        items: (templateData.items || []).map(item => ({ ...item, packed: false })),
                        stages: (templateData.stages || []).map(stage => ({
                            ...stage,
                            tasks: stage.tasks.map(task => ({ ...task, completed: false }))
                        }))
                    };

                    actions.loadList(list);
                    actions.hideModal();
                    actions.navigateTo('my-lists', 'pack');
                    actions.showToast('Trip created from imported template', 'success');
                });
            }
        });
    }

    /**
     * Show export as template modal
     */
    showExportAsTemplateModal() {
        const currentList = store.getState().currentList;
        if (!currentList) return;

        actions.showModal({
            title: 'Export as Template',
            content: `
                <p>Save your current packing list as a reusable template.</p>
                <form id="export-template-form">
                    <div class="form-group">
                        <label for="template-name">Template Name *</label>
                        <input type="text" id="template-name" required
                               value="${sanitize(currentList.trip.name)}"
                               placeholder="e.g., Beach Vacation">
                    </div>
                    <div class="form-group">
                        <label for="template-description">Description</label>
                        <textarea id="template-description" rows="2"
                                  placeholder="Brief description of this template"></textarea>
                    </div>
                </form>
                <p class="help-text">Note: Trip dates and checked items will be reset in the template.</p>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-export">Export Template</button>
            `,
            onRender: (overlay) => {
                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);

                $('#modal-export', overlay).addEventListener('click', async () => {
                    const form = $('#export-template-form', overlay);
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const templateName = $('#template-name', overlay).value;
                    const result = await fileService.exportAsTemplate(currentList, templateName);

                    if (result.success) {
                        actions.hideModal();
                        actions.showToast('Template exported successfully', 'success');
                    }
                });
            }
        });
    }
}
