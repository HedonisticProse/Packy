/**
 * Input Validation Utilities
 */

/**
 * Check if value is a non-empty string
 * @param {*} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a valid date string (YYYY-MM-DD)
 * @param {string} value
 * @returns {boolean}
 */
export function isValidDateString(value) {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
}

/**
 * Check if return date is after departure date
 * @param {string} departure
 * @param {string} returnDate
 * @returns {boolean}
 */
export function isValidDateRange(departure, returnDate) {
    const dep = new Date(departure);
    const ret = new Date(returnDate);
    return ret >= dep;
}

/**
 * Check if value is a positive integer
 * @param {*} value
 * @returns {boolean}
 */
export function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
}

/**
 * Validate packing list structure
 * @param {Object} data
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePackingList(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Data must be an object'] };
    }

    // Check required top-level fields
    const requiredFields = ['meta', 'bags', 'categories', 'items'];
    requiredFields.forEach(field => {
        if (!data[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    });

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    // Validate arrays
    if (!Array.isArray(data.bags)) {
        errors.push('Bags must be an array');
    }
    if (!Array.isArray(data.categories)) {
        errors.push('Categories must be an array');
    }
    if (!Array.isArray(data.items)) {
        errors.push('Items must be an array');
    }

    // Validate items have required fields
    if (Array.isArray(data.items)) {
        data.items.forEach((item, index) => {
            if (!item.id) errors.push(`Item ${index}: missing id`);
            if (!item.name) errors.push(`Item ${index}: missing name`);
            if (!item.categoryId) errors.push(`Item ${index}: missing categoryId`);
            if (!item.quantityType) errors.push(`Item ${index}: missing quantityType`);
        });
    }

    // Validate bags have required fields
    if (Array.isArray(data.bags)) {
        data.bags.forEach((bag, index) => {
            if (!bag.id) errors.push(`Bag ${index}: missing id`);
            if (!bag.name) errors.push(`Bag ${index}: missing name`);
        });
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Sanitize string input (prevent XSS)
 * @param {string} str
 * @returns {string}
 */
export function sanitize(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
