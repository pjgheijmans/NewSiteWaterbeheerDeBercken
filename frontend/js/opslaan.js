async function verwerkCentraleOpslaan() {
        toonBericht('Gegevens verwerken...', '');
        const datum = document.getElementById('centraleDatum').value;

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden' && huidigeSubtab !== 'meetwaarden') {
            const algemeenOpgeslagen = await slaAlgemeenGegevensOp();
            if (algemeenOpgeslagen) {
                toonBericht('Gegevens succesvol opgeslagen!', 'succes');
                laadMetingen();
            } else {
                toonBericht('Fout bij opslaan.', 'fout');
            }
            return;
        }

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden') {
            const baden = ['Diep', 'Ondiep'];
            let succesTeller = 0;
            let legeVelden = false;
            let foutberichten = [];

            for (const bad of baden) {
                const lowerBad = bad.toLowerCase();
                const phEl = document.getElementById(`ph-${lowerBad}`);
                const chloorEl = document.getElementById(`chloor-${lowerBad}`);
                const payload = {
                    datum: datum,
                    bad_naam: bad,
                    ph_waarde: parseNumberValue(`ph-${lowerBad}`),
                    chloor_waarde: parseNumberValue(`chloor-${lowerBad}`),
                    temperatuur: parseNumberValue(`temp-${lowerBad}`),
                    flow: parseNumberValue(`flow-${lowerBad}`),
                    filter_druk_in: parseNumberValue(`filter-in-${lowerBad}`),
                    filter_druk_uit: parseNumberValue(`filter-uit-${lowerBad}`)
                };
                payload.filter_druk = payload.filter_druk_in ?? payload.filter_druk_uit ?? 0;

                if (!phEl.value || !chloorEl.value) { legeVelden = true; }

                try {
                    const response = await apiCall('/api/metingen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        succesTeller++;
                    } else {
                        const errorData = await response.json().catch(() => null);
                        foutberichten.push(`${bad}: ${errorData?.error || response.statusText}`);
                    }
                } catch (fout) {
                    console.error(fout);
                    foutberichten.push(`${bad}: ${fout.message || 'Netwerkfout'}`);
                }
            }

            if (succesTeller === baden.length) {
                if (legeVelden) { toonBericht('Opgeslagen met waarschuwing: Niet alle velden waren ingevuld.', 'fout'); }
                else { toonBericht('Waterbeheer gegevens succesvol opgeslagen!', 'succes'); }
                laadMetingen();
            } else {
                const boodschap = foutberichten.length > 0 ? foutberichten.join(' | ') : 'Niet alle gegevens konden worden opgeslagen.';
                toonBericht(boodschap, 'fout');
            }
            return;
        }

        if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'peuterbad') {
            const phEl = document.getElementById('peuterbad-ph');
            const chloorEl = document.getElementById('peuterbad-chloor');
            const payload = {
                datum: datum,
                bad_naam: 'Peuterbad',
                ph_waarde: parseNumberValue('peuterbad-ph'),
                chloor_waarde: parseNumberValue('peuterbad-chloor'),
                flow: parseNumberValue('peuterbad-flow'),
                filter_druk: parseNumberValue('peuterbad-filterdruk'),
                water: document.getElementById('peuterbad-water').value,
                chemicalien_chloor: document.getElementById('peuterbad-chemicalien-chloor').value,
                chemicalien_zwavelzuur: document.getElementById('peuterbad-chemicalien-zwavelzuur').value
            };

            let legeVelden = false;
            if (!phEl.value || !chloorEl.value) { legeVelden = true; }

            try {
                const response = await apiCall('/api/metingen', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    if (legeVelden) { toonBericht('Opgeslagen met waarschuwing: Niet alle velden waren ingevuld.', 'fout'); }
                    else { toonBericht('Waterbeheer gegevens succesvol opgeslagen!', 'succes'); }
                    laadMetingen();
                } else {
                    const errorData = await response.json().catch(() => null);
                    toonBericht(errorData?.error || 'Niet alle gegevens konden worden opgeslagen.', 'fout');
                }
            } catch (fout) {
                console.error(fout);
                toonBericht('Niet alle gegevens konden worden opgeslagen.', 'fout');
            }
            return;
        }

        const rijen = document.querySelectorAll('#dagstaatTbody tr');
        let succesTeller = 0; let legeVelden = false;

        rijen.forEach(r => { r.querySelectorAll('input[type="number"]').forEach(i => { if (i.value.trim() === '') legeVelden = true; }); });

        for (const rij of rijen) {
            const badNaam = rij.getAttribute('data-bad');
            let payload = { datum: datum, bad_naam: badNaam };
            let url = (huidigeRol === 'waterbeheer') ? '/api/metingen' : '/api/coordinatoren';

            if (huidigeRol === 'waterbeheer') {
                payload.ph_waarde = rij.querySelector('.v-ph').value ? parseFloat(rij.querySelector('.v-ph').value) : null;
                payload.chloor_waarde = rij.querySelector('.v-chloor').value ? parseFloat(rij.querySelector('.v-chloor').value) : null;
                const f = rij.querySelector('.v-flow'); const d = rij.querySelector('.v-druk');
                payload.flow = f && f.value ? parseInt(f.value) : null;
                payload.filter_druk = d && d.value ? parseFloat(d.value) : null;
            } else {
                payload.ph_waarde = rij.querySelector('.c-ph').value ? parseFloat(rij.querySelector('.c-ph').value) : null;
                payload.chloor_waarde = rij.querySelector('.c-chloor').value ? parseFloat(rij.querySelector('.c-chloor').value) : null;
                payload.watertemperatuur = rij.querySelector('.c-temp').value ? parseFloat(rij.querySelector('.c-temp').value) : null;
                payload.helderheid = rij.querySelector('.c-helder').value;
            }

            try {
                const response = await apiCall(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (response.ok) succesTeller++;
            } catch (fout) { console.error(fout); }
        }

        if (succesTeller === rijen.length) {
            if (legeVelden) { toonBericht('Opgeslagen met waarschuwing: Niet alle velden waren ingevuld.', 'fout'); }
            else { toonBericht('Gegevens succesvol opgeslagen!', 'succes'); }
            laadMetingen();
        } else { toonBericht('Niet alle gegevens konden worden opgeslagen.', 'fout'); }
    }
