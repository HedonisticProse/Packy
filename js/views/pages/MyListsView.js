/**
 * MyListsView
 * Main packing list view with workflow subviews
 */

import { store } from '../../state/store.js';
import * as actions from '../../state/actions.js';
import { templateService } from '../../services/templateService.js';
import { fileService } from '../../services/fileService.js';
import { expressionParser } from '../../services/expressionParser.js';
import { calculateDays, formatDate, getDateRangeString, getDurationString, getToday, getDateFromToday } from '../../services/dateService.js';
import { $, $$, delegate } from '../../utils/dom.js';
import { sanitize } from '../../utils/validation.js';
import { ICONS } from './icons.js';

export class MyListsView {
    constructor(container) {
        this.container = container;
        this.subviews = ['trip', 'bags', 'items', 'assignments', 'pack', 'stages'];
        this.draggedItem = null;
        this.pendingFocusStageId = null;
        this.pendingFocusCategoryId = null;
    }

    /**
     * Update view with current state
     * @param {Object} state
     */
    update(state) {
        const { currentList } = state;
        const { currentSubview } = state.ui;

        if (!currentList) {
            this.renderEmptyState(state);
        } else {
            this.renderListView(state, currentSubview || 'pack');
        }
    }

    /**
     * Render empty state (no active list)
     * @param {Object} state
     */
    renderEmptyState(state) {
        this.container.innerHTML = `
            <div class="content-placeholder">
                <div class="empty-state">
                    <div class="empty-state-icon">${ICONS.suitcase}</div>
                    <h2>No Active Packing List</h2>
                    <p>Start a new trip or import an existing list</p>

                    <div class="empty-state-actions">
                        <button class="btn btn-primary" id="new-trip-btn">
                            ${ICONS.plus} Start New Trip
                        </button>
                        <button class="btn btn-secondary" id="import-btn">
                            ${ICONS.upload} Import List
                        </button>
                    </div>

                    <div class="template-quick-select">
                        <h3>Quick Start from Template</h3>
                        <div class="template-cards">
                            ${state.templates.map(t => `
                                <button class="template-card" data-template-id="${t.id}">
                                    <span class="template-icon">${ICONS[t.icon] || ICONS.box}</span>
                                    <span class="template-name">${sanitize(t.name)}</span>
                                    <span class="template-desc">${sanitize(t.description)}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEmptyStateEvents();
    }

