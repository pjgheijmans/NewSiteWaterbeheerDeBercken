/**
 * Beheert statusberichten, veldinvoer en limietvalidatie in de UI.
 */
class UIManager {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * Toon een statusbericht bovenaan de pagina.
     * @param {string} tekst
     * @param {'succes'|'fout'|''} type
     */
    toonBericht(tekst, type) {
        const el = document.getElementById('statusBericht');
        if (!el) return;
        const state = this.app.state;
        if (state.berichtTimer) clearTimeout(state.berichtTimer);
        el.style.color  = '';
        el.innerText    = tekst;
        el.className    = 'status-melding ' + type;

        if (type === 'fout') {
            el.style.color   = '#ff9800';
            state.berichtTimer = setTimeout(() => this._resetBerichtBox(el), 5000);
        } else if (type === 'succes') {
            state.berichtTimer = setTimeout(() => this._resetBerichtBox(el), 5000);
        } else if (tekst !== '') {
            el.style.color = '#dc3545';
        }
    }

    /** @param {HTMLElement} el */
    _resetBerichtBox(el) {
        el.innerText  = '';
        el.className  = 'status-melding';
        el.style.color = '';
    }

    /**
     * Schrijf een waarde naar een invoerveld en valideer het daarna.
     * @param {string} id
     * @param {*} waarde
     */
    zetInputValue(id, waarde) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = (waarde !== undefined && waarde !== null) ? waarde : '';
        const param = el.getAttribute('data-param');
        if (param) this.valideerVeld(el, param);
    }

    /**
     * Valideer een numeriek invoerveld op decimaalprecisie en limietgrenzen.
     * Voegt of verwijdert de CSS-klasse 'buiten-limiet'.
     * @param {HTMLInputElement} el
     * @param {string|null} parameterNaam
     */
    valideerVeld(el, parameterNaam) {
        if (el.value === '') { el.classList.remove('buiten-limiet'); return; }
        const waarde = parseFloat(el.value);
        if (isNaN(waarde)) { el.classList.add('buiten-limiet'); return; }

        const step    = parseFloat(el.getAttribute('step'));
        if (!isNaN(step) && step > 0) {
            const toegestaan = step >= 1 ? 0 : (step.toString().split('.')[1] || '').length;
            const dotIdx     = el.value.indexOf('.');
            const ingevoerd  = dotIdx === -1 ? 0 : el.value.length - dotIdx - 1;
            if (ingevoerd > toegestaan) { el.classList.add('buiten-limiet'); return; }
        }

        const limiet = this.app.state.actieveLimieten[parameterNaam];
        if (limiet) {
            el.classList.toggle('buiten-limiet', waarde < limiet.min || waarde > limiet.max);
        } else {
            el.classList.remove('buiten-limiet');
        }
    }

    /**
     * Update de auto-save statusindicator.
     * @param {'pending'|'saving'|'saved'|'warning'|'error'} status
     */
    setAutoSaveStatus(status) {
        const el = document.getElementById('autoSaveStatus');
        if (!el) return;
        const states = {
            pending: ['Wijzigingen niet opgeslagen...', '#888'],
            saving:  ['Bewaren…',                       '#fd7e14'],
            saved:   ['✓ Opgeslagen',                   '#28a745'],
            warning: ['⚠ Opgeslagen met waarschuwing',  '#fd7e14'],
            error:   ['✗ Fout bij opslaan',             '#dc3545'],
        };
        const [text, color] = states[status] || ['', '#333'];
        el.textContent  = text;
        el.style.color  = color;
        if (status === 'saved') {
            setTimeout(() => { if (el.textContent.startsWith('✓')) el.textContent = ''; }, 4000);
        }
    }
}
