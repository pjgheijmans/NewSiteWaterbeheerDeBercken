/**
 * Waterbeheer-dienst — wie was er vandaag op dienst (twee personen).
 * Beide velden zijn keuzelijsten (<select>) met de geregistreerde waterbeheerders:
 * vrije tekst is niet mogelijk en op mobiel verschijnt de native keuzelijst.
 */
class DienstModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
        this._waterbeheerdersGeladen = false;
        this._listenersAttached = false;
        this._namen = [];
    }

    setStatus(status) {
        this.app.ui.zetBlokStatus(document.getElementById('waterbeheer-dienst-bar'), status);
    }

    /** @private HTML-escape voor optie-waarden. */
    _esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    /** Haal de geregistreerde waterbeheerders op en vul beide keuzelijsten (één keer). */
    async _laadWaterbeheerders() {
        if (this._waterbeheerdersGeladen) return;
        try {
            const res = await this.app.api.call('/api/dienst/waterbeheerders');
            const namen = await res.json();
            if (Array.isArray(namen)) {
                this._namen = namen.map(String);
                this._vulSelects();
                this._waterbeheerdersGeladen = true;
            }
        } catch (f) {
            console.error('Kon waterbeheerders niet laden', f);
        }
    }

    /** @private Vul beide dienst-selects met een lege optie + de waterbeheerders. */
    _vulSelects() {
        const opties =
            '<option value="">— kies —</option>' +
            this._namen.map((n) => `<option value="${this._esc(n)}">${this._esc(n)}</option>`).join('');
        ['dienst-1', 'dienst-2'].forEach((id) => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const huidige = sel.value;
            sel.innerHTML = opties;
            if (huidige) this._zetWaarde(sel, huidige);
        });
    }

    /**
     * @private Zet de waarde van een select; voeg de opgeslagen naam als optie toe als
     * die (bv. een verwijderde/oud-medewerker) niet meer in de lijst voorkomt, zodat de
     * historische keuze zichtbaar blijft.
     */
    _zetWaarde(sel, waarde) {
        if (!sel) return;
        if (waarde && !Array.from(sel.options).some((o) => o.value === waarde)) {
            const opt = document.createElement('option');
            opt.value = waarde;
            opt.textContent = waarde;
            sel.appendChild(opt);
        }
        sel.value = waarde || '';
    }

    /** Laad de dienst van een dag in de twee keuzelijsten. */
    async laadDienst(datum) {
        if (!datum) return;
        await this._laadWaterbeheerders();
        const veld1 = document.getElementById('dienst-1');
        const veld2 = document.getElementById('dienst-2');
        if (!veld1 || !veld2) return;
        try {
            const res = await this.app.api.call(`/api/dienst?datum=${datum}`);
            const d = await res.json();
            this._zetWaarde(veld1, d.dienst_1 || '');
            this._zetWaarde(veld2, d.dienst_2 || '');
        } catch (f) {
            console.error('Fout bij laden dienst:', f);
        }

        if (this._listenersAttached) return;
        this._listenersAttached = true;
        [veld1, veld2].forEach((veld) => veld.addEventListener('change', () => this._scheduleAutoSave()));
    }

    _scheduleAutoSave() {
        const state = this.app.state;
        if (state.dienstAutoSaveTimer) clearTimeout(state.dienstAutoSaveTimer);
        this.setStatus('pending');
        state.dienstAutoSaveTimer = setTimeout(async () => {
            this.setStatus('saving');
            const payload = {
                datum: document.getElementById('centraleDatum').value,
                dienst_1: document.getElementById('dienst-1').value.trim() || null,
                dienst_2: document.getElementById('dienst-2').value.trim() || null,
            };
            try {
                const res = await this.app.api.call('/api/dienst', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                this.setStatus(res.ok ? 'saved' : 'error');
                if (!res.ok) this.app.ui.toonBericht('Fout bij opslaan dienst.', 'fout');
            } catch {
                this.setStatus('error');
            }
        }, 1200);
    }
}

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DienstModule;
}
