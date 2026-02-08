/**
 * Template Service
 * Loads and manages packing list templates from /config
 */

import { generateShortId } from '../utils/uuid.js';
import { calculateDays } from './dateService.js';

class TemplateService {
    constructor() {
        this.templates = [];
        this.manifest = null;
        this.initialized = false;
    }

    /**
     * Initialize by loading template manifest
     * @returns {Promise<boolean>}
     */
    async initialize() {
        if (this.initialized) return true;

        try {
            const response = await fetch('./config/template-manifest.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            this.manifest = await response.json();
            this.initialized = true;
            return true;
        } catch (e) {
            console.error('Failed to load template manifest:', e);
            // Use fallback empty manifest
            this.manifest = { version: '1.0.0', templates: [] };
            this.initialized = true;
            return false;
        }
    }

    /**
     * Get list of available templates (metadata only)
     * @returns {Promise<Array>}
     */
    async getTemplateList() {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.manifest?.templates || [];
    }

    /**
     * Load a specific template by ID
     * @param {string} templateId - Template ID
     * @returns {Promise<Object>}
     */
    async loadTemplate(templateId) {
        const list = await this.getTemplateList();
        const templateInfo = list.find(t => t.id === templateId);

        if (!templateInfo) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const response = await fetch(`./config/templates/${templateInfo.filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${templateInfo.filename}`);
        }

        return await response.json();
    }

    /**
     * Create a new packing list from template
     * @param {string} templateId - Template ID
     * @param {Object} tripData - Trip details (name, departureDate, returnDate)
     * @returns {Promise<Object>}
     */
    async createFromTemplate(templateId, tripData) {
        const template = await this.loadTemplate(templateId);

        // Create ID mapping for references
        const bagIdMap = {};
        const categoryIdMap = {};

        // Generate new IDs for bags
        const bags = template.bags.map(bag => {
            const newId = generateShortId();
            bagIdMap[bag.id] = newId;
            return { ...bag, id: newId };
        });

        // Generate new IDs for categories and update bag references
        const categories = template.categories.map(cat => {
            const newId = generateShortId();
            categoryIdMap[cat.id] = newId;
            return {
                ...cat,
                id: newId,
                defaultBagId: cat.defaultBagId ? bagIdMap[cat.defaultBagId] : null
            };
        });

        // Generate new IDs for items and update references
        const items = template.items.map(item => ({
            ...item,
            id: generateShortId(),
            categoryId: categoryIdMap[item.categoryId] || item.categoryId,
            bagId: item.bagId ? bagIdMap[item.bagId] : null,
            packed: false
        }));

        // Generate new IDs for stages and tasks
        const stages = (template.stages || []).map(stage => ({
            ...stage,
            id: generateShortId(),
            tasks: stage.tasks.map(task => ({
                ...task,
                id: generateShortId(),
                completed: false
            }))
        }));

        return {
            meta: {
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                isTemplate: false,
                sourceTemplate: templateId
            },
            trip: {
                name: tripData.name,
                departureDate: tripData.departureDate,
                returnDate: tripData.returnDate,
                calculatedDays: calculateDays(tripData.departureDate, tripData.returnDate)
            },
            bags,
            categories,
            items,
            stages
        };
    }

    /**
     * Create empty list (start from scratch)
     * @param {Object} tripData - Trip details
     * @returns {Object}
     */
    createEmptyList(tripData) {
        return {
            meta: {
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                isTemplate: false
            },
            trip: {
                name: tripData.name,
                departureDate: tripData.departureDate,
                returnDate: tripData.returnDate,
                calculatedDays: calculateDays(tripData.departureDate, tripData.returnDate)
            },
            bags: [],
            categories: this.getDefaultCategories(),
            items: [],
            stages: this.getDefaultStages()
        };
    }

    /**
     * Get default categories for empty lists
     * @returns {Array}
     */
    getDefaultCategories() {
        return [
            { id: generateShortId(), name: 'Clothing', icon: 'shirt', defaultBagId: null },
            { id: generateShortId(), name: 'Toiletries', icon: 'soap', defaultBagId: null },
            { id: generateShortId(), name: 'Electronics', icon: 'laptop', defaultBagId: null },
            { id: generateShortId(), name: 'Documents', icon: 'file', defaultBagId: null },
            { id: generateShortId(), name: 'Medical', icon: 'pills', defaultBagId: null },
            { id: generateShortId(), name: 'Miscellaneous', icon: 'box', defaultBagId: null }
        ];
    }

    /**
     * Get default preparation stages
     * @returns {Array}
     */
    getDefaultStages() {
        return [
            {
                id: generateShortId(),
                name: 'Night Before',
                order: 1,
                tasks: []
            },
            {
                id: generateShortId(),
                name: 'Morning Of',
                order: 2,
                tasks: []
            }
        ];
    }
}

// Singleton instance
export const templateService = new TemplateService();
