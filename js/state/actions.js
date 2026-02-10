/**
 * State Actions
 * All state mutations go through these functions
 */

import { store } from './store.js';
import { generateShortId } from '../utils/uuid.js';
import { expressionParser } from '../services/expressionParser.js';
import { calculateDays } from '../services/dateService.js';

// ============================================
// TRIP ACTIONS
// ============================================

/**
 * Set or update trip details
 * @param {Object} tripData - Trip details
 */
export function setTrip(tripData) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            trip: {
                ...tripData,
                calculatedDays: calculateDays(tripData.departureDate, tripData.returnDate)
            }
        }
    }));
}

/**
 * Update a specific trip field
 * @param {string} field - Field name
 * @param {*} value - Field value
 */
export function updateTripField(field, value) {
    store.setState(state => {
        const trip = { ...state.currentList.trip, [field]: value };
        if (field === 'departureDate' || field === 'returnDate') {
            trip.calculatedDays = calculateDays(trip.departureDate, trip.returnDate);
        }
        return {
            currentList: { ...state.currentList, trip }
        };
    });
}

// ============================================
// BAG ACTIONS
// ============================================

/**
 * Add a new bag
 * @param {Object} bagData - Bag details
 * @returns {string} New bag ID
 */
export function addBag(bagData) {
    const bag = {
        id: generateShortId(),
        color: '#65b8e0',
        icon: 'suitcase',
        ...bagData
    };

    store.setState(state => ({
        currentList: {
            ...state.currentList,
            bags: [...(state.currentList?.bags || []), bag]
        }
    }));

    return bag.id;
}

/**
 * Update a bag
 * @param {string} bagId - Bag ID
 * @param {Object} updates - Fields to update
 */
export function updateBag(bagId, updates) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            bags: state.currentList.bags.map(bag =>
                bag.id === bagId ? { ...bag, ...updates } : bag
            )
        }
    }));
}

/**
 * Remove a bag
 * @param {string} bagId - Bag ID
 */
export function removeBag(bagId) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            bags: state.currentList.bags.filter(bag => bag.id !== bagId),
            // Also remove bag assignments from categories and items
            categories: state.currentList.categories.map(cat =>
                cat.defaultBagId === bagId ? { ...cat, defaultBagId: null } : cat
            ),
            items: state.currentList.items.map(item =>
                item.bagId === bagId ? { ...item, bagId: null } : item
            )
        }
    }));
}

// ============================================
// CATEGORY ACTIONS
// ============================================

/**
 * Add a new category
 * @param {Object} categoryData - Category details
 * @returns {string} New category ID
 */
export function addCategory(categoryData) {
    const category = {
        id: generateShortId(),
        icon: 'box',
        defaultBagId: null,
        ...categoryData
    };

    store.setState(state => ({
        currentList: {
            ...state.currentList,
            categories: [...(state.currentList?.categories || []), category]
        }
    }));

    return category.id;
}

/**
 * Update a category
 * @param {string} categoryId - Category ID
 * @param {Object} updates - Fields to update
 */
export function updateCategory(categoryId, updates) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            categories: state.currentList.categories.map(cat =>
                cat.id === categoryId ? { ...cat, ...updates } : cat
            )
        }
    }));
}

/**
 * Set default bag for a category
 * @param {string} categoryId - Category ID
 * @param {string} bagId - Bag ID
 */
export function setCategoryDefaultBag(categoryId, bagId) {
    updateCategory(categoryId, { defaultBagId: bagId });
}

/**
 * Remove a category
 * @param {string} categoryId - Category ID
 */
export function removeCategory(categoryId) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            categories: state.currentList.categories.filter(cat => cat.id !== categoryId),
            // Also remove items in this category
            items: state.currentList.items.filter(item => item.categoryId !== categoryId)
        }
    }));
}

// ============================================
// ITEM ACTIONS
// ============================================

/**
 * Add a new item
 * @param {Object} itemData - Item details
 * @returns {string} New item ID
 */
export function addItem(itemData) {
    const currentItems = store.getState().currentList?.items || [];
    const categoryItems = currentItems.filter(i => i.categoryId === itemData.categoryId);
    const maxOrder = categoryItems.length > 0
        ? Math.max(...categoryItems.map(i => i.order ?? 0))
        : -1;

    const item = {
        id: generateShortId(),
        order: maxOrder + 1,
        quantityType: 'single',
        quantity: 1,
        quantityExpression: null,
        bagId: null,
        packed: false,
        notes: '',
        ...itemData
    };

    store.setState(state => ({
        currentList: {
            ...state.currentList,
            items: [...(state.currentList?.items || []), item]
        }
    }));

    return item.id;
}

