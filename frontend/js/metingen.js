/**
 * Switch between the large pools and the toddler pool pages.
 * @param {string} pagina - The target page identifier ('grote-baden' or 'peuterbad').
 */
function wisselBadPagina(pagina) {
        huidigeBadPagina = pagina;
        // Always hide coordinator elements — bouwTabelOp is skipped for logboek/acties pages
        ['coordinatoren-subtab-nav', 'coordinatoren-blokken-content',
         'coordinatoren-checklist-content', 'coordinatoren-daggegevens-content',
         'coordinatoren-logboek-content'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        ['grote-baden', 'peuterbad', 'logboek', 'acties'].forEach(p => {
            document.getElementById(`tab-${p}`)?.classList.toggle('actief', p === pagina);
        });
        document.getElementById('waterbeheer-grote-baden-content').style.display = (pagina === 'grote-baden') ? 'block' : 'none';
        document.getElementById('waterbeheer-peuterbad-content').style.display   = (pagina === 'peuterbad')   ? 'block' : 'none';
        document.getElementById('waterbeheer-logboek-content').style.display     = (pagina === 'logboek')     ? 'block' : 'none';
        document.getElementById('waterbeheer-acties-content').style.display      = (pagina === 'acties')      ? 'block' : 'none';
        document.getElementById('tables-content').style.display = 'none';
        laadMetingen();
    }

/**
 * Switch the active subtab within the waterbeheer page.
 * If the user switches to verbruik or verwarmingssysteem, reload the related fields.
 * @param {string} subtab - The subtab identifier to activate.
 */
function wisselSubtab(subtab) {
        huidigeSubtab = subtab;
        ['meetwaarden', 'verbruik', 'verwarmingssysteem', 'bezoekers'].forEach(s => {
            document.getElementById(`subtab-${s}`).classList.toggle('actief', s === subtab);
            document.getElementById(`subtab-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
        });
        if (subtab === 'verbruik' || subtab === 'verwarmingssysteem') {
            laadWaterbeheerVelden();
        }
        if (subtab === 'bezoekers') {
            laadBezoekers();
        }
    }

/**
 * Load the current measurement dataset for the selected date and render it into the UI.
 * Also refreshes actions and calculated consumption for waterbeheerder mode.
 */
async function laadMetingen() {
        const datum = document.getElementById('centraleDatum').value;
        if (!datum) return;

        // Logboek and Acties have their own loaders
        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'logboek') {
            laadLogboek(datum);
            return;
        }
        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'acties') {
            laadActies(datum);
            return;
        }

        const endpoint = (huidigeRol === 'waterbeheer') ? '/api/metingen' : '/api/coordinatoren';

        try {
            const response = await apiCall(`${endpoint}?datum=${datum}`);
            gecachteData = await response.json();
            bouwTabelOp(gecachteData);
            
            if (huidigeRol === 'waterbeheer') {
                await laadBezoekers();        // must complete first: generates bezoekers actions in DB
                laadActies(datum);            // fire-and-forget: now sees the up-to-date action state
                await laadEnBerekenVerbruik();
            }
        } catch (fout) { toonBericht('Fout bij het ophalen van de gegevens.', 'fout'); }
    }

// Base labels for every subtab (used when rebuilding badge text)
const SUBTAB_LABELS = {
    'meetwaarden':           'Meetwaarden',
    'verbruik':              'Verbruik',
    'verwarmingssysteem':    'Verwarmingssysteem',
    'bezoekers':             'Bezoekers',
    'peuterbad-meetwaarden': 'Meetwaarden',
    'peuterbad-verbruik':    'Verbruik',
};

// Which actie_type|bad_naam keys are relevant to each subtab
const SUBTAB_ACTIE_MAP = {
    'meetwaarden':           ['filter_spoelen_druk|Diep',      'filter_spoelen_druk|Ondiep',
                              'filter_spoelen_flow|Diep',      'filter_spoelen_flow|Ondiep'],
    'verbruik':              ['chloor_bestellen|Diep',         'zwavelzuur_bestellen|Diep'],
    'verwarmingssysteem':    [],
    'bezoekers':             ['filter_spoelen_bezoekers|Diep',   'filter_spoelen_bezoekers|Ondiep',
                              'filter_spoelen_spoelbeurt|Diep', 'filter_spoelen_spoelbeurt|Ondiep'],
    'peuterbad-meetwaarden': ['filter_spoelen_druk|Peuterbad', 'filter_spoelen_flow|Peuterbad'],
    'peuterbad-verbruik':    [],
};

/**
 * Update subtab button labels with action counts, mirroring the main Acties tab badge logic.
 */
function updateSubtabBadges(open, gesloten) {
    Object.entries(SUBTAB_ACTIE_MAP).forEach(([subtab, sleutels]) => {
        const btn = document.getElementById(`subtab-${subtab}`);
        if (!btn) return;
        const label = SUBTAB_LABELS[subtab] || subtab;
        if (!sleutels.length) {
            btn.textContent = label;
            btn.classList.remove('subtab-heeft-acties');
            return;
        }
        const nOpen   = open.filter(a => sleutels.includes(`${a.actie_type}|${a.bad_naam}`)).length;
        const nTotaal = nOpen + gesloten.filter(a => sleutels.includes(`${a.actie_type}|${a.bad_naam}`)).length;
        btn.classList.toggle('subtab-heeft-acties', nOpen > 0);
        if (nOpen > 0)        btn.textContent = `${label} ⚠ (${nOpen})`;
        else if (nTotaal > 0) btn.textContent = `${label} ✓`;
        else                  btn.textContent = label;
    });
}

/**
 * Fetch today's visitor count from the coordinator and update the Bezoekers tab display.
 * Also triggers the bezoekers action check on the backend.
 */
async function laadBezoekers() {
    const datum = document.getElementById('centraleDatum').value;
    if (!datum) return;
    try {
        const res = await apiCall(`/api/bezoekers?datum=${datum}`);
        const data = await res.json();
        const el = document.getElementById('bezoekers-vandaag-display');
        if (el) el.value = data.bezoekers_vandaag ?? '';
        const elDiep = document.getElementById('bezoekers-spoelbeurt-diep-display');
        if (elDiep) elDiep.value = data.bezoekers_totaal_diep ?? '';
        const elOndiep = document.getElementById('bezoekers-spoelbeurt-ondiep-display');
        if (elOndiep) elOndiep.value = data.bezoekers_totaal_ondiep ?? '';
    } catch (fout) { console.error('Fout bij laden bezoekers:', fout); }
}

// Mapping from actie_type|bad_naam to input element IDs for field indicators
const ACTIE_VELD_MAP = {
    'filter_spoelen_druk|Diep':         ['filter-in-diep',     'filter-uit-diep'],
    'filter_spoelen_druk|Ondiep':       ['filter-in-ondiep',   'filter-uit-ondiep'],
    'filter_spoelen_druk|Peuterbad':    ['peuterbad-filterdruk'],
    'filter_spoelen_flow|Diep':         ['flow-diep'],
    'filter_spoelen_flow|Ondiep':       ['flow-ondiep'],
    'filter_spoelen_flow|Peuterbad':    ['peuterbad-flow'],
    'filter_spoelen_bezoekers|Diep':     ['bezoekers-vandaag-display'],
    'filter_spoelen_bezoekers|Ondiep':   ['bezoekers-vandaag-display'],
    'filter_spoelen_spoelbeurt|Diep':    ['bezoekers-spoelbeurt-diep-display'],
    'filter_spoelen_spoelbeurt|Ondiep':  ['bezoekers-spoelbeurt-ondiep-display'],
    'chloor_bestellen|Diep':             ['chemicalien-chloor'],
    'zwavelzuur_bestellen|Diep':        ['chemicalien-zwavelzuur'],
};

/**
 * Load acties for a date, update the tab badge, add field indicators,
 * and populate the Acties tab content.
 */
async function laadActies(datum) {
    try {
        const response = await apiCall(`/api/acties?datum=${datum}`);
        const acties = await response.json();

        if (!Array.isArray(acties)) return;
        const open     = acties.filter(a => !a.opgelost);
        const gesloten = acties.filter(a =>  a.opgelost);

        // ── Tab badge ────────────────────────────────────────────────────
        const totaal = acties.length;
        const tabBtn = document.getElementById('tab-acties');
        if (tabBtn) {
            if (totaal === 0)         tabBtn.textContent = 'Acties';
            else if (open.length > 0) tabBtn.textContent = `Acties (${open.length} ⚠ / ${totaal})`;
            else                      tabBtn.textContent = `Acties (${totaal} ✓)`;
            tabBtn.classList.toggle('acties-actief', open.length > 0);
        }

        // ── Main nav badge ───────────────────────────────────────────────
        const navBtn = document.getElementById('btn-rol-waterbeheer');
        if (navBtn) {
            navBtn.textContent = open.length > 0 ? `Waterbeheer ⚠ (${open.length})` : 'Waterbeheer';
            navBtn.classList.toggle('heeft-acties', open.length > 0);
        }

        // ── Subtab badges ────────────────────────────────────────────────
        updateSubtabBadges(open, gesloten);

        // ── Field indicators: ⚠ for open, ✓ for resolved ──────────────
        document.querySelectorAll('.actie-indicator').forEach(el => el.remove());
        open.forEach(actie => {
            const sleutel = `${actie.actie_type}|${actie.bad_naam}`;
            (ACTIE_VELD_MAP[sleutel] || []).forEach(inputId => {
                const input = document.getElementById(inputId);
                if (!input) return;
                const indicator = document.createElement('span');
                indicator.className = 'actie-indicator';
                indicator.title = actie.beschrijving;
                indicator.textContent = '⚠';
                input.parentElement.appendChild(indicator);
            });
        });
        gesloten.forEach(actie => {
            const sleutel = `${actie.actie_type}|${actie.bad_naam}`;
            (ACTIE_VELD_MAP[sleutel] || []).forEach(inputId => {
                const input = document.getElementById(inputId);
                if (!input) return;
                const indicator = document.createElement('span');
                indicator.className = 'actie-indicator actie-indicator-opgelost';
                const tijdstip = actie.opgelost_op ? String(actie.opgelost_op).slice(0, 16).replace('T', ' ') : '';
                const door = actie.opgelost_door ? ` door ${actie.opgelost_door}` : '';
                indicator.title = `Afgehandeld${door}${tijdstip ? ' om ' + tijdstip : ''}`;
                indicator.textContent = '✓';
                input.parentElement.appendChild(indicator);
            });
        });

        // ── Tab content ─────────────────────────────────────────────────
        const inhoud = document.getElementById('acties-tab-inhoud');
        if (!inhoud) return;

        // Split "reden — actie" on the last occurrence of ' — '
        const splitBeschrijving = b => {
            const idx = b.lastIndexOf(' — ');
            return idx === -1
                ? { reden: b, actie: '' }
                : { reden: b.slice(0, idx), actie: b.slice(idx + 3) };
        };

        // Group filter_spoelen_* actions per pool into one combined row
        const groepSleutel = a =>
            `${a.bad_naam}|${a.actie_type.startsWith('filter_spoelen') ? 'filter_spoelen' : a.actie_type}`;

        const actieGroepen = new Map();
        acties.forEach(a => {
            const k = groepSleutel(a);
            if (!actieGroepen.has(k)) actieGroepen.set(k, { bad_naam: a.bad_naam, items: [] });
            actieGroepen.get(k).items.push(a);
        });

        const rijGroep = groep => {
            const alleOpgelost = groep.items.every(a => a.opgelost);
            const ids = groep.items.map(a => a.id);
            const { actie } = splitBeschrijving(groep.items[0].beschrijving);
            const reden = groep.items.map(a => splitBeschrijving(a.beschrijving).reden).join('<br>');

            if (!alleOpgelost) {
                return `
                <tr>
                    <td><b>${groep.bad_naam}</b></td>
                    <td><b>${actie}</b></td>
                    <td>${reden}</td>
                    <td style="text-align:center;">
                        <input type="checkbox" onchange="losActieGroepOp(${JSON.stringify(ids)}, this.checked)"
                            style="width:18px; height:18px; cursor:pointer;">
                    </td>
                </tr>`;
            }
            const latest = groep.items.reduce((a, b) =>
                (String(a.opgelost_op) > String(b.opgelost_op)) ? a : b);
            const tijdstip = latest.opgelost_op ? String(latest.opgelost_op).slice(0, 16).replace('T', ' ') : '';
            const door = latest.opgelost_door ? ` door ${latest.opgelost_door}` : '';
            return `
            <tr style="background:#f0fff0; color:#555;">
                <td><b>${groep.bad_naam}</b></td>
                <td>
                    <span style="text-decoration:line-through;"><b>${actie}</b></span>
                    <span style="font-size:12px; color:#28a745; display:block;">✓ Afgehandeld${door}${tijdstip ? ' om ' + tijdstip : ''}</span>
                </td>
                <td><span style="text-decoration:line-through;">${reden}</span></td>
                <td style="text-align:center;">
                    <input type="checkbox" checked onchange="losActieGroepOp(${JSON.stringify(ids)}, this.checked)"
                        title="Vink uit om actie te heropenen"
                        style="width:18px; height:18px; cursor:pointer;">
                </td>
            </tr>`;
        };

        const openGroepen    = [...actieGroepen.values()].filter(g => !g.items.every(a => a.opgelost));
        const geslotenGroepen = [...actieGroepen.values()].filter(g =>  g.items.every(a => a.opgelost));

        if (acties.length === 0) {
            inhoud.innerHTML = `<div class="categorie-box" style="color:#28a745; font-weight:bold;">
                ✓ Geen openstaande acties voor deze dag.</div>`;
            return;
        }

        inhoud.innerHTML = `
            <div class="categorie-box">
                <h3 style="color:${openGroepen.length > 0 ? '#dc3545' : '#28a745'};">
                    ${openGroepen.length > 0 ? `Openstaande acties (${openGroepen.length})` : '✓ Alle acties afgehandeld'}
                </h3>
                <table class="categorie-tabel">
                    <thead><tr><th>Bad</th><th>Actie</th><th>Reden</th><th style="text-align:center; width:110px;">Uitgevoerd</th></tr></thead>
                    <tbody>
                        ${openGroepen.map(rijGroep).join('')}
                        ${geslotenGroepen.map(rijGroep).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (fout) { console.error('Fout bij laden acties:', fout); }
}

/**
 * Resolve or reopen all actions in a grouped row, then refresh the acties view.
 */
async function losActieGroepOp(ids, opgelost) {
    try {
        const endpoint = opgelost ? 'resolve' : 'unresolve';
        await Promise.all(ids.map(id => apiCall(`/api/acties/${id}/${endpoint}`, { method: 'POST' })));
        const datum = document.getElementById('centraleDatum').value;
        await laadActies(datum);
        toonBericht(opgelost ? 'Actie gemarkeerd als opgelost!' : 'Actie heropend.', 'succes');
    } catch (fout) { console.error('Fout bij oplossen acties:', fout); }
}

/**
 * Mark an action as resolved or reopen it (undo), then refresh the acties view.
 */
async function losActieOp(actieId, opgelost) {
    try {
        const endpoint = opgelost
            ? `/api/acties/${actieId}/resolve`
            : `/api/acties/${actieId}/unresolve`;
        const response = await apiCall(endpoint, { method: 'POST' });
        if (response.ok) {
            const datum = document.getElementById('centraleDatum').value;
            await laadActies(datum);
            toonBericht(opgelost ? 'Actie gemarkeerd als opgelost!' : 'Actie heropend.', 'succes');
        }
    } catch (fout) { console.error('Fout bij oplossen actie:', fout); }
}

/**
 * Build and render the central measurement table based on the active role, page, and data.
 * @param {Array} data - The measurement data array received from the backend.
 */
function bouwTabelOp(data) {
        const categorieContent = document.getElementById('waterbeheer-grote-baden-content');
        const tabelContent = document.getElementById('tables-content');
        const tKop = document.getElementById('tabelKop');
        const tBody = document.getElementById('dagstaatTbody');
        tKop.innerHTML = ''; tBody.innerHTML = '';

        // Always reset role-specific elements before deciding what to show
        document.getElementById('waterbeheer-logboek-content').style.display = 'none';
        document.getElementById('waterbeheer-acties-content').style.display = 'none';
        document.getElementById('coordinatoren-subtab-nav').style.display = 'none';
        document.getElementById('coordinatoren-blokken-content').style.display = 'none';
        document.getElementById('coordinatoren-checklist-content').style.display = 'none';
        document.getElementById('coordinatoren-daggegevens-content').style.display = 'none';
        document.getElementById('coordinatoren-logboek-content').style.display = 'none';

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden') {
            categorieContent.style.display = 'block';
            document.getElementById('waterbeheer-peuterbad-content').style.display = 'none';
            tabelContent.style.display = 'none';

            // Toon het actieve subtab
            ['meetwaarden', 'verbruik', 'verwarmingssysteem', 'bezoekers'].forEach(s => {
                document.getElementById(`subtab-${s}`).classList.toggle('actief', s === huidigeSubtab);
                document.getElementById(`subtab-${s}-content`).style.display = (s === huidigeSubtab) ? 'block' : 'none';
            });

            // Meetwaarden velden altijd leegmaken en opnieuw vullen
            ['diep', 'ondiep'].forEach(b => {
                ['ph', 'chloor', 'temp', 'flow'].forEach(f => { document.getElementById(`${f}-${b}`).value = ''; });
                ['filter-in', 'filter-uit'].forEach(f => { document.getElementById(`${f}-${b}`).value = ''; });
            });
            ['Diep', 'Ondiep'].forEach(bad => {
                const meting = Array.isArray(data) ? data.find(m => m.bad_naam === bad) : null;
                const lowerBad = bad.toLowerCase();
                zetInputValue(`ph-${lowerBad}`, meting?.ph_waarde ?? '');
                zetInputValue(`chloor-${lowerBad}`, meting?.chloor_waarde ?? '');
                zetInputValue(`temp-${lowerBad}`, meting?.temperatuur ?? '');
                zetInputValue(`flow-${lowerBad}`, meting?.flow ?? '');
                zetInputValue(`filter-in-${lowerBad}`, meting?.filter_druk_in ?? '');
                zetInputValue(`filter-uit-${lowerBad}`, meting?.filter_druk_uit ?? '');
            });

            if (huidigeSubtab === 'verbruik' || huidigeSubtab === 'verwarmingssysteem') {
                laadWaterbeheerVelden();
            }
            return;
        }

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'peuterbad') {
            categorieContent.style.display = 'none';
            document.getElementById('waterbeheer-peuterbad-content').style.display = 'block';
            tabelContent.style.display = 'none';

            // Eerst alle velden leeghalen
            ['peuterbad-ph', 'peuterbad-chloor', 'peuterbad-filterdruk', 'peuterbad-flow',
             'peuterbad-water', 'peuterbad-chemicalien-chloor', 'peuterbad-chemicalien-zwavelzuur'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            const meting = Array.isArray(data) ? data.find(m => m.bad_naam === 'Peuterbad') : null;
            zetInputValue('peuterbad-ph', meting?.ph_waarde ?? '');
            zetInputValue('peuterbad-chloor', meting?.chloor_waarde ?? '');
            zetInputValue('peuterbad-filterdruk', meting?.filter_druk ?? meting?.filter_druk_in ?? '');
            zetInputValue('peuterbad-flow', meting?.flow ?? '');
            zetInputValue('peuterbad-water', meting?.water ?? '');
            zetInputValue('peuterbad-chemicalien-chloor', meting?.chemicalien_chloor ?? '');
            zetInputValue('peuterbad-chemicalien-zwavelzuur', meting?.chemicalien_zwavelzuur ?? '');
            wisselPeuterbadSubtab(huidigePeuterbadSubtab);
            return;
        }

        categorieContent.style.display = 'none';
        document.getElementById('waterbeheer-peuterbad-content').style.display = 'none';
        tabelContent.style.display = 'none';

        if (huidigeRol === 'coordinatoren') {
            // Show subtab navigation
            document.getElementById('coordinatoren-subtab-nav').style.display = '';

            // Always render the measurement blocks (hidden when checklist tab is active)
            const blokkContainer = document.getElementById('coordinatoren-blokken-content');
            blokkContainer.innerHTML = '';
            const blokken = Array.isArray(data) ? data : [];
            blokken.forEach(blok => blokkContainer.appendChild(maakBlokElement(blok.tijdstip, blok.metingen, blok.auteur || '')));
            const btnRij = document.createElement('div');
            btnRij.className = 'actie-container';
            btnRij.style.cssText = 'justify-content:flex-start; margin-top:12px;';
            btnRij.innerHTML = `<button class="btn-centraal-opslaan" onclick="voegNieuwBlokToe()">+ Nieuw blok toevoegen</button>`;
            blokkContainer.appendChild(btnRij);

            // Show the correct subtab (also loads checklist data when on checklist tab)
            wisselCoordSubtab(huidigeCoordSubtab);
            return;
        }

        tabelContent.style.display = 'block';
        if (huidigeRol === 'waterbeheer') {
            if (huidigeBadPagina === 'grote-baden') {
                tKop.innerHTML = `<tr><th>Bad</th><th>pH</th><th>Chloor (mg/l)</th><th>Flow (m³/h)</th><th>Filterdruk (bar)</th></tr>`;
                ['Diep', 'Ondiep'].forEach(bad => {
                    const meting = Array.isArray(data) ? data.find(m => m.bad_naam === bad) : null;
                    tBody.innerHTML += genereerRijWaterbeheer(bad, meting || {}, false);
                });
            } else {
                tKop.innerHTML = `<tr><th>Bad</th><th>pH</th><th>Chloor (mg/l)</th></tr>`;
                const meting = Array.isArray(data) ? data.find(m => m.bad_naam === 'Peuterbad') : null;
                tBody.innerHTML += genereerRijWaterbeheer('Peuterbad', meting || {}, true);
            }
        }

        document.querySelectorAll('#dagstaatTbody input[type="number"]').forEach(input => {
            const param = input.getAttribute('data-param');
            if (param) valideerVeld(input, param);
        });
    }

/**
 * Generate an HTML row for a waterbeheerder measurement entry.
 * @param {string} badNaam - The pool name, e.g. 'Diep', 'Ondiep' or 'Peuterbad'.
 * @param {Object} meting - The measurement record for that pool.
 * @param {boolean} isPeuterbad - Whether the row is for the toddler pool.
 * @returns {string} The generated HTML row string.
 */
function genereerRijWaterbeheer(badNaam, meting, isPeuterbad) {
        const ph = meting.ph_waarde ?? ''; const chloor = meting.chloor_waarde ?? '';
        if (isPeuterbad) {
            return `<tr id="rij-${badNaam}" data-bad="${badNaam}"><td><b>${badNaam}</b></td>
                <td><input type="number" class="v-ph" step="0.01" value="${ph}" data-param="ph_waarde" oninput="valideerVeld(this, 'ph_waarde')"></td>
                <td><input type="number" class="v-chloor" step="0.01" value="${chloor}" data-param="chloor_waarde" oninput="valideerVeld(this, 'chloor_waarde')"></td></tr>`;
        } else {
            const flow = meting.flow ?? ''; const druk = meting.filter_druk ?? meting.filter_druk_in ?? '';
            const flowParam = badNaam === 'Diep' ? 'flow_diep' : 'flow_ondiep';
            return `<tr id="rij-${badNaam}" data-bad="${badNaam}"><td><b>${badNaam}</b></td>
                <td><input type="number" class="v-ph" step="0.01" value="${ph}" data-param="ph_waarde" oninput="valideerVeld(this, 'ph_waarde')"></td>
                <td><input type="number" class="v-chloor" step="0.01" value="${chloor}" data-param="chloor_waarde" oninput="valideerVeld(this, 'chloor_waarde')"></td>
                <td><input type="number" class="v-flow" value="${flow}" data-param="${flowParam}" oninput="valideerVeld(this, '${flowParam}')"></td>
                <td><input type="number" class="v-druk" step="0.01" value="${druk}" data-param="filter_druk" oninput="valideerVeld(this, 'filter_druk')"></td></tr>`;
        }
    }

/**
 * Generate an HTML row for a coordinator measurement entry.
 * Diep/Ondiep get a helderheid select; Peuterbad gets a bad_gebruikt checkbox.
 * @param {string} badNaam - The pool name to render.
 * @param {Object} meting  - The coordinator measurement record.
 * @returns {string} The generated HTML row string.
 */
function genereerRijCoordinatoren(badNaam, meting) {
    const ph     = meting.ph_waarde      ?? '';
    const vrij   = meting.chloor_vrij    ?? '';
    const totaal = meting.chloor_totaal  ?? '';
    const temp   = meting.watertemperatuur ?? '';

    const vNum = parseFloat(vrij), tNum = parseFloat(totaal);
    const gebonden = (!isNaN(vNum) && !isNaN(tNum)) ? (tNum - vNum).toFixed(2) : '';

    const chloorCellen = `
        <td data-label="Chloor Vrij (mg/l)"><input type="number" class="c-chloor-vrij"     step="0.01" value="${vrij}"     data-param="chloor_vrij"     oninput="valideerVeld(this, 'chloor_vrij')"></td>
        <td data-label="Chloor Totaal (mg/l)"><input type="number" class="c-chloor-totaal"   step="0.01" value="${totaal}"   data-param="chloor_totaal"   oninput="valideerVeld(this, 'chloor_totaal')"></td>
        <td data-label="Chloor Gebonden (mg/l)"><input type="number" class="c-chloor-gebonden" step="0.01" value="${gebonden}" data-param="chloor_gebonden" readonly
            style="background-color:#f0f0f0; cursor:not-allowed;" tabindex="-1"></td>`;

    const isPeuterbad = badNaam === 'Peuterbad';
    const extraCel = isPeuterbad
        ? `<td data-label="Gebruik"><label style="display:flex;align-items:center;gap:6px;">
               <input type="checkbox" class="c-gebruikt" ${meting.bad_gebruikt ? 'checked' : ''}> Gebruikt
           </label></td>`
        : `<td data-label="Helderheid"><select class="c-helder">
               <option value="Helder"       ${(meting.helderheid ?? 'Helder') === 'Helder'       ? 'selected' : ''}>Helder</option>
               <option value="Licht troebel"${(meting.helderheid ?? '')        === 'Licht troebel' ? 'selected' : ''}>Licht troebel</option>
               <option value="Troebel"      ${(meting.helderheid ?? '')        === 'Troebel'       ? 'selected' : ''}>Troebel</option>
           </select></td>`;

    return `<tr data-bad="${badNaam}">
        <td><b>${badNaam}</b></td>
        <td data-label="pH"><input type="number" class="c-ph" step="0.01" value="${ph}" data-param="ph_waarde" oninput="valideerVeld(this, 'ph_waarde')"></td>
        ${chloorCellen}
        <td data-label="Temp (°C)"><input type="number" class="c-temp" step="0.1" value="${temp}" data-param="watertemperatuur" oninput="valideerVeld(this, 'watertemperatuur')"></td>
        ${extraCel}
    </tr>`;
}

// ── Coördinatoren subtabs ─────────────────────────────────────────────────

let checklistAutoSaveTimer = null;

/**
 * Switch between Meetwaarden and Verbruik subtabs for the peuterbad view.
 * @param {string} subtab - 'meetwaarden' or 'verbruik'
 */
function wisselPeuterbadSubtab(subtab) {
    huidigePeuterbadSubtab = subtab;
    ['meetwaarden', 'verbruik'].forEach(s => {
        document.getElementById(`subtab-peuterbad-${s}`).classList.toggle('actief', s === subtab);
        document.getElementById(`peuterbad-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
    });
    if (subtab === 'verbruik') laadEnBerekenVerbruik();
}

/**
 * Switch between the Metingen and Checklijst subtabs for the coordinator view.
 * @param {string} subtab - 'metingen' or 'checklist'
 */
function wisselCoordSubtab(subtab) {
    huidigeCoordSubtab = subtab;
    ['metingen', 'checklist', 'daggegevens', 'logboek'].forEach(s => {
        document.getElementById(`subtab-coord-${s}`)?.classList.toggle('actief', s === subtab);
    });
    document.getElementById('coordinatoren-blokken-content').style.display    = subtab === 'metingen'    ? 'block' : 'none';
    document.getElementById('coordinatoren-checklist-content').style.display   = subtab === 'checklist'   ? 'block' : 'none';
    document.getElementById('coordinatoren-daggegevens-content').style.display = subtab === 'daggegevens' ? 'block' : 'none';
    document.getElementById('coordinatoren-logboek-content').style.display     = subtab === 'logboek'     ? 'block' : 'none';
    const datum = document.getElementById('centraleDatum').value;
    if (subtab === 'checklist')   laadCoordChecklist(datum);
    if (subtab === 'daggegevens') laadCoordDaggegevens(datum);
    if (subtab === 'logboek')     laadLogboek(datum, 'coordinatoren-logboek-blokken', '/api/coordinatoren/logboek');
}

/**
 * Load checklist data for a date and populate the checklist form.
 * Also wires up autosave and the character counter on the textarea.
 * @param {string} datum
 */
async function laadCoordChecklist(datum) {
    if (!datum) return;
    try {
        const res = await apiCall(`/api/coordinatoren/checklist?datum=${datum}`);
        const d = await res.json();
        document.getElementById('proef-waterspeel').checked = !!d.proef_waterspeel;
        document.getElementById('proef-spraypark').checked  = !!d.proef_spraypark;
        document.getElementById('proef-douches').checked    = !!d.proef_douches;
        document.getElementById('proef-glijbaan').checked   = !!d.proef_glijbaan;
    } catch (e) { console.error('Fout bij laden checklist:', e); }

    // Attach listeners once (guard against duplicate attachment)
    const form = document.getElementById('coordinatoren-checklist-content');
    if (form.dataset.listenersAttached) return;
    form.dataset.listenersAttached = '1';

    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', e => { e.stopPropagation(); scheduleAutoSaveChecklist(); });
        cb.addEventListener('input',  e => { e.stopPropagation(); });
    });
}

/**
 * Debounce and save the checklist.
 */
function scheduleAutoSaveChecklist() {
    if (checklistAutoSaveTimer) clearTimeout(checklistAutoSaveTimer);
    setAutoSaveStatus('pending');
    checklistAutoSaveTimer = setTimeout(async () => {
        setAutoSaveStatus('saving');
        const datum = document.getElementById('centraleDatum').value;
        const payload = {
            datum,
            proef_waterspeel: document.getElementById('proef-waterspeel').checked ? 1 : 0,
            proef_spraypark:  document.getElementById('proef-spraypark').checked  ? 1 : 0,
            proef_douches:    document.getElementById('proef-douches').checked    ? 1 : 0,
            proef_glijbaan:   document.getElementById('proef-glijbaan').checked   ? 1 : 0,
        };
        try {
            const res = await apiCall('/api/coordinatoren/checklist', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
            });
            setAutoSaveStatus(res.ok ? 'saved' : 'error');
            if (!res.ok) toonBericht('Fout bij opslaan checklist.', 'fout');
        } catch (e) { console.error(e); setAutoSaveStatus('error'); }
    }, 1200);
}

// ── Coördinatoren daggegevens ─────────────────────────────────────────────

let daggegevensAutoSaveTimer = null;

/**
 * Load daggegevens for a date and populate the form.
 * @param {string} datum
 */
async function laadCoordDaggegevens(datum) {
    if (!datum) return;
    try {
        const res = await apiCall(`/api/coordinatoren/daggegevens?datum=${datum}`);
        const d = await res.json();
        document.getElementById('coord-lucht-temp').value        = d.lucht_temperatuur ?? '';
        document.getElementById('coord-bezoekers-vandaag').value = d.bezoekers_vandaag ?? '';
    } catch (e) { console.error('Fout bij laden daggegevens:', e); }

    const form = document.getElementById('coordinatoren-daggegevens-content');
    if (form.dataset.listenersAttached) return;
    form.dataset.listenersAttached = '1';

    form.querySelectorAll('input').forEach(input => {
        input.addEventListener('input',  e => { e.stopPropagation(); scheduleAutoSaveDaggegevens(); });
        input.addEventListener('change', e => { e.stopPropagation(); scheduleAutoSaveDaggegevens(); });
    });
}

/**
 * Debounce and save daggegevens.
 */
function scheduleAutoSaveDaggegevens() {
    if (daggegevensAutoSaveTimer) clearTimeout(daggegevensAutoSaveTimer);
    setAutoSaveStatus('pending');
    daggegevensAutoSaveTimer = setTimeout(async () => {
        setAutoSaveStatus('saving');
        const datum = document.getElementById('centraleDatum').value;
        const payload = {
            datum,
            lucht_temperatuur: parseFloat(document.getElementById('coord-lucht-temp').value)     || null,
            bezoekers_vandaag: parseInt(document.getElementById('coord-bezoekers-vandaag').value) || null,
        };
        try {
            const res = await apiCall('/api/coordinatoren/daggegevens', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
            });
            setAutoSaveStatus(res.ok ? 'saved' : 'error');
            if (!res.ok) toonBericht('Fout bij opslaan daggegevens.', 'fout');
        } catch (e) { console.error(e); setAutoSaveStatus('error'); }
    }, 1200);
}

/**
 * Build a coordinator measurement block element for a given tijdstip.
 * The time header is an editable input; all listeners read data-blok-tijdstip
 * dynamically so renaming the block keeps everything in sync.
 * @param {string} tijdstip - Time string in HH:MM:SS or HH:MM format.
 * @param {Array}  metingen - Array of pool measurement objects for this block.
 * @returns {HTMLElement}
 */
function maakBlokElement(tijdstip, metingen, auteur = '') {
    const displayTijd = String(tijdstip).slice(0, 5);
    const auteurLabel = auteur ? `<span style="font-size:13px; font-weight:normal; color:#888; margin-left:10px;">— ${auteur}</span>` : '';
    const el = document.createElement('div');
    el.className = 'categorie-box';
    el.setAttribute('data-blok-tijdstip', tijdstip);

    el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h3 style="margin:0; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                Meting
                <input type="time" class="blok-tijdstip-input" value="${displayTijd}"
                    style="font-size:inherit; font-weight:bold; border:none; border-bottom:1px solid #aaa;
                           background:transparent; cursor:text; padding:0 2px; color:inherit; width:auto;">
                ${auteurLabel}
            </h3>
            <button class="blok-verwijder-btn" style="background:#dc3545; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:13px;">Verwijderen</button>
        </div>
        <table class="categorie-tabel coord-tabel">
            <thead>
                <tr>
                    <th rowspan="2">Bad</th>
                    <th rowspan="2">pH</th>
                    <th colspan="3">Chloor (mg/l)</th>
                    <th rowspan="2">Temp (°C)</th>
                    <th rowspan="2">Helderheid / Gebruik</th>
                </tr>
                <tr>
                    <th>Vrij</th>
                    <th>Totaal</th>
                    <th>Gebonden</th>
                </tr>
            </thead>
            <tbody>
                ${['Diep', 'Ondiep', 'Peuterbad'].map(bad => {
                    const m = (metingen || []).find(r => r.bad_naam === bad) || {};
                    return genereerRijCoordinatoren(bad, m);
                }).join('')}
            </tbody>
        </table>`;

    // Delete button reads tijdstip from element at click time
    el.querySelector('.blok-verwijder-btn').addEventListener('click', () => {
        verwijderBlok(el.getAttribute('data-blok-tijdstip'));
    });

    // Time input: rename the block when the user changes the time
    el.querySelector('.blok-tijdstip-input').addEventListener('change', async (e) => {
        e.stopPropagation();
        const nieuwTijd = e.target.value;
        if (!nieuwTijd) return;
        const nieuwTijdstip = nieuwTijd + ':00';
        const oudTijdstip   = el.getAttribute('data-blok-tijdstip');
        if (nieuwTijdstip === oudTijdstip) return;

        // Prevent duplicate block at the new time
        const blokkContainer = document.getElementById('coordinatoren-blokken-content');
        if (blokkContainer.querySelector(`[data-blok-tijdstip="${nieuwTijdstip}"]`)) {
            toonBericht('Er bestaat al een blok voor dit tijdstip.', 'fout');
            e.target.value = oudTijdstip.slice(0, 5);
            return;
        }

        // Delete old DB record (no-op/404 if block was never saved)
        const datum = document.getElementById('centraleDatum').value;
        try {
            await apiCall(`/api/coordinatoren?datum=${datum}&tijdstip=${encodeURIComponent(oudTijdstip)}`, { method: 'DELETE' });
        } catch (err) { /* ignore */ }

        // Re-key the element and save under the new time
        el.setAttribute('data-blok-tijdstip', nieuwTijdstip);
        scheduleAutoSaveBlok(nieuwTijdstip);
    });

    // Data inputs read tijdstip from element at event time, not from closure
    el.querySelectorAll('input:not(.blok-tijdstip-input):not(.c-chloor-gebonden), select').forEach(input => {
        input.addEventListener('input',  () => scheduleAutoSaveBlok(el.getAttribute('data-blok-tijdstip')));
        input.addEventListener('change', () => scheduleAutoSaveBlok(el.getAttribute('data-blok-tijdstip')));
    });

    // Recalculate gebonden = totaal - vrij whenever vrij or totaal changes
    el.querySelectorAll('.c-chloor-vrij, .c-chloor-totaal').forEach(input => {
        input.addEventListener('input', () => {
            const rij      = input.closest('tr');
            const v = parseFloat(rij.querySelector('.c-chloor-vrij')?.value);
            const t = parseFloat(rij.querySelector('.c-chloor-totaal')?.value);
            const gebEl = rij.querySelector('.c-chloor-gebonden');
            gebEl.value = (!isNaN(v) && !isNaN(t)) ? (t - v).toFixed(2) : '';
            if (gebEl.value !== '') valideerVeld(gebEl, 'chloor_gebonden');
        });
    });

    // Initial validation pass
    el.querySelectorAll('input[type="number"]').forEach(input => {
        const param = input.getAttribute('data-param');
        if (param && input.value !== '') valideerVeld(input, param);
    });

    return el;
}

/**
 * Delete a coordinator measurement block after confirmation.
 * Unsaved (new) blocks are removed from the DOM only; saved blocks are also deleted on the server.
 * @param {string} tijdstip - The block's time key (HH:MM:SS).
 */
async function verwijderBlok(tijdstip) {
    if (!confirm(`Blok ${String(tijdstip).slice(0, 5)} verwijderen?`)) return;
    const datum = document.getElementById('centraleDatum').value;
    try {
        const res = await apiCall(`/api/coordinatoren?datum=${datum}&tijdstip=${encodeURIComponent(tijdstip)}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) {
            const e = await res.json().catch(() => null);
            toonBericht(e?.error || 'Fout bij verwijderen.', 'fout');
            return;
        }
        // 404 means block was never saved to DB — still safe to remove from DOM
    } catch (e) { console.error(e); toonBericht('Verbindingsfout bij verwijderen.', 'fout'); return; }
    const el = document.querySelector(`[data-blok-tijdstip="${tijdstip}"]`);
    if (el) el.remove();
    setAutoSaveStatus('saved');
}

/**
 * Add a new empty measurement block for the current time.
 */
function voegNieuwBlokToe() {
    const now = new Date();
    const tijdstip = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    const blokkContainer = document.getElementById('coordinatoren-blokken-content');
    if (blokkContainer.querySelector(`[data-blok-tijdstip="${tijdstip}"]`)) {
        toonBericht('Er bestaat al een blok voor dit tijdstip.', 'fout');
        return;
    }
    const btnRij = blokkContainer.lastElementChild;
    const auteur = ingelogdeGebruiker
        ? [ingelogdeGebruiker.voornaam, ingelogdeGebruiker.achternaam].filter(Boolean).join(' ').trim() || ingelogdeGebruiker.inlognaam
        : '';
    blokkContainer.insertBefore(maakBlokElement(tijdstip, [], auteur), btnRij);
}