    /**
     * Render list view with subviews
     * @param {Object} state
     * @param {string} activeSubview
     */
    renderListView(state, activeSubview) {
        const { currentList } = state;
        const progress = actions.getPackingProgress();

        this.container.innerHTML = `
            <div class="content-placeholder packing-list-view">
                <div class="list-header">
                    <div class="list-title">
                        <h2>${sanitize(currentList.trip.name)}</h2>
                        <span class="trip-dates">
                            ${getDateRangeString(currentList.trip.departureDate, currentList.trip.returnDate)}
                            (${getDurationString(currentList.trip.calculatedDays)})
                        </span>
                    </div>
                    <div class="list-actions">
                        <button class="btn btn-icon" id="export-btn" title="Export List">
                            ${ICONS.download}
                        </button>
                        <button class="btn btn-icon btn-danger" id="clear-btn" title="Clear List">
                            ${ICONS.trash}
                        </button>
                    </div>
                </div>

                <nav class="subview-tabs">
                    ${this.subviews.map(sv => `
                        <button class="tab ${sv === activeSubview ? 'active' : ''}"
                                data-subview="${sv}">
                            ${this.getSubviewLabel(sv)}
                        </button>
                    `).join('')}
                </nav>

                <div class="subview-content">
                    ${this.renderSubview(activeSubview, state)}
                </div>

                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${progress}% packed</span>
                </div>
            </div>
        `;

        this.bindListViewEvents(activeSubview, state);

        // Restore focus after re-render if needed
        if (this.pendingFocusStageId) {
            const input = $(`.task-input[data-stage-id="${this.pendingFocusStageId}"]`, this.container);
            if (input) {
                input.focus();
            }
            this.pendingFocusStageId = null;
        }

        if (this.pendingFocusCategoryId) {
            const input = $(`.item-input[data-category-id="${this.pendingFocusCategoryId}"]`, this.container);
            if (input) {
                input.focus();
            }
            this.pendingFocusCategoryId = null;
        }

        // Scroll active tab into view (centered) on mobile
        const activeTab = $('.tab.active', this.container);
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    /**
     * Render specific subview content
     * @param {string} subview
     * @param {Object} state
     * @returns {string}
     */
    renderSubview(subview, state) {
        switch (subview) {
            case 'trip':
                return this.renderTripView(state);
            case 'bags':
                return this.renderBagsView(state);
            case 'items':
                return this.renderItemsView(state);
            case 'assignments':
                return this.renderAssignmentsView(state);
            case 'pack':
                return this.renderPackingView(state);
            case 'stages':
                return this.renderStagesView(state);
            default:
                return '<p>View not found</p>';
        }
    }

    // ========================================
    // SUBVIEW RENDERERS
    // ========================================

    renderTripView(state) {
        const { trip } = state.currentList;
        return `
            <div class="trip-form">
                <div class="form-group">
                    <label for="trip-name">Trip Name</label>
                    <input type="text" id="trip-name" value="${sanitize(trip.name)}"
                           placeholder="e.g., Beach Vacation 2024">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="departure-date">Departure Date</label>
                        <input type="date" id="departure-date" value="${trip.departureDate}">
                    </div>
                    <div class="form-group">
                        <label for="return-date">Return Date</label>
                        <input type="date" id="return-date" value="${trip.returnDate}">
                    </div>
                </div>
                <div class="trip-summary">
                    <strong>Trip Duration:</strong> ${getDurationString(trip.calculatedDays)}
                </div>
            </div>
        `;
    }

    renderBagsView(state) {
        const { bags } = state.currentList;
        return `
            <div class="bags-grid">
                ${bags.map(bag => `
                    <div class="bag-card" data-bag-id="${bag.id}" style="border-color: ${bag.color}">
                        <div class="bag-card-header" style="background-color: ${bag.color}20">
                            <span class="bag-icon">${ICONS[bag.icon] || ICONS.suitcase}</span>
                            <span class="bag-name">${sanitize(bag.name)}</span>
                        </div>
                        <div class="bag-card-body">
                            <span class="bag-type">${bag.type}</span>
                        </div>
                        <div class="bag-card-actions">
                            <button class="btn btn-small btn-edit" data-action="edit-bag">Edit</button>
                            <button class="btn btn-small btn-danger" data-action="delete-bag">Delete</button>
                        </div>
                    </div>
                `).join('')}
                <button class="bag-card bag-card-add" id="add-bag-btn">
                    <span class="add-icon">${ICONS.plus}</span>
                    <span>Add Bag</span>
                </button>
            </div>
        `;
    }

    renderItemsView(state) {
        const { categories, items } = state.currentList;
        const days = state.currentList.trip.calculatedDays;

        return `
            <div class="items-view">
                ${categories.map(cat => {
                    const catItems = items.filter(i => i.categoryId === cat.id);
                    return `
                        <div class="category-section" data-category-id="${cat.id}">
                            <div class="category-header">
                                <span class="category-icon">${ICONS[cat.icon] || ICONS.box}</span>
                                <h3>${sanitize(cat.name)}</h3>
                                <span class="item-count">(${catItems.length} items)</span>
                            </div>
                            <div class="category-items">
                                ${catItems.map(item => this.renderItemRow(item, days)).join('')}
                                <div class="item-quick-add">
                                    <input type="text" class="item-input"
                                           placeholder="Quick add item..."
                                           data-category-id="${cat.id}">
                                </div>
                                <button class="btn btn-text add-item-btn" data-category-id="${cat.id}">
                                    ${ICONS.plus} Add Item
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
                <button class="btn btn-secondary" id="add-category-btn">
                    ${ICONS.plus} Add Category
                </button>
            </div>
        `;
    }

    renderItemRow(item, days) {
        const qty = actions.getItemQuantity(item, days);
        const qtyDisplay = this.getQuantityDisplay(item, days);

        return `
            <div class="item-row" data-item-id="${item.id}">
                <span class="item-name">${sanitize(item.name)}</span>
                <span class="item-quantity">${qtyDisplay}</span>
                <div class="item-actions">
                    <button class="btn btn-icon btn-small" data-action="edit-item" title="Edit">
                        ${ICONS.edit}
                    </button>
                    <button class="btn btn-icon btn-small btn-danger" data-action="delete-item" title="Delete">
                        ${ICONS.trash}
                    </button>
                </div>
            </div>
        `;
    }

    getQuantityDisplay(item, days) {
        const qty = actions.getItemQuantity(item, days);
        switch (item.quantityType) {
            case 'single':
                return '1';
            case 'fixed':
                return String(qty);
            case 'dependent':
                return `${qty} (${item.quantityExpression})`;
            default:
                return '1';
        }
    }

    renderAssignmentsView(state) {
        const { bags, categories } = state.currentList;

        return `
            <div class="assignments-view">
                <p class="assignments-help">Assign each category to a default bag. Items will be packed in their category's bag unless overridden.</p>
                <div class="assignments-list">
                    ${categories.map(cat => `
                        <div class="assignment-row" data-category-id="${cat.id}">
                            <span class="category-name">
                                ${ICONS[cat.icon] || ICONS.box} ${sanitize(cat.name)}
                            </span>
                            <select class="bag-select" data-category-id="${cat.id}">
                                <option value="">-- Not assigned --</option>
                                ${bags.map(bag => `
                                    <option value="${bag.id}" ${cat.defaultBagId === bag.id ? 'selected' : ''}>
                                        ${sanitize(bag.name)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderPackingView(state) {
        const { currentList } = state;
        const { bags, items, categories } = currentList;
        const days = currentList.trip.calculatedDays;

        if (bags.length === 0) {
            return `
                <div class="empty-message">
                    <p>No bags defined yet. Add bags first to start packing!</p>
                    <button class="btn btn-primary" data-action="goto-bags">Add Bags</button>
                </div>
            `;
        }

        return `
            <div class="packing-grid">
                ${bags.map(bag => {
                    const bagItems = actions.getItemsByBag(bag.id);
                    const packedCount = bagItems.filter(i => i.packed).length;

                    return `
                        <div class="bag-column" data-bag-id="${bag.id}"
                             ondragover="event.preventDefault()"
                             ondrop="window.Packy?.handleDrop?.(event, '${bag.id}')">
                            <div class="bag-header" style="background-color: ${bag.color}">
                                <span class="bag-icon">${ICONS[bag.icon] || ICONS.suitcase}</span>
                                <h3>${sanitize(bag.name)}</h3>
                                <span class="bag-count">${packedCount}/${bagItems.length}</span>
                            </div>
                            <div class="bag-items">
                                ${this.groupItemsByCategory(bagItems, categories).map(group => `
                                    <div class="category-group">
                                        <h4>${sanitize(group.categoryName)}</h4>
                                        ${group.items.map(item => `
                                            <label class="pack-item ${item.packed ? 'packed' : ''}"
                                                   data-item-id="${item.id}"
                                                   draggable="true"
                                                   ondragstart="window.Packy?.handleDragStart?.(event, '${item.id}')">
                                                <input type="checkbox" class="pack-checkbox"
                                                       ${item.packed ? 'checked' : ''}>
                                                <span class="item-name">${sanitize(item.name)}</span>
                                                <span class="item-qty">(${actions.getItemQuantity(item, days)})</span>
                                                <select class="item-bag-select" data-item-id="${item.id}" title="Move to bag">
                                                    ${bags.map(b => `
                                                        <option value="${b.id}" ${actions.getEffectiveBagId(item) === b.id ? 'selected' : ''}>
                                                            ${sanitize(b.name)}
                                                        </option>
                                                    `).join('')}
                                                </select>
                                            </label>
                                        `).join('')}
                                    </div>
                                `).join('')}
                                ${bagItems.length === 0 ? '<p class="no-items">No items assigned</p>' : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderStagesView(state) {
        const { stages } = state.currentList;

        return `
            <div class="stages-view">
                ${stages.sort((a, b) => a.order - b.order).map(stage => {
                    const progress = actions.getStageProgress(stage.id);
                    return `
                        <div class="stage-card" data-stage-id="${stage.id}">
                            <div class="stage-header">
                                <h3>${sanitize(stage.name)}</h3>
                                <span class="stage-progress">${progress}%</span>
                            </div>
                            <div class="stage-tasks">
                                ${stage.tasks.map(task => `
                                    <label class="task-row ${task.completed ? 'completed' : ''}"
                                           data-task-id="${task.id}">
                                        <input type="checkbox" class="task-checkbox"
                                               ${task.completed ? 'checked' : ''}>
                                        <span class="task-description">${sanitize(task.description)}</span>
                                        <button class="btn btn-icon btn-small btn-danger"
                                                data-action="delete-task" title="Delete">
                                            ${ICONS.trash}
                                        </button>
                                    </label>
                                `).join('')}
                            </div>
                            <div class="stage-add-task">
                                <input type="text" class="task-input" placeholder="Add a task..."
                                       data-stage-id="${stage.id}">
                                <button class="btn btn-small btn-primary add-task-btn"
                                        data-stage-id="${stage.id}">Add</button>
                            </div>
                        </div>
                    `;
                }).join('')}
                <button class="btn btn-secondary" id="add-stage-btn">
                    ${ICONS.plus} Add Stage
                </button>
            </div>
        `;
    }

    // ========================================
    // HELPERS
    // ========================================

    groupItemsByCategory(items, categories) {
        const groups = {};
        items.forEach(item => {
            const cat = categories.find(c => c.id === item.categoryId);
            const catName = cat?.name || 'Uncategorized';
            if (!groups[catName]) {
                groups[catName] = { categoryName: catName, items: [] };
            }
            groups[catName].items.push(item);
        });
        return Object.values(groups);
    }

    getSubviewLabel(subview) {
        const labels = {
            trip: 'Trip Info',
            bags: 'Bags',
            items: 'Items',
            assignments: 'Assignments',
            pack: 'Pack!',
            stages: 'Stages'
        };
        return labels[subview] || subview;
    }

    // ========================================
    // EVENT BINDINGS
    // ========================================

    bindEmptyStateEvents() {
        $('#new-trip-btn', this.container)?.addEventListener('click', () => {
            this.showNewTripModal();
        });

        $('#import-btn', this.container)?.addEventListener('click', async () => {
            const result = await fileService.importList();
            if (result.success) {
                actions.loadList(result.data);
                actions.showToast('List imported successfully', 'success');
            } else if (result.error) {
                actions.showToast(result.error, 'error');
            }
        });

        $$('.template-card', this.container).forEach(card => {
            card.addEventListener('click', () => {
                const templateId = card.dataset.templateId;
                this.showNewTripModal(templateId);
            });
        });
    }

    bindListViewEvents(activeSubview, state) {
        // Tab navigation
        $$('.tab', this.container).forEach(tab => {
            tab.addEventListener('click', () => {
                actions.navigateTo('my-lists', tab.dataset.subview);
            });
        });

        // Export button
        $('#export-btn', this.container)?.addEventListener('click', async () => {
            const list = store.getState().currentList;
            const filename = fileService.generateFilename(list.trip);
            const result = await fileService.exportList(list, filename);
            if (result.success) {
                actions.showToast('List exported successfully', 'success');
            }
        });

        // Clear button
        $('#clear-btn', this.container)?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the current list? This cannot be undone.')) {
                actions.clearCurrentList();
            }
        });

        // Subview-specific bindings
        switch (activeSubview) {
            case 'trip':
                this.bindTripEvents();
                break;
            case 'bags':
                this.bindBagsEvents();
                break;
            case 'items':
                this.bindItemsEvents(state);
                break;
            case 'assignments':
                this.bindAssignmentsEvents();
                break;
            case 'pack':
                this.bindPackingEvents();
                break;
            case 'stages':
                this.bindStagesEvents();
                break;
        }
    }

    bindTripEvents() {
        const nameInput = $('#trip-name', this.container);
        const depInput = $('#departure-date', this.container);
        const retInput = $('#return-date', this.container);

        nameInput?.addEventListener('change', (e) => {
            actions.updateTripField('name', e.target.value);
        });

        depInput?.addEventListener('change', (e) => {
            actions.updateTripField('departureDate', e.target.value);
        });

        retInput?.addEventListener('change', (e) => {
            actions.updateTripField('returnDate', e.target.value);
        });
    }

    bindBagsEvents() {
        $('#add-bag-btn', this.container)?.addEventListener('click', () => {
            this.showAddBagModal();
        });

        delegate(this.container, 'click', '[data-action="edit-bag"]', (e, btn) => {
            const bagId = btn.closest('.bag-card').dataset.bagId;
            this.showEditBagModal(bagId);
        });

        delegate(this.container, 'click', '[data-action="delete-bag"]', (e, btn) => {
            const bagId = btn.closest('.bag-card').dataset.bagId;
            if (confirm('Delete this bag? Items will become unassigned.')) {
                actions.removeBag(bagId);
            }
        });
    }

    bindItemsEvents(state) {
        $$('.add-item-btn', this.container).forEach(btn => {
            btn.addEventListener('click', () => {
                const categoryId = btn.dataset.categoryId;
                this.showAddItemModal(categoryId, state);
            });
        });

        delegate(this.container, 'click', '[data-action="edit-item"]', (e, btn) => {
            const itemId = btn.closest('.item-row').dataset.itemId;
            this.showEditItemModal(itemId, state);
        });

        delegate(this.container, 'click', '[data-action="delete-item"]', (e, btn) => {
            const itemId = btn.closest('.item-row').dataset.itemId;
            if (confirm('Delete this item?')) {
                actions.removeItem(itemId);
            }
        });

        $('#add-category-btn', this.container)?.addEventListener('click', () => {
            this.showAddCategoryModal();
        });

        // Quick add item via Enter key (rapid entry)
        delegate(this.container, 'keypress', '.item-input', (e, input) => {
            if (e.key === 'Enter' && input.value.trim()) {
                const categoryId = input.dataset.categoryId;
                this.pendingFocusCategoryId = categoryId;
                actions.addItem({
                    name: input.value.trim(),
                    categoryId: categoryId,
                    quantityType: 'single'
                });
            }
        });
    }

    bindAssignmentsEvents() {
        $$('.bag-select', this.container).forEach(select => {
            select.addEventListener('change', (e) => {
                const categoryId = e.target.dataset.categoryId;
                const bagId = e.target.value || null;
                actions.setCategoryDefaultBag(categoryId, bagId);
            });
        });
    }

    bindPackingEvents() {
        // Checkbox toggling
        delegate(this.container, 'change', '.pack-checkbox', (e, checkbox) => {
            const itemId = checkbox.closest('.pack-item').dataset.itemId;
            actions.toggleItemPacked(itemId);
        });

        // Dropdown bag change
        delegate(this.container, 'change', '.item-bag-select', (e, select) => {
            const itemId = select.dataset.itemId;
            const bagId = select.value;
            actions.moveItemToBag(itemId, bagId);
        });

        // Go to bags button
        delegate(this.container, 'click', '[data-action="goto-bags"]', () => {
            actions.navigateTo('my-lists', 'bags');
        });
    }

    bindStagesEvents() {
        // Task checkbox
        delegate(this.container, 'change', '.task-checkbox', (e, checkbox) => {
            const stageId = checkbox.closest('.stage-card').dataset.stageId;
            const taskId = checkbox.closest('.task-row').dataset.taskId;
            actions.toggleTaskCompleted(stageId, taskId);
        });

        // Add task
        delegate(this.container, 'click', '.add-task-btn', (e, btn) => {
            const stageId = btn.dataset.stageId;
            const input = $(`.task-input[data-stage-id="${stageId}"]`, this.container);
            if (input?.value.trim()) {
                this.pendingFocusStageId = stageId;
                actions.addTaskToStage(stageId, input.value.trim());
            }
        });

        // Enter key on task input
        delegate(this.container, 'keypress', '.task-input', (e, input) => {
            if (e.key === 'Enter' && input.value.trim()) {
                const stageId = input.dataset.stageId;
                this.pendingFocusStageId = stageId;
                actions.addTaskToStage(stageId, input.value.trim());
            }
        });

        // Delete task
        delegate(this.container, 'click', '[data-action="delete-task"]', (e, btn) => {
            const stageId = btn.closest('.stage-card').dataset.stageId;
            const taskId = btn.closest('.task-row').dataset.taskId;
            actions.removeTask(stageId, taskId);
        });

        // Add stage
        $('#add-stage-btn', this.container)?.addEventListener('click', () => {
            this.showAddStageModal();
        });
    }

    // ========================================
    // MODALS
    // ========================================

    showNewTripModal(preselectedTemplate = null) {
        const templates = store.getState().templates;

        actions.showModal({
            title: 'Start New Trip',
            content: `
                <form id="new-trip-form">
                    <div class="form-group">
                        <label for="modal-trip-name">Trip Name *</label>
                        <input type="text" id="modal-trip-name" required
                               placeholder="e.g., Beach Vacation 2024">
                    </div>
                    <div class="form-group">
                        <label for="modal-template">Start from Template</label>
                        <select id="modal-template">
                            <option value="">Start from Scratch</option>
                            ${templates.map(t => `
                                <option value="${t.id}" ${t.id === preselectedTemplate ? 'selected' : ''}>
                                    ${sanitize(t.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="modal-departure">Departure *</label>
                            <input type="date" id="modal-departure" required value="${getToday()}">
                        </div>
                        <div class="form-group">
                            <label for="modal-return">Return *</label>
                            <input type="date" id="modal-return" required value="${getDateFromToday(3)}">
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
                const form = $('#new-trip-form', overlay);
                const depInput = $('#modal-departure', overlay);
                const retInput = $('#modal-return', overlay);
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
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const tripData = {
                        name: $('#modal-trip-name', overlay).value,
                        departureDate: depInput.value,
                        returnDate: retInput.value
                    };

                    const templateId = $('#modal-template', overlay).value;

                    try {
                        actions.setLoading(true);
                        let list;
                        if (templateId) {
                            list = await templateService.createFromTemplate(templateId, tripData);
                        } else {
                            list = templateService.createEmptyList(tripData);
                        }

                        actions.loadList(list);
                        actions.hideModal();
                        actions.navigateTo('my-lists', templateId ? 'pack' : 'bags');
                        actions.showToast('Trip created successfully', 'success');
                    } catch (error) {
                        actions.showToast('Failed to create trip: ' + error.message, 'error');
                    } finally {
                        actions.setLoading(false);
                    }
                });
            }
        });
    }

    showAddBagModal() {
        actions.showModal({
            title: 'Add Bag',
            content: `
                <form id="bag-form">
                    <div class="form-group">
                        <label for="bag-name">Bag Name *</label>
                        <input type="text" id="bag-name" required placeholder="e.g., Carry-On">
                    </div>
                    <div class="form-group">
                        <label for="bag-type">Type</label>
                        <select id="bag-type">
                            <option value="carry-on">Carry-On</option>
                            <option value="personal-item">Personal Item</option>
                            <option value="checked">Checked Bag</option>
                            <option value="backpack">Backpack</option>
                            <option value="sling-bag">Sling Bag</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="bag-color">Color</label>
                        <input type="color" id="bag-color" value="#65b8e0">
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-save">Add Bag</button>
            `,
            onRender: (overlay) => {
                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);
                $('#modal-save', overlay).addEventListener('click', () => {
                    const form = $('#bag-form', overlay);
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    actions.addBag({
                        name: $('#bag-name', overlay).value,
                        type: $('#bag-type', overlay).value,
                        color: $('#bag-color', overlay).value,
                        icon: 'suitcase'
                    });
                    actions.hideModal();
                });
            }
        });
    }

    showEditBagModal(bagId) {
        const bag = store.getState().currentList.bags.find(b => b.id === bagId);
        if (!bag) return;

        actions.showModal({
            title: 'Edit Bag',
            content: `
                <form id="bag-form">
                    <div class="form-group">
                        <label for="bag-name">Bag Name *</label>
                        <input type="text" id="bag-name" required value="${sanitize(bag.name)}">
                    </div>
                    <div class="form-group">
                        <label for="bag-type">Type</label>
                        <select id="bag-type">
                            <option value="carry-on" ${bag.type === 'carry-on' ? 'selected' : ''}>Carry-On</option>
                            <option value="personal-item" ${bag.type === 'personal-item' ? 'selected' : ''}>Personal Item</option>
                            <option value="checked" ${bag.type === 'checked' ? 'selected' : ''}>Checked Bag</option>
                            <option value="backpack" ${bag.type === 'backpack' ? 'selected' : ''}>Backpack</option>
                            <option value="sling-bag" ${bag.type === 'sling-bag' ? 'selected' : ''}>Sling Bag</option>
                            <option value="custom" ${bag.type === 'custom' ? 'selected' : ''}>Custom</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="bag-color">Color</label>
                        <input type="color" id="bag-color" value="${bag.color}">
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-save">Save</button>
            `,
            onRender: (overlay) => {
                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);
                $('#modal-save', overlay).addEventListener('click', () => {
                    actions.updateBag(bagId, {
                        name: $('#bag-name', overlay).value,
                        type: $('#bag-type', overlay).value,
                        color: $('#bag-color', overlay).value
                    });
                    actions.hideModal();
                });
            }
        });
    }

    showAddItemModal(categoryId, state) {
        const days = state.currentList.trip.calculatedDays;

        actions.showModal({
            title: 'Add Item',
            content: `
                <form id="item-form">
                    <div class="form-group">
                        <label for="item-name">Item Name *</label>
                        <input type="text" id="item-name" required placeholder="e.g., T-Shirts">
                    </div>
                    <div class="form-group">
                        <label for="quantity-type">Quantity Type</label>
                        <select id="quantity-type">
                            <option value="single">Single (1)</option>
                            <option value="fixed">Fixed Quantity</option>
                            <option value="dependent">Based on Trip Days</option>
                        </select>
                    </div>
                    <div class="form-group quantity-fixed hidden">
                        <label for="item-quantity">Quantity</label>
                        <input type="number" id="item-quantity" min="1" value="2">
                    </div>
                    <div class="form-group quantity-dependent hidden">
                        <label for="item-expression">Expression</label>
                        <input type="text" id="item-expression" placeholder="e.g., d+1, 2d">
                        <small class="expression-help">d = trip days. Examples: d (one per day), d+1, 2d+1</small>
                        <div class="expression-preview"></div>
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-save">Add Item</button>
            `,
            onRender: (overlay) => {
                const typeSelect = $('#quantity-type', overlay);
                const fixedGroup = $('.quantity-fixed', overlay);
                const dependentGroup = $('.quantity-dependent', overlay);
                const expressionInput = $('#item-expression', overlay);
                const preview = $('.expression-preview', overlay);

                typeSelect.addEventListener('change', () => {
                    fixedGroup.classList.toggle('hidden', typeSelect.value !== 'fixed');
                    dependentGroup.classList.toggle('hidden', typeSelect.value !== 'dependent');
                });

                expressionInput.addEventListener('input', () => {
                    const result = expressionParser.validate(expressionInput.value);
                    if (result.valid) {
                        const qty = expressionParser.evaluate(expressionInput.value, days);
                        preview.textContent = `= ${qty} items for ${days} day trip`;
                        preview.className = 'expression-preview valid';
                    } else {
                        preview.textContent = result.error;
                        preview.className = 'expression-preview invalid';
                    }
                });

                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);
                $('#modal-save', overlay).addEventListener('click', () => {
                    const form = $('#item-form', overlay);
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const qtyType = typeSelect.value;
                    const itemData = {
                        name: $('#item-name', overlay).value,
                        categoryId,
                        quantityType: qtyType
                    };

                    if (qtyType === 'fixed') {
                        itemData.quantity = parseInt($('#item-quantity', overlay).value, 10);
                    } else if (qtyType === 'dependent') {
                        itemData.quantityExpression = expressionInput.value;
                    }

                    actions.addItem(itemData);
                    actions.hideModal();
                });
            }
        });
    }

