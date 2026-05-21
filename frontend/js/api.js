/**
 * Perform an authenticated fetch request using default headers and cookie credentials.
 * @param {string} url - The endpoint URL to call.
 * @param {RequestInit} [options={}] - Optional fetch options to override defaults.
 * @returns {Promise<Response>} The fetch response.
 */
async function apiCall(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: options.headers || {}
    };
    const mergedOptions = { ...defaultOptions, ...options };
    if (options.headers) {
        mergedOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }
    return fetch(url, mergedOptions);
}

/**
 * Parse a numeric string from an input element and normalize decimal separators.
 * Returns null for empty or invalid input.
 * @param {string} id - The DOM id of the input field.
 * @returns {number|null}
 */
function parseNumberValue(id) {
    const element = document.getElementById(id);
    if (!element) return null;
    const rawValue = element.value;
    if (rawValue === undefined || rawValue === null || rawValue === '') return null;
    const normalized = rawValue.toString().replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
}
