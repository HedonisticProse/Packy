/**
 * Date Service
 * Handles date calculations and formatting
 */

/**
 * Parse YYYY-MM-DD string as local date (not UTC)
 * Avoids timezone offset issues where UTC dates shift backward
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object in local timezone
 */
function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Calculate number of days between two dates (inclusive)
 * @param {string} departure - Departure date (YYYY-MM-DD)
 * @param {string} returnDate - Return date (YYYY-MM-DD)
 * @returns {number} Number of days
 */
export function calculateDays(departure, returnDate) {
    const start = parseLocalDate(departure);
    const end = parseLocalDate(returnDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both departure and return days
}

/**
 * Format date for display
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} format - Format type: 'short', 'medium', 'long'
 * @returns {string} Formatted date
 */
export function formatDate(dateStr, format = 'medium') {
    const date = parseLocalDate(dateStr);

    const options = {
        short: { month: 'numeric', day: 'numeric' },
        medium: { month: 'short', day: 'numeric' },
        long: { month: 'long', day: 'numeric', year: 'numeric' }
    };

    return date.toLocaleDateString('en-US', options[format] || options.medium);
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string}
 */
export function getToday() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get date N days from today in YYYY-MM-DD format
 * @param {number} days - Number of days to add
 * @returns {string}
 */
export function getDateFromToday(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

/**
 * Check if a date is in the past
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {boolean}
 */
export function isPastDate(dateStr) {
    const date = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

/**
 * Get date range string for display
 * @param {string} departure - Departure date
 * @param {string} returnDate - Return date
 * @returns {string} Formatted range like "Dec 20 - Dec 27"
 */
export function getDateRangeString(departure, returnDate) {
    const depDate = parseLocalDate(departure);
    const retDate = parseLocalDate(returnDate);

    const depMonth = depDate.toLocaleDateString('en-US', { month: 'short' });
    const retMonth = retDate.toLocaleDateString('en-US', { month: 'short' });

    const depDay = depDate.getDate();
    const retDay = retDate.getDate();

    if (depMonth === retMonth) {
        return `${depMonth} ${depDay} - ${retDay}`;
    }
    return `${depMonth} ${depDay} - ${retMonth} ${retDay}`;
}

/**
 * Get trip duration string
 * @param {number} days - Number of days
 * @returns {string} Like "5 days" or "1 day"
 */
export function getDurationString(days) {
    return days === 1 ? '1 day' : `${days} days`;
}