    showEditItemModal(itemId, state) {
        const item = state.currentList.items.find(i => i.id === itemId);
        if (!item) return;

        const days = state.currentList.trip.calculatedDays;

        actions.showModal({
            title: 'Edit Item',
            content: `
                <form id="item-form">
                    <div class="form-group">
                        <label for="item-name">Item Name *</label>
                        <input type="text" id="item-name" required value="${sanitize(item.name)}">
                    </div>
                    <div class="form-group">
                        <label for="quantity-type">Quantity Type</label>
                        <select id="quantity-type">
                            <option value="single" ${item.quantityType === 'single' ? 'selected' : ''}>Single (1)</option>
                            <option value="fixed" ${item.quantityType === 'fixed' ? 'selected' : ''}>Fixed Quantity</option>
                            <option value="dependent" ${item.quantityType === 'dependent' ? 'selected' : ''}>Based on Trip Days</option>
                        </select>
                    </div>
                    <div class="form-group quantity-fixed ${item.quantityType !== 'fixed' ? 'hidden' : ''}">
                        <label for="item-quantity">Quantity</label>
                        <input type="number" id="item-quantity" min="1" value="${item.quantity || 2}">
                    </div>
                    <div class="form-group quantity-dependent ${item.quantityType !== 'dependent' ? 'hidden' : ''}">
                        <label for="item-expression">Expression</label>
                        <input type="text" id="item-expression" value="${item.quantityExpression || ''}">
                        <small class="expression-help">d = trip days. Examples: d, d+1, 2d+1</small>
                        <div class="expression-preview"></div>
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-save">Save</button>
            `,
            onRender: (overlay) => {
                const typeSelect = $('#quantity-type', overlay);
                const fixedGroup = $('.quantity-fixed', overlay);
                const dependentGroup = $('.quantity-dependent', overlay);
                const expressionInput = $('#item-expression', overlay);
                const preview = $('.expression-preview', overlay);

                const updatePreview = () => {
                    if (expressionInput.value) {
                        const result = expressionParser.validate(expressionInput.value);
                        if (result.valid) {
                            const qty = expressionParser.evaluate(expressionInput.value, days);
                            preview.textContent = `= ${qty} items for ${days} day trip`;
                            preview.className = 'expression-preview valid';
                        } else {
                            preview.textContent = result.error;
                            preview.className = 'expression-preview invalid';
                        }
                    }
                };

                typeSelect.addEventListener('change', () => {
                    fixedGroup.classList.toggle('hidden', typeSelect.value !== 'fixed');
                    dependentGroup.classList.toggle('hidden', typeSelect.value !== 'dependent');
                });

                expressionInput.addEventListener('input', updatePreview);
                updatePreview();

                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);
                $('#modal-save', overlay).addEventListener('click', () => {
                    const qtyType = typeSelect.value;
                    const updates = {
                        name: $('#item-name', overlay).value,
                        quantityType: qtyType
                    };

                    if (qtyType === 'fixed') {
                        updates.quantity = parseInt($('#item-quantity', overlay).value, 10);
                        updates.quantityExpression = null;
                    } else if (qtyType === 'dependent') {
                        updates.quantityExpression = expressionInput.value;
                        updates.quantity = null;
                    } else {
                        updates.quantity = null;
                        updates.quantityExpression = null;
                    }

                    actions.updateItem(itemId, updates);
                    actions.hideModal();
                });
            }
        });
    }

    showAddCategoryModal() {
        actions.showModal({
            title: 'Add Category',
            content: `
                <form id="category-form">
                    <div class="form-group">
                        <label for="category-name">Category Name *</label>
                        <input type="text" id="category-name" required placeholder="e.g., Beach Gear">
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-save">Add Category</button>
            `,
            onRender: (overlay) => {
                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);
                $('#modal-save', overlay).addEventListener('click', () => {
                    const name = $('#category-name', overlay).value;
                    if (name.trim()) {
                        actions.addCategory({ name: name.trim() });
                        actions.hideModal();
                    }
                });
            }
        });
    }

    showAddStageModal() {
        actions.showModal({
            title: 'Add Preparation Stage',
            content: `
                <form id="stage-form">
                    <div class="form-group">
                        <label for="stage-name">Stage Name *</label>
                        <input type="text" id="stage-name" required placeholder="e.g., Week Before">
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="modal-save">Add Stage</button>
            `,
            onRender: (overlay) => {
                $('#modal-cancel', overlay).addEventListener('click', actions.hideModal);
                $('#modal-save', overlay).addEventListener('click', () => {
                    const name = $('#stage-name', overlay).value;
                    if (name.trim()) {
                        actions.addStage({ name: name.trim() });
                        actions.hideModal();
                    }
                });
            }
        });
    }
}
