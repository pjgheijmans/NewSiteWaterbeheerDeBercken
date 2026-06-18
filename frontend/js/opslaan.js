/**
 * Auto-save orchestratie voor alle data-secties.
 */
class OpslaanModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * Bepaal of een grote-baden meetwaarden-opslag (Diep/Ondiep) onvolledig is.
     * Pure functie: álle meetvelden van de pagina tellen mee — pH, chloor,
     * temperatuur, flow, beide filterdrukken en kathodische bescherming.
     * Een waarde is "leeg" als ze null is (0 telt als ingevuld).
     * @param {{ph_waarde:?number, chloor_waarde:?number, temperatuur:?number, flow:?number, filter_druk_in:?number, filter_druk_uit:?number, kathodische_bescherming:?number}} payload
     * @returns {boolean}
     */
    static meetwaardenOnvolledig(payload) {
        return [
            payload.ph_waarde, payload.chloor_waarde, payload.temperatuur, payload.flow,
            payload.filter_druk_in, payload.filter_druk_uit, payload.kathodische_bescherming,
        ].some(v => v == null);
    }

    /**
     * Bepaal of een peuterbad-opslag onvolledig is voor de actieve subtab.
     * Pure functie: op de Verbruik-subtab tellen water + beide chemicaliën,
     * op Meetwaarden tellen pH, chloor, flow én filterdruk (alle velden van de
     * pagina). Een waarde is "leeg" als ze null is (0 telt als ingevuld).
     * @param {string} subtab - 'verbruik' of 'meetwaarden'
     * @param {{water:?number, chemicalien_chloor:?number, chemicalien_zwavelzuur:?number, ph_waarde:?number, chloor_waarde:?number, flow:?number, filter_druk:?number}} payload
     * @returns {boolean}
     */
    static peuterbadOnvolledig(subtab, payload) {
        return subtab === 'verbruik'
            ? (payload.water == null || payload.chemicalien_chloor == null || payload.chemicalien_zwavelzuur == null)
            : (payload.ph_waarde == null || payload.chloor_waarde == null || payload.flow == null || payload.filter_druk == null);
    }

    /** Verbind auto-save listeners aan de dagstaat-sectie. */
    wireAutoSave() {
        const sectie = document.getElementById('sectie-dagstaat');
        if (sectie) {
            // Naast het inplannen van de opslag ook direct de volledigheids-markeringen
            // op de subtabs bijwerken, zodat de indicatie live meeloopt met het typen
            // (i.p.v. een waarschuwing na elke opslag).
            const opInvoer = () => { this.scheduleAutoSave(); this.app.metingen.werkVolledigheidBij(); };
            sectie.addEventListener('input',  opInvoer);
            sectie.addEventListener('change', opInvoer);
        }
    }

    /**
     * Onthoud de nieuwe versie-meta na een succesvolle opslag, zodat de volgende
     * autosave de juiste verwachte versie meestuurt (optimistische concurrency).
     * @param {string} sleutel
     * @param {?{versie:number, auteur:?string, bijgewerkt_op:?string}} meta
     */
    _onthoudVersie(sleutel, meta) {
        if (!meta) return;
        this.app.state.versies[sleutel] = {
            versie: meta.versie ?? null,
            auteur: meta.auteur ?? null,
            bijgewerkt_op: meta.bijgewerkt_op ?? null,
        };
        this.app.metingen.toonLaatstGewijzigd();
    }

    // ── Centrale auto-save ────────────────────────────────────────────────

    scheduleAutoSave() {
        // Niets opslaan in alleen-lezen modus (geen schrijfrecht of historie-slot).
        if (this.app.auth && !this.app.auth.magNuOpslaan()) return;
        const state = this.app.state;
        if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
        this.app.ui.setAutoSaveStatus('pending');
        state.autoSaveTimer = setTimeout(async () => {
            state.autoSaveTimer = null;   // niet langer "pending" (o.a. voor de focus-herlaad)
            this.app.ui.setAutoSaveStatus('saving');
            await this.verwerkCentraleOpslaan(true);
        }, 1200);
    }

    // ── Coordinator blok auto-save ────────────────────────────────────────

    scheduleAutoSaveBlok(tijdstip) {
        if (this.app.auth && !this.app.auth.magNuOpslaan()) return;
        const state = this.app.state;
        if (state.blokTimers[tijdstip]) clearTimeout(state.blokTimers[tijdstip]);
        this.app.ui.setAutoSaveStatus('pending');
        state.blokTimers[tijdstip] = setTimeout(async () => {
            this.app.ui.setAutoSaveStatus('saving');
            const ok = await this._slaCoordinatorenBlokOp(tijdstip);
            this.app.ui.setAutoSaveStatus(ok ? 'saved' : 'error');
            if (!ok) this.app.ui.toonBericht('Fout bij opslaan van blok.', 'fout');
        }, 1200);
    }

    /** @private */
    async _slaCoordinatorenBlokOp(tijdstip) {
        const datum = document.getElementById('centraleDatum').value;
        const blok  = document.querySelector(`[data-blok-tijdstip="${tijdstip}"]`);
        if (!blok) return false;
        const rijen = blok.querySelectorAll('tr[data-bad]');
        let ok = 0;
        for (const rij of rijen) {
            const v          = s => s?.value ? parseFloat(s.value) : null;
            const isPeuterbad = rij.getAttribute('data-bad') === 'Peuterbad';
            const payload    = {
                datum, tijdstip,
                bad_naam:         rij.getAttribute('data-bad'),
                ph_waarde:        v(rij.querySelector('.c-ph')),
                chloor_vrij:      v(rij.querySelector('.c-chloor-vrij')),
                chloor_totaal:    v(rij.querySelector('.c-chloor-totaal')),
                watertemperatuur: v(rij.querySelector('.c-temp')),
                helderheid:       isPeuterbad ? null : (rij.querySelector('.c-helder')?.value || 'Helder'),
                bad_gebruikt:     isPeuterbad ? (rij.querySelector('.c-gebruikt')?.checked ? 1 : 0) : null,
            };
            try {
                const res = await this.app.api.call('/api/coordinatoren', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) ok++;
                else { const e = await res.json().catch(() => null); console.error(`Blok ${tijdstip}:`, e); }
            } catch (e) { console.error(e); }
        }
        return ok === rijen.length;
    }

    // ── Centrale opslaan ──────────────────────────────────────────────────

    /**
     * @param {boolean} [autoSave=false]
     */
    async verwerkCentraleOpslaan(autoSave = false) {
        const { huidigeRol, huidigeBadPagina, huidigeSubtab, huidigeCoordSubtab } = this.app.state;
        const datum = document.getElementById('centraleDatum').value;
        const ui    = this.app.ui;
        const api   = this.app.api;

        const opSuccess = msg => {
            if (autoSave) ui.setAutoSaveStatus('saved');
            else          ui.toonBericht(msg, 'succes');
        };
        const opError = msg => {
            ui.setAutoSaveStatus('error');
            ui.toonBericht(msg, 'fout');
        };
        const refreshNaOpslaan = () => {
            if (!autoSave) { this.app.metingen.laadMetingen(); return; }
            if (huidigeRol !== 'waterbeheer') return;
            if (huidigeBadPagina === 'peuterbad') this.app.verbruik.laadEnBerekenPeuterbadVerbruik();
            else                                   this.app.verbruik.laadEnBerekenVerbruik();
            const d = document.getElementById('centraleDatum').value;
            // Net als laadMetingen: zowel de ⚠-veldindicatoren bij de meetwaarden
            // als de ⚠-badges op de pagina-/Taken-tabs bijwerken. Voorheen werd alleen
            // laadActies aangeroepen, waardoor de badges pas na een volledige herlaad
            // (datumwissel/paginawissel) verschenen — niet automatisch na het opslaan.
            this.app.metingen.laadActies(d);
            this.app.taken.werkBadgeBij(d);
            this.app.metingen.werkVolledigheidBij();
        };

        // Logboek — geen centrale opslaan
        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'logboek') {
            ui.setAutoSaveStatus('saved'); return;
        }

        // Verbruik / Verwarmingssysteem subtabs
        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden' && huidigeSubtab !== 'meetwaarden') {
            const { ok, conflict } = await this.app.verbruik.slaAlgemeenGegevensOp();
            if (conflict) { this.app.metingen.behandelConflict(); return; }
            // Onvolledige standen worden niet meer als waarschuwing getoond, maar
            // passief als markering op de subtab (zie metingen.werkVolledigheidBij).
            if (ok) { opSuccess('Gegevens succesvol opgeslagen!'); refreshNaOpslaan(); }
            else      opError('Fout bij opslaan.');
            return;
        }

        // Meetwaarden Diep / Ondiep
        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden') {
            const leiden = ['Diep', 'Ondiep'];
            let ok = 0, fouten = [];

            for (const bad of leiden) {
                const lb = bad.toLowerCase();
                const payload = {
                    datum, bad_naam: bad,
                    ph_waarde:      api.parseNumberValue(`ph-${lb}`),
                    chloor_waarde:  api.parseNumberValue(`chloor-${lb}`),
                    temperatuur:    api.parseNumberValue(`temp-${lb}`),
                    flow:           api.parseNumberValue(`flow-${lb}`),
                    filter_druk_in: api.parseNumberValue(`filter-in-${lb}`),
                    filter_druk_uit:api.parseNumberValue(`filter-uit-${lb}`),
                    kathodische_bescherming: api.parseNumberValue(`kath-${lb}`),
                    versie: this.app.state.versies[`meting:${bad}`]?.versie ?? null,
                };
                payload.filter_druk = payload.filter_druk_in ?? payload.filter_druk_uit ?? 0;
                try {
                    const res = await api.call('/api/metingen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    if (res.status === 409) { this.app.metingen.behandelConflict(); return; }
                    if (res.ok) { ok++; this._onthoudVersie(`meting:${bad}`, await res.json().catch(() => null)); }
                    else { const e = await res.json().catch(() => null); fouten.push(`${bad}: ${e?.error || res.statusText}`); }
                } catch (e) { fouten.push(`${bad}: ${e.message}`); }
            }

            // Onvolledige velden worden passief op de subtab gemarkeerd (werkVolledigheidBij),
            // niet meer als waarschuwing na het opslaan.
            if (ok === leiden.length) { opSuccess('Meetwaarden opgeslagen!'); refreshNaOpslaan(); }
            else opError(fouten.join(' | ') || 'Niet alle gegevens konden worden opgeslagen.');
            return;
        }

        // Peuterbad
        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'peuterbad') {
            const payload  = {
                datum, bad_naam: 'Peuterbad',
                ph_waarde:    api.parseNumberValue('peuterbad-ph'),
                chloor_waarde:api.parseNumberValue('peuterbad-chloor'),
                flow:         api.parseNumberValue('peuterbad-flow'),
                filter_druk:  api.parseNumberValue('peuterbad-filterdruk'),
                water:                  api.parseNumberValue('peuterbad-water'),
                chemicalien_chloor:     api.parseNumberValue('peuterbad-chemicalien-chloor'),
                chemicalien_zwavelzuur: api.parseNumberValue('peuterbad-chemicalien-zwavelzuur'),
                versie: this.app.state.versies['meting:Peuterbad']?.versie ?? null,
            };
            try {
                const res = await api.call('/api/metingen', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.status === 409) { this.app.metingen.behandelConflict(); return; }
                if (res.ok) {
                    this._onthoudVersie('meting:Peuterbad', await res.json().catch(() => null));
                    // Onvolledige velden worden passief op de subtab gemarkeerd
                    // (werkVolledigheidBij), niet meer als waarschuwing na het opslaan.
                    opSuccess('Peuterbad opgeslagen!');
                    refreshNaOpslaan();
                } else {
                    const e = await res.json().catch(() => null);
                    opError(e?.error || 'Niet alle gegevens konden worden opgeslagen.');
                }
            } catch (e) { opError('Niet alle gegevens konden worden opgeslagen.'); }
            return;
        }

        // Coördinatoren
        if (huidigeRol === 'coordinatoren') {
            if (huidigeCoordSubtab !== 'metingen') return;
            const blokken = document.querySelectorAll('#coordinatoren-blokken-content [data-blok-tijdstip]');
            if (blokken.length === 0) { opSuccess('Geen blokken om op te slaan.'); return; }
            let allOk = true;
            for (const blok of blokken) {
                const ok = await this._slaCoordinatorenBlokOp(blok.getAttribute('data-blok-tijdstip'));
                if (!ok) allOk = false;
            }
            if (allOk) { opSuccess('Alle blokken opgeslagen!'); refreshNaOpslaan(); }
            else         opError('Niet alle blokken konden worden opgeslagen.');
        }
    }
}

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpslaanModule;
}
