/**
 * Waterbeheer-dienst — wie was er vandaag op dienst (twee personen).
 * Persoon 1 wordt voorgevuld met de ingelogde gebruiker; beide velden zijn een
 * keuzelijst (geregistreerde waterbeheerders) met vrije tekst als terugval.
 */
class DienstModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
        this._waterbeheerdersGeladen = false;
        this._listenersAttached = false;
    }

    setStatus(status) {
        const el = document.getElementById('dienstSaveStatus');
        if (!el) return;
        const states = {
            pending: ['Wijzigingen niet opgeslagen...', '#888'],
            saving: ['Bewaren…', '#fd7e14'],
            saved: ['✓ Opgeslagen', '#28a745'],
            error: ['✕ Fout bij opslaan', '#dc3545'],
        };
        const [text, color] = states[status] || ['', '#333'];
        el.textContent = text;
        el.style.color = color;
        if (status === 'saved')
            setTimeout(() => {
                if (el.textContent.startsWith('✓')) el.textContent = '';
            }, 4000);
    }

    /** Klap het bewerkvak open/dicht (de samenvattingschip blijft altijd zichtbaar). */
    toggleBewerk() {
        const box = document.getElementById('dienst-bewerk');
        const icoon = document.getElementById('dienst-toggle-icoon');
        if (!box) return;
        const tonen = box.style.display === 'none' || box.style.display === '';
        box.style.display = tonen ? 'flex' : 'none';
        if (icoon) icoon.textContent = tonen ? '▴' : '▾';
        // Vul de ingelogde gebruiker pas in als persoon 1 wanneer het bewerkvak
        // wordt geopend en er nog niemand is ingevuld.
        if (tonen) this._vulIngelogdeIndienLeeg();
    }

    /** Zet de ingelogde gebruiker als persoon 1 zolang beide velden leeg zijn. */
    _vulIngelogdeIndienLeeg() {
        const veld1 = document.getElementById('dienst-1');
        const veld2 = document.getElementById('dienst-2');
        if (!veld1 || !veld2) return;
        if (!veld1.value.trim() && !veld2.value.trim()) {
            veld1.value = this._ingelogdeNaam();
            this._updateSamenvatting();
        }
    }

    /** Werk de samengevatte chiptekst bij op basis van de huidige veldwaarden. */
    _updateSamenvatting() {
        const el = document.getElementById('dienst-samenvatting-tekst');
        if (!el) return;
        const veld1 = document.getElementById('dienst-1');
        const veld2 = document.getElementById('dienst-2');
        const namen = [veld1 && veld1.value, veld2 && veld2.value]
            .map((v) => (v || '').trim())
            .filter(Boolean);
        el.textContent = namen.length ? namen.join(' + ') : '— vul in';
    }

    /** Weergavenaam van de ingelogde gebruiker. */
    _ingelogdeNaam() {
        const g = this.app.state.ingelogdeGebruiker;
        return g ? [g.voornaam, g.achternaam].filter(Boolean).join(' ').trim() || g.inlognaam : '';
    }

    /** Vul de datalist met de geregistreerde waterbeheerders (één keer). */
    async _laadWaterbeheerders() {
        if (this._waterbeheerdersGeladen) return;
        try {
            const res = await this.app.api.call('/api/dienst/waterbeheerders');
            const namen = await res.json();
            const lijst = document.getElementById('waterbeheerders-lijst');
            if (lijst && Array.isArray(namen)) {
                lijst.innerHTML = namen
                    .map((n) => `<option value="${String(n).replace(/"/g, '&quot;')}">`)
                    .join('');
                this._waterbeheerdersGeladen = true;
            }
        } catch (f) {
            console.error('Kon waterbeheerders niet laden', f);
        }
    }

    /** Laad de dienst van een dag; persoon 1 voorvullen met de ingelogde gebruiker indien leeg. */
    async laadDienst(datum) {
        if (!datum) return;
        await this._laadWaterbeheerders();
        const veld1 = document.getElementById('dienst-1');
        const veld2 = document.getElementById('dienst-2');
        if (!veld1 || !veld2) return;
        try {
            const res = await this.app.api.call(`/api/dienst?datum=${datum}`);
            const d = await res.json();
            veld1.value = d.dienst_1 || '';
            veld2.value = d.dienst_2 || '';
        } catch (f) {
            console.error('Fout bij laden dienst:', f);
        }
        this._updateSamenvatting();

        if (this._listenersAttached) return;
        this._listenersAttached = true;
        [veld1, veld2].forEach((veld) => {
            veld.addEventListener('input', () => this._scheduleAutoSave());
            veld.addEventListener('change', () => this._scheduleAutoSave());
        });
    }

    _scheduleAutoSave() {
        const state = this.app.state;
        this._updateSamenvatting(); // chip live meelopen met het typen
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
