/**
 * Load general waterbeheer values for the selected date from the server.
 * Fetches both deep/shallows consumption and heating system values.
 */
async function laadWaterbeheerVelden() {
        const datum = document.getElementById('centraleDatum').value;
        try {
            const [verbruikRes, warmteRes] = await Promise.all([
                apiCall(`/api/verbruik/diep-ondiep?datum=${datum}`),
                apiCall(`/api/verbruik/verwarmingssysteem?datum=${datum}`)
            ]);
            const verbruikData = await verbruikRes.json();
            const warmteData = await warmteRes.json();
            const data = { ...verbruikData, ...warmteData };

            // Laad algemene velden van database — altijd schrijven zodat lege datums velden leegmaken
            document.getElementById('floculant').value = data.floculant || '';
            document.getElementById('water-diep').value = data.water_diep || '';
            document.getElementById('water-ondiep').value = data.water_ondiep || '';
            document.getElementById('water-totaal').value = data.water_totaal || '';
            document.getElementById('elektriciteit-nacht').value = data.elektriciteit_nacht || '';
            document.getElementById('elektriciteit-dag').value = data.elektriciteit_dag || '';
            document.getElementById('gas').value = data.gas || '';
            document.getElementById('chemicalien-chloor').value = data.chemicalien_chloor || '';
            document.getElementById('chemicalien-zwavelzuur').value = data.chemicalien_zwavelzuur || '';
            document.getElementById('systeem-status-1').checked = data.verwarming_status_1 === 1;
            document.getElementById('systeem-status-2').checked = data.verwarming_status_2 === 1;
            document.getElementById('systeem-status-3').checked = data.verwarming_status_3 === 1;
            document.getElementById('systeem-status-4').checked = data.verwarming_status_4 === 1;
            document.getElementById('systeem-druk-ok').checked = data.verwarming_druk_ok === 1;
            document.getElementById('visuele-inspectie').checked = data.verwarming_visuele_controle === 1;
        } catch (fout) {
            console.error('Fout bij laden algemene velden:', fout);
        }
    }

/**
 * Save the general verbruik and verwarmingssysteem values for the current date.
 * Sends two requests in parallel to the corresponding backend endpoints.
 * @returns {Promise<boolean>} True when both save requests succeed.
 */
async function slaAlgemeenGegevensOp() {
        const datum = document.getElementById('centraleDatum').value;
        const verbruikPayload = {
            datum: datum,
            floculant: document.getElementById('floculant').value || null,
            water_diep: parseNumberValue('water-diep'),
            water_ondiep: parseNumberValue('water-ondiep'),
            water_totaal: parseNumberValue('water-totaal'),
            elektriciteit_nacht: parseNumberValue('elektriciteit-nacht'),
            elektriciteit_dag: parseNumberValue('elektriciteit-dag'),
            gas: parseNumberValue('gas'),
            chemicalien_chloor: document.getElementById('chemicalien-chloor').value || null,
            chemicalien_zwavelzuur: document.getElementById('chemicalien-zwavelzuur').value || null
        };
        const verwarmingsPayload = {
            datum: datum,
            verwarming_status_1: document.getElementById('systeem-status-1').checked,
            verwarming_status_2: document.getElementById('systeem-status-2').checked,
            verwarming_status_3: document.getElementById('systeem-status-3').checked,
            verwarming_status_4: document.getElementById('systeem-status-4').checked,
            verwarming_druk_ok: document.getElementById('systeem-druk-ok').checked,
            verwarming_visuele_controle: document.getElementById('visuele-inspectie').checked
        };

        try {
            const [resVerbruik, resWarmte] = await Promise.all([
                apiCall('/api/verbruik/diep-ondiep', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(verbruikPayload)
                }),
                apiCall('/api/verbruik/verwarmingssysteem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(verwarmingsPayload)
                })
            ]);
            return resVerbruik.ok && resWarmte.ok;
        } catch (fout) {
            console.error('Fout bij opslaan algemene gegevens:', fout);
            return false;
        }
    }

/**
 * Load current and previous-day consumption values and calculate the usage deltas.
 * Updates the corresponding consumption input fields on the page.
 */
async function laadEnBerekenVerbruik() {
        const datum = document.getElementById('centraleDatum').value;
        if (!datum) return;

        try {
            const [huidigRes, vorigeRes] = await Promise.all([
                apiCall(`/api/verbruik/diep-ondiep?datum=${datum}`),
                apiCall(`/api/verbruik/diep-ondiep/vorige?datum=${datum}`)
            ]);
            const huidig = await huidigRes.json();
            const vorige = await vorigeRes.json();

            const berekenEnZet = (veldId, dbSleutel) => {
                const h = parseFloat(huidig[dbSleutel]);
                const v = parseFloat(vorige[dbSleutel]) || 0;
                const el = document.getElementById(`${veldId}-verbruik`);
                if (!el) return;
                if (isNaN(h)) { el.value = '-'; return; }
                const verbruik = Math.round(h) - Math.round(v);
                el.value = verbruik !== 0 ? String(verbruik) : '0';
            };

            berekenEnZet('water-diep', 'water_diep');
            berekenEnZet('water-ondiep', 'water_ondiep');
            berekenEnZet('water-totaal', 'water_totaal');
            berekenEnZet('elektriciteit-nacht', 'elektriciteit_nacht');
            berekenEnZet('elektriciteit-dag', 'elektriciteit_dag');
            berekenEnZet('gas', 'gas');
            berekenEnZet('floculant', 'floculant');
            berekenEnZet('chemicalien-chloor', 'chemicalien_chloor');
            berekenEnZet('chemicalien-zwavelzuur', 'chemicalien_zwavelzuur');
        } catch (fout) {
            console.error('Fout bij laden verbruik:', fout);
        }
    }
