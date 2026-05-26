let limietenAutoSaveTimer = null;

function setLimietenSaveStatus(status) {
    const el = document.getElementById('limietenSaveStatus');
    if (!el) return;
    const states = {
        pending: ['Wijzigingen niet opgeslagen...', '#888'],
        saving:  ['Bewaren…',                 '#fd7e14'],
        saved:   ['✓ Opgeslagen',             '#28a745'],
        error:   ['✕ Fout bij opslaan',       '#dc3545'],
    };
    const [text, color] = states[status] || ['', '#333'];
    el.textContent = text;
    el.style.color = color;
    if (status === 'saved') setTimeout(() => { if (el.textContent.startsWith('✓')) el.textContent = ''; }, 4000);
}

/**
 * Schedule a delayed save of limit values after the user stops editing.
 */
function scheduleAutoSaveLimieten() {
    if (limietenAutoSaveTimer) clearTimeout(limietenAutoSaveTimer);
    setLimietenSaveStatus('pending');
    limietenAutoSaveTimer = setTimeout(async () => {
        setLimietenSaveStatus('saving');
        await verwerkCentraleLimietenOpslaan(true);
    }, 1200);
}


const LIMIETEN_LABELS = {
    ph_waarde:             'pH',
    chloor_waarde:         'Chloor (mg/l)',
    watertemperatuur:      'Watertemperatuur (°C)',
    flow_diep:             'Flow Diep (m³/h)',
    flow_ondiep:           'Flow Ondiep (m³/h)',
    filter_druk_in:        'Filterdruk In (bar)',
    filter_druk_uit:       'Filterdruk Uit (bar)',
    flow_peuterbad:        'Flow (m³/h)',
    filter_druk_peuterbad: 'Filterdruk (bar)',
    elektriciteit_nacht:   'Elektriciteit Nacht (kWh)',
    elektriciteit_dag:     'Elektriciteit Dag (kWh)',
    gas:                   'Gas (m³)',
    water_diep:            'Water Diep (m³)',
    water_ondiep:          'Water Ondiep (m³)',
    water_totaal:          'Water Totaal (m³)',
    water_peuterbad:       'Water Peuterbad (m³)',
    chloor_vrij:           'Chloor Vrij (mg/l)',
    chloor_totaal:         'Chloor Totaal (mg/l)',
    chloor_gebonden:       'Chloor Gebonden (mg/l)',
};

const LIMIETEN_GROEPEN = [
    {
        titel: 'Diep / Ondiep – Meetwaarden',
        info: 'pH, chloor en temperatuur gelden ook voor het Peuterbad.',
        params: ['ph_waarde', 'chloor_waarde', 'watertemperatuur', 'flow_diep', 'flow_ondiep', 'filter_druk_in', 'filter_druk_uit'],
    },
    {
        titel: 'Peuterbad – Meetwaarden',
        params: ['flow_peuterbad', 'filter_druk_peuterbad'],
    },
    {
        titel: 'Verbruik',
        params: ['elektriciteit_nacht', 'elektriciteit_dag', 'gas', 'water_diep', 'water_ondiep', 'water_totaal', 'water_peuterbad'],
    },
    {
        titel: 'Coördinatoren – Chloor',
        info: 'Chloor Vrij geldt ook als grenswaarde voor de waterbeheer-meting (chloor_waarde).',
        params: ['chloor_vrij', 'chloor_totaal', 'chloor_gebonden'],
    },
];

/**
 * Fetch default limit values from the backend, fill all inputs, and schedule an autosave.
 */
async function laadStandaardLimieten() {
    if (!confirm('Standaardwaarden invullen? Dit overschrijft de huidige waarden.')) return;
    try {
        const res = await apiCall('/api/limieten/defaults');
        const defaults = await res.json();
        document.querySelectorAll('[data-limiet-param]').forEach(rij => {
            const param = rij.getAttribute('data-limiet-param');
            const def = defaults[param];
            if (!def) return;
            rij.querySelector('.l-min').value = def.min;
            rij.querySelector('.l-max').value = def.max;
        });
        scheduleAutoSaveLimieten();
    } catch (f) { toonBericht('Kon standaardwaarden niet ophalen.', 'fout'); }
}

/**
 * Load limit definitions from the server and render the table.
 */
