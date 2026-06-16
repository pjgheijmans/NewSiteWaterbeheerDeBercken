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
        ['grote-baden','peuterbad','logboek'].forEach(p => {
            document.getElementById(`tab-${p}`)?.classList.toggle('actief', p === pagina);
        });
        document.getElementById('waterbeheer-grote-baden-content').style.display = (pagina === 'grote-baden') ? 'block' : 'none';
        document.getElementById('waterbeheer-peuterbad-content').style.display   = (pagina === 'peuterbad')   ? 'block' : 'none';
        document.getElementById('waterbeheer-logboek-content').style.display     = (pagina === 'logboek')     ? 'block' : 'none';
        document.getElementById('tables-content').style.display = 'none';
        this.laadMetingen();
    }

    wisselSubtab(subtab) {
        this.app.state.huidigeSubtab = subtab;
        ['meetwaarden','verbruik','verwarmingssysteem','bezoekers','taken'].forEach(s => {
            document.getElementById(`subtab-${s}`).classList.toggle('actief', s === subtab);
            document.getElementById(`subtab-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
        });
        if (subtab === 'verbruik' || subtab === 'verwarmingssysteem')
            this.app.verbruik.laadWaterbeheerVelden();
        if (subtab === 'bezoekers')
            this.laadBezoekers();
        if (subtab === 'taken')
            this.app.taken.laadBadTaken('grote-baden', document.getElementById('centraleDatum').value);
    }

    wisselPeuterbadSubtab(subtab) {
        this.app.state.huidigePeuterbadSubtab = subtab;
        ['meetwaarden','verbruik','taken'].forEach(s => {
            document.getElementById(`subtab-peuterbad-${s}`).classList.toggle('actief', s === subtab);
            document.getElementById(`peuterbad-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
        });
        if (subtab === 'verbruik') this.app.verbruik.laadEnBerekenPeuterbadVerbruik();
        if (subtab === 'taken') this.app.taken.laadBadTaken('peuterbad', document.getElementById('centraleDatum').value);
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

        // Dienstbalk (wie was op dienst) hoort bij de hele waterbeheer-weergave,
        // dus laden vóór de logboek-afsplitsing hieronder.
        if (huidigeRol === 'waterbeheer') this.app.dienst.laadDienst(datum);

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'logboek') {
            this.app.logboek.laadLogboek(datum); return;
        }
        const endpoint = huidigeRol === 'waterbeheer' ? '/api/metingen' : '/api/coordinatoren';
        try {
            const res = await this.app.api.call(`${endpoint}?datum=${datum}`);
            this.app.state.gecachteData = await res.json();
            this._bouwTabelOp(this.app.state.gecachteData);
            if (huidigeRol === 'waterbeheer') {
                this._onthoudMetingVersies(this.app.state.gecachteData);
                await this.laadBezoekers();
                await this.laadGebondenChloor();
                this.laadActies(datum);                  // alleen nog de ⚠-veldindicatoren
                // Taken: badges altijd bijwerken; staat de Taken-subtab van de grote
                // baden open, dan ook de inhoud (her)laden — anders blijft die bij
                // datumnavigatie op de vorige dag staan (de peuterbad-Taken-inhoud
                // wordt via _bouwTabelOp → wisselPeuterbadSubtab al herladen).
                if (huidigeBadPagina === 'grote-baden' && this.app.state.huidigeSubtab === 'taken') {
                    this.app.taken.laadBadTaken('grote-baden', datum);   // badges + inhoud
                } else {
                    this.app.taken.werkBadgeBij(datum);                  // alleen badges
                }
                await this.app.verbruik.laadEnBerekenVerbruik();
                // Verbruik-standen laden/cachen zodat de volledigheids-markering klopt:
                // op grote-baden in de DOM (voor de subtab), op peuterbad alleen gecachet
                // (voor het bolletje op de Diep/Ondiep-pagina-tab).
                if (huidigeBadPagina === 'grote-baden') await this.app.verbruik.laadWaterbeheerVelden();
                else                                     await this.app.verbruik.cacheGroteBadenVerbruik();
                this.werkVolledigheidBij();              // passieve "niet alle velden ingevuld"-markering
                this.toonLaatstGewijzigd();              // "laatst gewijzigd door … om …"
            }
        } catch { this.app.ui.toonBericht('Fout bij het ophalen van de gegevens.', 'fout'); }
    }

    // ── Optimistische concurrency: versies + "laatst gewijzigd" + conflict ──────

    /** Bewaar per bad de versie/auteur/bijgewerkt_op uit de geladen metingen. */
    _onthoudMetingVersies(data) {
        (Array.isArray(data) ? data : []).forEach(r => {
            this.app.state.versies[`meting:${r.bad_naam}`] = {
                versie: r.versie ?? null, auteur: r.auteur ?? null, bijgewerkt_op: r.bijgewerkt_op ?? null,
            };
        });
    }

    /**
     * Optimistische concurrency: de server gaf 409 omdat iemand anders de gegevens
     * ondertussen wijzigde. Herlaad met de actuele waarden en leg uit wat er gebeurde.
     */
    behandelConflict() {
        this.app.ui.toonBericht(
            'Iemand anders heeft deze gegevens ondertussen gewijzigd. De pagina is opnieuw geladen met de actuele waarden.',
            'fout');
        this.laadMetingen();
    }

    /** Vul de "laatst gewijzigd door … om …"-regels uit de bewaarde versie-meta. */
    toonLaatstGewijzigd() {
        const v = this.app.state.versies;
        const fmt = meta => {
            if (!meta || !meta.auteur) return '';
            let tijd = '';
            if (meta.bijgewerkt_op) {
                const d = new Date(meta.bijgewerkt_op);
                if (!isNaN(d)) tijd = ' om ' + d.toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' });
            }
            return `Laatst gewijzigd door ${meta.auteur}${tijd}`;
        };
        const recentste = (...ms) => ms
            .filter(m => m && m.bijgewerkt_op)
            .sort((a, b) => (a.bijgewerkt_op < b.bijgewerkt_op ? 1 : -1))[0] || null;
        const zet = (id, tekst) => { const el = document.getElementById(id); if (el) el.textContent = tekst; };
        zet('meetwaarden-gewijzigd', fmt(recentste(v['meting:Diep'], v['meting:Ondiep'])));
        zet('verbruik-gewijzigd',    fmt(v['verbruik']));
        zet('peuterbad-gewijzigd',   fmt(v['meting:Peuterbad']));
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

    /**
     * Laadt het berekende dagmaximum gebonden chloor per bad (afgeleid van de
     * coordinator-metingen) en toont het read-only in de waterbeheer-tabs. De
     * actiemarkering bij deze velden wordt door laadActies geplaatst.
     */
    async laadGebondenChloor() {
        const datum = document.getElementById('centraleDatum').value;
        if (!datum) return;
        try {
            const res  = await this.app.api.call(`/api/gebonden-chloor?datum=${datum}`);
            const data = await res.json();
            const fmt  = v => (v === null || v === undefined || isNaN(v)) ? '' : Number(v).toFixed(2);
            const elDiep      = document.getElementById('gebonden-chloor-diep');
            const elOndiep    = document.getElementById('gebonden-chloor-ondiep');
            const elPeuterbad = document.getElementById('gebonden-chloor-peuterbad');
            if (elDiep)      elDiep.value      = fmt(data.diep);
            if (elOndiep)    elOndiep.value    = fmt(data.ondiep);
            if (elPeuterbad) elPeuterbad.value = fmt(data.peuterbad);
        } catch (f) { console.error('Fout bij laden gebonden chloor:', f); }
    }

    // ── Acties (veldindicatoren) ────────────────────────────────────────────

    static get ACTIE_VELD_MAP() {
        return {
            'filter_spoelen_druk|Diep':          ['filter-in-diep','filter-uit-diep'],
            'filter_spoelen_druk|Ondiep':        ['filter-in-ondiep','filter-uit-ondiep'],
            'filter_spoelen_druk|Peuterbad':     ['peuterbad-filterdruk'],
            'filter_spoelen_flow|Diep':          ['flow-diep'],
            'filter_spoelen_flow|Ondiep':        ['flow-ondiep'],
            'filter_spoelen_flow|Peuterbad':     ['peuterbad-flow'],
            'filter_spoelen_gebonden|Diep':      ['gebonden-chloor-diep'],
            'filter_spoelen_gebonden|Ondiep':    ['gebonden-chloor-ondiep'],
            'filter_spoelen_gebonden|Peuterbad': ['gebonden-chloor-peuterbad'],
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

    /** Koppelt een subtab-contentcontainer aan de bijbehorende subtab-knop. */
    static get ACTIE_SUBTAB_KNOP() {
        return {
            'subtab-meetwaarden-content':    'subtab-meetwaarden',
            'subtab-verbruik-content':       'subtab-verbruik',
            'subtab-bezoekers-content':      'subtab-bezoekers',
            'peuterbad-meetwaarden-content': 'subtab-peuterbad-meetwaarden',
            'peuterbad-verbruik-content':    'subtab-peuterbad-verbruik',
        };
    }

    /** Zet of verwijder de ⚠-actiemarkering op een subtab-knop (idempotent). */
    _zetSubtabActieMarker(buttonId, heeft) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        let marker = btn.querySelector('.tab-actie-indicator');
        if (heeft) {
            if (!marker) {
                marker = document.createElement('span');
                marker.className   = 'tab-actie-indicator';
                marker.textContent = '⚠';
                marker.title       = 'Openstaande actie op een veld in deze subtab';
                btn.appendChild(marker);
            }
        } else if (marker) {
            marker.remove();
        }
    }

    /**
     * Toont de ⚠/✓-veldindicatoren naast de meetwaarden op basis van de open/
     * afgehandelde acties. De takenlijst zelf (incl. deze acties) wordt door de
     * TakenModule gerenderd; deze methode beheert alleen de indicatoren bij de velden.
     */
    async laadActies(datum) {
        try {
            const res    = await this.app.api.call(`/api/acties?datum=${datum}`);
            const acties = await res.json();
            if (!Array.isArray(acties)) return;

            document.querySelectorAll('.actie-indicator').forEach(el => el.remove());
            const veldKaart = MetingenModule.ACTIE_VELD_MAP;
            const open     = acties.filter(a => !a.opgelost);
            const gesloten = acties.filter(a =>  a.opgelost);
            const subtabsMetActie = new Set();
            open.forEach(actie => {
                (veldKaart[`${actie.actie_type}|${actie.bad_naam}`] || []).forEach(inputId => {
                    const input = document.getElementById(inputId); if (!input) return;
                    const ind   = document.createElement('span');
                    ind.className = 'actie-indicator'; ind.title = actie.beschrijving; ind.textContent = '⚠';
                    input.parentElement.appendChild(ind);
                    // Onthoud welke subtab dit veld bevat, zodat ook de subtab-knop een
                    // ⚠ krijgt (anders zie je het alarm alleen op de Taken-/pagina-tab).
                    const knop = MetingenModule.ACTIE_SUBTAB_KNOP[input.closest('[id$="-content"]')?.id];
                    if (knop) subtabsMetActie.add(knop);
                });
            });
            Object.values(MetingenModule.ACTIE_SUBTAB_KNOP).forEach(knop =>
                this._zetSubtabActieMarker(knop, subtabsMetActie.has(knop)));
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
        } catch (f) { console.error('Fout bij laden veldindicatoren:', f); }
    }

    // ── Volledigheid (passieve "niet alle velden ingevuld"-markering) ────────

    /**
     * Werkt de passieve "niet alle velden ingevuld"-markering (gedempt bolletje) bij.
     * De huidige pagina wordt live uit de DOM gelezen (incl. nog niet opgeslagen
     * invoer); de andere pagina uit de gecachte data (die wordt nu niet bewerkt).
     * Zo zijn beide pagina-tabs vanaf het laden correct, net als de actie-⚠.
     * De subtab-bolletjes worden alleen voor de zichtbare pagina gezet.
     */
    werkVolledigheidBij() {
        const { huidigeRol, huidigeBadPagina } = this.app.state;
        if (huidigeRol !== 'waterbeheer') return;

        const grote  = huidigeBadPagina === 'grote-baden'
            ? this._groteBadenOnvolledigUitDom()  : this._groteBadenOnvolledigUitData();
        const peuter = huidigeBadPagina === 'peuterbad'
            ? this._peuterbadOnvolledigUitDom()   : this._peuterbadOnvolledigUitData();

        if (huidigeBadPagina === 'grote-baden') {
            this._zetVolledigheidMarker('subtab-meetwaarden', grote.meet);
            this._zetVolledigheidMarker('subtab-verbruik',    grote.verbruik);
        } else if (huidigeBadPagina === 'peuterbad') {
            this._zetVolledigheidMarker('subtab-peuterbad-meetwaarden', peuter.meet);
            this._zetVolledigheidMarker('subtab-peuterbad-verbruik',    peuter.verbruik);
        }
        // Pagina-tabs voor beide baden — net als de actie-⚠ altijd actueel.
        this._zetVolledigheidMarker('tab-grote-baden', grote.meet  || grote.verbruik);
        this._zetVolledigheidMarker('tab-peuterbad',   peuter.meet || peuter.verbruik);
    }

    /** Normaliseer een data-waarde: lege string/undefined → null (0 en "0" blijven). */
    static _leeg(v) { return (v === '' || v === undefined) ? null : v; }

    /** Diep/Ondiep onvolledig uit de (live) DOM. @returns {{meet:boolean, verbruik:boolean}} */
    _groteBadenOnvolledigUitDom() {
        const api = this.app.api;
        const tekst = id => document.getElementById(id)?.value || null;
        const meet = ['diep', 'ondiep'].some(lb => OpslaanModule.meetwaardenOnvolledig({
            ph_waarde:      api.parseNumberValue(`ph-${lb}`),
            chloor_waarde:  api.parseNumberValue(`chloor-${lb}`),
            temperatuur:    api.parseNumberValue(`temp-${lb}`),
            flow:           api.parseNumberValue(`flow-${lb}`),
            filter_druk_in: api.parseNumberValue(`filter-in-${lb}`),
            filter_druk_uit:api.parseNumberValue(`filter-uit-${lb}`),
            kathodische_bescherming: api.parseNumberValue(`kath-${lb}`),
        }));
        const verbruik = VerbruikModule.verbruikOnvolledig({
            water_diep:          api.parseNumberValue('water-diep'),
            water_ondiep:        api.parseNumberValue('water-ondiep'),
            water_totaal:        api.parseNumberValue('water-totaal'),
            elektriciteit_nacht: api.parseNumberValue('elektriciteit-nacht'),
            elektriciteit_dag:   api.parseNumberValue('elektriciteit-dag'),
            gas:                 api.parseNumberValue('gas'),
            floculant:              tekst('floculant'),
            chemicalien_chloor:     tekst('chemicalien-chloor'),
            chemicalien_zwavelzuur: tekst('chemicalien-zwavelzuur'),
        });
        return { meet, verbruik };
    }

    /** Diep/Ondiep onvolledig uit de gecachte data (gecachteData + gecachteVerbruik). */
    _groteBadenOnvolledigUitData() {
        const L = MetingenModule._leeg;
        const rijen = Array.isArray(this.app.state.gecachteData) ? this.app.state.gecachteData : [];
        const meet = ['Diep', 'Ondiep'].some(bad => {
            const r = rijen.find(m => m.bad_naam === bad) || {};
            return OpslaanModule.meetwaardenOnvolledig({
                ph_waarde: L(r.ph_waarde), chloor_waarde: L(r.chloor_waarde),
                temperatuur: L(r.temperatuur), flow: L(r.flow),
                filter_druk_in: L(r.filter_druk_in), filter_druk_uit: L(r.filter_druk_uit),
                kathodische_bescherming: L(r.kathodische_bescherming),
            });
        });
        const v = this.app.state.gecachteVerbruik || {};
        const verbruik = VerbruikModule.verbruikOnvolledig({
            water_diep: L(v.water_diep), water_ondiep: L(v.water_ondiep), water_totaal: L(v.water_totaal),
            elektriciteit_nacht: L(v.elektriciteit_nacht), elektriciteit_dag: L(v.elektriciteit_dag), gas: L(v.gas),
            floculant: L(v.floculant), chemicalien_chloor: L(v.chemicalien_chloor), chemicalien_zwavelzuur: L(v.chemicalien_zwavelzuur),
        });
        return { meet, verbruik };
    }

    /** Peuterbad onvolledig uit de (live) DOM. @returns {{meet:boolean, verbruik:boolean}} */
    _peuterbadOnvolledigUitDom() {
        const api = this.app.api;
        const payload = {
            ph_waarde:    api.parseNumberValue('peuterbad-ph'),
            chloor_waarde:api.parseNumberValue('peuterbad-chloor'),
            flow:         api.parseNumberValue('peuterbad-flow'),
            filter_druk:  api.parseNumberValue('peuterbad-filterdruk'),
            water:                  api.parseNumberValue('peuterbad-water'),
            chemicalien_chloor:     api.parseNumberValue('peuterbad-chemicalien-chloor'),
            chemicalien_zwavelzuur: api.parseNumberValue('peuterbad-chemicalien-zwavelzuur'),
        };
        return {
            meet:     OpslaanModule.peuterbadOnvolledig('meetwaarden', payload),
            verbruik: OpslaanModule.peuterbadOnvolledig('verbruik', payload),
        };
    }

    /** Peuterbad onvolledig uit de gecachte data (Peuterbad-rij in gecachteData). */
    _peuterbadOnvolledigUitData() {
        const L = MetingenModule._leeg;
        const rijen = Array.isArray(this.app.state.gecachteData) ? this.app.state.gecachteData : [];
        const r = rijen.find(m => m.bad_naam === 'Peuterbad') || {};
        const payload = {
            ph_waarde: L(r.ph_waarde), chloor_waarde: L(r.chloor_waarde),
            flow: L(r.flow), filter_druk: L(r.filter_druk ?? r.filter_druk_in),
            water: L(r.water), chemicalien_chloor: L(r.chemicalien_chloor),
            chemicalien_zwavelzuur: L(r.chemicalien_zwavelzuur),
        };
        return {
            meet:     OpslaanModule.peuterbadOnvolledig('meetwaarden', payload),
            verbruik: OpslaanModule.peuterbadOnvolledig('verbruik', payload),
        };
    }

    /** Zet of verwijder het volledigheids-bolletje op een subtab-knop (idempotent). */
    _zetVolledigheidMarker(buttonId, onvolledig) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        let marker = btn.querySelector('.tab-onvolledig-indicator');
        if (onvolledig) {
            if (!marker) {
                marker = document.createElement('span');
                marker.className   = 'tab-onvolledig-indicator';
                marker.textContent = '•';
                marker.title       = 'Nog niet alle velden ingevuld';
                btn.appendChild(marker);
            }
        } else if (marker) {
            marker.remove();
        }
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

        ['waterbeheer-logboek-content',
         'coordinatoren-subtab-nav',
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
                ['filter-in','filter-uit','kath'].forEach(f => { document.getElementById(`${f}-${b}`).value = ''; });
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
                ui.zetInputValue(`kath-${lb}`,        meting?.kathodische_bescherming ?? '');
            });
            // De Verbruik-standen worden door laadMetingen geladen (zodat ook de
            // volledigheids-markering klopt); hier niet nogmaals laden.
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
            this._toonChecklistAuteur(d.auteur);
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
                if (res.ok) this._toonChecklistAuteur(this._ingelogdeAuteur());
                else        this.app.ui.toonBericht('Fout bij opslaan checklist.', 'fout');
            } catch (e) { this.app.ui.setAutoSaveStatus('error'); }
        }, 1200);
    }

    /** Toon "Ingevuld door X" onder de checklijst, of leeg als onbekend. */
    _toonChecklistAuteur(auteur) {
        const el = document.getElementById('checklist-auteur');
        if (el) el.textContent = auteur ? `Ingevuld door ${auteur}` : '';
    }

    async _laadCoordDaggegevens(datum) {
        if (!datum) return;
        try {
            const res = await this.app.api.call(`/api/coordinatoren/daggegevens?datum=${datum}`);
            const d   = await res.json();
            document.getElementById('coord-lucht-temp').value        = d.lucht_temperatuur ?? '';
            document.getElementById('coord-bezoekers-vandaag').value = d.bezoekers_vandaag ?? '';
            this._toonDaggegevensAuteur(d.auteur);
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
                if (res.ok) this._toonDaggegevensAuteur(this._ingelogdeAuteur());
                else        this.app.ui.toonBericht('Fout bij opslaan daggegevens.', 'fout');
            } catch (e) { this.app.ui.setAutoSaveStatus('error'); }
        }, 1200);
    }

    /** Toon "Ingevuld door X" onder de temperatuur & bezoekers, of leeg als onbekend. */
    _toonDaggegevensAuteur(auteur) {
        const el = document.getElementById('daggegevens-auteur');
        if (el) el.textContent = auteur ? `Ingevuld door ${auteur}` : '';
    }

    /** Weergavenaam van de ingelogde gebruiker (voor de directe auteur-update na opslaan). */
    _ingelogdeAuteur() {
        const g = this.app.state.ingelogdeGebruiker;
        return g ? ([g.voornaam, g.achternaam].filter(Boolean).join(' ').trim() || g.inlognaam) : '';
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
        if (!(await this.app.ui.bevestig({ tekst: `Meetblok ${String(tijdstip).slice(0, 5)} verwijderen?`, bevestig: 'Verwijderen', gevaar: true }))) return;
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

// Node/Jest: exporteer de klasse zodat hij in jsdom-tests gebruikt kan worden.
// In de browser bestaat `module` niet en wordt dit genegeerd.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetingenModule;
}
