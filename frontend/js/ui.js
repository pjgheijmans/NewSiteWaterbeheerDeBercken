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

        // Lege tekst betekent: verbergen.
        if (!tekst) {
            this._resetBerichtBox(el);
            return;
        }

        el.textContent = tekst;
        el.className = 'status-melding ' + (type || 'info');
        // Forceer reflow zodat de toast bij elke nieuwe melding opnieuw inschuift.
        void el.offsetWidth;
        el.classList.add('zichtbaar');

        // Succes- en foutmeldingen verdwijnen vanzelf; neutrale 'bezig'-meldingen
        // blijven staan tot ze door een volgende melding vervangen worden.
        if (type === 'succes' || type === 'fout') {
            state.berichtTimer = setTimeout(() => this._resetBerichtBox(el), 5000);
        }
    }

    /**
     * Verberg de toast met een uitschuif-animatie en wis de tekst erna.
     * @param {HTMLElement} el
     */
    _resetBerichtBox(el) {
        el.classList.remove('zichtbaar');
        this.app.state.berichtTimer = setTimeout(() => {
            el.textContent = '';
            el.className = 'status-melding';
        }, 280);
    }

    /**
     * Toon een bevestigingsmodal (vervangt window.confirm) en wacht op de keuze.
     * @param {string|{titel?:string, tekst:string, bevestig?:string, annuleer?:string, gevaar?:boolean}} opties
     * @returns {Promise<boolean>} true = bevestigd, false = geannuleerd
     */
    bevestig(opties) {
        const o = typeof opties === 'string' ? { tekst: opties } : opties || {};
        return new Promise((resolve) => this._toonModal(o, resolve));
    }

    /**
     * Toon een informatiemodal met één knop (vervangt window.alert).
     * @param {string|{titel?:string, tekst:string, bevestig?:string}} opties
     * @returns {Promise<void>}
     */
    meld(opties) {
        const o = typeof opties === 'string' ? { tekst: opties } : opties || {};
        return this.bevestig({ ...o, alleenBevestig: true, bevestig: o.bevestig || 'OK' });
    }

    /** Bouw, toon en bedraad de modal; resolve bij sluiten. @private */
    _toonModal(o, resolve) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-dialog${o.gevaar ? ' modal-gevaar' : ''}" role="dialog" aria-modal="true">
                ${o.titel ? '<h3 class="modal-titel"></h3>' : ''}
                <p class="modal-tekst"></p>
                <div class="modal-knoppen">
                    ${o.alleenBevestig ? '' : '<button type="button" class="modal-knop modal-annuleer"></button>'}
                    <button type="button" class="modal-knop modal-bevestig"></button>
                </div>
            </div>`;
        // textContent voorkomt HTML-injectie via dynamische teksten (bv. tabelnaam).
        if (o.titel) overlay.querySelector('.modal-titel').textContent = o.titel;
        overlay.querySelector('.modal-tekst').textContent = o.tekst || '';
        const bevestigKnop = overlay.querySelector('.modal-bevestig');
        const annuleerKnop = overlay.querySelector('.modal-annuleer');
        bevestigKnop.textContent = o.bevestig || 'Bevestigen';
        if (annuleerKnop) annuleerKnop.textContent = o.annuleer || 'Annuleren';

        const sluit = (resultaat) => {
            document.removeEventListener('keydown', onKey);
            overlay.classList.remove('zichtbaar');
            setTimeout(() => overlay.remove(), 200);
            resolve(resultaat);
        };
        const onKey = (e) => {
            if (e.key === 'Escape' && !o.alleenBevestig) sluit(false);
            else if (e.key === 'Enter') sluit(true);
        };
        bevestigKnop.addEventListener('click', () => sluit(true));
        if (annuleerKnop) annuleerKnop.addEventListener('click', () => sluit(false));
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay && !o.alleenBevestig) sluit(false);
        });
        document.addEventListener('keydown', onKey);

        document.body.appendChild(overlay);
        void overlay.offsetWidth; // reflow → in-animatie
        overlay.classList.add('zichtbaar');
        bevestigKnop.focus();
    }

    /**
     * Schrijf een waarde naar een invoerveld en valideer het daarna.
     * @param {string} id
     * @param {*} waarde
     */
    zetInputValue(id, waarde) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = waarde !== undefined && waarde !== null ? waarde : '';
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
        if (el.value === '') {
            el.classList.remove('buiten-limiet');
            return;
        }
        const waarde = parseFloat(el.value);
        if (isNaN(waarde)) {
            el.classList.add('buiten-limiet');
            return;
        }

        const step = parseFloat(el.getAttribute('step'));
        if (!isNaN(step) && step > 0) {
            const toegestaan = step >= 1 ? 0 : (step.toString().split('.')[1] || '').length;
            const dotIdx = el.value.indexOf('.');
            const ingevoerd = dotIdx === -1 ? 0 : el.value.length - dotIdx - 1;
            if (ingevoerd > toegestaan) {
                el.classList.add('buiten-limiet');
                return;
            }
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
            saving: ['Bewaren…', '#fd7e14'],
            saved: ['✓ Opgeslagen', '#28a745'],
            warning: ['⚠ Opgeslagen met waarschuwing', '#fd7e14'],
            error: ['✗ Fout bij opslaan', '#dc3545'],
        };
        const [text, color] = states[status] || ['', '#333'];
        el.textContent = text;
        el.style.color = color;
        if (status === 'saved') {
            setTimeout(() => {
                if (el.textContent.startsWith('✓')) el.textContent = '';
            }, 4000);
        }
    }
}
