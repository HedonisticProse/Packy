/**
 * UUID Generation Utility
 * Generates unique identifiers for entities
 */

/**
 * Generate a random UUID v4
 * @returns {string} UUID string
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate a shorter ID for internal use
 * @returns {string} Short ID string
 */
export function generateShortId() {
    return 'id-' + Math.random().toString(36).substring(2, 11);
}
