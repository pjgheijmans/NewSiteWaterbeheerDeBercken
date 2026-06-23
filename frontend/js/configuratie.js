/**
 * Configuratiebeheer (Administrator) — generieke sleutel/waarde-instellingen.
 * Autosave met 1,2 s debounce, net als de rest van de app (geen opslaan-knop).
 */
class ConfiguratieModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    _setStatus(status) {
        const el = document.getElementById('configuratieSaveStatus');
        if (!el) return;
        const states = {
            pending: ['Wijzigingen niet opgeslagen...', '#888'],
            saving: ['Bewaren…', '#fd7e14'],
            saved: ['✓ Opgeslagen', '#28a745'],
            error: ['✕ Fout bij opslaan', '#dc3545'],
        };
        const [tekst, kleur] = states[status] || ['', '#333'];
        el.textContent = tekst;
        el.style.color = kleur;
        if (status === 'saved')
            setTimeout(() => {
                if (el.textContent.startsWith('✓')) el.textContent = '';
            }, 4000);
    }

    /** @private Plan een autosave in voor één instelling (debounce 1,2 s). */
    _scheduleAutoSave(sleutel) {
        const timers = this.app.state.configuratieSaveTimers;
        if (timers[sleutel]) clearTimeout(timers[sleutel]);
        this._setStatus('pending');
        timers[sleutel] = setTimeout(() => this._opslaan(sleutel), 1200);
    }

    /** Laad alle configuratie-instellingen en render de beheertabel. */
    async laad() {
        try {
            const res = await this.app.api.call('/api/configuratie');
            const items = await res.json();
            const tbody = document.getElementById('configuratieTbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            (Array.isArray(items) ? items : []).forEach((item) => {
                const sleutel = String(item.sleutel);
                const label = item.omschrijving || sleutel;
                const type = item.type === 'getal' ? 'number' : 'text';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><b>${label}</b><br><span style="font-size:12px;color:#888;">${sleutel}</span></td>
                    <td><input type="${type}" id="cfg-${sleutel}" value="${item.waarde ?? ''}"></td>`;
                tbody.appendChild(tr);
                const input = tr.querySelector('input');
                input.addEventListener('input', () => this._scheduleAutoSave(sleutel));
                input.addEventListener('change', () => this._scheduleAutoSave(sleutel));
            });
        } catch {
            this.app.ui.toonBericht('Fout bij laden configuratie.', 'fout');
        }
    }

    /** @private Sla één instelling op naar de backend. */
    async _opslaan(sleutel) {
        const el = document.getElementById(`cfg-${sleutel}`);
        if (!el) return;
        // Getalvelden leveren al een punt-decimaal; tekstvelden bewaren we ongewijzigd
        // (alleen randspaties weg). Geen komma→punt-vervanging: die zou tekstwaarden corrumperen.
        const waarde = el.value.toString().trim();
        this._setStatus('saving');
        try {
            const res = await this.app.api.call(
                `/api/configuratie/${encodeURIComponent(sleutel)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ waarde }),
                },
            );
            if (res.ok) {
                this._setStatus('saved');
            } else {
                this._setStatus('error');
                const e = await res.json().catch(() => null);
                this.app.ui.toonBericht(e?.error || 'Fout bij opslaan configuratie.', 'fout');
            }
        } catch {
            this._setStatus('error');
            this.app.ui.toonBericht('Verbindingsfout bij opslaan.', 'fout');
        }
    }
}

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfiguratieModule;
}
