// ── Auto-save status ──────────────────────────────────────────────────────

let autoSaveTimer = null;
const blokTimers = {};

/**
 * Update the auto-save status indicator displayed in the UI.
 * @param {'pending'|'saving'|'saved'|'error'} status - The status keyword to display.
 */
function setAutoSaveStatus(status) {
    const el = document.getElementById('autoSaveStatus');
    if (!el) return;
    const states = {
        pending:  ['Wijzigingen niet opgeslagen...', '#888'],
        saving:   ['Bewaren…',                  '#fd7e14'],
        saved:    ['✓ Opgeslagen',              '#28a745'],
        warning:  ['⚠ Opgeslagen met waarschuwing', '#fd7e14'],
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

/**
 * Schedule a delayed save action after the user stops editing for a short period.
 * This improves responsiveness and avoids unnecessary immediate save requests.
 */
function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setAutoSaveStatus('pending');
    autoSaveTimer = setTimeout(async () => {
        setAutoSaveStatus('saving');
        await verwerkCentraleOpslaan(true);
    }, 1200);
}

// ── Coördinatoren blok-save ───────────────────────────────────────────────

/**
 * Schedule a debounced save for a single coordinator measurement block.
 * @param {string} tijdstip - The block's time key (HH:MM:SS).
 */
function scheduleAutoSaveBlok(tijdstip) {
    if (blokTimers[tijdstip]) clearTimeout(blokTimers[tijdstip]);
    setAutoSaveStatus('pending');
    blokTimers[tijdstip] = setTimeout(async () => {
        setAutoSaveStatus('saving');
        const ok = await slaCoordinatorenBlokOp(tijdstip);
        setAutoSaveStatus(ok ? 'saved' : 'error');
        if (!ok) toonBericht('Fout bij opslaan van blok.', 'fout');
    }, 1200);
}

/**
 * Save all rows of one coordinator block to the backend.
 * @param {string} tijdstip - The block's time key.
 * @returns {Promise<boolean>} True when all rows saved successfully.
 */
async function slaCoordinatorenBlokOp(tijdstip) {
    const datum = document.getElementById('centraleDatum').value;
    const blok  = document.querySelector(`[data-blok-tijdstip="${tijdstip}"]`);
    if (!blok) return false;
    const rijen = blok.querySelectorAll('tr[data-bad]');
    let ok = 0;
    for (const rij of rijen) {
        const v = s => s?.value ? parseFloat(s.value) : null;
        const isPeuterbad = rij.getAttribute('data-bad') === 'Peuterbad';
        const payload = {
            datum,
            tijdstip,
            bad_naam:         rij.getAttribute('data-bad'),
            ph_waarde:        v(rij.querySelector('.c-ph')),
            chloor_vrij:      v(rij.querySelector('.c-chloor-vrij')),
            chloor_totaal:    v(rij.querySelector('.c-chloor-totaal')),
            watertemperatuur: v(rij.querySelector('.c-temp')),
            helderheid:       isPeuterbad ? null : (rij.querySelector('.c-helder')?.value || 'Helder'),
            bad_gebruikt:     isPeuterbad ? (rij.querySelector('.c-gebruikt')?.checked ? 1 : 0) : null,
        };
        try {
            const res = await apiCall('/api/coordinatoren', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
            });
            if (res.ok) ok++;
            else { const e = await res.json().catch(() => null); console.error(`Blok ${tijdstip} - ${payload.bad_naam}:`, e); }
        } catch (e) { console.error(e); }
    }
    return ok === rijen.length;
}

// ── Opslaan ───────────────────────────────────────────────────────────────

/**
 * Save central application data for the current date.
 * Handles auto-save behavior, verbruik/verwarmingssysteem subtabs, diep/ondiep measurements, and peuterbad data saving.
 * @param {boolean} [autoSave=false] - Whether the save was triggered automatically.
 */
async function verwerkCentraleOpslaan(autoSave = false) {
    const datum = document.getElementById('centraleDatum').value;

    /**
     * Handle successful saves by updating the UI depending on auto-save mode.
     * @param {string} msg - The message to display for manual saves.
     */
    function opSuccess(msg) {
        if (autoSave) {
            setAutoSaveStatus('saved');
        } else {
            toonBericht(msg, 'succes');
        }
    }

    /**
     * Handle failed saves by setting the status to error and showing a message.
     * @param {string} msg - The error message to display.
     */
    function opError(msg) {
        setAutoSaveStatus('error');
        toonBericht(msg, 'fout');
    }

    /**
     * Handle warnings that should still be shown as error-style feedback.
     * @param {string} msg - The warning message to display.
     */
    function opWaarschuwing(msg) {
        setAutoSaveStatus('warning');
        toonBericht(msg, 'fout');
    }

    /**
     * Refresh page inputs after save completion without disrupting manual edits.
     */
    function refreshNaOpslaan() {
        if (!autoSave) laadMetingen();
        else if (huidigeRol === 'waterbeheer') laadEnBerekenVerbruik();
    }

    // ── Logboek – geen centrale opslaan nodig ────────────────────────────
    if (huidigeRol === 'waterbeheer' && huidigeBadPagina === 'logboek') {
        setAutoSaveStatus('saved'); return;
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

    // ── Coördinatoren – alle blokken opslaan (alleen op metingen-subtab) ──
    if (huidigeRol === 'coordinatoren') {
        if (huidigeCoordSubtab !== 'metingen') return;
        const blokken = document.querySelectorAll('#coordinatoren-blokken-content [data-blok-tijdstip]');
        if (blokken.length === 0) { opSuccess('Geen blokken om op te slaan.'); return; }
        let allOk = true;
        for (const blok of blokken) {
            const ok = await slaCoordinatorenBlokOp(blok.getAttribute('data-blok-tijdstip'));
            if (!ok) allOk = false;
        }
        if (allOk) { opSuccess('Alle blokken opgeslagen!'); refreshNaOpslaan(); }
        else        { opError('Niet alle blokken konden worden opgeslagen.'); }
        return;
    }
}
