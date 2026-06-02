/**
 * Metingen — laden, renderen, acties en coordinator-blokken.
 */
class MetingenModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    // ── Subtab/paginawisseling ─────────────────────────────────────────────

    wisselBadPagina(pagina) {
        this.app.state.huidigeBadPagina = pagina;
        ['coordinatoren-subtab-nav','coordinatoren-blokken-content','coordinatoren-checklist-content',
         'coordinatoren-daggegevens-content','coordinatoren-logboek-content'].forEach(id => {
            const el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        ['grote-baden','peuterbad','logboek','acties'].forEach(p => {
            document.getElementById(`tab-${p}`)?.classList.toggle('actief', p === pagina);
        });
        document.getElementById('waterbeheer-grote-baden-content').style.display = (pagina === 'grote-baden') ? 'block' : 'none';
        document.getElementById('waterbeheer-peuterbad-content').style.display   = (pagina === 'peuterbad')   ? 'block' : 'none';
        document.getElementById('waterbeheer-logboek-content').style.display     = (pagina === 'logboek')     ? 'block' : 'none';
        document.getElementById('waterbeheer-acties-content').style.display      = (pagina === 'acties')      ? 'block' : 'none';
        document.getElementById('tables-content').style.display = 'none';
        this.laadMetingen();
    }

    wisselSubtab(subtab) {
        this.app.state.huidigeSubtab = subtab;
        ['meetwaarden','verbruik','verwarmingssysteem','bezoekers'].forEach(s => {
            document.getElementById(`subtab-${s}`).classList.toggle('actief', s === subtab);
            document.getElementById(`subtab-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
        });
        if (subtab === 'verbruik' || subtab === 'verwarmingssysteem')
            this.app.verbruik.laadWaterbeheerVelden();
        if (subtab === 'bezoekers')
            this.laadBezoekers();
    }

    wisselPeuterbadSubtab(subtab) {
        this.app.state.huidigePeuterbadSubtab = subtab;
        ['meetwaarden','verbruik'].forEach(s => {
            document.getElementById(`subtab-peuterbad-${s}`).classList.toggle('actief', s === subtab);
            document.getElementById(`peuterbad-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
        });
        if (subtab === 'verbruik') this.app.verbruik.laadEnBerekenPeuterbadVerbruik();
    }

    wisselCoordSubtab(subtab) {
        this.app.state.huidigeCoordSubtab = subtab;
        ['metingen','checklist','daggegevens','logboek'].forEach(s => {
            document.getElementById(`subtab-coord-${s}`)?.classList.toggle('actief', s === subtab);
        });
        document.getElementById('coordinatoren-blokken-content').style.display    = subtab === 'metingen'    ? 'block' : 'none';
        document.getElementById('coordinatoren-checklist-content').style.display   = subtab === 'checklist'   ? 'block' : 'none';
        document.getElementById('coordinatoren-daggegevens-content').style.display = subtab === 'daggegevens' ? 'block' : 'none';
        document.getElementById('coordinatoren-logboek-content').style.display     = subtab === 'logboek'     ? 'block' : 'none';
        const datum = document.getElementById('centraleDatum').value;
        if (subtab === 'checklist')   this._laadCoordChecklist(datum);
        if (subtab === 'daggegevens') this._laadCoordDaggegevens(datum);
        if (subtab === 'logboek')     this.app.logboek.laadLogboek(datum, 'coordinatoren-logboek-blokken', '/api/coordinatoren/logboek');
    }

    // ── Laden ─────────────────────────────────────────────────────────────

    async laadMetingen() {
        const { huidigeRol, huidigeBadPagina } = this.app.state;
        const datum = document.getElementById('centraleDatum').value;
        if (!datum) return;

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'logboek') {
            this.app.logboek.laadLogboek(datum); return;
        }
        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'acties') {
            this.laadActies(datum); return;
        }

        const endpoint = huidigeRol === 'waterbeheer' ? '/api/metingen' : '/api/coordinatoren';
        try {
            const res = await this.app.api.call(`${endpoint}?datum=${datum}`);
            this.app.state.gecachteData = await res.json();
            this._bouwTabelOp(this.app.state.gecachteData);
            if (huidigeRol === 'waterbeheer') {
                await this.laadBezoekers();
                this.laadActies(datum);
                await this.app.verbruik.laadEnBerekenVerbruik();
            }
        } catch { this.app.ui.toonBericht('Fout bij het ophalen van de gegevens.', 'fout'); }
    }

    async laadBezoekers() {
        const datum = document.getElementById('centraleDatum').value;
        if (!datum) return;
        try {
            const res  = await this.app.api.call(`/api/bezoekers?datum=${datum}`);
            const data = await res.json();
            const el       = document.getElementById('bezoekers-vandaag-display');
            const elDiep   = document.getElementById('bezoekers-spoelbeurt-diep-display');
            const elOndiep = document.getElementById('bezoekers-spoelbeurt-ondiep-display');
            if (el)       el.value       = data.bezoekers_vandaag      ?? '';
            if (elDiep)   elDiep.value   = data.bezoekers_totaal_diep  ?? '';
            if (elOndiep) elOndiep.value = data.bezoekers_totaal_ondiep ?? '';
        } catch (f) { console.error('Fout bij laden bezoekers:', f); }
    }

    // ── Acties ────────────────────────────────────────────────────────────

    static get SUBTAB_LABELS() {
        return {
            'meetwaarden':           'Meetwaarden',
            'verbruik':              'Verbruik',
            'verwarmingssysteem':    'Verwarmingssysteem',
            'bezoekers':             'Bezoekers',
            'peuterbad-meetwaarden': 'Meetwaarden',
            'peuterbad-verbruik':    'Verbruik',
        };
    }

    static get SUBTAB_ACTIE_MAP() {
        return {
            'meetwaarden':           ['filter_spoelen_druk|Diep','filter_spoelen_druk|Ondiep','filter_spoelen_flow|Diep','filter_spoelen_flow|Ondiep'],
            'verbruik':              ['chloor_bestellen|Diep','zwavelzuur_bestellen|Diep','floculant_bijvullen|Diep'],
            'verwarmingssysteem':    [],
            'bezoekers':             ['filter_spoelen_bezoekers|Diep','filter_spoelen_bezoekers|Ondiep','filter_spoelen_spoelbeurt|Diep','filter_spoelen_spoelbeurt|Ondiep'],
            'peuterbad-meetwaarden': ['filter_spoelen_druk|Peuterbad','filter_spoelen_flow|Peuterbad'],
            'peuterbad-verbruik':    ['chloor_peuterbad_bijvullen|Peuterbad','zwavelzuur_peuterbad_bijvullen|Peuterbad'],
        };
    }

    static get ACTIE_VELD_MAP() {
        return {
            'filter_spoelen_druk|Diep':          ['filter-in-diep','filter-uit-diep'],
            'filter_spoelen_druk|Ondiep':        ['filter-in-ondiep','filter-uit-ondiep'],
            'filter_spoelen_druk|Peuterbad':     ['peuterbad-filterdruk'],
            'filter_spoelen_flow|Diep':          ['flow-diep'],
            'filter_spoelen_flow|Ondiep':        ['flow-ondiep'],
            'filter_spoelen_flow|Peuterbad':     ['peuterbad-flow'],
            'filter_spoelen_bezoekers|Diep':     ['bezoekers-vandaag-display'],
            'filter_spoelen_bezoekers|Ondiep':   ['bezoekers-vandaag-display'],
            'filter_spoelen_spoelbeurt|Diep':    ['bezoekers-spoelbeurt-diep-display'],
            'filter_spoelen_spoelbeurt|Ondiep':  ['bezoekers-spoelbeurt-ondiep-display'],
            'chloor_bestellen|Diep':             ['chemicalien-chloor'],
            'zwavelzuur_bestellen|Diep':         ['chemicalien-zwavelzuur'],
            'floculant_bijvullen|Diep':          ['floculant'],
            'chloor_peuterbad_bijvullen|Peuterbad':     ['peuterbad-chemicalien-chloor'],
            'zwavelzuur_peuterbad_bijvullen|Peuterbad': ['peuterbad-chemicalien-zwavelzuur'],
        };
    }

    /**
     * Groepeer acties tot één rij per bad per "soort": alle filter_spoelen_*
     * redenen (druk, flow, bezoekers, spoelbeurt, gebonden) van eenzelfde bad
     * vallen samen onder één groep, zodat het scherm één "Filter spoelen"-actie
     * per bad toont met alle redenen en één checkbox die de hele groep oplost.
     * Niet-filter-acties blijven elk hun eigen groep. Pure functie (geen DOM).
     * @param {Array<{id:number,bad_naam:string,actie_type:string,opgelost:boolean}>} acties
     * @returns {Array<{sleutel:string,bad_naam:string,items:Array}>}
     */
    static groepeerActies(acties) {
        const groepSleutel = a => `${a.bad_naam}|${a.actie_type.startsWith('filter_spoelen') ? 'filter_spoelen' : a.actie_type}`;
        const map = new Map();
        (Array.isArray(acties) ? acties : []).forEach(a => {
            const k = groepSleutel(a);
            if (!map.has(k)) map.set(k, { sleutel: k, bad_naam: a.bad_naam, items: [] });
            map.get(k).items.push(a);
        });
        return [...map.values()];
    }

    _updateSubtabBadges(actieGroepen) {
        const labels = MetingenModule.SUBTAB_LABELS;
        const kaart  = MetingenModule.SUBTAB_ACTIE_MAP;
        Object.entries(kaart).forEach(([subtab, sleutels]) => {
            const btn   = document.getElementById(`subtab-${subtab}`);
            if (!btn) return;
            const label = labels[subtab] || subtab;
            if (!sleutels.length) { btn.textContent = label; btn.classList.remove('subtab-heeft-acties'); return; }
            let nOpen = 0, nTotaal = 0;
            actieGroepen.forEach(groep => {
                if (!groep.items.some(a => sleutels.includes(`${a.actie_type}|${a.bad_naam}`))) return;
                nTotaal++;
                if (!groep.items.every(a => a.opgelost)) nOpen++;
            });
            btn.classList.toggle('subtab-heeft-acties', nOpen > 0);
            if (nOpen > 0)        btn.textContent = `${label} ⚠ (${nOpen})`;
            else if (nTotaal > 0) btn.textContent = `${label} ✓`;
            else                  btn.textContent = label;
        });
    }

    async laadActies(datum) {
        try {
            const res    = await this.app.api.call(`/api/acties?datum=${datum}`);
            const acties = await res.json();
            if (!Array.isArray(acties)) return;

            const actieGroepen = MetingenModule.groepeerActies(acties);
            const openGroepen     = actieGroepen.filter(g => !g.items.every(a => a.opgelost));
            const geslotenGroepen = actieGroepen.filter(g =>  g.items.every(a => a.opgelost));

            // Tab badge
            const tabBtn = document.getElementById('tab-acties');
            if (tabBtn) {
                tabBtn.textContent = actieGroepen.length === 0 ? 'Acties'
                    : openGroepen.length > 0 ? `Acties (${openGroepen.length} ⚠ / ${actieGroepen.length})`
                    : `Acties (${actieGroepen.length} ✓)`;
                tabBtn.classList.toggle('acties-actief', openGroepen.length > 0);
            }

            // Nav badge
            const navBtn = document.getElementById('btn-rol-waterbeheer');
            if (navBtn) {
                navBtn.textContent = openGroepen.length > 0 ? `Waterbeheer ⚠ (${openGroepen.length})` : 'Waterbeheer';
                navBtn.classList.toggle('heeft-acties', openGroepen.length > 0);
            }

            this._updateSubtabBadges(actieGroepen);

            // Veldindicatoren
            document.querySelectorAll('.actie-indicator').forEach(el => el.remove());
            const veldKaart = MetingenModule.ACTIE_VELD_MAP;
            const open    = acties.filter(a => !a.opgelost);
            const gesloten = acties.filter(a =>  a.opgelost);
            open.forEach(actie => {
                (veldKaart[`${actie.actie_type}|${actie.bad_naam}`] || []).forEach(inputId => {
                    const input = document.getElementById(inputId); if (!input) return;
                    const ind   = document.createElement('span');
                    ind.className = 'actie-indicator'; ind.title = actie.beschrijving; ind.textContent = '⚠';
                    input.parentElement.appendChild(ind);
                });
            });
            gesloten.forEach(actie => {
                (veldKaart[`${actie.actie_type}|${actie.bad_naam}`] || []).forEach(inputId => {
                    const input = document.getElementById(inputId); if (!input) return;
                    const ind   = document.createElement('span');
                    ind.className = 'actie-indicator actie-indicator-opgelost';
                    const tijdstip = actie.opgelost_op ? String(actie.opgelost_op).slice(0, 16).replace('T', ' ') : '';
                    const door     = actie.opgelost_door ? ` door ${actie.opgelost_door}` : '';
                    ind.title = `Afgehandeld${door}${tijdstip ? ' om ' + tijdstip : ''}`;
                    ind.textContent = '✓';
                    input.parentElement.appendChild(ind);
                });
            });

            // Tab-inhoud
            const inhoud = document.getElementById('acties-tab-inhoud');
            if (!inhoud) return;

            const splitBeschrijving = b => {
                const idx = b.lastIndexOf(' — ');
                return idx === -1 ? { reden: b, actie: '' } : { reden: b.slice(0, idx), actie: b.slice(idx + 3) };
            };
            const rijGroep = groep => {
                const alleOpgelost = groep.items.every(a => a.opgelost);
                const ids   = groep.items.map(a => a.id);
                const { actie } = splitBeschrijving(groep.items[0].beschrijving);
                const reden = groep.items.map(a => splitBeschrijving(a.beschrijving).reden).join('<br>');
                if (!alleOpgelost) return `
                    <tr>
                        <td><b>${groep.bad_naam}</b></td><td><b>${actie}</b></td><td>${reden}</td>
                        <td style="text-align:center;">
                            <input type="checkbox" onchange="losActieGroepOp(${JSON.stringify(ids)}, this.checked)"
                                style="width:18px;height:18px;cursor:pointer;">
                        </td>
                    </tr>`;
                const latest   = groep.items.reduce((a, b) => (String(a.opgelost_op) > String(b.opgelost_op)) ? a : b);
                const tijdstip = latest.opgelost_op ? String(latest.opgelost_op).slice(0, 16).replace('T', ' ') : '';
                const door     = latest.opgelost_door ? ` door ${latest.opgelost_door}` : '';
                return `
                    <tr style="background:#f0fff0;color:#555;">
                        <td><b>${groep.bad_naam}</b></td>
                        <td><span style="text-decoration:line-through;"><b>${actie}</b></span>
                            <span style="font-size:12px;color:#28a745;display:block;">✓ Afgehandeld${door}${tijdstip ? ' om ' + tijdstip : ''}</span></td>
                        <td><span style="text-decoration:line-through;">${reden}</span></td>
                        <td style="text-align:center;">
                            <input type="checkbox" checked onchange="losActieGroepOp(${JSON.stringify(ids)}, this.checked)"
                                title="Vink uit om actie te heropenen" style="width:18px;height:18px;cursor:pointer;">
                        </td>
                    </tr>`;
            };

            if (acties.length === 0) {
                inhoud.innerHTML = `<div class="categorie-box" style="color:#28a745;font-weight:bold;">✓ Geen openstaande acties voor deze dag.</div>`;
                return;
            }
            inhoud.innerHTML = `
                <div class="categorie-box">
                    <h3 style="color:${openGroepen.length > 0 ? '#dc3545' : '#28a745'};">
                        ${openGroepen.length > 0 ? `Openstaande acties (${openGroepen.length})` : '✓ Alle acties afgehandeld'}
                    </h3>
                    <table class="categorie-tabel">
                        <thead><tr><th>Bad</th><th>Actie</th><th>Reden</th><th style="text-align:center;width:110px;">Uitgevoerd</th></tr></thead>
                        <tbody>${openGroepen.map(rijGroep).join('')}${geslotenGroepen.map(rijGroep).join('')}</tbody>
                    </table>
                </div>`;
        } catch (f) { console.error('Fout bij laden acties:', f); }
    }

    async losActieGroepOp(ids, opgelost) {
        try {
            const endpoint = opgelost ? 'resolve' : 'unresolve';
            await Promise.all(ids.map(id => this.app.api.call(`/api/acties/${id}/${endpoint}`, { method: 'POST' })));
            const datum = document.getElementById('centraleDatum').value;
            await this.laadActies(datum);
            this.app.ui.toonBericht(opgelost ? 'Actie gemarkeerd als opgelost!' : 'Actie heropend.', 'succes');
        } catch (f) { console.error('Fout bij oplossen acties:', f); }
    }

    async losActieOp(actieId, opgelost) {
        try {
            const endpoint = opgelost ? `/api/acties/${actieId}/resolve` : `/api/acties/${actieId}/unresolve`;
            const res = await this.app.api.call(endpoint, { method: 'POST' });
            if (res.ok) {
                const datum = document.getElementById('centraleDatum').value;
                await this.laadActies(datum);
                this.app.ui.toonBericht(opgelost ? 'Actie gemarkeerd als opgelost!' : 'Actie heropend.', 'succes');
            }
        } catch (f) { console.error('Fout bij oplossen actie:', f); }
    }

    // ── Tabel renderen ────────────────────────────────────────────────────

    _bouwTabelOp(data) {
        const ui = this.app.ui;
        const { huidigeRol, huidigeBadPagina, huidigeSubtab, huidigePeuterbadSubtab, huidigeCoordSubtab } = this.app.state;
        const categorieContent = document.getElementById('waterbeheer-grote-baden-content');
        const tabelContent     = document.getElementById('tables-content');
        const tKop  = document.getElementById('tabelKop');
        const tBody = document.getElementById('dagstaatTbody');
        tKop.innerHTML = ''; tBody.innerHTML = '';

        ['waterbeheer-logboek-content','waterbeheer-acties-content','coordinatoren-subtab-nav',
         'coordinatoren-blokken-content','coordinatoren-checklist-content',
         'coordinatoren-daggegevens-content','coordinatoren-logboek-content'].forEach(id => {
            const el = document.getElementById(id); if (el) el.style.display = 'none';
        });

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden') {
            categorieContent.style.display = 'block';
            document.getElementById('waterbeheer-peuterbad-content').style.display = 'none';
            tabelContent.style.display = 'none';

            ['meetwaarden','verbruik','verwarmingssysteem','bezoekers'].forEach(s => {
                document.getElementById(`subtab-${s}`).classList.toggle('actief', s === huidigeSubtab);
                document.getElementById(`subtab-${s}-content`).style.display = (s === huidigeSubtab) ? 'block' : 'none';
            });

            ['diep','ondiep'].forEach(b => {
                ['ph','chloor','temp','flow'].forEach(f => { document.getElementById(`${f}-${b}`).value = ''; });
                ['filter-in','filter-uit'].forEach(f => { document.getElementById(`${f}-${b}`).value = ''; });
            });
            ['Diep','Ondiep'].forEach(bad => {
                const meting = Array.isArray(data) ? data.find(m => m.bad_naam === bad) : null;
                const lb = bad.toLowerCase();
                ui.zetInputValue(`ph-${lb}`,         meting?.ph_waarde     ?? '');
                ui.zetInputValue(`chloor-${lb}`,     meting?.chloor_waarde ?? '');
                ui.zetInputValue(`temp-${lb}`,        meting?.temperatuur   ?? '');
                ui.zetInputValue(`flow-${lb}`,         meting?.flow         ?? '');
                ui.zetInputValue(`filter-in-${lb}`,   meting?.filter_druk_in  ?? '');
                ui.zetInputValue(`filter-uit-${lb}`,  meting?.filter_druk_uit ?? '');
            });
            if (huidigeSubtab === 'verbruik' || huidigeSubtab === 'verwarmingssysteem')
                this.app.verbruik.laadWaterbeheerVelden();
            return;
        }

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'peuterbad') {
            categorieContent.style.display = 'none';
            document.getElementById('waterbeheer-peuterbad-content').style.display = 'block';
            tabelContent.style.display = 'none';
            ['peuterbad-ph','peuterbad-chloor','peuterbad-filterdruk','peuterbad-flow',
             'peuterbad-water','peuterbad-chemicalien-chloor','peuterbad-chemicalien-zwavelzuur'].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            const meting = Array.isArray(data) ? data.find(m => m.bad_naam === 'Peuterbad') : null;
            ui.zetInputValue('peuterbad-ph',                   meting?.ph_waarde     ?? '');
            ui.zetInputValue('peuterbad-chloor',               meting?.chloor_waarde ?? '');
            ui.zetInputValue('peuterbad-filterdruk',           meting?.filter_druk ?? meting?.filter_druk_in ?? '');
            ui.zetInputValue('peuterbad-flow',                 meting?.flow          ?? '');
            ui.zetInputValue('peuterbad-water',                meting?.water         ?? '');
            ui.zetInputValue('peuterbad-chemicalien-chloor',   meting?.chemicalien_chloor     ?? '');
            ui.zetInputValue('peuterbad-chemicalien-zwavelzuur',meting?.chemicalien_zwavelzuur ?? '');
            this.wisselPeuterbadSubtab(huidigePeuterbadSubtab);
            return;
        }

        categorieContent.style.display = 'none';
        document.getElementById('waterbeheer-peuterbad-content').style.display = 'none';
        tabelContent.style.display = 'none';

        if (huidigeRol === 'coordinatoren') {
            document.getElementById('coordinatoren-subtab-nav').style.display = '';
            const blokkContainer = document.getElementById('coordinatoren-blokken-content');
            blokkContainer.innerHTML = '';
            const blokken = Array.isArray(data) ? data : [];
            blokken.forEach(blok => blokkContainer.appendChild(
                this._maakBlokElement(blok.tijdstip, blok.metingen, blok.auteur || '')
            ));
            const btnRij = document.createElement('div');
            btnRij.className = 'actie-container';
            btnRij.style.cssText = 'justify-content:flex-start;margin-top:12px;';
            btnRij.innerHTML = `<button class="btn-centraal-opslaan" onclick="voegNieuwBlokToe()">+ Nieuw blok toevoegen</button>`;
            blokkContainer.appendChild(btnRij);
            this.wisselCoordSubtab(huidigeCoordSubtab);
            return;
        }

        tabelContent.style.display = 'block';
        if (huidigeRol === 'waterbeheer') {
            if (huidigeBadPagina === 'grote-baden') {
                tKop.innerHTML = `<tr><th>Bad</th><th>pH</th><th>Chloor (mg/l)</th><th>Flow (m³/h)</th><th>Filterdruk (bar)</th></tr>`;
                ['Diep','Ondiep'].forEach(bad => {
                    const meting = Array.isArray(data) ? data.find(m => m.bad_naam === bad) : null;
                    tBody.innerHTML += this._genereerRijWaterbeheer(bad, meting || {}, false);
                });
            } else {
                tKop.innerHTML = `<tr><th>Bad</th><th>pH</th><th>Chloor (mg/l)</th></tr>`;
                const meting = Array.isArray(data) ? data.find(m => m.bad_naam === 'Peuterbad') : null;
                tBody.innerHTML += this._genereerRijWaterbeheer('Peuterbad', meting || {}, true);
            }
        }
        document.querySelectorAll('#dagstaatTbody input[type="number"]').forEach(input => {
            const param = input.getAttribute('data-param');
            if (param) this.app.ui.valideerVeld(input, param);
        });
    }

    _genereerRijWaterbeheer(badNaam, meting, isPeuterbad) {
        const ph    = meting.ph_waarde     ?? '';
        const chloor = meting.chloor_waarde ?? '';
        if (isPeuterbad) return `<tr id="rij-${badNaam}" data-bad="${badNaam}"><td><b>${badNaam}</b></td>
            <td><input type="number" class="v-ph"    step="0.01" value="${ph}"    data-param="ph_waarde"    oninput="valideerVeld(this,'ph_waarde')"></td>
            <td><input type="number" class="v-chloor" step="0.01" value="${chloor}" data-param="chloor_waarde" oninput="valideerVeld(this,'chloor_waarde')"></td></tr>`;
        const flow  = meting.flow            ?? '';
        const druk  = meting.filter_druk ?? meting.filter_druk_in ?? '';
        const flowParam = badNaam === 'Diep' ? 'flow_diep' : 'flow_ondiep';
        return `<tr id="rij-${badNaam}" data-bad="${badNaam}"><td><b>${badNaam}</b></td>
            <td><input type="number" class="v-ph"    step="0.01" value="${ph}"    data-param="ph_waarde"    oninput="valideerVeld(this,'ph_waarde')"></td>
            <td><input type="number" class="v-chloor" step="0.01" value="${chloor}" data-param="chloor_waarde" oninput="valideerVeld(this,'chloor_waarde')"></td>
            <td><input type="number" class="v-flow"  value="${flow}" data-param="${flowParam}" oninput="valideerVeld(this,'${flowParam}')"></td>
            <td><input type="number" class="v-druk"  step="0.01" value="${druk}" data-param="filter_druk"   oninput="valideerVeld(this,'filter_druk')"></td></tr>`;
    }

    _genereerRijCoordinatoren(badNaam, meting) {
        const ph     = meting.ph_waarde       ?? '';
        const vrij   = meting.chloor_vrij     ?? '';
        const totaal = meting.chloor_totaal   ?? '';
        const temp   = meting.watertemperatuur ?? '';
        const vNum = parseFloat(vrij), tNum = parseFloat(totaal);
        const gebonden = (!isNaN(vNum) && !isNaN(tNum)) ? (tNum - vNum).toFixed(2) : '';

        const chloorCellen = `
            <td><input type="number" class="c-chloor-vrij"     step="0.01" value="${vrij}"     data-param="chloor_vrij"     oninput="valideerVeld(this,'chloor_vrij')"></td>
            <td><input type="number" class="c-chloor-totaal"   step="0.01" value="${totaal}"   data-param="chloor_totaal"   oninput="valideerVeld(this,'chloor_totaal')"></td>
            <td><input type="number" class="c-chloor-gebonden" step="0.01" value="${gebonden}" data-param="chloor_gebonden" readonly
                style="background-color:#f0f0f0;cursor:not-allowed;" tabindex="-1"></td>`;

        const isPeuterbad = badNaam === 'Peuterbad';
        const extraCel = isPeuterbad
            ? `<td><label style="display:flex;align-items:center;gap:6px;">
                   <input type="checkbox" class="c-gebruikt" ${meting.bad_gebruikt ? 'checked' : ''}> Gebruikt
               </label></td>`
            : `<td><select class="c-helder">
                   <option value="Helder"        ${(meting.helderheid ?? 'Helder') === 'Helder'        ? 'selected' : ''}>Helder</option>
                   <option value="Licht troebel" ${(meting.helderheid ?? '')        === 'Licht troebel' ? 'selected' : ''}>Licht troebel</option>
                   <option value="Troebel"       ${(meting.helderheid ?? '')        === 'Troebel'       ? 'selected' : ''}>Troebel</option>
               </select></td>`;

        return `<tr data-bad="${badNaam}">
            <td><b>${badNaam}</b></td>
            <td><input type="number" class="c-ph" step="0.01" value="${ph}" data-param="ph_waarde" oninput="valideerVeld(this,'ph_waarde')"></td>
            ${chloorCellen}
            <td><input type="number" class="c-temp" step="0.1" value="${temp}" data-param="watertemperatuur" oninput="valideerVeld(this,'watertemperatuur')"></td>
            ${extraCel}
        </tr>`;
    }

    // ── Coordinator checklist en daggegevens ──────────────────────────────

    async _laadCoordChecklist(datum) {
        if (!datum) return;
        try {
            const res = await this.app.api.call(`/api/coordinatoren/checklist?datum=${datum}`);
            const d   = await res.json();
            document.getElementById('proef-waterspeel').checked = !!d.proef_waterspeel;
            document.getElementById('proef-spraypark').checked  = !!d.proef_spraypark;
            document.getElementById('proef-douches').checked    = !!d.proef_douches;
            document.getElementById('proef-glijbaan').checked   = !!d.proef_glijbaan;
        } catch (e) { console.error('Fout bij laden checklist:', e); }

        const form = document.getElementById('coordinatoren-checklist-content');
        if (form.dataset.listenersAttached) return;
        form.dataset.listenersAttached = '1';
        form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', e => { e.stopPropagation(); this._scheduleAutoSaveChecklist(); });
            cb.addEventListener('input',  e => e.stopPropagation());
        });
    }

    _scheduleAutoSaveChecklist() {
        const state = this.app.state;
        if (state.checklistAutoSaveTimer) clearTimeout(state.checklistAutoSaveTimer);
        this.app.ui.setAutoSaveStatus('pending');
        state.checklistAutoSaveTimer = setTimeout(async () => {
            this.app.ui.setAutoSaveStatus('saving');
            const datum   = document.getElementById('centraleDatum').value;
            const payload = {
                datum,
                proef_waterspeel: document.getElementById('proef-waterspeel').checked ? 1 : 0,
                proef_spraypark:  document.getElementById('proef-spraypark').checked  ? 1 : 0,
                proef_douches:    document.getElementById('proef-douches').checked    ? 1 : 0,
                proef_glijbaan:   document.getElementById('proef-glijbaan').checked   ? 1 : 0,
            };
            try {
                const res = await this.app.api.call('/api/coordinatoren/checklist', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
                });
                this.app.ui.setAutoSaveStatus(res.ok ? 'saved' : 'error');
                if (!res.ok) this.app.ui.toonBericht('Fout bij opslaan checklist.', 'fout');
            } catch (e) { this.app.ui.setAutoSaveStatus('error'); }
        }, 1200);
    }

    async _laadCoordDaggegevens(datum) {
        if (!datum) return;
        try {
            const res = await this.app.api.call(`/api/coordinatoren/daggegevens?datum=${datum}`);
            const d   = await res.json();
            document.getElementById('coord-lucht-temp').value        = d.lucht_temperatuur ?? '';
            document.getElementById('coord-bezoekers-vandaag').value = d.bezoekers_vandaag ?? '';
        } catch (e) { console.error('Fout bij laden daggegevens:', e); }

        const form = document.getElementById('coordinatoren-daggegevens-content');
        if (form.dataset.listenersAttached) return;
        form.dataset.listenersAttached = '1';
        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input',  e => { e.stopPropagation(); this._scheduleAutoSaveDaggegevens(); });
            input.addEventListener('change', e => { e.stopPropagation(); this._scheduleAutoSaveDaggegevens(); });
        });
    }

    _scheduleAutoSaveDaggegevens() {
        const state = this.app.state;
        if (state.daggegevensAutoSaveTimer) clearTimeout(state.daggegevensAutoSaveTimer);
        this.app.ui.setAutoSaveStatus('pending');
        state.daggegevensAutoSaveTimer = setTimeout(async () => {
            this.app.ui.setAutoSaveStatus('saving');
            const datum   = document.getElementById('centraleDatum').value;
            const payload = {
                datum,
                lucht_temperatuur: parseFloat(document.getElementById('coord-lucht-temp').value)     || null,
                bezoekers_vandaag: parseInt(document.getElementById('coord-bezoekers-vandaag').value) || null,
            };
            try {
                const res = await this.app.api.call('/api/coordinatoren/daggegevens', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
                });
                this.app.ui.setAutoSaveStatus(res.ok ? 'saved' : 'error');
                if (!res.ok) this.app.ui.toonBericht('Fout bij opslaan daggegevens.', 'fout');
            } catch (e) { this.app.ui.setAutoSaveStatus('error'); }
        }, 1200);
    }

    // ── Coordinator blokken ───────────────────────────────────────────────

    _maakBlokElement(tijdstip, metingen, auteur = '') {
        const displayTijd  = String(tijdstip).slice(0, 5);
        const auteurLabel  = auteur ? `<span style="font-size:13px;font-weight:normal;color:#888;margin-left:10px;">— ${auteur}</span>` : '';
        const el = document.createElement('div');
        el.className = 'categorie-box';
        el.setAttribute('data-blok-tijdstip', tijdstip);

        el.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h3 style="margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    Meting
                    <input type="time" class="blok-tijdstip-input" value="${displayTijd}"
                        style="font-size:inherit;font-weight:bold;border:none;border-bottom:1px solid #aaa;
                               background:transparent;cursor:text;padding:0 2px;color:inherit;width:auto;">
                    ${auteurLabel}
                </h3>
                <button class="blok-verwijder-btn" style="background:#dc3545;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:13px;">Verwijderen</button>
            </div>
            <table class="categorie-tabel coord-tabel">
                <thead>
                    <tr><th rowspan="2">Bad</th><th rowspan="2">pH</th><th colspan="3">Chloor (mg/l)</th><th rowspan="2">Temp (°C)</th><th rowspan="2">Helderheid / Gebruik</th></tr>
                    <tr><th>Vrij</th><th>Totaal</th><th>Gebonden</th></tr>
                </thead>
                <tbody>
                    ${['Diep','Ondiep','Peuterbad'].map(bad => {
                        const m = (metingen || []).find(r => r.bad_naam === bad) || {};
                        return this._genereerRijCoordinatoren(bad, m);
                    }).join('')}
                </tbody>
            </table>`;

        el.querySelector('.blok-verwijder-btn').addEventListener('click',
            () => this._verwijderBlok(el.getAttribute('data-blok-tijdstip')));

        el.querySelector('.blok-tijdstip-input').addEventListener('change', async e => {
            e.stopPropagation();
            const nieuwTijd    = e.target.value;
            if (!nieuwTijd) return;
            const nieuwTijdstip = nieuwTijd + ':00';
            const oudTijdstip   = el.getAttribute('data-blok-tijdstip');
            if (nieuwTijdstip === oudTijdstip) return;
            const blokkContainer = document.getElementById('coordinatoren-blokken-content');
            if (blokkContainer.querySelector(`[data-blok-tijdstip="${nieuwTijdstip}"]`)) {
                this.app.ui.toonBericht('Er bestaat al een blok voor dit tijdstip.', 'fout');
                e.target.value = oudTijdstip.slice(0, 5);
                return;
            }
            const datum = document.getElementById('centraleDatum').value;
            try {
                await this.app.api.call(`/api/coordinatoren?datum=${datum}&tijdstip=${encodeURIComponent(oudTijdstip)}`, { method: 'DELETE' });
            } catch { /* ignore */ }
            el.setAttribute('data-blok-tijdstip', nieuwTijdstip);
            this.app.opslaan.scheduleAutoSaveBlok(nieuwTijdstip);
        });

        el.querySelectorAll('input:not(.blok-tijdstip-input):not(.c-chloor-gebonden), select').forEach(input => {
            input.addEventListener('input',  () => this.app.opslaan.scheduleAutoSaveBlok(el.getAttribute('data-blok-tijdstip')));
            input.addEventListener('change', () => this.app.opslaan.scheduleAutoSaveBlok(el.getAttribute('data-blok-tijdstip')));
        });

        el.querySelectorAll('.c-chloor-vrij, .c-chloor-totaal').forEach(input => {
            input.addEventListener('input', () => {
                const rij  = input.closest('tr');
                const v    = parseFloat(rij.querySelector('.c-chloor-vrij')?.value);
                const t    = parseFloat(rij.querySelector('.c-chloor-totaal')?.value);
                const gebEl = rij.querySelector('.c-chloor-gebonden');
                gebEl.value = (!isNaN(v) && !isNaN(t)) ? (t - v).toFixed(2) : '';
                if (gebEl.value !== '') this.app.ui.valideerVeld(gebEl, 'chloor_gebonden');
            });
        });

        el.querySelectorAll('input[type="number"]').forEach(input => {
            const param = input.getAttribute('data-param');
            if (param && input.value !== '') this.app.ui.valideerVeld(input, param);
        });

        return el;
    }

    async _verwijderBlok(tijdstip) {
        if (!confirm(`Blok ${String(tijdstip).slice(0, 5)} verwijderen?`)) return;
        const datum = document.getElementById('centraleDatum').value;
        try {
            const res = await this.app.api.call(
                `/api/coordinatoren?datum=${datum}&tijdstip=${encodeURIComponent(tijdstip)}`,
                { method: 'DELETE' }
            );
            if (!res.ok && res.status !== 404) {
                const e = await res.json().catch(() => null);
                this.app.ui.toonBericht(e?.error || 'Fout bij verwijderen.', 'fout');
                return;
            }
        } catch (e) { console.error(e); this.app.ui.toonBericht('Verbindingsfout bij verwijderen.', 'fout'); return; }
        const el = document.querySelector(`[data-blok-tijdstip="${tijdstip}"]`);
        if (el) el.remove();
        this.app.ui.setAutoSaveStatus('saved');
    }

    voegNieuwBlokToe() {
        const now = new Date();
        const tijdstip = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`;
        const blokkContainer = document.getElementById('coordinatoren-blokken-content');
        if (blokkContainer.querySelector(`[data-blok-tijdstip="${tijdstip}"]`)) {
            this.app.ui.toonBericht('Er bestaat al een blok voor dit tijdstip.', 'fout');
            return;
        }
        const g       = this.app.state.ingelogdeGebruiker;
        const auteur  = g ? ([g.voornaam, g.achternaam].filter(Boolean).join(' ').trim() || g.inlognaam) : '';
        const btnRij  = blokkContainer.lastElementChild;
        blokkContainer.insertBefore(this._maakBlokElement(tijdstip, [], auteur), btnRij);
    }
}

// Node/Jest: exporteer de klasse zodat pure helpers (zoals groepeerActies)
// los te testen zijn. In de browser bestaat `module` niet en wordt dit genegeerd.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetingenModule;
}
