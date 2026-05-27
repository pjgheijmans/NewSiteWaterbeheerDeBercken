/**
 * Logboek — free-text entry blocks.
 * All public functions accept an apiBase so waterbeheer (/api/logboek)
 * and coordinatoren (/api/coordinatoren/logboek) use separate tables.
 */

const logboekTimers = {};

function setLogboekSaveStatus(status) {
    const el = document.getElementById('logboekSaveStatus');
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
 * Load all logboek entries for the given date and render them into a container.
 * @param {string} datum
 * @param {string} [containerId='logboek-blokken']
 * @param {string} [apiBase='/api/logboek']
 */
async function laadLogboek(datum, containerId = 'logboek-blokken', apiBase = '/api/logboek') {
    if (!datum) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    try {
        const res = await apiCall(`${apiBase}?datum=${datum}`);
        const entries = await res.json();
        entries.forEach(e => container.appendChild(maakLogboekBlok(e.id, e.tijdstip, e.tekst, apiBase, e.auteur)));
    } catch (err) { console.error('Fout bij laden logboek:', err); }
}

/**
 * Build one logboek block DOM element.
 * @param {number|null} id
 * @param {string} tijdstip
 * @param {string} tekst
 * @param {string} [apiBase='/api/logboek']
 * @returns {HTMLElement}
 */
function maakLogboekBlok(id, tijdstip, tekst, apiBase = '/api/logboek', auteur = '') {
    // Normalize to MySQL DATETIME format "YYYY-MM-DD HH:MM:SS"
    const normalized = String(tijdstip).slice(0, 19).replace('T', ' ');
    const displayTijd = normalized.slice(0, 16);
    const auteurLabel = auteur ? `<span style="color:#888; font-size:13px; margin-left:10px;">— ${auteur}</span>` : '';
    const el = document.createElement('div');
    el.className = 'categorie-box';
    if (id) el.setAttribute('data-logboek-id', id);
    el.setAttribute('data-logboek-tijdstip', normalized);
    el.setAttribute('data-logboek-api', apiBase);

    el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-weight:600; color:#555;">${displayTijd}${auteurLabel}</span>
            <button class="logboek-verwijder-btn" style="background:#dc3545; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:13px;">Verwijderen</button>
        </div>
        <textarea maxlength="500" rows="4"
            placeholder="Voer hier een logboekaantekening in…"
            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid #dee2e6; border-radius:4px; font-family:inherit; font-size:14px; resize:vertical;">${tekst || ''}</textarea>
        <div style="font-size:12px; color:#888; text-align:right; margin-top:4px;">
            <span class="logboek-teller">${(tekst || '').length}</span>/500
        </div>`;

    const ta = el.querySelector('textarea');
    const teller = el.querySelector('.logboek-teller');

    ta.addEventListener('input', e => {
        e.stopPropagation();
        teller.textContent = ta.value.length;
        scheduleAutoSaveLogboek(el);
    });
    ta.addEventListener('change', e => e.stopPropagation());

    el.querySelector('.logboek-verwijder-btn').addEventListener('click', () => verwijderLogboekBlok(el));

    return el;
}

/**
 * Debounce-save a single logboek block using its stored apiBase.
 */
function scheduleAutoSaveLogboek(el) {
    const tijdstip = el.getAttribute('data-logboek-tijdstip');
    const apiBase  = el.getAttribute('data-logboek-api') || '/api/logboek';
    if (logboekTimers[tijdstip]) clearTimeout(logboekTimers[tijdstip]);
    setLogboekSaveStatus('pending');
    logboekTimers[tijdstip] = setTimeout(async () => {
        setLogboekSaveStatus('saving');
        try {
            const datum = document.getElementById('centraleDatum')?.value;
            const tekst = el.querySelector('textarea')?.value ?? '';
            if (!datum) return;
            const res = await apiCall(apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datum, tijdstip, tekst }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.id && !el.getAttribute('data-logboek-id')) {
                    el.setAttribute('data-logboek-id', data.id);
                }
                setLogboekSaveStatus('saved');
            } else {
                setLogboekSaveStatus('error');
                toonBericht('Fout bij opslaan logboek.', 'fout');
            }
        } catch (err) { console.error(err); setLogboekSaveStatus('error'); }
    }, 1200);
}

/**
 * Create a new empty block at the current local datetime and append it to the container.
 * @param {string} [containerId='logboek-blokken']
 * @param {string} [apiBase='/api/logboek']
 */
async function voegLogboekBlokToe(containerId = 'logboek-blokken', apiBase = '/api/logboek') {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const tijdstip = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const datum = document.getElementById('centraleDatum').value;

    try {
        const res = await apiCall(apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ datum, tijdstip, tekst: '' }),
        });
        const data = await res.json();
        const blok = maakLogboekBlok(data.id ?? null, tijdstip, '', apiBase, data.auteur ?? '');
        const container = document.getElementById(containerId);
        if (container) { container.appendChild(blok); blok.querySelector('textarea').focus(); }
    } catch (err) { console.error(err); toonBericht('Fout bij aanmaken logboekblok.', 'fout'); }
}

/**
 * Delete a logboek block using its stored apiBase.
 */
async function verwijderLogboekBlok(el) {
    const id      = el.getAttribute('data-logboek-id');
    const apiBase = el.getAttribute('data-logboek-api') || '/api/logboek';
    if (!confirm('Tekstblok verwijderen?')) return;
    if (id) {
        try {
            const res = await apiCall(`${apiBase}/${id}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 404) {
                const e = await res.json().catch(() => null);
                toonBericht(e?.error || 'Fout bij verwijderen.', 'fout');
                return;
            }
        } catch (err) { console.error(err); toonBericht('Verbindingsfout bij verwijderen.', 'fout'); return; }
    }
    el.remove();
    setLogboekSaveStatus('saved');
}
