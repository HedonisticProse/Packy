/**
 * File Service
 * Handles JSON import/export functionality
 */

import { validatePackingList } from '../utils/validation.js';

class FileService {
    constructor() {
        this.supportsFileSystemAccess = 'showSaveFilePicker' in window;
    }

    /**
     * Export packing list to JSON file
     * @param {Object} listData - Packing list data
     * @param {string} filename - Suggested filename
     * @returns {Promise<{success: boolean, cancelled?: boolean, error?: string}>}
     */
    async exportList(listData, filename = 'packing-list.json') {
        const json = JSON.stringify(listData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });

        if (this.supportsFileSystemAccess) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return { success: true };
            } catch (e) {
                if (e.name === 'AbortError') {
                    return { success: false, cancelled: true };
                }
                console.error('Export error:', e);
                return { success: false, error: e.message };
            }
        } else {
            // Fallback: trigger download
            return this.downloadFile(blob, filename);
        }
    }

    /**
     * Fallback download method
     * @param {Blob} blob - File blob
     * @param {string} filename - Filename
     * @returns {{success: boolean}}
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
    }

    /**
     * Import packing list from JSON file
     * @returns {Promise<{success: boolean, data?: Object, filename?: string, cancelled?: boolean, error?: string}>}
     */
    async importList() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve({ success: false, cancelled: true });
                    return;
                }

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);

                    // Validate structure
                    const validation = validatePackingList(data);
                    if (!validation.valid) {
                        resolve({
                            success: false,
                            error: `Invalid file structure: ${validation.errors.join(', ')}`
                        });
                        return;
                    }

                    resolve({ success: true, data, filename: file.name });
                } catch (e) {
                    console.error('Import error:', e);
                    resolve({ success: false, error: 'Invalid JSON file' });
                }
            };

            // Handle cancel (no file selected)
            input.oncancel = () => {
                resolve({ success: false, cancelled: true });
            };

            input.click();
        });
    }

    /**
     * Generate export filename from trip data
     * @param {Object} trip - Trip data
     * @returns {string} Filename
     */
    generateFilename(trip) {
        const safeName = (trip?.name || 'packing-list')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const date = new Date().toISOString().split('T')[0];
        return `packy-${safeName}-${date}.json`;
    }

    /**
     * Export as template (strips trip-specific data)
     * @param {Object} listData - Packing list data
     * @param {string} templateName - Template name
     * @returns {Promise<{success: boolean}>}
     */
    async exportAsTemplate(listData, templateName) {
        const template = {
            meta: {
                version: listData.meta?.version || '1.0.0',
                templateName: templateName,
                description: '',
                author: 'User',
                isTemplate: true,
                createdAt: new Date().toISOString()
            },
            bags: listData.bags,
            categories: listData.categories,
            items: listData.items.map(item => ({
                ...item,
                packed: false // Reset packed status
            })),
            stages: listData.stages?.map(stage => ({
                ...stage,
                tasks: stage.tasks.map(task => ({
                    ...task,
                    completed: false // Reset completed status
                }))
            })) || []
        };

        const filename = `packy-template-${templateName.toLowerCase().replace(/\s+/g, '-')}.json`;
        return this.exportList(template, filename);
    }
}

// Singleton instance
export const fileService = new FileService();
