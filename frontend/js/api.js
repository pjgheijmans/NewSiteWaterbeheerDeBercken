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

function parseNumberValue(id) {
    const element = document.getElementById(id);
    if (!element) return null;
    const rawValue = element.value;
    if (rawValue === undefined || rawValue === null || rawValue === '') return null;
    const normalized = rawValue.toString().replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
}
