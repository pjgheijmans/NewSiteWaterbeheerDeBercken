/**
 * HTTP-client voor geauthenticeerde API-aanroepen en invoerverwerking.
 */
class ApiClient {
    /** @param {Application} [app] - voor de globale 401-afhandeling (sessie verlopen). */
    constructor(app) {
        this.app = app;
    }

    /**
     * Voer een fetch-aanroep uit met standaard credentials en headers.
     * Bij een 401 (verlopen/ontbrekende sessie) keert de UI terug naar het
     * loginscherm — behalve voor de login-call zelf, die lokaal wordt afgehandeld.
     * @param {string} url
     * @param {RequestInit} [options={}]
     * @returns {Promise<Response>}
     */
    async call(url, options = {}) {
        const defaults = { credentials: 'include', headers: options.headers || {} };
        const merged = { ...defaults, ...options };
        if (options.headers) merged.headers = { ...defaults.headers, ...options.headers };
        const res = await fetch(url, merged);
        if (res.status === 401 && !url.includes('/api/login') && this.app?.auth?.sessieVerlopen) {
            this.app.auth.sessieVerlopen();
        }
        return res;
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

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}
