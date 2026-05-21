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

const STANDAARD_LIMIETEN = {
    ph_waarde:             { min: 7.0,  max: 7.6  },
    chloor_waarde:         { min: 0.5,  max: 1.5  },
    watertemperatuur:      { min: 24,   max: 29   },
    flow_diep:             { min: 100,  max: 400  },
    flow_ondiep:           { min: 50,   max: 200  },
    flow_peuterbad:        { min: 10,   max: 50   },
    filter_druk_in:        { min: 0.5,  max: 2.5  },
    filter_druk_uit:       { min: 0.5,  max: 2.5  },
    filter_druk_peuterbad: { min: 0.5,  max: 2.5  },
    elektriciteit_nacht:   { min: 0,    max: 0    },
    elektriciteit_dag:     { min: 0,    max: 0    },
    gas:                   { min: 0,    max: 0    },
};

/**
 * Fill all limit inputs with predefined default values and schedule an autosave.
 */
function laadStandaardLimieten() {
    if (!confirm('Standaardwaarden invullen? Dit overschrijft de huidige waarden.')) return;
    document.querySelectorAll('#limietenTbody tr').forEach(rij => {
        const param = rij.getAttribute('data-param');
        const def = STANDAARD_LIMIETEN[param];
        if (!def) return;
        rij.querySelector('.l-min').value = def.min;
        rij.querySelector('.l-max').value = def.max;
    });
    scheduleAutoSaveLimieten();
}

/**
 * Load the current limit definitions from the backend and render them in the UI.
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
 * Render the current active limit values into the limits management table.
 * Attaches autosave listeners to each input after rendering.
 */
function bouwLimietenBeheerTabel() {
    const tbody = document.getElementById('limietenTbody');
    tbody.innerHTML = '';
    const labels = { ph_waarde: 'pH Waarde', chloor_waarde: 'Chloor (mg/l)', flow_diep: 'Flow Diep (m³/h)', flow_ondiep: 'Flow Ondiep (m³/h)', flow_peuterbad: 'Flow Peuterbad (m³/h)', filter_druk_in: 'Filterdruk In (bar)', filter_druk_uit: 'Filterdruk Uit (bar)', filter_druk_peuterbad: 'Filterdruk Peuterbad (bar)', watertemperatuur: 'Watertemperatuur (°C)', elektriciteit_nacht: 'Elektriciteit Nacht', elektriciteit_dag: 'Elektriciteit Dag', gas: 'Gas' };
    Object.keys(actieveLimieten).forEach(param => {
        tbody.innerHTML += `<tr id="limiet-rij-${param}" data-param="${param}">
            <td><b>${labels[param] || param}</b></td>
            <td><input type="number" class="l-min" step="0.01" value="${actieveLimieten[param].min}"></td>
            <td><input type="number" class="l-max" step="0.01" value="${actieveLimieten[param].max}"></td></tr>`;
    });
    tbody.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', scheduleAutoSaveLimieten);
    });
}

/**
 * Save all edited limit values back to the server in sequence.
 * @param {boolean} [autoSave=false] - Whether the save was triggered automatically.
 */
async function verwerkCentraleLimietenOpslaan(autoSave = false) {
    if (!autoSave) toonBericht('Limieten verwerken...', '');
    const rijen = document.querySelectorAll('#limietenTbody tr');
    let succesTeller = 0;
    for (const rij of rijen) {
        const paramNaam = rij.getAttribute('data-param');
        const payload = { parameter_naam: paramNaam, min_waarde: parseFloat(rij.querySelector('.l-min').value), max_waarde: parseFloat(rij.querySelector('.l-max').value) };
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