async function laadLimietenVanServer() {
    try {
        const response = await apiCall('/api/limieten');
        const limieten = await response.json();
        actieveLimieten = normaliseerLimieten(limieten);
        bouwLimietenBeheerTabel();
    } catch (fout) { console.error("Kon limieten niet laden", fout); }
}

/**
 * Normalize a limits object by copying backward-compatible fields and merging aliases.
 * @param {Object} limieten - The raw limits object returned by the backend.
 * @returns {Object} The normalized limits object used by the UI.
 */
function normaliseerLimieten(limieten) {
    const genormaliseerd = { ...limieten };
    if (!genormaliseerd.watertemperatuur && genormaliseerd.temperatuur) {
        genormaliseerd.watertemperatuur = genormaliseerd.temperatuur;
    }
    if (genormaliseerd.flow) {
        if (!genormaliseerd.flow_diep) genormaliseerd.flow_diep = genormaliseerd.flow;
        if (!genormaliseerd.flow_ondiep) genormaliseerd.flow_ondiep = genormaliseerd.flow;
        if (!genormaliseerd.flow_peuterbad) genormaliseerd.flow_peuterbad = genormaliseerd.flow;
    }
    if (genormaliseerd.filter_druk) {
        if (!genormaliseerd.filter_druk_in) genormaliseerd.filter_druk_in = genormaliseerd.filter_druk;
        if (!genormaliseerd.filter_druk_uit) genormaliseerd.filter_druk_uit = genormaliseerd.filter_druk;
        if (!genormaliseerd.filter_druk_peuterbad) genormaliseerd.filter_druk_peuterbad = genormaliseerd.filter_druk;
    }
    delete genormaliseerd.temperatuur;
    delete genormaliseerd.flow;
    delete genormaliseerd.filter_druk;
    return genormaliseerd;
}

/**
 * Render limit groups as styled boxes into #limietenGroepen.
 * Attaches autosave listeners to each input after rendering.
 */
function bouwLimietenBeheerTabel() {
    const container = document.getElementById('limietenGroepen');
    container.innerHTML = '';

    LIMIETEN_GROEPEN.forEach(groep => {
        const box = document.createElement('div');
        box.className = 'categorie-box';

        let html = `<h3>${groep.titel}</h3>`;
        if (groep.info) html += `<p style="font-size:13px; color:#666; margin: -8px 0 10px;">${groep.info}</p>`;
        html += `<table class="categorie-tabel">
            <thead><tr><th>Parameter</th><th>Minimum</th><th>Maximum</th></tr></thead>
            <tbody>`;

        groep.params.forEach(param => {
            const val = actieveLimieten[param] || { min: '', max: '' };
            const label = LIMIETEN_LABELS[param] || param;
            html += `<tr data-limiet-param="${param}">
                <td><b>${label}</b></td>
                <td><input type="number" class="l-min" step="0.01" value="${val.min}"></td>
                <td><input type="number" class="l-max" step="0.01" value="${val.max}"></td>
            </tr>`;
        });

        html += '</tbody></table>';
        box.innerHTML = html;
        container.appendChild(box);

        box.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', scheduleAutoSaveLimieten);
        });
    });
}

/**
 * Save all edited limit values back to the server in sequence.
 * @param {boolean} [autoSave=false] - Whether the save was triggered automatically.
 */
async function verwerkCentraleLimietenOpslaan(autoSave = false) {
    if (!autoSave) toonBericht('Limieten verwerken...', '');
    const rijen = document.querySelectorAll('[data-limiet-param]');
    let succesTeller = 0;
    for (const rij of rijen) {
        const paramNaam = rij.getAttribute('data-limiet-param');
        const payload = {
            parameter_naam: paramNaam,
            min_waarde: parseFloat(rij.querySelector('.l-min').value),
            max_waarde: parseFloat(rij.querySelector('.l-max').value),
        };
        try {
            const response = await apiCall('/api/limieten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) { succesTeller++; }
        } catch (f) { console.error(f); }
    }
    if (succesTeller === rijen.length) {
        setLimietenSaveStatus('saved');
        if (!autoSave) toonBericht('Limieten succesvol bijgewerkt!', 'succes');
        laadLimietenVanServer();
    } else {
        setLimietenSaveStatus('error');
        toonBericht('Fout bij opslaan van limieten.', 'fout');
    }
}