/**
 * Update an item
 * @param {string} itemId - Item ID
 * @param {Object} updates - Fields to update
 */
export function updateItem(itemId, updates) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            items: state.currentList.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
            )
        }
    }));
}

/**
 * Toggle item packed status
 * @param {string} itemId - Item ID
 */
export function toggleItemPacked(itemId) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            items: state.currentList.items.map(item =>
                item.id === itemId ? { ...item, packed: !item.packed } : item
            )
        }
    }));
}

/**
 * Move item to a different bag
 * @param {string} itemId - Item ID
 * @param {string} bagId - Target bag ID (null to use category default)
 */
export function moveItemToBag(itemId, bagId) {
    updateItem(itemId, { bagId });
}

/**
 * Move item to a different category
 * @param {string} itemId - Item ID
 * @param {string} newCategoryId - Target category ID
 */
export function moveItemToCategory(itemId, newCategoryId) {
    const state = store.getState();
    const items = state.currentList?.items || [];
    const categoryItems = items.filter(i => i.categoryId === newCategoryId);
    const maxOrder = categoryItems.length > 0
        ? Math.max(...categoryItems.map(i => i.order ?? 0))
        : -1;

    updateItem(itemId, { categoryId: newCategoryId, order: maxOrder + 1 });
}

/**
 * Reorder item within or across categories
 * @param {string} itemId - Item being dragged
 * @param {string} targetItemId - Item being dropped on
 * @param {string} position - 'before' or 'after'
 */
export function reorderItem(itemId, targetItemId, position) {
    store.setState(state => {
        const items = [...state.currentList.items];
        const item = items.find(i => i.id === itemId);
        const targetItem = items.find(i => i.id === targetItemId);

        if (!item || !targetItem) return state;

        if (item.categoryId !== targetItem.categoryId) {
            // Moving to different category - place relative to target
            const targetCategoryItems = items
                .filter(i => i.categoryId === targetItem.categoryId)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            const targetIndex = targetCategoryItems.findIndex(i => i.id === targetItemId);
            const newOrder = position === 'before' ? targetIndex : targetIndex + 1;

            // Shift existing items to make room
            targetCategoryItems.forEach((i, idx) => {
                if (idx >= newOrder) i.order = idx + 1;
            });

            return {
                currentList: {
                    ...state.currentList,
                    items: items.map(i => {
                        if (i.id === itemId) {
                            return { ...i, categoryId: targetItem.categoryId, order: newOrder };
                        }
                        const updated = targetCategoryItems.find(c => c.id === i.id);
                        return updated || i;
                    })
                }
            };
        }

        // Same category reordering
        const categoryItems = items
            .filter(i => i.categoryId === item.categoryId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const oldIndex = categoryItems.findIndex(i => i.id === itemId);
        const targetIndex = categoryItems.findIndex(i => i.id === targetItemId);
        let newIndex = position === 'before' ? targetIndex : targetIndex + 1;
        if (oldIndex < newIndex) newIndex--;

        // Remove and reinsert
        const [movedItem] = categoryItems.splice(oldIndex, 1);
        categoryItems.splice(newIndex, 0, movedItem);

        // Reassign order values
        categoryItems.forEach((i, idx) => { i.order = idx; });

        return {
            currentList: {
                ...state.currentList,
                items: items.map(i => {
                    const updated = categoryItems.find(c => c.id === i.id);
                    return updated || i;
                })
            }
        };
    });
}

/**
 * Remove an item
 * @param {string} itemId - Item ID
 */
export function removeItem(itemId) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            items: state.currentList.items.filter(item => item.id !== itemId)
        }
    }));
}

// ============================================
// STAGE ACTIONS
// ============================================

/**
 * Add a new stage
 * @param {Object} stageData - Stage details
 * @returns {string} New stage ID
 */
export function addStage(stageData) {
    const state = store.getState();
    const order = state.currentList?.stages?.length || 0;

    const stage = {
        id: generateShortId(),
        order,
        tasks: [],
        ...stageData
    };

    store.setState(state => ({
        currentList: {
            ...state.currentList,
            stages: [...(state.currentList?.stages || []), stage]
        }
    }));

    return stage.id;
}

/**
 * Update a stage
 * @param {string} stageId - Stage ID
 * @param {Object} updates - Fields to update
 */
export function updateStage(stageId, updates) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            stages: state.currentList.stages.map(stage =>
                stage.id === stageId ? { ...stage, ...updates } : stage
            )
        }
    }));
}

/**
 * Remove a stage
 * @param {string} stageId - Stage ID
 */
