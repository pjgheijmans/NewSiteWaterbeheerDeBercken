/**
 * Logboek — tekstblokken voor waterbeheer en coordinatoren.
 */
class LogboekModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    _setSaveStatus(status) {
        const el = document.getElementById('logboekSaveStatus');
        if (!el) return;
        const states = {
            pending: ['Wijzigingen niet opgeslagen...', '#888'],
            saving: ['Bewaren…', '#fd7e14'],
            saved: ['✓ Opgeslagen', '#28a745'],
            error: ['✕ Fout bij opslaan', '#dc3545'],
        };
        const [text, color] = states[status] || ['', '#333'];
        el.textContent = text;
        el.style.color = color;
        if (status === 'saved')
            setTimeout(() => {
                if (el.textContent.startsWith('✓')) el.textContent = '';
            }, 4000);
    }

    /**
     * Laad alle logboekregels voor een datum en render ze in een container.
     * @param {string} datum
     * @param {string} [containerId='logboek-blokken']
     * @param {string} [apiBase='/api/logboek']
     */
    async laadLogboek(datum, containerId = 'logboek-blokken', apiBase = '/api/logboek') {
        if (!datum) return;
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        try {
            const res = await this.app.api.call(`${apiBase}?datum=${datum}`);
            const entries = await res.json();
            entries.forEach((e) =>
                container.appendChild(this._maakBlok(e.id, e.tijdstip, e.tekst, apiBase, e.auteur)),
            );
        } catch (e) {
            console.error('Fout bij laden logboek:', e);
        }
    }

    /** @private */
    _maakBlok(id, tijdstip, tekst, apiBase = '/api/logboek', auteur = '') {
        const normalized = String(tijdstip).slice(0, 19).replace('T', ' ');
        const displayTijd = normalized.slice(0, 16);
        const auteurLabel = auteur
            ? `<span style="color:#888;font-size:13px;margin-left:10px;">— ${auteur}</span>`
            : '';

        const el = document.createElement('div');
        el.className = 'categorie-box';
        if (id) el.setAttribute('data-logboek-id', id);
        el.setAttribute('data-logboek-tijdstip', normalized);
        el.setAttribute('data-logboek-api', apiBase);

        el.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:600;color:#555;">${displayTijd}${auteurLabel}</span>
                <button class="logboek-verwijder-btn" style="background:#dc3545;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:13px;">Verwijderen</button>
            </div>
            <textarea maxlength="500" rows="4"
                placeholder="Voer hier een logboekaantekening in…"
                style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #dee2e6;border-radius:4px;font-family:inherit;font-size:14px;resize:vertical;">${tekst || ''}</textarea>
            <div style="font-size:12px;color:#888;text-align:right;margin-top:4px;">
                <span class="logboek-teller">${(tekst || '').length}</span>/500
            </div>`;

        const ta = el.querySelector('textarea');
        const teller = el.querySelector('.logboek-teller');

        ta.addEventListener('input', (e) => {
            e.stopPropagation();
            teller.textContent = ta.value.length;
            this._scheduleAutoSave(el);
        });
        ta.addEventListener('change', (e) => e.stopPropagation());
        el.querySelector('.logboek-verwijder-btn').addEventListener('click', () =>
            this._verwijderBlok(el),
        );

        return el;
    }

    /** @private */
    _scheduleAutoSave(el) {
        const tijdstip = el.getAttribute('data-logboek-tijdstip');
        const apiBase = el.getAttribute('data-logboek-api') || '/api/logboek';
        const timers = this.app.state.logboekTimers;
        if (timers[tijdstip]) clearTimeout(timers[tijdstip]);
        this._setSaveStatus('pending');
        timers[tijdstip] = setTimeout(async () => {
            this._setSaveStatus('saving');
            try {
                const datum = document.getElementById('centraleDatum')?.value;
                const tekst = el.querySelector('textarea')?.value ?? '';
                if (!datum) return;
                const res = await this.app.api.call(apiBase, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ datum, tijdstip, tekst }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.id && !el.getAttribute('data-logboek-id'))
                        el.setAttribute('data-logboek-id', data.id);
                    this._setSaveStatus('saved');
                } else {
                    this._setSaveStatus('error');
                    this.app.ui.toonBericht('Fout bij opslaan logboek.', 'fout');
                }
            } catch (e) {
                console.error(e);
                this._setSaveStatus('error');
            }
        }, 1200);
    }

    /**
     * Maak een nieuw leeg blok aan voor het huidige tijdstip.
     * @param {string} [containerId='logboek-blokken']
     * @param {string} [apiBase='/api/logboek']
     */
    async voegLogboekBlokToe(containerId = 'logboek-blokken', apiBase = '/api/logboek') {
        // Geen schrijfrecht (of historie zonder recht)? Niets toevoegen — de knop
        // is in alleen-lezen modus ook visueel uitgeschakeld (.schrijf-actie).
        if (!this.app.auth.magNuOpslaan()) return;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const tijdstip = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const datum = document.getElementById('centraleDatum').value;
        try {
            const res = await this.app.api.call(apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datum, tijdstip, tekst: '' }),
            });
            const data = await res.json();
            const blok = this._maakBlok(data.id ?? null, tijdstip, '', apiBase, data.auteur ?? '');
            const container = document.getElementById(containerId);
            if (container) {
                container.appendChild(blok);
                blok.querySelector('textarea').focus();
            }
        } catch (e) {
            console.error(e);
            this.app.ui.toonBericht('Fout bij aanmaken logboekblok.', 'fout');
        }
    }

    /** @private */
    async _verwijderBlok(el) {
        const id = el.getAttribute('data-logboek-id');
        const apiBase = el.getAttribute('data-logboek-api') || '/api/logboek';
        if (
            !(await this.app.ui.bevestig({
                tekst: 'Dit tekstblok verwijderen?',
                bevestig: 'Verwijderen',
                gevaar: true,
            }))
        )
            return;
        if (id) {
            try {
                const res = await this.app.api.call(`${apiBase}/${id}`, { method: 'DELETE' });
                if (!res.ok && res.status !== 404) {
                    const e = await res.json().catch(() => null);
                    this.app.ui.toonBericht(e?.error || 'Fout bij verwijderen.', 'fout');
                    return;
                }
            } catch (e) {
                console.error(e);
                this.app.ui.toonBericht('Verbindingsfout bij verwijderen.', 'fout');
                return;
            }
        }
        el.remove();
        this._setSaveStatus('saved');
    }
}

// Node/Jest: exporteer de klasse zodat hij in jsdom-tests gebruikt kan worden.
// In de browser bestaat `module` niet en wordt dit genegeerd.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogboekModule;
}
