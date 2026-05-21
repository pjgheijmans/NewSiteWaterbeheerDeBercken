function wisselBadPagina(pagina) {
        huidigeBadPagina = pagina;
        document.getElementById('tab-grote-baden').classList.toggle('actief', pagina === 'grote-baden');
        document.getElementById('tab-peuterbad').classList.toggle('actief', pagina === 'peuterbad');
        document.getElementById('waterbeheer-grote-baden-content').style.display = (pagina === 'grote-baden') ? 'block' : 'none';
        document.getElementById('waterbeheer-peuterbad-content').style.display = (pagina === 'peuterbad') ? 'block' : 'none';
        document.getElementById('tables-content').style.display = 'none';
        laadMetingen();
    }

function wisselSubtab(subtab) {
        huidigeSubtab = subtab;
        ['meetwaarden', 'verbruik', 'verwarmingssysteem'].forEach(s => {
            document.getElementById(`subtab-${s}`).classList.toggle('actief', s === subtab);
            document.getElementById(`subtab-${s}-content`).style.display = (s === subtab) ? 'block' : 'none';
        });
        if (subtab === 'verbruik' || subtab === 'verwarmingssysteem') {
            laadWaterbeheerVelden();
        }
    }

async function laadMetingen() {
        const datum = document.getElementById('centraleDatum').value;
        if (!datum) return;
        const endpoint = (huidigeRol === 'waterbeheer') ? '/api/metingen' : '/api/coordinatoren';

        try {
            const response = await apiCall(`${endpoint}?datum=${datum}`);
            gecachteData = await response.json();
            bouwTabelOp(gecachteData);
            
            if (huidigeRol === 'waterbeheer') {
                laadActies(datum);
                await laadEnBerekenVerbruik();
            }
        } catch (fout) { toonBericht('Fout bij het ophalen van de gegevens.', 'fout'); }
    }

async function laadActies(datum) {
        try {
            const response = await apiCall(`/api/acties?datum=${datum}`);
            const acties = await response.json();
            if (acties.length > 0) {
                document.getElementById('acties-paneel').style.display = 'block';
                const tbody = document.getElementById('acties-tbody');
                tbody.innerHTML = acties.map(actie => `
                    <tr style="background: white; border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px;">${actie.bad_naam}</td>
                        <td style="padding: 10px;">${actie.beschrijving}</td>
                        <td style="padding: 10px; text-align: center;">
                            <input type="checkbox" onchange="losActieOp(${actie.id}, this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
                        </td>
                    </tr>
                `).join('');
            } else {
                document.getElementById('acties-paneel').style.display = 'none';
            }
        } catch (fout) { console.error('Fout bij laden acties:', fout); }
    }

async function losActieOp(actieId, opgelost) {
        if (!opgelost) return;
        try {
            const response = await apiCall(`/api/acties/${actieId}/resolve`, { method: 'POST' });
            if (response.ok) {
                const datum = document.getElementById('centraleDatum').value;
                laadActies(datum);
                toonBericht('Actie gemarkeerd als opgelost!', 'succes');
            }
        } catch (fout) { console.error('Fout bij oplossen actie:', fout); }
    }

function bouwTabelOp(data) {
        const categorieContent = document.getElementById('waterbeheer-grote-baden-content');
        const tabelContent = document.getElementById('tables-content');
        const tKop = document.getElementById('tabelKop');
        const tBody = document.getElementById('dagstaatTbody');
        tKop.innerHTML = ''; tBody.innerHTML = '';

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden') {
            categorieContent.style.display = 'block';
            document.getElementById('waterbeheer-peuterbad-content').style.display = 'none';
            tabelContent.style.display = 'none';

            // Toon het actieve subtab
            ['meetwaarden', 'verbruik', 'verwarmingssysteem'].forEach(s => {
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
            return;
        }

        categorieContent.style.display = 'none';
        document.getElementById('waterbeheer-peuterbad-content').style.display = 'none';
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
        } else if (huidigeRol === 'coordinatoren') {
            tKop.innerHTML = `<tr><th>Bad</th><th>pH</th><th>Chloor (mg/l)</th><th>Temp (°C)</th><th>Helderheid</th></tr>`;
            ['Diep', 'Ondiep', 'Peuterbad'].forEach(bad => {
                const meting = Array.isArray(data) ? data.find(m => m.bad_naam === bad) : null;
                tBody.innerHTML += genereerRijCoordinatoren(bad, meting || {});
            });
        }

        document.querySelectorAll('#dagstaatTbody input[type="number"]').forEach(input => {
            const param = input.getAttribute('data-param');
            if (param) valideerVeld(input, param);
        });
    }

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

function genereerRijCoordinatoren(badNaam, meting) {
        const ph = meting.ph_waarde ?? ''; const chloor = meting.chloor_waarde ?? '';
        const temp = meting.watertemperatuur ?? ''; const helderheid = meting.helderheid ?? 'Helder';
        return `<tr id="rij-${badNaam}" data-bad="${badNaam}"><td><b>${badNaam}</b></td>
            <td><input type="number" class="c-ph" step="0.01" value="${ph}" data-param="ph_waarde" oninput="valideerVeld(this, 'ph_waarde')"></td>
            <td><input type="number" class="c-chloor" step="0.01" value="${chloor}" data-param="chloor_waarde" oninput="valideerVeld(this, 'chloor_waarde')"></td>
            <td><input type="number" class="c-temp" step="0.1" value="${temp}" data-param="watertemperatuur" oninput="valideerVeld(this, 'watertemperatuur')"></td>
            <td><select class="c-helder"><option value="Helder" ${helderheid === 'Helder' ? 'selected' : ''}>Helder</option><option value="Licht troebel" ${helderheid === 'Licht troebel' ? 'selected' : ''}>Licht troebel</option><option value="Troebel" ${helderheid === 'Troebel' ? 'selected' : ''}>Troebel</option></select></td></tr>`;
    }