export function removeStage(stageId) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            stages: state.currentList.stages.filter(stage => stage.id !== stageId)
        }
    }));
}

/**
 * Reorder stages
 * @param {string} stageId - Stage being dragged
 * @param {string} targetStageId - Stage being dropped on
 * @param {string} position - 'before' or 'after'
 */
export function reorderStage(stageId, targetStageId, position) {
    store.setState(state => {
        const stages = [...state.currentList.stages].sort((a, b) => a.order - b.order);
        const draggedIndex = stages.findIndex(s => s.id === stageId);
        const targetIndex = stages.findIndex(s => s.id === targetStageId);

        if (draggedIndex === -1 || targetIndex === -1) return state;

        let newIndex = position === 'before' ? targetIndex : targetIndex + 1;
        if (draggedIndex < newIndex) newIndex--;

        const [movedStage] = stages.splice(draggedIndex, 1);
        stages.splice(newIndex, 0, movedStage);

        // Reassign order values
        stages.forEach((s, idx) => { s.order = idx; });

        return {
            currentList: { ...state.currentList, stages }
        };
    });
}

/**
 * Add a task to a stage
 * @param {string} stageId - Stage ID
 * @param {string} description - Task description
 * @returns {string} New task ID
 */
export function addTaskToStage(stageId, description) {
    store.setState(state => {
        const stage = state.currentList.stages.find(s => s.id === stageId);
        const maxOrder = stage && stage.tasks.length > 0
            ? Math.max(...stage.tasks.map(t => t.order ?? 0))
            : -1;

        const task = {
            id: generateShortId(),
            description,
            completed: false,
            order: maxOrder + 1
        };

        return {
            currentList: {
                ...state.currentList,
                stages: state.currentList.stages.map(s =>
                    s.id === stageId ? { ...s, tasks: [...s.tasks, task] } : s
                )
            }
        };
    });

    const state = store.getState();
    const stage = state.currentList.stages.find(s => s.id === stageId);
    return stage.tasks[stage.tasks.length - 1].id;
}

/**
 * Update a task
 * @param {string} stageId - Stage ID
 * @param {string} taskId - Task ID
 * @param {Object} updates - Fields to update
 */
export function updateTask(stageId, taskId, updates) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            stages: state.currentList.stages.map(stage =>
                stage.id === stageId
                    ? {
                        ...stage,
                        tasks: stage.tasks.map(task =>
                            task.id === taskId ? { ...task, ...updates } : task
                        )
                    }
                    : stage
            )
        }
    }));
}

/**
 * Toggle task completed status
 * @param {string} stageId - Stage ID
 * @param {string} taskId - Task ID
 */
export function toggleTaskCompleted(stageId, taskId) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            stages: state.currentList.stages.map(stage =>
                stage.id === stageId
                    ? {
                        ...stage,
                        tasks: stage.tasks.map(task =>
                            task.id === taskId ? { ...task, completed: !task.completed } : task
                        )
                    }
                    : stage
            )
        }
    }));
}

/**
 * Remove a task from a stage
 * @param {string} stageId - Stage ID
 * @param {string} taskId - Task ID
 */
export function removeTask(stageId, taskId) {
    store.setState(state => ({
        currentList: {
            ...state.currentList,
            stages: state.currentList.stages.map(stage =>
                stage.id === stageId
                    ? { ...stage, tasks: stage.tasks.filter(task => task.id !== taskId) }
                    : stage
            )
        }
    }));
}

/**
 * Reorder task within a stage
 * @param {string} stageId - Stage ID
 * @param {string} taskId - Task being dragged
 * @param {string} targetTaskId - Task being dropped on
 * @param {string} position - 'before' or 'after'
 */
