/**
 * HTTP-client voor geauthenticeerde API-aanroepen en invoerverwerking.
 */
class ApiClient {
    /**
     * Voer een fetch-aanroep uit met standaard credentials en headers.
     * @param {string} url
     * @param {RequestInit} [options={}]
     * @returns {Promise<Response>}
     */
    async call(url, options = {}) {
        const defaults = { credentials: 'include', headers: options.headers || {} };
        const merged   = { ...defaults, ...options };
        if (options.headers) merged.headers = { ...defaults.headers, ...options.headers };
        return fetch(url, merged);
    }

    /**
     * Lees de waarde van een invoerveld en normaliseer decimaalscheidingstekens.
     * Geeft null terug bij leeg of ongeldig invoer.
     * @param {string} id - DOM-id van het invoerveld.
     * @returns {number|null}
     */
    parseNumberValue(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const raw = el.value;
        if (raw === undefined || raw === null || raw === '') return null;
        const parsed = parseFloat(raw.toString().replace(',', '.'));
        return Number.isNaN(parsed) ? null : parsed;
    }
}
