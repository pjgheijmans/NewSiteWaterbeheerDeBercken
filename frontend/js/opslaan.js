// ── Auto-save status ──────────────────────────────────────────────────────

let autoSaveTimer = null;

function setAutoSaveStatus(status) {
    const el = document.getElementById('autoSaveStatus');
    if (!el) return;
    const states = {
        pending:  ['Wijzigingen niet opgeslagen...', '#888'],
        saving:   ['Bewaren…',                  '#fd7e14'],
        saved:    ['✓ Opgeslagen',              '#28a745'],
        error:    ['✗ Fout bij opslaan',        '#dc3545'],
    };
    const [text, color] = states[status] || ['', '#333'];
    el.textContent = text;
    el.style.color  = color;
    // Clear "saved" indicator after 4 seconds
    if (status === 'saved') setTimeout(() => {
        if (el.textContent.startsWith('✓')) { el.textContent = ''; }
    }, 4000);
}

function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setAutoSaveStatus('pending');
    autoSaveTimer = setTimeout(async () => {
        setAutoSaveStatus('saving');
        await verwerkCentraleOpslaan(true);
    }, 1200);
}

// ── Opslaan ───────────────────────────────────────────────────────────────

async function verwerkCentraleOpslaan(autoSave = false) {
    const datum = document.getElementById('centraleDatum').value;

    function opSuccess(msg) {
        if (autoSave) {
            setAutoSaveStatus('saved');
        } else {
            toonBericht(msg, 'succes');
        }
    }

    function opError(msg) {
        setAutoSaveStatus('error');
        toonBericht(msg, 'fout');
    }

    function opWaarschuwing(msg) {
        setAutoSaveStatus('error');
        toonBericht(msg, 'fout');
    }

    // Only refresh inputs when NOT auto-saving (prevents overwriting in-progress input)
    function refreshNaOpslaan() {
        if (!autoSave) laadMetingen();
        else if (huidigeRol === 'waterbeheer') laadEnBerekenVerbruik();
    }

    // ── Verbruik / Verwarmingssysteem subtabs ─────────────────────────────
    if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden' && huidigeSubtab !== 'meetwaarden') {
        const ok = await slaAlgemeenGegevensOp();
        if (ok) { opSuccess('Gegevens succesvol opgeslagen!'); refreshNaOpslaan(); }
        else     { opError('Fout bij opslaan.'); }
        return;
    }

    // ── Meetwaarden Diep / Ondiep ─────────────────────────────────────────
    if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'grote-baden') {
        const leiden = ['Diep', 'Ondiep'];
        let ok = 0, leeg = false, fouten = [];

        for (const bad of leiden) {
            const lb = bad.toLowerCase();
            const phEl    = document.getElementById(`ph-${lb}`);
            const chloorEl = document.getElementById(`chloor-${lb}`);
            if (!phEl?.value || !chloorEl?.value) leeg = true;

            const payload = {
                datum, bad_naam: bad,
                ph_waarde:      parseNumberValue(`ph-${lb}`),
                chloor_waarde:  parseNumberValue(`chloor-${lb}`),
                temperatuur:    parseNumberValue(`temp-${lb}`),
                flow:           parseNumberValue(`flow-${lb}`),
                filter_druk_in: parseNumberValue(`filter-in-${lb}`),
                filter_druk_uit:parseNumberValue(`filter-uit-${lb}`),
            };
            payload.filter_druk = payload.filter_druk_in ?? payload.filter_druk_uit ?? 0;

            try {
                const res = await apiCall('/api/metingen', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) { ok++; }
                else { const e = await res.json().catch(() => null); fouten.push(`${bad}: ${e?.error || res.statusText}`); }
            } catch (e) { console.error(e); fouten.push(`${bad}: ${e.message}`); }
        }

        if (ok === leiden.length) {
            if (leeg) opWaarschuwing('Opgeslagen, maar niet alle velden zijn ingevuld.');
            else      opSuccess('Meetwaarden opgeslagen!');
            refreshNaOpslaan();
        } else {
            opError(fouten.join(' | ') || 'Niet alle gegevens konden worden opgeslagen.');
        }
        return;
    }

    // ── Peuterbad ─────────────────────────────────────────────────────────
    if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'peuterbad') {
        const phEl    = document.getElementById('peuterbad-ph');
        const chloorEl = document.getElementById('peuterbad-chloor');
        const leeg = !phEl?.value || !chloorEl?.value;
        const payload = {
            datum, bad_naam: 'Peuterbad',
            ph_waarde:    parseNumberValue('peuterbad-ph'),
            chloor_waarde:parseNumberValue('peuterbad-chloor'),
            flow:         parseNumberValue('peuterbad-flow'),
            filter_druk:  parseNumberValue('peuterbad-filterdruk'),
            water:        document.getElementById('peuterbad-water').value,
            chemicalien_chloor:      document.getElementById('peuterbad-chemicalien-chloor').value,
            chemicalien_zwavelzuur:  document.getElementById('peuterbad-chemicalien-zwavelzuur').value,
        };
        try {
            const res = await apiCall('/api/metingen', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (leeg) opWaarschuwing('Opgeslagen, maar niet alle velden zijn ingevuld.');
                else      opSuccess('Peuterbad opgeslagen!');
                refreshNaOpslaan();
            } else {
                const e = await res.json().catch(() => null);
                opError(e?.error || 'Niet alle gegevens konden worden opgeslagen.');
            }
        } catch (e) { console.error(e); opError('Niet alle gegevens konden worden opgeslagen.'); }
        return;
    }

    // ── Coördinatoren / tabelvorm ─────────────────────────────────────────
    const rijen = document.querySelectorAll('#dagstaatTbody tr');
    let ok = 0, leeg = false;
    rijen.forEach(r => { r.querySelectorAll('input[type="number"]').forEach(i => { if (!i.value.trim()) leeg = true; }); });

    const url = huidigeRol === 'waterbeheer' ? '/api/metingen' : '/api/coordinatoren';
    for (const rij of rijen) {
        const bad_naam = rij.getAttribute('data-bad');
        const payload  = { datum, bad_naam };

        if (huidigeRol === 'waterbeheer') {
            payload.ph_waarde    = rij.querySelector('.v-ph')?.value    ? parseFloat(rij.querySelector('.v-ph').value)    : null;
            payload.chloor_waarde= rij.querySelector('.v-chloor')?.value? parseFloat(rij.querySelector('.v-chloor').value): null;
            const f = rij.querySelector('.v-flow'), d = rij.querySelector('.v-druk');
            payload.flow        = f?.value ? parseInt(f.value)   : null;
            payload.filter_druk = d?.value ? parseFloat(d.value) : null;
        } else {
            payload.ph_waarde      = rij.querySelector('.c-ph')?.value    ? parseFloat(rij.querySelector('.c-ph').value)    : null;
            payload.chloor_waarde  = rij.querySelector('.c-chloor')?.value ? parseFloat(rij.querySelector('.c-chloor').value): null;
            payload.watertemperatuur= rij.querySelector('.c-temp')?.value  ? parseFloat(rij.querySelector('.c-temp').value)  : null;
            payload.helderheid     = rij.querySelector('.c-helder')?.value;
        }

        try {
            const res = await apiCall(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) ok++;
        } catch (e) { console.error(e); }
    }

    if (ok === rijen.length) {
        if (leeg) opWaarschuwing('Opgeslagen, maar niet alle velden zijn ingevuld.');
        else      opSuccess('Gegevens opgeslagen!');
        refreshNaOpslaan();
    } else {
        opError('Niet alle gegevens konden worden opgeslagen.');
    }
}
