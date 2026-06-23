/**
 * Limieten — ophalen, renderen en opslaan van grenswaarden.
 */
class LimietenModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    // ── Statusbalk ────────────────────────────────────────────────────────

    setLimietenSaveStatus(status) {
        const el = document.getElementById('limietenSaveStatus');
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

    // ── Auto-save ─────────────────────────────────────────────────────────

    scheduleAutoSaveLimieten() {
        const state = this.app.state;
        if (state.limietenAutoSaveTimer) clearTimeout(state.limietenAutoSaveTimer);
        this.setLimietenSaveStatus('pending');
        state.limietenAutoSaveTimer = setTimeout(async () => {
            this.setLimietenSaveStatus('saving');
            await this.verwerkCentraleLimietenOpslaan(true);
        }, 1200);
    }

    // ── Labels en groepen ─────────────────────────────────────────────────

    static get LABELS() {
        return {
            ph_waarde: 'pH',
            chloor_waarde: 'Chloor (mg/l)',
            watertemperatuur: 'Watertemperatuur (°C)',
            flow_diep: 'Flow Diep (m³/h)',
            flow_ondiep: 'Flow Ondiep (m³/h)',
            flow_peuterbad: 'Flow (m³/h)',
            filter_druk_in: 'Filterdruk In (bar)',
            filter_druk_uit: 'Filterdruk Uit (bar)',
            filter_druk_peuterbad: 'Filterdruk (bar)',
            kathodische_bescherming: 'Kathodische bescherming (V)',
            elektriciteit_nacht: 'Elektriciteit Nacht (kWh)',
            elektriciteit_dag: 'Elektriciteit Dag (kWh)',
            gas: 'Gas (m³)',
            water_diep: 'Water Diep (m³)',
            water_ondiep: 'Water Ondiep (m³)',
            water_totaal: 'Water Totaal (m³)',
            water_peuterbad: 'Water Peuterbad (m³)',
            chloor_vrij: 'Chloor Vrij (mg/l)',
            chloor_totaal: 'Chloor Totaal (mg/l)',
            chloor_gebonden: 'Chloor Gebonden (mg/l)',
            actie_druk_verschil: 'Filterdruk verschil max (bar)',
            actie_druk_peuterbad: 'Filterdruk Peuterbad max (bar)',
            actie_flow_diep: 'Flow Diep min (m³/h)',
            actie_flow_ondiep: 'Flow Ondiep min (m³/h)',
            actie_flow_peuterbad: 'Flow Peuterbad min (m³/h)',
            actie_chloor_min: 'Chloorvoorraad min (L)',
            actie_zwavelzuur_min: 'Zwavelzuurvoorraad min (L)',
            actie_bezoekers_max: 'Bezoekers max (per dag)',
            actie_spoelbeurt_max: 'Bezoekers max (sinds spoelbeurt)',
            actie_spoelbeurt_dagen: 'Dagen max (sinds spoelbeurt)',
            actie_floculant_min: 'Floculant min',
            actie_gebonden_chloor_max: 'Gebonden chloor max (mg/l)',
            actie_chloor_peuterbad_min: 'Chloor Peuterbad min (vat)',
            actie_zwavelzuur_peuterbad_min: 'Zwavelzuur Peuterbad min (vat)',
            seizoen_begin: 'Begin seizoen',
            seizoen_eind: 'Eind seizoen',
        };
    }

    static get GROEPEN() {
        return [
            {
                titel: 'Diep / Ondiep – Meetwaarden',
                info: 'pH, chloor en temperatuur gelden ook voor het Peuterbad.',
                params: [
                    'ph_waarde',
                    'chloor_waarde',
                    'watertemperatuur',
                    'flow_diep',
                    'flow_ondiep',
                    'filter_druk_in',
                    'filter_druk_uit',
                    'kathodische_bescherming',
                ],
            },
            {
                titel: 'Peuterbad – Meetwaarden',
                params: ['flow_peuterbad', 'filter_druk_peuterbad'],
            },
            {
                titel: 'Verbruik',
                params: [
                    'elektriciteit_nacht',
                    'elektriciteit_dag',
                    'gas',
                    'water_diep',
                    'water_ondiep',
                    'water_totaal',
                    'water_peuterbad',
                ],
            },
            {
                titel: 'Coördinatoren – Chloor',
                info: 'Chloor Vrij geldt ook als grenswaarde voor de waterbeheer-meting (chloor_waarde).',
                params: ['chloor_vrij', 'chloor_totaal', 'chloor_gebonden'],
            },
            {
                titel: 'Actie-drempelwaarden',
                info: 'Drempelwaarden die bepalen wanneer een actie wordt aangemaakt.',
                enkelvoudig: true,
                params: [
                    'actie_druk_verschil',
                    'actie_druk_peuterbad',
                    'actie_flow_diep',
                    'actie_flow_ondiep',
                    'actie_flow_peuterbad',
                    'actie_chloor_min',
                    'actie_zwavelzuur_min',
                    'actie_bezoekers_max',
                    'actie_spoelbeurt_max',
                    'actie_spoelbeurt_dagen',
                    'actie_floculant_min',
                    'actie_gebonden_chloor_max',
                    'actie_chloor_peuterbad_min',
                    'actie_zwavelzuur_peuterbad_min',
                ],
            },
            {
                titel: 'Seizoen',
                info: 'Begin- en einddatum van het seizoen. Datumnavigatie kan niet buiten deze grenzen.',
                enkelvoudig: true,
                datum: true,
                params: ['seizoen_begin', 'seizoen_eind'],
            },
        ];
    }

    // ── Conversie hulpfuncties ────────────────────────────────────────────

    /** YYYYMMDD integer → ISO datumstring */
    _yyyymmddNaarIso(val) {
        if (!val) return '';
        const s = String(Math.round(val)).padStart(8, '0');
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    }

    /** ISO datumstring → YYYYMMDD integer */
    _isoNaarYyyymmdd(iso) {
        return iso ? parseInt(iso.replace(/-/g, ''), 10) : 0;
    }

    // ── Laden ─────────────────────────────────────────────────────────────

    /** Laad limieten van de server en render de beheertabel. */
    async laadLimietenVanServer() {
        try {
            const res = await this.app.api.call('/api/limieten');
            const limieten = await res.json();
            this.app.state.actieveLimieten = this._normaliseer(limieten);
            this._bouwBeheertabel();
            this.app.nav.pasSeizoenAan();
        } catch (f) {
            console.error('Kon limieten niet laden', f);
        }
    }

    /** Vul standaardwaarden in via de backend en sla direct op. */
    async laadStandaardLimieten() {
        if (
            !(await this.app.ui.bevestig({
                tekst: 'Standaardwaarden invullen? Dit overschrijft de huidige waarden.',
                bevestig: 'Invullen',
            }))
        )
            return;
        try {
            const res = await this.app.api.call('/api/limieten/defaults');
            const defaults = await res.json();
            document.querySelectorAll('[data-limiet-param]').forEach((rij) => {
                const param = rij.getAttribute('data-limiet-param');
                const def = defaults[param];
                if (!def) return;
                rij.querySelector('.l-min').value = def.min;
                rij.querySelector('.l-max').value = def.max;
            });
            this.scheduleAutoSaveLimieten();
        } catch {
            this.app.ui.toonBericht('Kon standaardwaarden niet ophalen.', 'fout');
        }
    }

    // ── Renderen ──────────────────────────────────────────────────────────

    _bouwBeheertabel() {
        const container = document.getElementById('limietenGroepen');
        container.innerHTML = '';
        const labels = LimietenModule.LABELS;
        const limieten = this.app.state.actieveLimieten;

        LimietenModule.GROEPEN.forEach((groep) => {
            const box = document.createElement('div');
            box.className = 'categorie-box';

            let html = `<h3>${groep.titel}</h3>`;
            if (groep.info)
                html += `<p style="font-size:13px;color:#666;margin:-8px 0 10px;">${groep.info}</p>`;

            if (groep.enkelvoudig) {
                const isDatum = !!groep.datum;
                html += `<table class="categorie-tabel">
                    <thead><tr><th>Parameter</th><th>${isDatum ? 'Datum' : 'Drempelwaarde'}</th></tr></thead><tbody>`;
                groep.params.forEach((param) => {
                    const val = limieten[param] || { min: 0, max: '' };
                    const label = labels[param] || param;
                    const invoer = isDatum
                        ? `<input type="date" class="l-max l-datum" value="${this._yyyymmddNaarIso(val.max)}">`
                        : `<input type="number" class="l-max" step="0.01" value="${val.max}">`;
                    html += `<tr data-limiet-param="${param}">
                        <td><b>${label}</b></td>
                        <td>${invoer}<input type="hidden" class="l-min" value="0"></td></tr>`;
                });
            } else {
                html += `<table class="categorie-tabel">
                    <thead><tr><th>Parameter</th><th>Minimum</th><th>Maximum</th></tr></thead><tbody>`;
                groep.params.forEach((param) => {
                    const val = limieten[param] || { min: '', max: '' };
                    const label = labels[param] || param;
                    html += `<tr data-limiet-param="${param}">
                        <td><b>${label}</b></td>
                        <td><input type="number" class="l-min" step="0.01" value="${val.min}"></td>
                        <td><input type="number" class="l-max" step="0.01" value="${val.max}"></td></tr>`;
                });
            }
            html += '</tbody></table>';
            box.innerHTML = html;
            container.appendChild(box);

            box.querySelectorAll('input:not([type="hidden"])').forEach((input) => {
                input.addEventListener('input', () => this.scheduleAutoSaveLimieten());
            });
        });
    }

    // ── Normalisatie ──────────────────────────────────────────────────────

    _normaliseer(limieten) {
        const g = { ...limieten };
        if (!g.watertemperatuur && g.temperatuur) g.watertemperatuur = g.temperatuur;
        if (g.flow) {
            if (!g.flow_diep) g.flow_diep = g.flow;
            if (!g.flow_ondiep) g.flow_ondiep = g.flow;
            if (!g.flow_peuterbad) g.flow_peuterbad = g.flow;
        }
        if (g.filter_druk) {
            if (!g.filter_druk_in) g.filter_druk_in = g.filter_druk;
            if (!g.filter_druk_uit) g.filter_druk_uit = g.filter_druk;
            if (!g.filter_druk_peuterbad) g.filter_druk_peuterbad = g.filter_druk;
        }
        delete g.temperatuur;
        delete g.flow;
        delete g.filter_druk;
        return g;
    }

    // ── Opslaan ───────────────────────────────────────────────────────────

    async verwerkCentraleLimietenOpslaan(autoSave = false) {
        if (!autoSave) this.app.ui.toonBericht('Limieten verwerken...', '');
        const rijen = document.querySelectorAll('[data-limiet-param]');
        let teller = 0;
        for (const rij of rijen) {
            const param = rij.getAttribute('data-limiet-param');
            const maxEl = rij.querySelector('.l-max');
            const maxVal = maxEl.classList.contains('l-datum')
                ? this._isoNaarYyyymmdd(maxEl.value)
                : parseFloat(maxEl.value);
            const payload = {
                parameter_naam: param,
                min_waarde: parseFloat(rij.querySelector('.l-min').value),
                max_waarde: maxVal,
            };
            try {
                const res = await this.app.api.call('/api/limieten', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) teller++;
            } catch (f) {
                console.error(f);
            }
        }
        if (teller === rijen.length) {
            this.setLimietenSaveStatus('saved');
            if (!autoSave) this.app.ui.toonBericht('Limieten succesvol bijgewerkt!', 'succes');
            this.laadLimietenVanServer();
        } else {
            this.setLimietenSaveStatus('error');
            this.app.ui.toonBericht('Fout bij opslaan van limieten.', 'fout');
        }
    }
}

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LimietenModule;
}