export function reorderTask(stageId, taskId, targetTaskId, position) {
    store.setState(state => {
        const stage = state.currentList.stages.find(s => s.id === stageId);
        if (!stage) return state;

        const tasks = [...stage.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const draggedIndex = tasks.findIndex(t => t.id === taskId);
        const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

        if (draggedIndex === -1 || targetIndex === -1) return state;

        let newIndex = position === 'before' ? targetIndex : targetIndex + 1;
        if (draggedIndex < newIndex) newIndex--;

        const [movedTask] = tasks.splice(draggedIndex, 1);
        tasks.splice(newIndex, 0, movedTask);

        // Reassign order values
        tasks.forEach((t, idx) => { t.order = idx; });

        return {
            currentList: {
                ...state.currentList,
                stages: state.currentList.stages.map(s =>
                    s.id === stageId ? { ...s, tasks } : s
                )
            }
        };
    });
}

// ============================================
// LIST ACTIONS
// ============================================

/**
 * Load a packing list into state
 * @param {Object} listData - Packing list data
 */
export function loadList(listData) {
    store.setState({ currentList: listData });
}

/**
 * Clear the current list
 */
export function clearCurrentList() {
    store.setState({ currentList: null });
}

// ============================================
// UI ACTIONS
// ============================================

/**
 * Navigate to a view
 * @param {string} view - View name
 * @param {string} subview - Subview name (optional)
 */
export function navigateTo(view, subview = null) {
    store.setState(state => ({
        ui: {
            ...state.ui,
            currentView: view,
            currentSubview: subview
        }
    }));
}

/**
 * Show a modal
 * @param {Object} modalConfig - Modal configuration
 */
export function showModal(modalConfig) {
    store.setState(state => ({
        ui: { ...state.ui, modal: modalConfig }
    }));
}

/**
 * Hide the modal
 */
export function hideModal() {
    store.setState(state => ({
        ui: { ...state.ui, modal: null }
    }));
}

/**
 * Show a toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'info', 'success', 'warning', 'error'
 * @param {number} duration - Duration in ms (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
    store.setState(state => ({
        ui: { ...state.ui, toast: { message, type } }
    }));

    // Auto-hide after duration
    setTimeout(() => {
        store.setState(state => ({
            ui: { ...state.ui, toast: null }
        }));
    }, duration);
}

/**
 * Set loading state
 * @param {boolean} isLoading
 */
export function setLoading(isLoading) {
    store.setState(state => ({
        ui: { ...state.ui, isLoading }
    }));
}

// ============================================
// COMPUTED SELECTORS
// ============================================

/**
 * Get calculated quantity for an item
 * @param {Object} item - Item object
 * @param {number} days - Number of trip days
 * @returns {number}
 */
export function getItemQuantity(item, days) {
    switch (item.quantityType) {
        case 'single':
            return 1;
        case 'fixed':
            return item.quantity || 1;
        case 'dependent':
            try {
                return expressionParser.evaluate(item.quantityExpression, days);
            } catch {
                return 1;
            }
        default:
            return 1;
    }
}

/**
 * Get packing progress percentage
 * @returns {number} 0-100
 */
export function getPackingProgress() {
    const state = store.getState();
    if (!state.currentList?.items?.length) return 0;

    const packedCount = state.currentList.items.filter(i => i.packed).length;
    return Math.round((packedCount / state.currentList.items.length) * 100);
}

/**
 * Get items assigned to a specific bag
 * @param {string} bagId - Bag ID
 * @returns {Array}
 */
export function getItemsByBag(bagId) {
    const state = store.getState();
    if (!state.currentList) return [];

    return state.currentList.items.filter(item => {
        // Item has explicit bag assignment
        if (item.bagId) return item.bagId === bagId;

        // Fall back to category's default bag
        const category = state.currentList.categories.find(c => c.id === item.categoryId);
        return category?.defaultBagId === bagId;
    });
}

/**
 * Get items grouped by category
 * @returns {Object} { categoryId: items[] }
 */
export function getItemsByCategory() {
    const state = store.getState();
    if (!state.currentList) return {};

    const grouped = {};
    state.currentList.items.forEach(item => {
        if (!grouped[item.categoryId]) {
            grouped[item.categoryId] = [];
        }
        grouped[item.categoryId].push(item);
    });
    return grouped;
}

/**
 * Get unassigned items (no bag, and category has no default bag)
 * @returns {Array}
 */
export function getUnassignedItems() {
    const state = store.getState();
    if (!state.currentList) return [];

    return state.currentList.items.filter(item => {
        if (item.bagId) return false;
        const category = state.currentList.categories.find(c => c.id === item.categoryId);
        return !category?.defaultBagId;
    });
}

/**
 * Get stage completion percentage
 * @param {string} stageId - Stage ID
 * @returns {number} 0-100
 */
export function getStageProgress(stageId) {
    const state = store.getState();
    const stage = state.currentList?.stages?.find(s => s.id === stageId);
    if (!stage?.tasks?.length) return 0;

    const completedCount = stage.tasks.filter(t => t.completed).length;
    return Math.round((completedCount / stage.tasks.length) * 100);
}

/**
 * Get the effective bag for an item (considering category defaults)
 * @param {Object} item - Item object
 * @returns {string|null} Bag ID
 */
export function getEffectiveBagId(item) {
    const state = store.getState();
    if (item.bagId) return item.bagId;

    const category = state.currentList?.categories?.find(c => c.id === item.categoryId);
    return category?.defaultBagId || null;
}
